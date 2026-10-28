import { v4 as uuid } from 'uuid';
import { dbGet, dbPut, dbDelete, dbQuery, TABLES } from './dynamodb';
import { Customer, OrderPayment, PaymentMethod, PaymentStatus, ResellerSale, ResellerSaleLine } from '../types';

const TABLE = TABLES.STOCK;
const PK = 'RESELLER_SALE';

/**
 * Stock a reseller takes from the kitchen, billed now and paid later (no returns).
 *   PK = RESELLER_SALE   SK = ID#{id}
 * The goods leave the kitchen stock on `date`; the bill is due on `dueDate`.
 */

export const DEFAULT_TERM_DAYS = 7;

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface PaymentInput {
  date: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
}

/** Recompute total / paid / remaining / paymentStatus. */
function withTotals(sale: ResellerSale): ResellerSale {
  const total = sale.lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const paid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(total - paid, 0);
  let paymentStatus: PaymentStatus = 'dp';
  if (paid <= 0) paymentStatus = 'belum_bayar';
  else if (remaining <= 0) paymentStatus = 'lunas';
  return { ...sale, total, paid, remaining, paymentStatus };
}

function toSale(item: Record<string, any>): ResellerSale {
  return withTotals({
    id: item.id,
    kitchen: item.kitchen,
    customerId: item.customerId,
    customerName: item.customerName,
    customerPhone: item.customerPhone,
    date: item.date,
    dueDate: item.dueDate,
    lines: item.lines ?? [],
    total: 0,
    payments: item.payments ?? [],
    paid: 0,
    remaining: 0,
    paymentStatus: 'belum_bayar',
    notes: item.notes,
    createdBy: item.createdBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
}

async function save(sale: ResellerSale): Promise<ResellerSale> {
  const final = withTotals(sale);
  await dbPut(TABLE, { PK, SK: `ID#${final.id}`, ...final });
  return final;
}

export async function listResellerSales(filters: {
  kitchen?: string;
  customerId?: string;
  from?: string;
  to?: string;
  unpaidOnly?: boolean;
} = {}): Promise<ResellerSale[]> {
  const items = await dbQuery({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': PK },
  });
  return items
    .map(toSale)
    .filter((s) => !filters.kitchen || s.kitchen === filters.kitchen)
    .filter((s) => !filters.customerId || s.customerId === filters.customerId)
    .filter((s) => (!filters.from || s.date >= filters.from) && (!filters.to || s.date <= filters.to))
    .filter((s) => !filters.unpaidOnly || s.remaining > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export async function getResellerSale(id: string): Promise<ResellerSale | null> {
  const item = await dbGet(TABLE, { PK, SK: `ID#${id}` });
  return item ? toSale(item) : null;
}

export async function createResellerSale(data: {
  kitchen: string;
  customer: Customer;
  date: string;
  dueDate?: string;
  lines: ResellerSaleLine[];
  payment?: PaymentInput;
  notes?: string;
  createdBy?: string;
}): Promise<ResellerSale> {
  const now = new Date().toISOString();
  return save({
    id: uuid(),
    kitchen: data.kitchen,
    customerId: data.customer.id,
    customerName: data.customer.name,
    customerPhone: data.customer.phone,
    date: data.date,
    dueDate: data.dueDate || addDays(data.date, DEFAULT_TERM_DAYS),
    lines: data.lines,
    total: 0,
    payments: data.payment ? [newPayment(data.payment, data.createdBy)] : [],
    paid: 0,
    remaining: 0,
    paymentStatus: 'belum_bayar',
    notes: data.notes?.trim() || undefined,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateResellerSale(
  existing: ResellerSale,
  updates: { date?: string; dueDate?: string; lines?: ResellerSaleLine[]; notes?: string },
): Promise<ResellerSale> {
  const next: ResellerSale = { ...existing, updatedAt: new Date().toISOString() };
  if (updates.date !== undefined) next.date = updates.date;
  if (updates.dueDate !== undefined) next.dueDate = updates.dueDate;
  if (updates.lines !== undefined) next.lines = updates.lines;
  if (updates.notes !== undefined) next.notes = updates.notes.trim() || undefined;
  return save(next);
}

function newPayment(p: PaymentInput, createdBy?: string): OrderPayment {
  return {
    id: uuid(),
    date: p.date,
    amount: p.amount,
    method: p.method,
    note: p.note?.trim() || undefined,
    createdBy,
    createdAt: new Date().toISOString(),
  };
}

export async function addResellerPayment(existing: ResellerSale, payment: PaymentInput, createdBy?: string) {
  return save({ ...existing, payments: [...existing.payments, newPayment(payment, createdBy)], updatedAt: new Date().toISOString() });
}

export async function removeResellerPayment(existing: ResellerSale, paymentId: string) {
  return save({ ...existing, payments: existing.payments.filter((p) => p.id !== paymentId), updatedAt: new Date().toISOString() });
}

export async function deleteResellerSale(id: string): Promise<void> {
  await dbDelete(TABLE, { PK, SK: `ID#${id}` });
}

/** Keep the reseller name/phone copied onto their bills in sync after a customer edit. */
export async function syncCustomerOnResellerSales(customer: Customer): Promise<void> {
  const sales = await listResellerSales({ customerId: customer.id });
  for (const s of sales) {
    if (s.customerName === customer.name && s.customerPhone === customer.phone) continue;
    await save({ ...s, customerName: customer.name, customerPhone: customer.phone });
  }
}

/** Bills still open, grouped per reseller, with how much of it is past due on `today`. */
export function outstandingByReseller(sales: ResellerSale[], today: string) {
  const map = new Map<string, { customerId: string; customerName: string; customerPhone: string; bills: number; remaining: number; overdue: number; oldestDue: string }>();
  sales.filter((s) => s.remaining > 0).forEach((s) => {
    const r = map.get(s.customerId) ?? {
      customerId: s.customerId, customerName: s.customerName, customerPhone: s.customerPhone,
      bills: 0, remaining: 0, overdue: 0, oldestDue: s.dueDate,
    };
    r.bills += 1;
    r.remaining += s.remaining;
    if (s.dueDate < today) r.overdue += s.remaining;
    if (s.dueDate < r.oldestDue) r.oldestDue = s.dueDate;
    map.set(s.customerId, r);
  });
  return [...map.values()].sort((a, b) => b.overdue - a.overdue || b.remaining - a.remaining);
}
