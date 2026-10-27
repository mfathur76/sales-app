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
import { getAllOutlets } from '../services/outletService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import {
  ok, created, badRequest, unauthorized, forbidden, notFound, serverError, preflight,
} from '../utils/response';
import { JwtUser, ShipmentLine } from '../types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CLOSED_MSG = 'Outlet sudah tutup toko di tanggal ini, jadi kiriman akan mengacaukan hitungan. Pakai tanggal besok.';

function getUser(event: APIGatewayProxyEvent): JwtUser | null {
  const token = extractBearerToken(event.headers['Authorization'] || event.headers['authorization']);
  return verifyToken(token);
}

const isAdmin = (u: JwtUser) => u.type === 'admin';
const isKitchen = (u: JwtUser) => u.type === 'outlet' && u.role === 'dapur';
const isOutletStaff = (u: JwtUser) => u.type === 'outlet' && u.role !== 'dapur';
const actor = (u: JwtUser) => (u.type === 'admin' ? u.username : u.outlet);

function isQty(v: unknown): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/** Shipments may only go to real outlets, not to the kitchen account itself. */
async function isShopOutlet(code: string): Promise<boolean> {
  const outlets = await getAllOutlets();
  return outlets.some((o) => o.code === code && o.role !== 'dapur');
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

// ---- Shipments ----

/** GET /api/stock/shipments?outlet&from&to&status — outlet staff only see their own */
export async function getShipments(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const qs = event.queryStringParameters || {};
    const outlet = isOutletStaff(user) ? user.outlet : qs.outlet;
    return ok(await listShipments({ outlet, from: qs.from, to: qs.to, status: qs.status }));
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/stock/shipments — kitchen or admin. Body: { outlet, date, lines: [{ productId, qty }], notes? } */
export async function createShipmentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (!isKitchen(user) && !isAdmin(user)) return forbidden('Hanya dapur atau admin yang boleh mengirim barang');

  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.outlet || !(await isShopOutlet(body.outlet))) return badRequest('Outlet tujuan tidak valid');
    if (!DATE_RE.test(body.date || '')) return badRequest('Tanggal kirim tidak valid');
    if (await hasClosing(body.outlet, body.date)) return badRequest(CLOSED_MSG);

    const lines = await parseShipmentLines(body.lines);
    if (typeof lines === 'string') return badRequest(lines);

    const shipment = await createShipment({ outlet: body.outlet, date: body.date, lines, notes: body.notes, createdBy: actor(user) });
    return created(shipment, 'Kiriman berhasil dicatat');
  } catch (err) {
    return serverError(err);
  }
}

/** PUT /api/stock/shipments/{outlet}/{id} — kitchen (until received) or admin */
export async function updateShipmentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (!isKitchen(user) && !isAdmin(user)) return forbidden('Hanya dapur atau admin yang boleh mengubah kiriman');

  const { outlet, id } = event.pathParameters || {};
  if (!outlet || !id) return badRequest('Outlet and id path parameters are required');

  try {
    const existing = await getShipment(outlet, id);
    if (!existing) return notFound('Kiriman tidak ditemukan');
    if (isKitchen(user) && existing.status === 'diterima') {
      return forbidden('Kiriman sudah diterima outlet. Minta admin untuk mengubahnya.');
    }

    const body = JSON.parse(event.body || '{}');
    if (body.date !== undefined && !DATE_RE.test(body.date)) return badRequest('Tanggal kirim tidak valid');
    if (body.date !== undefined && body.date !== existing.date && (await hasClosing(outlet, body.date))) {
      return badRequest(CLOSED_MSG);
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

/** DELETE /api/stock/shipments/{outlet}/{id} — kitchen (until received) or admin */
export async function deleteShipmentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (!isKitchen(user) && !isAdmin(user)) return forbidden('Hanya dapur atau admin yang boleh menghapus kiriman');

  const { outlet, id } = event.pathParameters || {};
  if (!outlet || !id) return badRequest('Outlet and id path parameters are required');

  try {
    const existing = await getShipment(outlet, id);
    if (!existing) return notFound('Kiriman tidak ditemukan');
    if (isKitchen(user) && existing.status === 'diterima') {
      return forbidden('Kiriman sudah diterima outlet. Minta admin untuk menghapusnya.');
    }
    await deleteShipment(outlet, id);
    return ok(null, 'Kiriman berhasil dihapus');
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/stock/shipments/{outlet}/{id}/receive — the destination outlet (or admin).
 * Body: { lines?: [{ productId, receivedQty }] } — omitted products are received in full.
 */
export async function receiveShipmentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { outlet, id } = event.pathParameters || {};
  if (!outlet || !id) return badRequest('Outlet and id path parameters are required');
  if (!isAdmin(user) && !(isOutletStaff(user) && user.outlet === outlet)) {
    return forbidden('Hanya outlet tujuan yang boleh menerima kiriman ini');
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
