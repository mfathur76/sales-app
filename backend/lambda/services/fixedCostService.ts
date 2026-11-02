import { dbGet, dbPut, TABLES } from './dynamodb';
import { FixedCost } from '../types';

const TABLE = TABLES.FIXED_COSTS;
const KEY = { PK: 'FIXED_COSTS', SK: 'LIST' };

/**
 * Costs paid yearly or outside the app (rent, THR, ...) that the profit & loss spreads over the
 * months they cover. The whole list is one item: it is short and always edited together.
 */
export async function listFixedCosts(): Promise<FixedCost[]> {
  const item = await dbGet(TABLE, KEY);
  return (item?.items as FixedCost[]) ?? [];
}

export async function saveFixedCosts(items: FixedCost[], updatedBy?: string): Promise<FixedCost[]> {
  await dbPut(TABLE, { ...KEY, items, updatedBy, updatedAt: new Date().toISOString() });
  return items;
}

/** What one cost adds to `month` (YYYY-MM): a twelfth of a yearly amount, or the monthly amount. */
export function fixedCostFor(cost: FixedCost, month: string): number {
  if (month < cost.startMonth || (cost.endMonth && month > cost.endMonth)) return 0;
  return cost.period === 'tahun' ? cost.amount / 12 : cost.amount;
}
