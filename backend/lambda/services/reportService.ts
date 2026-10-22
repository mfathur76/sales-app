import { dbScan, TABLES } from './dynamodb';
import { getAllOutlets } from './outletService';
import { getAllOutletSales } from './salesService';
import { getAllExpenses } from './expenseService';

/**
 * Expense categories counted as cost of goods sold (HPP). Every other category,
 * including ones created later, is an operating expense.
 */
const COGS_CATEGORIES = new Set(['belanja dapur', 'belanja pasar johar', 'kemasan', 'konsinyasi']);

type RevenueRow = {
  month: string;
  outlet: string;
  cash: number;
  qris: number;
  gojek: number;
  shopee: number;
  grab: number;
  total: number;
  days: number;
};

type ExpenseRow = {
  month: string;
  outlet: string;
  categoryId: string;
  categoryName: string;
  group: 'cogs' | 'opex';
  total: number;
  count: number;
};

/**
 * Raw figures for a profit & loss statement, bucketed by month, outlet and category.
 * Only registered outlets are included (old test outlets are ignored) and rejected
 * expenses are skipped. The frontend pivots these rows into the statement.
 */
export async function getProfitLoss(startDate: string, endDate: string) {
  const [outlets, items, categories] = await Promise.all([
    getAllOutlets(),
    dbScan(TABLES.ITEM_MASTERS), // includes inactive items, so old expenses still resolve
    dbScan(TABLES.EXPENSE_CATEGORIES),
  ]);
  const outletCodes = new Set(outlets.map((o) => o.code));
  const [sales, expensesPerOutlet] = await Promise.all([
    getAllOutletSales({ start_date: startDate, end_date: endDate }),
    Promise.all(outlets.map((o) =>
      getAllExpenses(o.code, undefined, new Date(startDate), new Date(endDate)))),
  ]);

  const revenue = new Map<string, RevenueRow>();
  let lastSalesDate: string | null = null;
  for (const s of sales) {
    if (!outletCodes.has(s.outlet)) continue;
    const month = s.date.slice(0, 7);
    const key = `${month}|${s.outlet}`;
    const row = revenue.get(key) ?? {
      month, outlet: s.outlet, cash: 0, qris: 0, gojek: 0, shopee: 0, grab: 0, total: 0, days: 0,
    };
    row.cash += s.cash;
    row.qris += s.qris;
    row.gojek += s.gojek;
    row.shopee += s.shopee;
    row.grab += s.grab;
    row.total += s.totalSales;
    row.days += 1;
    revenue.set(key, row);
    if (!lastSalesDate || s.date > lastSalesDate) lastSalesDate = s.date;
  }

  const categoryOfItem = new Map(items.map((i) => [i.id as string, i.categoryId as string]));
  const categoryName = new Map(categories.map((c) => [c.id as string, c.name as string]));
  const expenses = new Map<string, ExpenseRow>();
  let lastExpenseDate: string | null = null;
  for (const e of expensesPerOutlet.flat()) {
    if (e.status === 'rejected') continue;
    const month = e.date.slice(0, 7);
    const categoryId = categoryOfItem.get(e.itemId) ?? 'uncategorized';
    const name = categoryName.get(categoryId) ?? 'Tanpa Kategori';
    const key = `${month}|${e.outlet}|${categoryId}`;
    const row = expenses.get(key) ?? {
      month,
      outlet: e.outlet,
      categoryId,
      categoryName: name,
      group: COGS_CATEGORIES.has(name.toLowerCase()) ? 'cogs' : 'opex',
      total: 0,
      count: 0,
    };
    row.total += Number(e.totalPrice || 0);
    row.count += 1;
    expenses.set(key, row);
    if (!lastExpenseDate || e.date > lastExpenseDate) lastExpenseDate = e.date;
  }

  return {
    startDate,
    endDate,
    lastSalesDate,
    lastExpenseDate,
    outlets: outlets.map((o) => ({ code: o.code, name: o.name })),
    revenue: Array.from(revenue.values()),
    expenses: Array.from(expenses.values()),
  };
}
