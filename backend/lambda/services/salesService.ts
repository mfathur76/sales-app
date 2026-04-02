import { dbGet, dbPut, dbUpdate, dbDelete, dbQuery, dbScan, TABLES } from './dynamodb';
import { OutletSale, CreateOutletSaleRequest, OutletSaleFilters } from '../types';

const TABLE = TABLES.SALES;

/**
 * DynamoDB key layout for sales:
 *   PK  = SALE#{outlet_code}        (e.g. SALE#RM001)
 *   SK  = DATE#{YYYY-MM-DD}         (e.g. DATE#2024-01-15)
 *
 * Global Secondary Index "AllSalesDateIndex":
 *   PK  = ALL_SALES  (static partition)
 *   SK  = DATE#{YYYY-MM-DD}#OUTLET#{code}
 * – used for cross-outlet date range queries by admin.
 */

function toSale(item: Record<string, any>): OutletSale {
  return {
    outlet: item.outlet,
    date: item.date,
    cash: item.cash ?? 0,
    qris: item.qris ?? 0,
    gojek: item.gojek ?? 0,
    shopee: item.shopee ?? 0,
    grab: item.grab ?? 0,
    totalSales: item.totalSales ?? 0,
    qrisBank: item.qrisBank ?? 0,
    gojekBank: item.gojekBank ?? 0,
    shopeeBank: item.shopeeBank ?? 0,
    grabBank: item.grabBank ?? 0,
    bcaBank: item.bcaBank ?? 0,
    mandiriBank: item.mandiriBank ?? 0,
    totalBank: item.totalBank ?? 0,
    qrisPercent: item.qrisPercent ?? 0,
    gojekPercent: item.gojekPercent ?? 0,
    shopeePercent: item.shopeePercent ?? 0,
    grabPercent: item.grabPercent ?? 0,
    bcaPercent: item.bcaPercent ?? 0,
    mandiriPercent: item.mandiriPercent ?? 0,
    overallPercent: item.overallPercent ?? 0,
    status: item.status ?? 'pending',
    verifiedBy: item.verifiedBy,
    verifiedAt: item.verifiedAt,
    notes: item.notes,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/** Calculate totalSales from payment method fields */
function calcTotal(data: Partial<CreateOutletSaleRequest>, existing?: OutletSale) {
  const cash   = data.cash   ?? existing?.cash   ?? 0;
  const qris   = data.qris   ?? existing?.qris   ?? 0;
  const gojek  = data.gojek  ?? existing?.gojek  ?? 0;
  const shopee = data.shopee ?? existing?.shopee ?? 0;
  const grab   = data.grab   ?? existing?.grab   ?? 0;
  return { cash, qris, gojek, shopee, grab, totalSales: cash + qris + gojek + shopee + grab };
}

export async function createOutletSale(data: CreateOutletSaleRequest): Promise<OutletSale> {
  const existing = await getOutletSaleByOutletAndDate(data.outlet, data.date);
  if (existing) throw new Error(`Sale for outlet ${data.outlet} on ${data.date} already exists`);

  const totals = calcTotal(data);
  const now = new Date().toISOString();

  const item = {
    PK: `SALE#${data.outlet}`,
    SK: `DATE#${data.date}`,
    // GSI key
    GSI_PK: 'ALL_SALES',
    GSI_SK: `DATE#${data.date}#OUTLET#${data.outlet}`,
    outlet: data.outlet,
    date: data.date,
    ...totals,
    qrisBank: 0, gojekBank: 0, shopeeBank: 0, grabBank: 0, bcaBank: 0, mandiriBank: 0, totalBank: 0,
    qrisPercent: 0, gojekPercent: 0, shopeePercent: 0, grabPercent: 0, bcaPercent: 0, mandiriPercent: 0, overallPercent: 0,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  await dbPut(TABLE, item);
  return toSale(item);
}

export async function getOutletSaleByOutletAndDate(
  outlet: string,
  date: string,
): Promise<OutletSale | null> {
  const item = await dbGet(TABLE, { PK: `SALE#${outlet}`, SK: `DATE#${date}` });
  return item ? toSale(item) : null;
}

export async function getAllOutletSales(filters?: OutletSaleFilters): Promise<OutletSale[]> {
  if (filters?.outlet) {
    // Single outlet - query by PK
    const params: any = {
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `SALE#${filters.outlet}` },
      ScanIndexForward: false,
    };

    if (filters.start_date && filters.end_date) {
      params.KeyConditionExpression += ' AND SK BETWEEN :start AND :end';
      params.ExpressionAttributeValues[':start'] = `DATE#${filters.start_date}`;
      params.ExpressionAttributeValues[':end'] = `DATE#${filters.end_date}`;
    } else if (filters.start_date) {
      params.KeyConditionExpression += ' AND SK >= :start';
      params.ExpressionAttributeValues[':start'] = `DATE#${filters.start_date}`;
    } else if (filters.end_date) {
      params.KeyConditionExpression += ' AND SK <= :end';
      params.ExpressionAttributeValues[':end'] = `DATE#${filters.end_date}`;
    }

    const items = await dbQuery(params);
    return items.map(toSale);
  }

  // All outlets - use GSI
  const params: any = {
    TableName: TABLE,
    IndexName: 'AllSalesDateIndex',
    KeyConditionExpression: 'GSI_PK = :gsi_pk',
    ExpressionAttributeValues: { ':gsi_pk': 'ALL_SALES' },
    ScanIndexForward: false,
  };

  if (filters?.start_date && filters?.end_date) {
    params.KeyConditionExpression += ' AND GSI_SK BETWEEN :start AND :end';
    params.ExpressionAttributeValues[':start'] = `DATE#${filters.start_date}`;
    params.ExpressionAttributeValues[':end'] = `DATE#${filters.end_date}`;
  }

  const items = await dbQuery(params);
  return items.map(toSale);
}

export async function updateOutletSale(
  outlet: string,
  date: string,
  updates: Partial<CreateOutletSaleRequest>,
): Promise<OutletSale | null> {
  const existing = await getOutletSaleByOutletAndDate(outlet, date);
  if (!existing) return null;

  const totals = calcTotal(updates, existing);
  const payload: Record<string, unknown> = {
    ...totals,
    updatedAt: new Date().toISOString(),
  };

  const updated = await dbUpdate(
    TABLE,
    { PK: `SALE#${outlet}`, SK: `DATE#${date}` },
    payload,
  );

  return updated ? toSale(updated as any) : null;
}

export async function updateBankTransfer(
  outlet: string,
  date: string,
  bankData: {
    qrisBank?: number;
    gojekBank?: number;
    shopeeBank?: number;
    grabBank?: number;
    bcaBank?: number;
    mandiriBank?: number;
    notes?: string;
    verifiedBy?: string;
  },
): Promise<OutletSale | null> {
  const existing = await getOutletSaleByOutletAndDate(outlet, date);
  if (!existing) return null;

  // Merge bank values
  const qrisBank   = bankData.qrisBank   ?? existing.qrisBank;
  const gojekBank  = bankData.gojekBank  ?? existing.gojekBank;
  const shopeeBank = bankData.shopeeBank ?? existing.shopeeBank;
  const grabBank   = bankData.grabBank   ?? existing.grabBank;
  const bcaBank    = bankData.bcaBank    ?? existing.bcaBank;
  const mandiriBank = bankData.mandiriBank ?? existing.mandiriBank;
  const totalBank  = qrisBank + gojekBank + shopeeBank + grabBank + bcaBank + mandiriBank;

  // Recalculate percentages (avoid div/0)
  const pct = (bank: number, sales: number) => (sales > 0 ? (bank / sales) * 100 : 0);
  const qrisPercent    = pct(qrisBank,    existing.qris);
  const gojekPercent   = pct(gojekBank,   existing.gojek);
  const shopeePercent  = pct(shopeeBank,  existing.shopee);
  const grabPercent    = pct(grabBank,    existing.grab);
  const bcaPercent     = pct(bcaBank,     existing.totalSales);
  const mandiriPercent = pct(mandiriBank, existing.totalSales);
  const digitalSales   = existing.qris + existing.gojek + existing.shopee + existing.grab;
  const overallPercent = pct(totalBank, digitalSales);

  const payload: Record<string, unknown> = {
    qrisBank, gojekBank, shopeeBank, grabBank, bcaBank, mandiriBank, totalBank,
    qrisPercent, gojekPercent, shopeePercent, grabPercent, bcaPercent, mandiriPercent, overallPercent,
    updatedAt: new Date().toISOString(),
  };
  if (bankData.notes !== undefined)      payload.notes      = bankData.notes;
  if (bankData.verifiedBy !== undefined) payload.verifiedBy = bankData.verifiedBy;
  if (bankData.verifiedBy !== undefined) payload.verifiedAt = new Date().toISOString();

  const updated = await dbUpdate(TABLE, { PK: `SALE#${outlet}`, SK: `DATE#${date}` }, payload);
  return updated ? toSale(updated as any) : null;
}

export async function deleteOutletSale(outlet: string, date: string): Promise<void> {
  await dbDelete(TABLE, { PK: `SALE#${outlet}`, SK: `DATE#${date}` });
}

export async function getOutletSalesStats(filters?: OutletSaleFilters) {
  const sales = await getAllOutletSales(filters);

  const total_revenue       = sales.reduce((s, r) => s + r.totalSales, 0);
  const total_cash          = sales.reduce((s, r) => s + r.cash, 0);
  const total_qris          = sales.reduce((s, r) => s + r.qris, 0);
  const total_gojek         = sales.reduce((s, r) => s + r.gojek, 0);
  const total_shopee        = sales.reduce((s, r) => s + r.shopee, 0);
  const total_grab          = sales.reduce((s, r) => s + r.grab, 0);
  const average_daily_sales = sales.length > 0 ? total_revenue / sales.length : 0;

  // Group by outlet
  const outletMap = new Map<string, { total_sales: number; total_revenue: number }>();
  for (const sale of sales) {
    const entry = outletMap.get(sale.outlet) ?? { total_sales: 0, total_revenue: 0 };
    entry.total_sales += 1;
    entry.total_revenue += sale.totalSales;
    outletMap.set(sale.outlet, entry);
  }

  return {
    total_sales: sales.length,
    total_revenue,
    average_daily_sales,
    total_cash,
    total_qris,
    total_gojek,
    total_shopee,
    total_grab,
    outlet_breakdown: Array.from(outletMap.entries()).map(([outlet, data]) => ({
      outlet,
      ...data,
    })),
  };
}

export async function getOutletOptions(): Promise<string[]> {
  const items = await dbScan(TABLE);
  const codes = new Set<string>();
  for (const item of items) {
    if (item.outlet) codes.add(item.outlet as string);
  }
  return Array.from(codes).sort();
}
