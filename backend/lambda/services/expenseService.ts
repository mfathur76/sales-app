import { v4 as uuid } from 'uuid';
import { dbPut, dbUpdate, dbDelete, dbQuery, dbScan, TABLES } from './dynamodb';
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
    status: item.status ?? 'approved',
    approvedBy: item.approvedBy,
    approvedAt: item.approvedAt,
    rejectionReason: item.rejectionReason,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    createdBy: item.createdBy,
  };
}

function buildExpenseItem(data: {
  id: string;
  outlet: string;
  itemId: string;
  date: string;
  quantity: number;
  actualPrice: number;
  totalPrice: number;
  notes?: string;
  isCash: boolean;
  status: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}) {
  return {
    PK: `EXPENSE#${data.outlet}`,
    SK: `DATE#${data.date}#ID#${data.id}`,
    id: data.id,
    outlet: data.outlet,
    itemId: data.itemId,
    date: data.date,
    quantity: data.quantity,
    actualPrice: data.actualPrice,
    totalPrice: data.totalPrice,
    notes: data.notes,
    isCash: data.isCash,
    status: data.status,
    approvedBy: data.approvedBy,
    approvedAt: data.approvedAt,
    rejectionReason: data.rejectionReason,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy,
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
      params.KeyConditionExpression += ' AND SK BETWEEN :start AND :end';
      params.ExpressionAttributeValues[':start'] = `DATE#${start}`;
      params.ExpressionAttributeValues[':end']   = `DATE#${end}~`;
    } else if (startDate) {
      const start = startDate.toISOString().split('T')[0];
      params.KeyConditionExpression += ' AND SK >= :start';
      params.ExpressionAttributeValues[':start'] = `DATE#${start}`;
    } else if (endDate) {
      const end = endDate.toISOString().split('T')[0];
      params.KeyConditionExpression += ' AND SK <= :end';
      params.ExpressionAttributeValues[':end'] = `DATE#${end}~`;
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
  const items = await dbScan(EXP_TABLE, '#id = :id', { ':id': id }, { '#id': 'id' });
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

  const item = buildExpenseItem({
    id,
    outlet: data.outlet,
    itemId: data.itemId,
    date: dateStr,
    quantity: data.quantity,
    actualPrice: data.actualPrice,
    totalPrice: data.totalPrice,
    notes: data.notes,
    isCash: data.isCash ?? true,
    status: 'approved',
    approvedBy: data.createdBy,
    approvedAt: now,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  });

  await dbPut(EXP_TABLE, item);
  return toExpense(item);
}

export async function updateExpense(
  id: string,
  updates: {
    outlet?: string;
    itemId?: string;
    date?: Date;
    quantity?: number;
    actualPrice?: number;
    notes?: string;
    isCash?: boolean;
    updatedBy?: string;
  },
): Promise<Expense | null> {
  const existing = await getExpenseById(id);
  if (!existing) return null;

  const quantity = updates.quantity ?? existing.quantity;
  const actualPrice = updates.actualPrice ?? existing.actualPrice;
  const totalPrice = quantity * actualPrice;
  const nextDate = updates.date ? updates.date.toISOString().split('T')[0] : existing.date;
  const nextOutlet = updates.outlet ?? existing.outlet;
  const now = new Date().toISOString();

  const updatedItem = buildExpenseItem({
    id,
    outlet: nextOutlet,
    itemId: updates.itemId ?? existing.itemId,
    date: nextDate,
    quantity,
    actualPrice,
    totalPrice,
    notes: updates.notes !== undefined ? updates.notes : existing.notes,
    isCash: updates.isCash ?? existing.isCash,
    status: 'approved',
    approvedBy: existing.approvedBy ?? updates.updatedBy ?? existing.createdBy,
    approvedAt: existing.approvedAt ?? now,
    createdAt: existing.createdAt,
    updatedAt: now,
    createdBy: existing.createdBy,
  });

  const oldKey = {
    PK: `EXPENSE#${existing.outlet}`,
    SK: `DATE#${existing.date}#ID#${id}`,
  };
  const newKey = {
    PK: `EXPENSE#${nextOutlet}`,
    SK: `DATE#${nextDate}#ID#${id}`,
  };

  if (oldKey.PK !== newKey.PK || oldKey.SK !== newKey.SK) {
    await dbPut(EXP_TABLE, updatedItem);
    await dbDelete(EXP_TABLE, oldKey);
    return toExpense(updatedItem);
  }

  const payload: Record<string, unknown> = {
    itemId: updatedItem.itemId,
    quantity: updatedItem.quantity,
    actualPrice: updatedItem.actualPrice,
    totalPrice: updatedItem.totalPrice,
    notes: updatedItem.notes,
    isCash: updatedItem.isCash,
    status: updatedItem.status,
    approvedBy: updatedItem.approvedBy,
    approvedAt: updatedItem.approvedAt,
    rejectionReason: undefined,
    updatedAt: updatedItem.updatedAt,
  };

  const updated = await dbUpdate(
    EXP_TABLE,
    oldKey,
    payload,
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

type ExpenseReportItem = {
  description: string;
  date: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type ExpenseReportCategory = {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  itemCount: number;
  items: ExpenseReportItem[];
};

type ExpenseReportTableRow = {
  itemName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: string;
  outlet: string;
};

function formatDateOnly(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function buildGroupedExpenseReport(expenses: Expense[]) {
  const [items, categories] = await Promise.all([getAllItems(), getAllCategories()]);

  const itemMap = new Map(items.map((i) => [i.id, i]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const grouped = new Map<string, ExpenseReportCategory>();
  const tableData: ExpenseReportTableRow[] = [];
  const categoryTotalsMap = new Map<string, number>();
  const outletTotalsMap = new Map<string, number>();

  for (const exp of expenses) {
    const item = itemMap.get(exp.itemId);
    const categoryId = item?.categoryId || 'uncategorized';
    const categoryName = categoryMap.get(categoryId)?.name || 'Uncategorized';
    const quantity = Number(exp.quantity || 0);
    const unitPrice = Number(exp.actualPrice || 0);
    const totalPrice = Number(exp.totalPrice || 0);

    if (!grouped.has(categoryId)) {
      grouped.set(categoryId, {
        categoryId,
        categoryName,
        totalAmount: 0,
        itemCount: 0,
        items: [],
      });
    }

    const bucket = grouped.get(categoryId)!;
    bucket.totalAmount += totalPrice;
    bucket.itemCount += 1;
    bucket.items.push({
      description: item?.name || exp.notes || 'Expense Item',
      date: exp.date,
      quantity,
      unitPrice,
      totalPrice,
    });

    tableData.push({
      itemName: item?.name || exp.notes || 'Expense Item',
      category: categoryName,
      quantity,
      unitPrice,
      totalPrice,
      date: exp.date,
      outlet: exp.outlet,
    });

    categoryTotalsMap.set(categoryName, (categoryTotalsMap.get(categoryName) || 0) + totalPrice);
    outletTotalsMap.set(exp.outlet, (outletTotalsMap.get(exp.outlet) || 0) + totalPrice);
  }

  const expensesByCategory = Array.from(grouped.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  const totalExpense = expensesByCategory.reduce((sum, c) => sum + c.totalAmount, 0);

  tableData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    totalExpense,
    expensesByCategory,
    tableData,
    categoryTotals: Array.from(categoryTotalsMap.entries()).map(([categoryName, totalAmount]) => ({
      categoryName,
      totalAmount,
    })),
    outletTotals: Array.from(outletTotalsMap.entries()).map(([outlet, totalAmount]) => ({
      outlet,
      totalAmount,
    })),
  };
}

export async function getWeeklyExpenseReport(
  outlets: string[],
  weekStart: Date,
  status?: string,
) {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, 6);

  let expenses: Expense[] = [];

  if (outlets.length > 0) {
    const results = await Promise.all(
      outlets.map((outlet) => getAllExpenses(outlet, undefined, start, end, status)),
    );
    expenses = results.flat();
  } else {
    expenses = await getAllExpenses(undefined, undefined, start, end, status);
  }

  const grouped = await buildGroupedExpenseReport(expenses);
  return {
    weekStart: formatDateOnly(start),
    weekEnd: formatDateOnly(end),
    ...grouped,
  };
}

export async function getMonthlyExpenseReport(
  outlets: string[],
  month: number,
  year: number,
  status?: string,
) {
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month, 0);
  end.setHours(0, 0, 0, 0);

  let expenses: Expense[] = [];

  if (outlets.length > 0) {
    const results = await Promise.all(
      outlets.map((outlet) => getAllExpenses(outlet, undefined, start, end, status)),
    );
    expenses = results.flat();
  } else {
    expenses = await getAllExpenses(undefined, undefined, start, end, status);
  }

  const grouped = await buildGroupedExpenseReport(expenses);
  return {
    month,
    year,
    ...grouped,
  };
}

export async function getExpenseSummaryReport(
  outlet: string | undefined,
  startDate: Date,
  endDate: Date,
) {
  const expenses = await getAllExpenses(outlet, undefined, startDate, endDate);

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.totalPrice || 0), 0);
  const cashExpense = expenses
    .filter((e) => e.isCash)
    .reduce((sum, e) => sum + Number(e.totalPrice || 0), 0);
  const nonCashExpense = expenses
    .filter((e) => !e.isCash)
    .reduce((sum, e) => sum + Number(e.totalPrice || 0), 0);

  return {
    outlet,
    startDate: formatDateOnly(startDate),
    endDate: formatDateOnly(endDate),
    totalExpense,
    cashExpense,
    nonCashExpense,
    totalRecords: expenses.length,
  };
}
