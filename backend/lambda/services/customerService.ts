import { v4 as uuid } from 'uuid';
import { dbGet, dbPut, dbDelete, dbScan, TABLES } from './dynamodb';
import { Customer } from '../types';

const TABLE = TABLES.CUSTOMERS;

export class DuplicatePhoneError extends Error {
  constructor(public existing: Customer) {
    super(`Nomor HP sudah terdaftar atas nama ${existing.name}`);
  }
}

/** 0812..., +62 812..., 812... → 62812... so the same number always matches. */
export function normalizePhone(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function toCustomer(item: Record<string, any>): Customer {
  return {
    id: item.id,
    name: item.name,
    phone: item.phone,
    address: item.address,
    notes: item.notes,
    outlet: item.outlet,
    createdBy: item.createdBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function buildItem(c: Customer) {
  return { PK: `CUSTOMER#${c.id}`, SK: 'PROFILE', ...c };
}

export async function listCustomers(q?: string): Promise<Customer[]> {
  const items = await dbScan(TABLE);
  let customers = items.filter((i) => i.SK === 'PROFILE').map(toCustomer);

  const term = (q || '').trim().toLowerCase();
  if (term) {
    const phoneTerm = term.replace(/\D/g, '').replace(/^0/, '');
    customers = customers.filter((c) =>
      c.name.toLowerCase().includes(term) || (phoneTerm.length >= 3 && c.phone.includes(phoneTerm)),
    );
  }

  return customers.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const item = await dbGet(TABLE, { PK: `CUSTOMER#${id}`, SK: 'PROFILE' });
  return item ? toCustomer(item) : null;
}

export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  const items = await dbScan(TABLE, 'phone = :phone', { ':phone': normalizePhone(phone) });
  return items[0] ? toCustomer(items[0]) : null;
}

export async function createCustomer(data: {
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  outlet: string;
  createdBy?: string;
}): Promise<Customer> {
  const phone = normalizePhone(data.phone);
  const existing = await findCustomerByPhone(phone);
  if (existing) throw new DuplicatePhoneError(existing);

  const now = new Date().toISOString();
  const customer: Customer = {
    id: uuid(),
    name: data.name.trim(),
    phone,
    address: data.address?.trim() || undefined,
    notes: data.notes?.trim() || undefined,
    outlet: data.outlet,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  await dbPut(TABLE, buildItem(customer));
  return customer;
}

export async function updateCustomer(
  id: string,
  updates: { name?: string; phone?: string; address?: string; notes?: string },
): Promise<Customer | null> {
  const existing = await getCustomerById(id);
  if (!existing) return null;

  const next: Customer = { ...existing, updatedAt: new Date().toISOString() };
  if (updates.name !== undefined) next.name = updates.name.trim();
  if (updates.address !== undefined) next.address = updates.address.trim() || undefined;
  if (updates.notes !== undefined) next.notes = updates.notes.trim() || undefined;
  if (updates.phone !== undefined) {
    next.phone = normalizePhone(updates.phone);
    if (next.phone !== existing.phone) {
      const other = await findCustomerByPhone(next.phone);
      if (other && other.id !== id) throw new DuplicatePhoneError(other);
    }
  }

  await dbPut(TABLE, buildItem(next));
  return next;
}

export async function deleteCustomer(id: string): Promise<void> {
  await dbDelete(TABLE, { PK: `CUSTOMER#${id}`, SK: 'PROFILE' });
}
