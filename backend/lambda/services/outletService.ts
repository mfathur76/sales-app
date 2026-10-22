import bcrypt from 'bcryptjs';
import { signToken } from '../utils/jwt';
import { dbGet, dbPut, dbScan, TABLES } from './dynamodb';
import { Outlet } from '../types';

const TABLE = TABLES.OUTLETS;

function toOutlet(item: Record<string, any>): Outlet {
  return {
    code: item.code,
    name: item.name,
    password: item.password,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function loginOutlet(code: string, password: string) {
  const item = await dbGet(TABLE, { PK: `OUTLET#${code}`, SK: 'PROFILE' });

  if (!item) {
    return { success: false, message: 'Outlet tidak ditemukan' };
  }

  const valid = await bcrypt.compare(password, item.password);
  if (!valid) {
    return { success: false, message: 'Password salah' };
  }

  const token = signToken({ outlet: item.code, name: item.name, type: 'outlet' });
  return {
    success: true,
    message: 'Login berhasil',
    data: { token, outlet: item.code, name: item.name },
  };
}

export async function getAllOutlets(): Promise<Outlet[]> {
  const items = await dbScan(TABLE);
  return items
    .filter((i) => i.SK === 'PROFILE')
    .map(toOutlet)
    .sort((a, b) => a.code.localeCompare(b.code));
}

export async function getOutletByCode(code: string): Promise<Outlet | null> {
  const item = await dbGet(TABLE, { PK: `OUTLET#${code}`, SK: 'PROFILE' });
  return item ? toOutlet(item) : null;
}

export async function createOutlet(data: { code: string; name: string; password: string }): Promise<Outlet> {
  const existing = await dbGet(TABLE, { PK: `OUTLET#${data.code}`, SK: 'PROFILE' });
  if (existing) throw new Error(`Outlet with code ${data.code} already exists`);

  const hashed = await bcrypt.hash(data.password, 10);
  const now = new Date().toISOString();

  const item = {
    PK: `OUTLET#${data.code}`,
    SK: 'PROFILE',
    code: data.code,
    name: data.name,
    password: hashed,
    createdAt: now,
    updatedAt: now,
  };

  await dbPut(TABLE, item);
  return toOutlet(item);
}

export async function updateOutlet(
  code: string,
  updates: { name?: string; password?: string },
): Promise<Outlet | null> {
  const existing = await dbGet(TABLE, { PK: `OUTLET#${code}`, SK: 'PROFILE' });
  if (!existing) return null;

  const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (updates.name) payload.name = updates.name;
  if (updates.password) payload.password = await bcrypt.hash(updates.password, 10);

  const { dbUpdate } = await import('./dynamodb');
  const updated = await dbUpdate(TABLE, { PK: `OUTLET#${code}`, SK: 'PROFILE' }, payload);
  return updated ? toOutlet(updated as any) : null;
}

export async function deleteOutlet(code: string): Promise<void> {
  const { dbDelete } = await import('./dynamodb');
  await dbDelete(TABLE, { PK: `OUTLET#${code}`, SK: 'PROFILE' });
}
