import { v4 as uuid } from 'uuid';
import { dbGet, dbPut, dbUpdate, dbDelete, dbQuery, dbScan, TABLES } from './dynamodb';
import { Expense, ExpenseCategory, ItemMaster } from '../types';

// ---- Expense Categories ----

const CAT_TABLE  = TABLES.EXPENSE_CATEGORIES;
const ITEM_TABLE = TABLES.ITEM_MASTERS;
const EXP_TABLE  = TABLES.EXPENSES;

export async function getAllCategories(): Promise<ExpenseCategory[]> {
  const items = await dbScan(CAT_TABLE);
  return items.filter((i) => i.isActive !== false) as ExpenseCategory[];
}

export async function createCategory(data: { name: string; description?: string }) {
  const now = new Date().toISOString();
  const item = {
    PK: `CATEGORY#${data.name.toUpperCase()}`,
    SK: 'PROFILE',
    id: uuid(),
    name: data.name,
    description: data.description,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await dbPut(CAT_TABLE, item);
  return item;
}

// ---- Item Masters ----

export async function getAllItems(categoryId?: string): Promise<ItemMaster[]> {
  const items = await dbScan(ITEM_TABLE);
  let filtered = items.filter((i) => i.isActive !== false) as ItemMaster[];
  if (categoryId) filtered = filtered.filter((i) => i.categoryId === categoryId);
  return filtered;
}

export async function getItemById(id: string): Promise<ItemMaster | null> {
  const items = await dbScan(ITEM_TABLE, 'id = :id', { ':id': id });
  return (items[0] as ItemMaster) ?? null;
}

export async function createItem(data: {
  name: string;
  categoryId: string;
  standardPrice?: number;
  unit?: string;
}) {
  const now = new Date().toISOString();
  const item = {
    PK: `ITEM#${uuid()}`,
    SK: 'PROFILE',
    id: uuid(),
    name: data.name,
    categoryId: data.categoryId,
    standardPrice: data.standardPrice,
    unit: data.unit || 'kg',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  await dbPut(ITEM_TABLE, item);
  return item;
}

// ---- Expenses ----

function toExpense(item: Record<string, any>): Expense {
  return {
    id: item.id,
    outlet: item.outlet,
    itemId: item.itemId,
    date: item.date,
    quantity: item.quantity,
    actualPrice: item.actualPrice,
    totalPrice: item.totalPrice,
    notes: item.notes,
    isCash: item.isCash ?? true,
    status: item.status ?? 'pending',
    approvedBy: item.approvedBy,
    approvedAt: item.approvedAt,
    rejectionReason: item.rejectionReason,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    createdBy: item.createdBy,
  };
}

export async function getAllExpenses(
  outlet?: string,
  categoryId?: string,
  startDate?: Date,
  endDate?: Date,
  status?: string,
): Promise<Expense[]> {
  if (outlet) {
    const params: any = {
      TableName: EXP_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `EXPENSE#${outlet}` },
      ScanIndexForward: false,
    };

    if (startDate && endDate) {
      const start = startDate.toISOString().split('T')[0];
      const end   = endDate.toISOString().split('T')[0];
      params.KeyConditionExpression += ' AND begins_with(SK, :datePrefix) AND SK BETWEEN :start AND :end';
      params.ExpressionAttributeValues[':start'] = `DATE#${start}`;
      params.ExpressionAttributeValues[':end']   = `DATE#${end}~`;
    }

    const items = await dbQuery(params);
    let expenses = items.map(toExpense);
    if (status) expenses = expenses.filter((e) => e.status === status);
    return expenses;
  }

  // Scan all (admin use)
  const items = await dbScan(EXP_TABLE);
  let expenses = items.map(toExpense);
  if (status) expenses = expenses.filter((e) => e.status === status);
  if (startDate) expenses = expenses.filter((e) => new Date(e.date) >= startDate);
  if (endDate)   expenses = expenses.filter((e) => new Date(e.date) <= endDate);
  return expenses;
}

export async function getExpenseById(id: string): Promise<Expense | null> {
  const items = await dbScan(EXP_TABLE, '#id = :id', { ':id': id });
  return items.length > 0 ? toExpense(items[0]) : null;
}

export async function createExpense(data: {
  outlet: string;
  itemId: string;
  date: Date;
  quantity: number;
  actualPrice: number;
  totalPrice: number;
  notes?: string;
  isCash?: boolean;
  createdBy?: string;
}): Promise<Expense> {
  const id  = uuid();
  const now = new Date().toISOString();
  const dateStr = data.date.toISOString().split('T')[0];

  const item = {
    PK: `EXPENSE#${data.outlet}`,
    SK: `DATE#${dateStr}#ID#${id}`,
    id,
    outlet: data.outlet,
    itemId: data.itemId,
    date: dateStr,
    quantity: data.quantity,
    actualPrice: data.actualPrice,
    totalPrice: data.totalPrice,
    notes: data.notes,
    isCash: data.isCash ?? true,
    status: 'pending',
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  await dbPut(EXP_TABLE, item);
  return toExpense(item);
}

export async function updateExpense(
  id: string,
  updates: { itemId?: string; date?: Date; quantity?: number; actualPrice?: number; notes?: string },
): Promise<Expense | null> {
  const existing = await getExpenseById(id);
  if (!existing) return null;

  const quantity    = updates.quantity    ?? existing.quantity;
  const actualPrice = updates.actualPrice ?? existing.actualPrice;
  const totalPrice  = quantity * actualPrice;

  const payload: Record<string, unknown> = {
    totalPrice,
    updatedAt: new Date().toISOString(),
  };
  if (updates.itemId    !== undefined) payload.itemId    = updates.itemId;
  if (updates.quantity  !== undefined) payload.quantity  = updates.quantity;
  if (updates.actualPrice !== undefined) payload.actualPrice = updates.actualPrice;
  if (updates.notes     !== undefined) payload.notes     = updates.notes;
  if (updates.date      !== undefined) payload.date      = updates.date.toISOString().split('T')[0];

  const dateStr = existing.date;
  const updated = await dbUpdate(
    EXP_TABLE,
    { PK: `EXPENSE#${existing.outlet}`, SK: `DATE#${dateStr}#ID#${id}` },
    payload,
  );

  return updated ? toExpense(updated as any) : null;
}

export async function approveExpense(id: string, adminUsername: string): Promise<Expense | null> {
  const existing = await getExpenseById(id);
  if (!existing) return null;

  const updated = await dbUpdate(
    EXP_TABLE,
    { PK: `EXPENSE#${existing.outlet}`, SK: `DATE#${existing.date}#ID#${id}` },
    {
      status: 'approved',
      approvedBy: adminUsername,
      approvedAt: new Date().toISOString(),
      updatedAt:  new Date().toISOString(),
    },
  );

  return updated ? toExpense(updated as any) : null;
}

export async function rejectExpense(
  id: string,
  adminUsername: string,
  reason?: string,
): Promise<Expense | null> {
  const existing = await getExpenseById(id);
  if (!existing) return null;

  const updated = await dbUpdate(
    EXP_TABLE,
    { PK: `EXPENSE#${existing.outlet}`, SK: `DATE#${existing.date}#ID#${id}` },
    {
      status: 'rejected',
      approvedBy: adminUsername,
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
    },
  );

  return updated ? toExpense(updated as any) : null;
}

export async function deleteExpense(id: string): Promise<void> {
  const existing = await getExpenseById(id);
  if (!existing) return;
  await dbDelete(EXP_TABLE, {
    PK: `EXPENSE#${existing.outlet}`,
    SK: `DATE#${existing.date}#ID#${id}`,
  });
}
