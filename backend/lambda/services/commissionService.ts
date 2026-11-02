import { v4 as uuid } from 'uuid';
import { dbGet, dbPut, dbScan, TABLES } from './dynamodb';
import { CommissionEmployee } from '../types';

const TABLE = TABLES.COMMISSION;

/**
 * Employees paid a commission on the money their outlets take in.
 *   PK = EMPLOYEE#{id}  SK = PROFILE
 * The commission itself is worked out from Sales when the report is opened, nothing is stored.
 */

function toEmployee(item: Record<string, any>): CommissionEmployee {
  return {
    id: item.id,
    name: item.name,
    outlets: item.outlets ?? [],
    isActive: item.isActive !== false,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function save(e: CommissionEmployee): Promise<CommissionEmployee> {
  await dbPut(TABLE, { PK: `EMPLOYEE#${e.id}`, SK: 'PROFILE', ...e });
  return e;
}

export async function listEmployees(): Promise<CommissionEmployee[]> {
  const items = await dbScan(TABLE);
  return items
    .filter((i) => i.SK === 'PROFILE')
    .map(toEmployee)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createEmployee(data: { name: string; outlets: string[] }): Promise<CommissionEmployee> {
  const now = new Date().toISOString();
  return save({ id: uuid(), name: data.name.trim(), outlets: data.outlets, isActive: true, createdAt: now, updatedAt: now });
}

export async function updateEmployee(
  id: string,
  updates: { name?: string; outlets?: string[]; isActive?: boolean },
): Promise<CommissionEmployee | null> {
  const item = await dbGet(TABLE, { PK: `EMPLOYEE#${id}`, SK: 'PROFILE' });
  if (!item) return null;
  const next = { ...toEmployee(item), updatedAt: new Date().toISOString() };
  if (updates.name !== undefined) next.name = updates.name.trim();
  if (updates.outlets !== undefined) next.outlets = updates.outlets;
  if (updates.isActive !== undefined) next.isActive = updates.isActive;
  return save(next);
}
