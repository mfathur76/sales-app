import { v4 as uuid } from 'uuid';
import { dbGet, dbPut, dbDelete, dbQuery, TABLES } from './dynamodb';
import { listShipments, listClosings, saveClosing } from './stockService';
import { listProducts } from './productService';
import { getAllOutlets } from './outletService';
import { listResellerSales } from './resellerService';
import { KitchenEntry, KitchenEntryLine, Product, ResellerSale, Shipment, StockClosing } from '../types';

const TABLE = TABLES.STOCK;

/**
 * Kitchen stock lives in the stock table next to the outlet data:
 *   Entry: PK = KITCHEN_ENTRY#{kitchen}  SK = ID#{id}       (production or bought-in goods arriving)
 *   Count: PK = CLOSING#{kitchen}        SK = DATE#{date}   (weekly freezer count, same shape as an outlet count)
 *
 * Expected stock on a count day = previous count + entries + returns from outlets − shipments it sent
 * − goods taken by resellers.
 * The count then shows the gap: counted + waste − expected (negative = missing).
 */

export async function kitchenCodes(): Promise<string[]> {
  return (await getAllOutlets()).filter((o) => o.role === 'dapur').map((o) => o.code);
}

// ---- Entries ----

function toEntry(item: Record<string, any>): KitchenEntry {
  return {
    id: item.id,
    kitchen: item.kitchen,
    date: item.date,
    kind: item.kind === 'masuk' ? 'masuk' : 'produksi',
    lines: item.lines ?? [],
    notes: item.notes,
    createdBy: item.createdBy,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function saveEntry(e: KitchenEntry): Promise<KitchenEntry> {
  await dbPut(TABLE, { PK: `KITCHEN_ENTRY#${e.kitchen}`, SK: `ID#${e.id}`, ...e });
  return e;
}

export async function listEntries(kitchen: string, from?: string, to?: string): Promise<KitchenEntry[]> {
  const items = await dbQuery({
    TableName: TABLE,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': `KITCHEN_ENTRY#${kitchen}` },
  });
  return items
    .map(toEntry)
    .filter((e) => (!from || e.date >= from) && (!to || e.date <= to))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

export async function getEntry(kitchen: string, id: string): Promise<KitchenEntry | null> {
  const item = await dbGet(TABLE, { PK: `KITCHEN_ENTRY#${kitchen}`, SK: `ID#${id}` });
  return item ? toEntry(item) : null;
}

export async function createEntry(data: {
  kitchen: string;
  date: string;
  kind: 'produksi' | 'masuk';
  lines: KitchenEntryLine[];
  notes?: string;
  createdBy?: string;
}): Promise<KitchenEntry> {
  const now = new Date().toISOString();
  return saveEntry({
    id: uuid(),
    kitchen: data.kitchen,
    date: data.date,
    kind: data.kind,
    lines: data.lines,
    notes: data.notes?.trim() || undefined,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateEntry(
  existing: KitchenEntry,
  updates: { date?: string; kind?: 'produksi' | 'masuk'; lines?: KitchenEntryLine[]; notes?: string },
): Promise<KitchenEntry> {
  const next: KitchenEntry = { ...existing, updatedAt: new Date().toISOString() };
  if (updates.date !== undefined) next.date = updates.date;
  if (updates.kind !== undefined) next.kind = updates.kind;
  if (updates.lines !== undefined) next.lines = updates.lines;
  if (updates.notes !== undefined) next.notes = updates.notes.trim() || undefined;
  return saveEntry(next);
}

export async function deleteEntry(kitchen: string, id: string): Promise<void> {
  await dbDelete(TABLE, { PK: `KITCHEN_ENTRY#${kitchen}`, SK: `ID#${id}` });
}

/** Latest count date, so entries on or before it can be locked against edits. */
export async function lastCountDate(kitchen: string): Promise<string | null> {
  const counts = await listClosings(kitchen, '9999-12-31');
  return counts.length ? counts[counts.length - 1].date : null;
}

// ---- Expected stock and counts ----

/** Shipments made before transfers existed have no source; they all came from the kitchen. */
const fromKitchen = (s: Shipment, kitchen: string) => !s.source || s.source === kitchen;

interface KitchenFlow {
  productId: string;
  name: string;
  category?: string;
  price: number;
  opening: number;
  produced: number;
  bought: number;
  shipped: number;
  returned: number;  // sent back by outlets
  resold: number;    // taken by resellers
  expected: number;
  remaining?: number;
  waste?: number;
}

/**
 * Movements in (prev.date, date]; with no previous count everything up to `date` counts from zero.
 * Shipments the kitchen sent and reseller pick-ups go out, returns from outlets come in,
 * outlet-to-outlet transfers are ignored.
 */
function kitchenFlows(
  kitchen: string,
  date: string,
  prev: StockClosing | undefined,
  entries: KitchenEntry[],
  shipments: Shipment[],
  resellerSales: ResellerSale[],
  products: Product[],
): Map<string, KitchenFlow> {
  const productById = new Map(products.map((p) => [p.id, p]));
  const map = new Map<string, KitchenFlow>();
  const get = (productId: string, name: string) => {
    let f = map.get(productId);
    if (!f) {
      const p = productById.get(productId);
      f = {
        productId, name: p?.name ?? name, category: p?.category, price: p?.price ?? 0,
        opening: 0, produced: 0, bought: 0, shipped: 0, returned: 0, resold: 0, expected: 0,
      };
      map.set(productId, f);
    }
    return f;
  };
  const inPeriod = (d: string) => d <= date && (!prev || d > prev.date);

  prev?.lines.forEach((l) => { get(l.productId, l.name).opening = l.remaining; });
  entries.filter((e) => inPeriod(e.date)).forEach((e) => e.lines.forEach((l) => {
    const f = get(l.productId, l.name);
    if (e.kind === 'masuk') f.bought += l.qty;
    else f.produced += l.qty;
  }));
  shipments.filter((s) => inPeriod(s.date)).forEach((s) => s.lines.forEach((l) => {
    if (s.outlet === kitchen) get(l.productId, l.name).returned += l.receivedQty ?? l.qty;
    else if (fromKitchen(s, kitchen)) get(l.productId, l.name).shipped += l.qty;
  }));
  resellerSales.filter((r) => inPeriod(r.date)).forEach((r) => r.lines.forEach((l) => {
    get(l.productId, l.name).resold += l.qty;
  }));
  map.forEach((f) => { f.expected = f.opening + f.produced + f.bought + f.returned - f.shipped - f.resold; });
  return map;
}

async function load(kitchen: string, upTo: string) {
  return Promise.all([
    listClosings(kitchen, upTo),
    listEntries(kitchen, undefined, upTo),
    listShipments({ to: upTo }),
    listResellerSales({ kitchen, to: upTo }),
    listProducts(true),
  ]);
}

/** The count form, and the live "stock now" view when `date` is today and nothing is saved yet. */
export async function getKitchenCountDraft(kitchen: string, date: string) {
  const [counts, entries, shipments, resellerSales, products] = await load(kitchen, date);
  const existing = counts.find((c) => c.date === date);
  const prev = counts.filter((c) => c.date < date).pop();
  const map = kitchenFlows(kitchen, date, prev, entries, shipments, resellerSales, products);

  existing?.lines.forEach((l) => {
    const f = map.get(l.productId);
    if (f) Object.assign(f, { remaining: l.remaining, waste: l.waste });
    else {
      map.set(l.productId, {
        productId: l.productId, name: l.name, price: l.price, opening: 0, produced: 0, bought: 0, shipped: 0, returned: 0, resold: 0,
        expected: 0, remaining: l.remaining, waste: l.waste,
      });
    }
  });

  const order = new Map(products.map((p, i) => [p.id, p.isActive ? i : products.length + i]));
  products.filter((p) => p.isActive && !map.has(p.id)).forEach((p) => {
    map.set(p.id, {
      productId: p.id, name: p.name, category: p.category, price: p.price,
      opening: 0, produced: 0, bought: 0, shipped: 0, returned: 0, resold: 0, expected: 0,
    });
  });
  const categoryById = new Map(products.map((p) => [p.id, p.category]));
  const activeIds = new Set(products.filter((p) => p.isActive).map((p) => p.id));
  const lines = [...map.values()]
    .map((f) => ({ ...f, category: categoryById.get(f.productId) }))
    .filter((f) => activeIds.has(f.productId) || f.expected || f.remaining)
    .sort((a, b) => (order.get(a.productId) ?? 1e9) - (order.get(b.productId) ?? 1e9));

  return {
    kitchen,
    date,
    prevDate: prev?.date ?? null,
    isFirstCount: !prev,
    saved: Boolean(existing),
    submittedBy: existing?.submittedBy,
    lines,
  };
}

export async function saveKitchenCount(data: {
  kitchen: string;
  date: string;
  lines: { productId: string; remaining: number; waste: number }[];
  submittedBy?: string;
}) {
  await saveClosing({ outlet: data.kitchen, date: data.date, lines: data.lines, submittedBy: data.submittedBy });
  return getKitchenCountDraft(data.kitchen, data.date);
}

/** Counts in range with their gaps, plus production / bought-in / shipped totals per product. */
export async function getKitchenReport(kitchen: string, from: string, to: string) {
  const [counts, entries, shipments, resellerSales, products] = await load(kitchen, to);
  const categoryById = new Map(products.map((p) => [p.id, p.category]));

  const countRows = [];
  for (let i = 0; i < counts.length; i++) {
    const c = counts[i];
    if (c.date < from) continue;
    const prev = counts[i - 1];
    if (!prev) {
      countRows.push({ date: c.date, prevDate: null, isFirstCount: true, lines: [], diff: 0, diffValue: 0, waste: 0 });
      continue;
    }
    const map = kitchenFlows(kitchen, c.date, prev, entries, shipments, resellerSales, products);
    const counted = new Map(c.lines.map((l) => [l.productId, l]));
    const ids = new Set([...map.keys(), ...counted.keys()]);
    const lines = [...ids].map((id) => {
      const f = map.get(id);
      const l = counted.get(id);
      const expected = f?.expected ?? 0;
      const remaining = l?.remaining ?? 0;
      const waste = l?.waste ?? 0;
      const price = l?.price ?? f?.price ?? 0;
      return {
        productId: id,
        name: l?.name ?? f?.name ?? '?',
        category: categoryById.get(id),
        expected,
        remaining,
        waste,
        diff: remaining + waste - expected,
        price,
      };
    }).filter((l) => l.expected || l.remaining || l.waste);

    countRows.push({
      date: c.date,
      prevDate: prev.date,
      isFirstCount: false,
      lines: lines.filter((l) => l.diff !== 0 || l.waste),
      diff: lines.reduce((s, l) => s + l.diff, 0),
      diffValue: lines.reduce((s, l) => s + l.diff * l.price, 0),
      waste: lines.reduce((s, l) => s + l.waste, 0),
    });
  }

  // Movements inside the range, whatever the count dates
  const inRange = (d: string) => d >= from && d <= to;
  const movement = new Map<string, { productId: string; name: string; category?: string; produced: number; bought: number; shipped: number; returned: number; resold: number }>();
  const move = (productId: string, name: string) => {
    let m = movement.get(productId);
    if (!m) {
      m = { productId, name, category: categoryById.get(productId), produced: 0, bought: 0, shipped: 0, returned: 0, resold: 0 };
      movement.set(productId, m);
    }
    return m;
  };
  entries.filter((e) => inRange(e.date)).forEach((e) => e.lines.forEach((l) => {
    const m = move(l.productId, l.name);
    if (e.kind === 'masuk') m.bought += l.qty;
    else m.produced += l.qty;
  }));
  shipments.filter((s) => inRange(s.date)).forEach((s) => s.lines.forEach((l) => {
    if (s.outlet === kitchen) move(l.productId, l.name).returned += l.receivedQty ?? l.qty;
    else if (fromKitchen(s, kitchen)) move(l.productId, l.name).shipped += l.qty;
  }));
  resellerSales.filter((r) => inRange(r.date)).forEach((r) => r.lines.forEach((l) => {
    move(l.productId, l.name).resold += l.qty;
  }));

  const order = new Map(products.map((p, i) => [p.id, i]));
  return {
    kitchen,
    from,
    to,
    counts: countRows.sort((a, b) => b.date.localeCompare(a.date)),
    movement: [...movement.values()].sort((a, b) => (order.get(a.productId) ?? 1e9) - (order.get(b.productId) ?? 1e9)),
  };
}
