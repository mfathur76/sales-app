import { dbScan, TABLES } from './dynamodb';
import { getAllOutlets } from './outletService';
import { getAllOutletSales } from './salesService';
import { getAllExpenses } from './expenseService';
import { OutletSale } from '../types';

/**
 * Expense categories counted as cost of goods sold (HPP). Every other category,
 * including ones created later, is an operating expense.
 */
const COGS_CATEGORIES = new Set(['belanja dapur', 'belanja pasar johar', 'kemasan', 'konsinyasi']);

/** GoPay QRIS: MDR plus a fixed device fee per outlet per day with QRIS sales. */
const QRIS_MDR = 0.007;
const QRIS_DAILY_FEE = 2000;
/** Days of verified transfers used to estimate fees for days not verified yet. */
const FEE_RATE_WINDOW_DAYS = 90;

const FEE_CHANNELS = ['qris', 'gojek', 'shopee', 'grab'] as const;
type FeeChannel = typeof FEE_CHANNELS[number];
type Fees = Record<FeeChannel, number>;

type RevenueRow = {
  month: string;
  outlet: string;
  cash: number;
  qris: number;
  gojek: number;
  shopee: number;
  grab: number;
  transfer: number; // direct customer transfers to BCA/Mandiri, entered by admin at verification
  total: number;
  days: number;
  fees: Fees;            // actual where the transfer is verified, estimated otherwise
  estimatedFees: number; // part of `fees` that is an estimate
  unverifiedSales: number; // gross sales whose transfer has not been entered yet
};

const estimateQrisFee = (qris: number) => (qris > 0 ? qris * QRIS_MDR + QRIS_DAILY_FEE : 0);

/**
 * Platform fees (sales − amount received in the bank) per channel for one day,
 * or null for a channel whose transfer has not been entered yet.
 * Since 2026 the QRIS payout arrives together with GoFood in gojekBank; on days
 * where qrisBank is filled in, both were entered separately.
 */
function actualFees(s: OutletSale): Record<FeeChannel, number | null> {
  const fees: Record<FeeChannel, number | null> = { qris: null, gojek: null, shopee: null, grab: null };
  if (s.qrisBank > 0) {
    fees.qris = s.qris - s.qrisBank;
    if (s.gojekBank > 0 || s.gojek === 0) fees.gojek = s.gojek - s.gojekBank;
  } else if (s.gojekBank > 0) {
    fees.qris = estimateQrisFee(s.qris);
    fees.gojek = s.qris + s.gojek - s.gojekBank - fees.qris;
  } else {
    if (s.qris === 0) fees.qris = 0;
    if (s.gojek === 0) fees.gojek = 0;
  }
  fees.shopee = s.shopeeBank > 0 || s.shopee === 0 ? s.shopee - s.shopeeBank : null;
  fees.grab = s.grabBank > 0 || s.grab === 0 ? s.grab - s.grabBank : null;
  return fees;
}

/** Fee as a share of gross sales per channel, over days whose transfer is verified. */
function feeRates(sales: OutletSale[]): Fees {
  const rates = {} as Fees;
  for (const ch of FEE_CHANNELS) {
    let fee = 0;
    let gross = 0;
    for (const s of sales) {
      const f = actualFees(s)[ch];
      if (f === null || s[ch] === 0) continue;
      fee += f;
      gross += s[ch];
    }
    rates[ch] = gross > 0 ? fee / gross : 0;
  }
  return rates;
}

const shiftDate = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
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
 * Revenue rows carry platform fees (see actualFees). Only registered outlets are
 * included (old test outlets are ignored) and rejected
 * expenses are skipped. The frontend pivots these rows into the statement.
 */
export async function getProfitLoss(startDate: string, endDate: string) {
  const [outlets, items, categories] = await Promise.all([
    getAllOutlets(),
    dbScan(TABLES.ITEM_MASTERS), // includes inactive items, so old expenses still resolve
    dbScan(TABLES.EXPENSE_CATEGORIES),
  ]);
  const outletCodes = new Set(outlets.map((o) => o.code));
  // Sales are read from the start of the fee-rate window so the rates can be computed too
  const salesFrom = [startDate, shiftDate(endDate, -FEE_RATE_WINDOW_DAYS)].sort()[0];
  const [allSales, expensesPerOutlet] = await Promise.all([
    getAllOutletSales({ start_date: salesFrom, end_date: endDate }),
    Promise.all(outlets.map((o) =>
      getAllExpenses(o.code, undefined, new Date(startDate), new Date(endDate)))),
  ]);
  const registered = allSales.filter((s) => outletCodes.has(s.outlet));
  const windowStart = shiftDate(endDate, -FEE_RATE_WINDOW_DAYS);
  const rates = feeRates(registered.filter((s) => s.date >= windowStart));
  const sales = registered.filter((s) => s.date >= startDate);

  const revenue = new Map<string, RevenueRow>();
  let lastSalesDate: string | null = null;
  for (const s of sales) {
    const month = s.date.slice(0, 7);
    const key = `${month}|${s.outlet}`;
    const row = revenue.get(key) ?? {
      month, outlet: s.outlet, cash: 0, qris: 0, gojek: 0, shopee: 0, grab: 0, transfer: 0, total: 0, days: 0,
      fees: { qris: 0, gojek: 0, shopee: 0, grab: 0 }, estimatedFees: 0, unverifiedSales: 0,
    };
    row.cash += s.cash;
    row.qris += s.qris;
    row.gojek += s.gojek;
    row.shopee += s.shopee;
    row.grab += s.grab;
    // Customer transfers are not part of the cashier's totalSales
    const transfer = (s.bcaBank || 0) + (s.mandiriBank || 0);
    row.transfer += transfer;
    row.total += s.totalSales + transfer;
    row.days += 1;
    const fees = actualFees(s);
    for (const ch of FEE_CHANNELS) {
      const actual = fees[ch];
      if (actual !== null) {
        row.fees[ch] += actual;
        continue;
      }
      const estimate = ch === 'qris' ? estimateQrisFee(s.qris) : s[ch] * rates[ch];
      row.fees[ch] += estimate;
      row.estimatedFees += estimate;
      row.unverifiedSales += s[ch];
    }
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
    feeRates: rates,
    outlets: outlets.map((o) => ({ code: o.code, name: o.name })),
    revenue: Array.from(revenue.values()),
    expenses: Array.from(expenses.values()),
  };
}
