import { v4 as uuid } from 'uuid';
import { dbGet, dbPut, dbDelete, dbScan, TABLES } from './dynamodb';
import { Customer, Fulfillment, Order, OrderPayment, OrderStatus, PaymentMethod, PaymentStatus } from '../types';

const TABLE = TABLES.ORDERS;

export interface OrderFilters {
  outlet?: string;
  customerId?: string;
  pickupFrom?: string;  // YYYY-MM-DD, inclusive
  pickupTo?: string;    // YYYY-MM-DD, inclusive
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  unpaidOnly?: boolean; // remaining > 0 and not cancelled
}

export interface OrderInput {
  outlet: string;
  orderDate: string;
  pickupDate: string;
  pickupTime?: string;
  fulfillment: Fulfillment;
  deliveryAddress?: string;
  deliveryFee?: number;
  items: string;
  total: number;
  status?: OrderStatus;
  notes?: string;
}

export interface PaymentInput {
  date: string;
  amount: number;
  method: PaymentMethod;
  note?: string;
}

/** Recompute paid / remaining / paymentStatus from the payments list. */
function withTotals(order: Order): Order {
  const deliveryFee = order.fulfillment === 'antar' ? order.deliveryFee || 0 : 0;
  const grandTotal = (order.total || 0) + deliveryFee;
  const paid = order.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(grandTotal - paid, 0);

  let paymentStatus: PaymentStatus = 'dp';
  if (paid <= 0) paymentStatus = 'belum_bayar';
  else if (remaining <= 0) paymentStatus = 'lunas';

  return { ...order, deliveryFee, grandTotal, paid, remaining, paymentStatus };
}

function toOrder(item: Record<string, any>): Order {
  return withTotals({
    id: item.id,
    customerId: item.customerId,
    customerName: item.customerName,
    customerPhone: item.customerPhone,
    outlet: item.outlet,
    orderDate: item.orderDate,
    pickupDate: item.pickupDate,
    pickupTime: item.pickupTime,
    fulfillment: item.fulfillment ?? 'ambil',
    deliveryAddress: item.deliveryAddress,
    deliveryFee: item.deliveryFee ?? 0,
    items: item.items,
    total: item.total ?? 0,
    grandTotal: 0,
    payments: item.payments ?? [],
    paid: 0,
    remaining: 0,
    paymentStatus: 'belum_bayar',
    status: item.status ?? 'baru',
    notes: item.notes,
    createdBy: item.createdBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
}

async function save(order: Order): Promise<Order> {
  const final = withTotals(order);
  await dbPut(TABLE, { PK: `ORDER#${final.id}`, SK: 'PROFILE', ...final });
  return final;
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

export async function listOrders(filters: OrderFilters = {}): Promise<Order[]> {
  const items = await dbScan(TABLE);
  let orders = items.filter((i) => i.SK === 'PROFILE').map(toOrder);

  if (filters.outlet) orders = orders.filter((o) => o.outlet === filters.outlet);
  if (filters.customerId) orders = orders.filter((o) => o.customerId === filters.customerId);
  if (filters.pickupFrom) orders = orders.filter((o) => o.pickupDate >= filters.pickupFrom!);
  if (filters.pickupTo) orders = orders.filter((o) => o.pickupDate <= filters.pickupTo!);
  if (filters.status) orders = orders.filter((o) => o.status === filters.status);
  if (filters.paymentStatus) orders = orders.filter((o) => o.paymentStatus === filters.paymentStatus);
  if (filters.unpaidOnly) orders = orders.filter((o) => o.remaining > 0 && o.status !== 'batal');

  const key = (o: Order) => `${o.pickupDate} ${o.pickupTime || '99:99'}`;
  return orders.sort((a, b) => key(a).localeCompare(key(b)));
}

export async function getOrderById(id: string): Promise<Order | null> {
  const item = await dbGet(TABLE, { PK: `ORDER#${id}`, SK: 'PROFILE' });
  return item ? toOrder(item) : null;
}

export async function createOrder(
  customer: Customer,
  data: OrderInput,
  initialPayment?: PaymentInput,
  createdBy?: string,
): Promise<Order> {
  const now = new Date().toISOString();
  return save({
    id: uuid(),
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    outlet: data.outlet,
    orderDate: data.orderDate,
    pickupDate: data.pickupDate,
    pickupTime: data.pickupTime || undefined,
    fulfillment: data.fulfillment,
    deliveryAddress: data.fulfillment === 'antar' ? data.deliveryAddress?.trim() || undefined : undefined,
    deliveryFee: data.deliveryFee || 0,
    items: data.items.trim(),
    total: data.total,
    grandTotal: 0,
    payments: initialPayment ? [newPayment(initialPayment, createdBy)] : [],
    paid: 0,
    remaining: 0,
    paymentStatus: 'belum_bayar',
    status: data.status || 'baru',
    notes: data.notes?.trim() || undefined,
    createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateOrder(
  id: string,
  updates: Partial<OrderInput>,
  customer?: Customer,
): Promise<Order | null> {
  const existing = await getOrderById(id);
  if (!existing) return null;

  const next: Order = { ...existing, updatedAt: new Date().toISOString() };
  if (customer) {
    next.customerId = customer.id;
    next.customerName = customer.name;
    next.customerPhone = customer.phone;
  }
  if (updates.outlet !== undefined) next.outlet = updates.outlet;
  if (updates.orderDate !== undefined) next.orderDate = updates.orderDate;
  if (updates.pickupDate !== undefined) next.pickupDate = updates.pickupDate;
  if (updates.pickupTime !== undefined) next.pickupTime = updates.pickupTime || undefined;
  if (updates.fulfillment !== undefined) next.fulfillment = updates.fulfillment;
  if (updates.deliveryAddress !== undefined) next.deliveryAddress = updates.deliveryAddress.trim() || undefined;
  if (updates.deliveryFee !== undefined) next.deliveryFee = updates.deliveryFee;
  if (updates.items !== undefined) next.items = updates.items.trim();
  if (updates.total !== undefined) next.total = updates.total;
  if (updates.status !== undefined) next.status = updates.status;
  if (updates.notes !== undefined) next.notes = updates.notes.trim() || undefined;
  if (next.fulfillment === 'ambil') next.deliveryAddress = undefined;

  return save(next);
}

/** Keep the customer name/phone copied onto orders in sync after a customer edit. */
export async function syncCustomerOnOrders(customer: Customer): Promise<void> {
  const orders = await listOrders({ customerId: customer.id });
  for (const o of orders) {
    if (o.customerName === customer.name && o.customerPhone === customer.phone) continue;
    await save({ ...o, customerName: customer.name, customerPhone: customer.phone });
  }
}

export async function addPayment(id: string, payment: PaymentInput, createdBy?: string): Promise<Order | null> {
  const existing = await getOrderById(id);
  if (!existing) return null;
  return save({
    ...existing,
    payments: [...existing.payments, newPayment(payment, createdBy)],
    updatedAt: new Date().toISOString(),
  });
}

export async function removePayment(id: string, paymentId: string): Promise<Order | null> {
  const existing = await getOrderById(id);
  if (!existing) return null;
  return save({
    ...existing,
    payments: existing.payments.filter((p) => p.id !== paymentId),
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteOrder(id: string): Promise<void> {
  await dbDelete(TABLE, { PK: `ORDER#${id}`, SK: 'PROFILE' });
}
