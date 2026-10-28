import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  listShipments,
  getShipment,
  createShipment,
  updateShipment,
  receiveShipment,
  deleteShipment,
  getClosingDraft,
  saveClosing,
  hasClosing,
  deleteClosing,
  getStockReport,
} from '../services/stockService';
import { listProducts } from '../services/productService';
import { kitchenCodes, lastCountDate } from '../services/kitchenService';
import { getAllOutlets } from '../services/outletService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import {
  ok, created, badRequest, unauthorized, forbidden, notFound, serverError, preflight,
} from '../utils/response';
import { JwtUser, OutletRole, Shipment, ShipmentLine } from '../types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function getUser(event: APIGatewayProxyEvent): JwtUser | null {
  const token = extractBearerToken(event.headers['Authorization'] || event.headers['authorization']);
  return verifyToken(token);
}

const isAdmin = (u: JwtUser) => u.type === 'admin';
const isKitchen = (u: JwtUser) => u.type === 'outlet' && u.role === 'dapur';
const isOutletStaff = (u: JwtUser) => u.type === 'outlet' && u.role !== 'dapur';
const actor = (u: JwtUser) => (u.type === 'admin' ? u.username : u.outlet);

const KITCHEN_COUNTED_MSG = 'Dapur sudah opname di tanggal ini atau sesudahnya, jadi kiriman ini akan mengacaukan hitungan stok dapur. Pakai tanggal sesudah opname, atau minta admin.';
const closedMsg = (code: string) => `${code} sudah tutup toko di tanggal ini, jadi kiriman akan mengacaukan hitungannya. Pakai tanggal besok.`;

type Roles = Map<string, OutletRole>;

/** True when a kitchen count already covers `date`, so a shipment on it would shift the count's gap. */
async function kitchenCounted(user: JwtUser, ...dates: string[]): Promise<boolean> {
  if (isAdmin(user)) return false;
  const lasts = await Promise.all((await kitchenCodes()).map(lastCountDate));
  return lasts.some((last) => last && dates.some((d) => d <= last));
}

function isQty(v: unknown): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/** Outlet code → role, to tell shops from the kitchen. */
async function outletRoles(): Promise<Roles> {
  return new Map((await getAllOutlets()).map((o) => [o.code, o.role]));
}

const firstKitchen = (roles: Roles) => [...roles].find(([, role]) => role === 'dapur')?.[0];

/** Shipments made before transfers existed have no source; they came from the kitchen. */
const sourceOf = (s: Shipment, roles: Roles) => s.source ?? firstKitchen(roles);

/** The account that sent a shipment may change it until it is received. */
const isSender = (user: JwtUser, s: Shipment, roles: Roles) => user.type === 'outlet' && sourceOf(s, roles) === user.outlet;

/**
 * A shipment dated on a day an outlet at either end has already counted (or the kitchen has already
 * counted, when it is involved) would change those numbers afterwards. Returns the refusal message.
 */
async function dateConflict(user: JwtUser, ends: string[], roles: Roles, date: string, ...lockDates: string[]): Promise<string | null> {
  for (const code of ends) {
    if (roles.get(code) === 'outlet' && (await hasClosing(code, date))) return closedMsg(code);
  }
  if (ends.some((c) => roles.get(c) === 'dapur') && (await kitchenCounted(user, date, ...lockDates))) {
    return KITCHEN_COUNTED_MSG;
  }
  return null;
}

/** Validate shipment lines against active products and attach product names. */
async function parseShipmentLines(lines: unknown): Promise<string | ShipmentLine[]> {
  if (!Array.isArray(lines)) return 'Daftar barang wajib diisi';
  const products = new Map((await listProducts()).map((p) => [p.id, p]));
  const out: ShipmentLine[] = [];
  const seen = new Set<string>();
  for (const l of lines as any[]) {
    if (!isQty(l?.qty)) return 'Jumlah harus bilangan bulat 0 atau lebih';
    if (l.qty === 0) continue;
    const p = products.get(l.productId);
    if (!p) return 'Produk tidak ditemukan atau sudah tidak aktif';
    if (seen.has(p.id)) return `Produk ${p.name} tercantum dua kali`;
    seen.add(p.id);
    out.push({ productId: p.id, name: p.name, qty: l.qty });
  }
  if (out.length === 0) return 'Isi minimal satu barang';
  return out;
}

// ---- Shipments (kitchen → outlet, outlet → outlet transfers, outlet → kitchen returns) ----

/** GET /api/stock/shipments?outlet&from&to&status — outlet staff see what they received and sent */
export async function getShipments(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const qs = event.queryStringParameters || {};
    if (isOutletStaff(user)) {
      const all = await listShipments({ from: qs.from, to: qs.to, status: qs.status });
      return ok(all.filter((s) => s.outlet === user.outlet || s.source === user.outlet));
    }
    return ok(await listShipments({ outlet: qs.outlet, from: qs.from, to: qs.to, status: qs.status }));
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/stock/shipments — Body: { outlet, source?, date, lines: [{ productId, qty }], notes? }
 * The kitchen sends to outlets; outlet staff transfer to another outlet or return to the kitchen;
 * admins may send from anywhere (source defaults to the kitchen).
 */
export async function createShipmentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const body = JSON.parse(event.body || '{}');
    const roles = await outletRoles();

    const source: string | undefined = isAdmin(user) ? body.source || firstKitchen(roles) : user.outlet;
    const dest: string | undefined = body.outlet;
    if (!source || !roles.has(source)) return badRequest('Asal kiriman tidak valid');
    if (!dest || !roles.has(dest) || dest === source) return badRequest('Tujuan kiriman tidak valid');
    if (roles.get(source) === 'dapur' && roles.get(dest) !== 'outlet') return badRequest('Tujuan kiriman tidak valid');
    if (!DATE_RE.test(body.date || '')) return badRequest('Tanggal kirim tidak valid');

    const conflict = await dateConflict(user, [source, dest], roles, body.date);
    if (conflict) return badRequest(conflict);

    const lines = await parseShipmentLines(body.lines);
    if (typeof lines === 'string') return badRequest(lines);

    const shipment = await createShipment({ outlet: dest, source, date: body.date, lines, notes: body.notes, createdBy: actor(user) });
    const what = roles.get(dest) === 'dapur' ? 'Retur ke dapur' : roles.get(source) === 'outlet' ? 'Transfer' : 'Kiriman';
    return created(shipment, `${what} berhasil dicatat`);
  } catch (err) {
    return serverError(err);
  }
}

/** PUT /api/stock/shipments/{outlet}/{id} — the sender (until received) or admin */
export async function updateShipmentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { outlet, id } = event.pathParameters || {};
  if (!outlet || !id) return badRequest('Outlet and id path parameters are required');

  try {
    const existing = await getShipment(outlet, id);
    if (!existing) return notFound('Kiriman tidak ditemukan');
    const roles = await outletRoles();
    if (!isAdmin(user)) {
      if (!isSender(user, existing, roles)) return forbidden('Hanya pengirim atau admin yang boleh mengubah kiriman ini');
      if (existing.status === 'diterima') return forbidden('Kiriman sudah diterima. Minta admin untuk mengubahnya.');
    }

    const body = JSON.parse(event.body || '{}');
    if (body.date !== undefined && !DATE_RE.test(body.date)) return badRequest('Tanggal kirim tidak valid');
    const ends = [sourceOf(existing, roles), existing.outlet].filter(Boolean) as string[];
    if (body.date !== undefined && body.date !== existing.date) {
      const conflict = await dateConflict(user, ends, roles, body.date, existing.date);
      if (conflict) return badRequest(conflict);
    } else if (ends.some((c) => roles.get(c) === 'dapur') && (await kitchenCounted(user, existing.date))) {
      return badRequest(KITCHEN_COUNTED_MSG);
    }

    let lines;
    if (body.lines !== undefined) {
      lines = await parseShipmentLines(body.lines);
      if (typeof lines === 'string') return badRequest(lines);
    }

    const shipment = await updateShipment(existing, { date: body.date, lines, notes: body.notes });
    return ok(shipment, 'Kiriman berhasil diperbarui');
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/stock/shipments/{outlet}/{id} — the sender (until received) or admin */
export async function deleteShipmentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { outlet, id } = event.pathParameters || {};
  if (!outlet || !id) return badRequest('Outlet and id path parameters are required');

  try {
    const existing = await getShipment(outlet, id);
    if (!existing) return notFound('Kiriman tidak ditemukan');
    const roles = await outletRoles();
    if (!isAdmin(user)) {
      if (!isSender(user, existing, roles)) return forbidden('Hanya pengirim atau admin yang boleh menghapus kiriman ini');
      if (existing.status === 'diterima') return forbidden('Kiriman sudah diterima. Minta admin untuk menghapusnya.');
    }
    const ends = [sourceOf(existing, roles), existing.outlet];
    if (ends.some((c) => c && roles.get(c) === 'dapur') && (await kitchenCounted(user, existing.date))) {
      return badRequest(KITCHEN_COUNTED_MSG);
    }
    await deleteShipment(outlet, id);
    return ok(null, 'Kiriman berhasil dihapus');
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/stock/shipments/{outlet}/{id}/receive — the destination (an outlet, or the kitchen for
 * returns) or admin. Body: { lines?: [{ productId, receivedQty }] } — omitted products are received in full.
 */
export async function receiveShipmentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { outlet, id } = event.pathParameters || {};
  if (!outlet || !id) return badRequest('Outlet and id path parameters are required');
  if (!isAdmin(user) && !(user.type === 'outlet' && user.outlet === outlet)) {
    return forbidden('Hanya tujuan kiriman yang boleh menerimanya');
  }

  try {
    const existing = await getShipment(outlet, id);
    if (!existing) return notFound('Kiriman tidak ditemukan');

    const body = JSON.parse(event.body || '{}');
    const lines = Array.isArray(body.lines) ? body.lines : [];
    for (const l of lines) {
      if (!isQty(l?.receivedQty)) return badRequest('Jumlah diterima harus bilangan bulat 0 atau lebih');
    }

    const shipment = await receiveShipment(existing, lines, actor(user));
    return ok(shipment, 'Kiriman diterima');
  } catch (err) {
    return serverError(err);
  }
}

// ---- End-of-day count ----

function closingOutlet(user: JwtUser, requested?: string): string | undefined {
  return isOutletStaff(user) ? user.outlet : isAdmin(user) ? requested : undefined;
}

/** GET /api/stock/closing?outlet&date — the form with opening stock and shipments filled in */
export async function getClosingHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (isKitchen(user)) return forbidden('Akun dapur tidak mengisi tutup toko');

  try {
    const qs = event.queryStringParameters || {};
    const outlet = closingOutlet(user, qs.outlet);
    if (!outlet) return badRequest('Outlet wajib diisi');
    if (!DATE_RE.test(qs.date || '')) return badRequest('Tanggal tidak valid');
    return ok(await getClosingDraft(outlet, qs.date!));
  } catch (err) {
    return serverError(err);
  }
}

/** PUT /api/stock/closing — Body: { outlet?, date, lines: [{ productId, remaining, waste }] } */
export async function saveClosingHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (isKitchen(user)) return forbidden('Akun dapur tidak mengisi tutup toko');

  try {
    const body = JSON.parse(event.body || '{}');
    const outlet = closingOutlet(user, body.outlet);
    if (!outlet) return badRequest('Outlet wajib diisi');
    if (!DATE_RE.test(body.date || '')) return badRequest('Tanggal tidak valid');
    if (!Array.isArray(body.lines)) return badRequest('Daftar hitungan wajib diisi');

    const lines = [];
    for (const l of body.lines) {
      const remaining = l?.remaining ?? 0;
      const waste = l?.waste ?? 0;
      if (!l?.productId || !isQty(remaining) || !isQty(waste)) {
        return badRequest('Sisa dan rusak harus bilangan bulat 0 atau lebih');
      }
      lines.push({ productId: l.productId, remaining, waste });
    }

    await saveClosing({ outlet, date: body.date, lines, submittedBy: actor(user) });
    return ok(await getClosingDraft(outlet, body.date), 'Hitungan tutup toko tersimpan');
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/stock/closing/{outlet}/{date} — admin only */
export async function deleteClosingHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (!isAdmin(user)) return forbidden('Hanya admin yang boleh menghapus hitungan');

  const { outlet, date } = event.pathParameters || {};
  if (!outlet || !date || !DATE_RE.test(date)) return badRequest('Outlet and date path parameters are required');

  try {
    await deleteClosing(outlet, date);
    return ok(null, 'Hitungan dihapus');
  } catch (err) {
    return serverError(err);
  }
}

/**
 * GET /api/stock/report?outlet&from&to
 * Outlet staff get their own outlet. Admins get one outlet, or every shop outlet when outlet is empty.
 */
export async function getStockReportHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (isKitchen(user)) return forbidden('Akun dapur tidak punya akses laporan stok');

  try {
    const qs = event.queryStringParameters || {};
    if (!DATE_RE.test(qs.from || '') || !DATE_RE.test(qs.to || '') || qs.from! > qs.to!) {
      return badRequest('Rentang tanggal tidak valid');
    }

    let outlets: string[];
    if (isOutletStaff(user)) outlets = [user.outlet!];
    else if (qs.outlet) outlets = [qs.outlet];
    else outlets = (await getAllOutlets()).filter((o) => o.role !== 'dapur').map((o) => o.code);

    const reports = await Promise.all(outlets.map((o) => getStockReport(o, qs.from!, qs.to!)));
    return ok(reports);
  } catch (err) {
    return serverError(err);
  }
}
