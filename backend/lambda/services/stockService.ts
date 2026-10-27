import { v4 as uuid } from 'uuid';
import { dbGet, dbPut, dbDelete, dbQuery, dbScan, TABLES } from './dynamodb';
import { getAllOutletSales } from './salesService';
import { listProducts } from './productService';
import { ClosingLine, Product, Shipment, ShipmentLine, StockClosing } from '../types';

const TABLE = TABLES.STOCK;

/**
 * DynamoDB key layout for stock (one table):
 *   Shipment: PK = SHIPMENT#{outlet}  SK = ID#{id}
 *   Closing:  PK = CLOSING#{outlet}   SK = DATE#{YYYY-MM-DD}   (one end-of-day count per outlet per day)
 *
 * Sold for a closing day D = previous count + shipments received after it, up to D − count on D − waste on D.
 * Unconfirmed shipments count with the quantity sent, so a forgotten "Terima" does not break the numbers.
 */

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---- Shipments ----

function toShipment(item: Record<string, any>): Shipment {
  return {
    id: item.id,
    outlet: item.outlet,
    date: item.date,
    lines: item.lines ?? [],
    status: item.status === 'diterima' ? 'diterima' : 'dikirim',
    notes: item.notes,
    createdBy: item.createdBy,
    receivedBy: item.receivedBy,
    receivedAt: item.receivedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function saveShipment(s: Shipment): Promise<Shipment> {
  await dbPut(TABLE, { PK: `SHIPMENT#${s.outlet}`, SK: `ID#${s.id}`, ...s });
  return s;
}

export async function listShipments(filters: { outlet?: string; from?: string; to?: string; status?: string } = {}) {
  const items = filters.outlet
    ? await dbQuery({
      TableName: TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `SHIPMENT#${filters.outlet}` },
    })
    : await dbScan(TABLE, 'begins_with(PK, :p)', { ':p': 'SHIPMENT#' });

  return items
    .map(toShipment)
    .filter((s) => (!filters.from || s.date >= filters.from) && (!filters.to || s.date <= filters.to))
    .filter((s) => !filters.status || s.status === filters.status)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export async function getShipment(outlet: string, id: string): Promise<Shipment | null> {
  const item = await dbGet(TABLE, { PK: `SHIPMENT#${outlet}`, SK: `ID#${id}` });
  return item ? toShipment(item) : null;
}

export async function createShipment(data: {
  outlet: string;
  date: string;
  lines: ShipmentLine[];
  notes?: string;
  createdBy?: string;
}): Promise<Shipment> {
  const now = new Date().toISOString();
  return saveShipment({
    id: uuid(),
    outlet: data.outlet,
    date: data.date,
    lines: data.lines.map(({ productId, name, qty }) => ({ productId, name, qty })),
    status: 'dikirim',
    notes: data.notes?.trim() || undefined,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateShipment(
  existing: Shipment,
  updates: { date?: string; lines?: ShipmentLine[]; notes?: string },
): Promise<Shipment> {
  const next: Shipment = { ...existing, updatedAt: new Date().toISOString() };
  if (updates.date !== undefined) next.date = updates.date;
  if (updates.notes !== undefined) next.notes = updates.notes.trim() || undefined;
  if (updates.lines !== undefined) {
    // Keep the outlet's confirmed quantities for lines that are still there
    const received = new Map(existing.lines.map((l) => [l.productId, l.receivedQty]));
    next.lines = updates.lines.map(({ productId, name, qty }) => ({
      productId, name, qty, receivedQty: received.get(productId),
    }));
  }
  return saveShipment(next);
}

/** The outlet confirms what actually arrived; products not listed are taken as received in full. */
export async function receiveShipment(
  existing: Shipment,
  received: { productId: string; receivedQty: number }[],
  receivedBy?: string,
): Promise<Shipment> {
  const byProduct = new Map(received.map((r) => [r.productId, r.receivedQty]));
  const now = new Date().toISOString();
  return saveShipment({
    ...existing,
    lines: existing.lines.map((l) => ({ ...l, receivedQty: byProduct.get(l.productId) ?? l.qty })),
    status: 'diterima',
    receivedBy,
    receivedAt: now,
    updatedAt: now,
  });
}

export async function deleteShipment(outlet: string, id: string): Promise<void> {
  await dbDelete(TABLE, { PK: `SHIPMENT#${outlet}`, SK: `ID#${id}` });
}

// ---- Closings (end-of-day counts) ----

function toClosing(item: Record<string, any>): StockClosing {
  return {
    outlet: item.outlet,
    date: item.date,
    lines: item.lines ?? [],
    submittedBy: item.submittedBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/** All counts for an outlet up to and including `upTo`, oldest first. */
async function listClosings(outlet: string, upTo: string): Promise<StockClosing[]> {
  const items = await dbQuery({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk AND SK <= :to',
    ExpressionAttributeValues: { ':pk': `CLOSING#${outlet}`, ':to': `DATE#${upTo}` },
  });
  return items.map(toClosing).sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveClosing(data: {
  outlet: string;
  date: string;
  lines: { productId: string; remaining: number; waste: number }[];
  submittedBy?: string;
}): Promise<StockClosing> {
  const [existing, products] = await Promise.all([
    dbGet(TABLE, { PK: `CLOSING#${data.outlet}`, SK: `DATE#${data.date}` }),
    listProducts(true),
  ]);
  const productById = new Map(products.map((p) => [p.id, p]));
  const oldLines = new Map<string, ClosingLine>((existing?.lines ?? []).map((l: ClosingLine) => [l.productId, l]));

  const lines: ClosingLine[] = data.lines
    .filter((l) => productById.has(l.productId))
    .map((l) => {
      const p = productById.get(l.productId)!;
      // Re-saving a day keeps the price it was first counted at
      return { productId: p.id, name: p.name, price: oldLines.get(p.id)?.price ?? p.price, remaining: l.remaining, waste: l.waste };
    });

  const now = new Date().toISOString();
  const closing: StockClosing = {
    outlet: data.outlet,
    date: data.date,
    lines,
    submittedBy: data.submittedBy,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await dbPut(TABLE, { PK: `CLOSING#${data.outlet}`, SK: `DATE#${data.date}`, ...closing });
  return closing;
}

export async function hasClosing(outlet: string, date: string): Promise<boolean> {
  return Boolean(await dbGet(TABLE, { PK: `CLOSING#${outlet}`, SK: `DATE#${date}` }));
}

export async function deleteClosing(outlet: string, date: string): Promise<void> {
  await dbDelete(TABLE, { PK: `CLOSING#${outlet}`, SK: `DATE#${date}` });
}

// ---- Calculations ----

interface ProductFlow {
  productId: string;
  name: string;
  price: number;
  opening: number;
  received: number;
  pending: number;   // part of `received` the outlet has not confirmed yet
  remaining?: number;
  waste?: number;
}

/** Opening stock and shipments for the period (prevDate, date]. */
function flows(
  date: string,
  prev: StockClosing | undefined,
  shipments: Shipment[],
  products: Product[],
): Map<string, ProductFlow> {
  const productById = new Map(products.map((p) => [p.id, p]));
  const map = new Map<string, ProductFlow>();
  const get = (productId: string, name: string) => {
    let f = map.get(productId);
    if (!f) {
      const p = productById.get(productId);
      f = { productId, name: p?.name ?? name, price: p?.price ?? 0, opening: 0, received: 0, pending: 0 };
      map.set(productId, f);
    }
    return f;
  };

  prev?.lines.forEach((l) => { get(l.productId, l.name).opening = l.remaining; });
  shipments
    .filter((s) => s.date <= date && (!prev || s.date > prev.date))
    .forEach((s) => s.lines.forEach((l) => {
      const f = get(l.productId, l.name);
      f.received += l.receivedQty ?? l.qty;
      if (s.status !== 'diterima') f.pending += l.qty;
    }));
  return map;
}

/** Everything the end-of-day form needs: one line per active product with stock so far. */
export async function getClosingDraft(outlet: string, date: string) {
  const [closings, shipments, products] = await Promise.all([
    listClosings(outlet, date),
    listShipments({ outlet, to: date }),
    listProducts(true),
  ]);
  const existing = closings.find((c) => c.date === date);
  const prev = closings.filter((c) => c.date < date).pop();
  const map = flows(date, prev, shipments, products);

  existing?.lines.forEach((l) => {
    const f = map.get(l.productId) ?? { productId: l.productId, name: l.name, price: l.price, opening: 0, received: 0, pending: 0 };
    Object.assign(f, { price: l.price, remaining: l.remaining, waste: l.waste });
    map.set(l.productId, f);
  });

  // Active products first in menu order, then any retired product that still has stock
  const order = new Map(products.map((p, i) => [p.id, p.isActive ? i : products.length + i]));
  const activeIds = new Set(products.filter((p) => p.isActive).map((p) => p.id));
  products.filter((p) => p.isActive && !map.has(p.id)).forEach((p) => {
    map.set(p.id, { productId: p.id, name: p.name, price: p.price, opening: 0, received: 0, pending: 0 });
  });
  const lines = [...map.values()]
    .filter((f) => activeIds.has(f.productId) || f.opening || f.received || f.remaining)
    .sort((a, b) => (order.get(a.productId) ?? 1e9) - (order.get(b.productId) ?? 1e9));

  return {
    outlet,
    date,
    prevDate: prev?.date ?? null,
    isFirstCount: !prev,
    saved: Boolean(existing),
    submittedBy: existing?.submittedBy,
    updatedAt: existing?.updatedAt,
    lines,
  };
}

/** Per counted day and per product: sold, waste, value, compared with the Sales money for the period. */
export async function getStockReport(outlet: string, from: string, to: string) {
  const [closings, shipments, products] = await Promise.all([
    listClosings(outlet, to),
    listShipments({ outlet, to }),
    listProducts(true),
  ]);
  // Sales are needed from the day after the count that precedes the first day in range
  const firstPrev = closings.filter((c) => c.date < from).pop();
  const sales = await getAllOutletSales({ outlet, start_date: firstPrev ? addDays(firstPrev.date, 1) : from, end_date: to });

  const days = [];
  const totals = new Map<string, { productId: string; name: string; sold: number; waste: number; value: number }>();

  for (let i = 0; i < closings.length; i++) {
    const c = closings[i];
    if (c.date < from) continue;
    const prev = closings[i - 1];
    if (!prev) {
      days.push({ date: c.date, prevDate: null, isFirstCount: true, sold: 0, waste: 0, value: 0, sales: 0, diff: 0, negative: [] });
      continue;
    }

    const map = flows(c.date, prev, shipments, products);
    let sold = 0;
    let waste = 0;
    let value = 0;
    const negative: string[] = [];
    const counted = new Map(c.lines.map((l) => [l.productId, l]));
    const ids = new Set([...map.keys(), ...counted.keys()]);
    ids.forEach((id) => {
      const f = map.get(id);
      const l = counted.get(id);
      const lineSold = (f?.opening ?? 0) + (f?.received ?? 0) - (l?.remaining ?? 0) - (l?.waste ?? 0);
      const price = l?.price ?? f?.price ?? 0;
      const name = l?.name ?? f?.name ?? '?';
      if (lineSold < 0) negative.push(name);
      sold += lineSold;
      waste += l?.waste ?? 0;
      value += lineSold * price;

      const t = totals.get(id) ?? { productId: id, name, sold: 0, waste: 0, value: 0 };
      t.sold += lineSold;
      t.waste += l?.waste ?? 0;
      t.value += lineSold * price;
      totals.set(id, t);
    });

    // Sales money for every day since the previous count
    const salesTotal = sales
      .filter((s) => s.date > prev.date && s.date <= c.date)
      .reduce((sum, s) => sum + (s.totalSales || 0), 0);

    days.push({ date: c.date, prevDate: prev.date, isFirstCount: false, sold, waste, value, sales: salesTotal, diff: salesTotal - value, negative });
  }

  // Shipments where the outlet confirmed a different quantity than was sent
  const shipmentDiffs = shipments
    .filter((s) => s.date >= from && s.status === 'diterima')
    .flatMap((s) => s.lines
      .filter((l) => l.receivedQty !== undefined && l.receivedQty !== l.qty)
      .map((l) => ({ date: s.date, shipmentId: s.id, name: l.name, sent: l.qty, received: l.receivedQty! })));

  const order = new Map(products.map((p, i) => [p.id, i]));
  return {
    outlet,
    from,
    to,
    days: days.sort((a, b) => b.date.localeCompare(a.date)),
    products: [...totals.values()].sort((a, b) => (order.get(a.productId) ?? 1e9) - (order.get(b.productId) ?? 1e9)),
    shipmentDiffs,
    summary: days.reduce(
      (acc, d) => ({ sold: acc.sold + d.sold, waste: acc.waste + d.waste, value: acc.value + d.value, sales: acc.sales + d.sales, diff: acc.diff + d.diff }),
      { sold: 0, waste: 0, value: 0, sales: 0, diff: 0 },
    ),
  };
}
