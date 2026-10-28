import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  kitchenCodes,
  listEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
  lastCountDate,
  getKitchenCountDraft,
  saveKitchenCount,
  getKitchenReport,
} from '../services/kitchenService';
import { listProducts } from '../services/productService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import {
  ok, created, badRequest, unauthorized, forbidden, notFound, serverError, preflight,
} from '../utils/response';
import { JwtUser, KitchenEntryLine } from '../types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const COUNTED_MSG = 'Dapur sudah opname di tanggal ini atau sesudahnya, jadi catatan ini terkunci. Minta admin untuk mengubahnya.';

function getUser(event: APIGatewayProxyEvent): JwtUser | null {
  const token = extractBearerToken(event.headers['Authorization'] || event.headers['authorization']);
  return verifyToken(token);
}

const isAdmin = (u: JwtUser) => u.type === 'admin';
const isKitchen = (u: JwtUser) => u.type === 'outlet' && u.role === 'dapur';
const actor = (u: JwtUser) => (u.type === 'admin' ? u.username : u.outlet);

function isQty(v: unknown): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/**
 * The kitchen this request is about: the kitchen account itself, or for admins the one asked for
 * (defaulting to the only kitchen account). Returns an error response when there is none.
 */
export async function resolveKitchen(user: JwtUser | null, requested?: string): Promise<string | APIGatewayProxyResult> {
  if (!user) return unauthorized('Access token required');
  if (isKitchen(user)) return user.outlet!;
  if (!isAdmin(user)) return forbidden('Hanya dapur atau admin yang boleh mengakses stok dapur');

  const codes = await kitchenCodes();
  if (requested) return codes.includes(requested) ? requested : badRequest('Akun dapur tidak ditemukan');
  if (codes.length === 0) return badRequest('Belum ada akun Dapur Pusat. Atur di Manajemen Outlet.');
  return codes[0];
}

async function parseLines(lines: unknown): Promise<string | KitchenEntryLine[]> {
  if (!Array.isArray(lines)) return 'Daftar barang wajib diisi';
  const products = new Map((await listProducts()).map((p) => [p.id, p]));
  const out: KitchenEntryLine[] = [];
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

/** Kitchen accounts may not change anything a count already covers; admins can. */
export async function lockedFor(user: JwtUser, kitchen: string, ...dates: string[]): Promise<boolean> {
  if (isAdmin(user)) return false;
  const last = await lastCountDate(kitchen);
  return Boolean(last && dates.some((d) => d <= last));
}

// ---- Entries (production and bought-in goods arriving) ----

/** GET /api/stock/kitchen/entries?from&to&kitchen */
export async function getEntriesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    const qs = event.queryStringParameters || {};
    const kitchen = await resolveKitchen(getUser(event), qs.kitchen);
    if (typeof kitchen !== 'string') return kitchen;
    return ok(await listEntries(kitchen, qs.from, qs.to));
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/stock/kitchen/entries — Body: { date, kind: 'produksi' | 'masuk', lines: [{ productId, qty }], notes?, kitchen? } */
export async function createEntryHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    const user = getUser(event);
    const body = JSON.parse(event.body || '{}');
    const kitchen = await resolveKitchen(user, body.kitchen);
    if (typeof kitchen !== 'string') return kitchen;

    if (!DATE_RE.test(body.date || '')) return badRequest('Tanggal tidak valid');
    if (body.kind !== 'produksi' && body.kind !== 'masuk') return badRequest('Jenis catatan harus produksi atau masuk');
    if (await lockedFor(user!, kitchen, body.date)) return badRequest(COUNTED_MSG);

    const lines = await parseLines(body.lines);
    if (typeof lines === 'string') return badRequest(lines);

    const entry = await createEntry({ kitchen, date: body.date, kind: body.kind, lines, notes: body.notes, createdBy: actor(user!) });
    return created(entry, body.kind === 'masuk' ? 'Barang masuk tercatat' : 'Hasil produksi tercatat');
  } catch (err) {
    return serverError(err);
  }
}

/** PUT /api/stock/kitchen/entries/{id} */
export async function updateEntryHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Entry id path parameter is required');

  try {
    const user = getUser(event);
    const body = JSON.parse(event.body || '{}');
    const kitchen = await resolveKitchen(user, body.kitchen);
    if (typeof kitchen !== 'string') return kitchen;

    const existing = await getEntry(kitchen, id);
    if (!existing) return notFound('Catatan tidak ditemukan');
    if (body.date !== undefined && !DATE_RE.test(body.date)) return badRequest('Tanggal tidak valid');
    if (body.kind !== undefined && body.kind !== 'produksi' && body.kind !== 'masuk') return badRequest('Jenis catatan tidak valid');
    if (await lockedFor(user!, kitchen, existing.date, body.date ?? existing.date)) return badRequest(COUNTED_MSG);

    let lines;
    if (body.lines !== undefined) {
      lines = await parseLines(body.lines);
      if (typeof lines === 'string') return badRequest(lines);
    }

    const entry = await updateEntry(existing, { date: body.date, kind: body.kind, lines, notes: body.notes });
    return ok(entry, 'Catatan diperbarui');
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/stock/kitchen/entries/{id}?kitchen */
export async function deleteEntryHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Entry id path parameter is required');

  try {
    const user = getUser(event);
    const kitchen = await resolveKitchen(user, event.queryStringParameters?.kitchen);
    if (typeof kitchen !== 'string') return kitchen;

    const existing = await getEntry(kitchen, id);
    if (!existing) return notFound('Catatan tidak ditemukan');
    if (await lockedFor(user!, kitchen, existing.date)) return badRequest(COUNTED_MSG);

    await deleteEntry(kitchen, id);
    return ok(null, 'Catatan dihapus');
  } catch (err) {
    return serverError(err);
  }
}

// ---- Weekly count ----

/** GET /api/stock/kitchen/count?date&kitchen — expected stock per product, plus the saved count if any */
export async function getKitchenCountHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    const qs = event.queryStringParameters || {};
    const kitchen = await resolveKitchen(getUser(event), qs.kitchen);
    if (typeof kitchen !== 'string') return kitchen;
    if (!DATE_RE.test(qs.date || '')) return badRequest('Tanggal tidak valid');
    return ok(await getKitchenCountDraft(kitchen, qs.date!));
  } catch (err) {
    return serverError(err);
  }
}

/** PUT /api/stock/kitchen/count — Body: { date, lines: [{ productId, remaining, waste }], kitchen? } */
export async function saveKitchenCountHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    const user = getUser(event);
    const body = JSON.parse(event.body || '{}');
    const kitchen = await resolveKitchen(user, body.kitchen);
    if (typeof kitchen !== 'string') return kitchen;

    if (!DATE_RE.test(body.date || '')) return badRequest('Tanggal tidak valid');
    if (!Array.isArray(body.lines)) return badRequest('Daftar hitungan wajib diisi');
    // Re-doing the latest count is fine; rewriting an older one would shift every gap after it
    const last = await lastCountDate(kitchen);
    if (!isAdmin(user!) && last && body.date < last) {
      return badRequest('Sudah ada opname yang lebih baru. Minta admin untuk mengubah opname lama.');
    }

    const lines = [];
    for (const l of body.lines) {
      const remaining = l?.remaining ?? 0;
      const waste = l?.waste ?? 0;
      if (!l?.productId || !isQty(remaining) || !isQty(waste)) {
        return badRequest('Sisa dan rusak harus bilangan bulat 0 atau lebih');
      }
      lines.push({ productId: l.productId, remaining, waste });
    }

    return ok(await saveKitchenCount({ kitchen, date: body.date, lines, submittedBy: actor(user!) }), 'Opname dapur tersimpan');
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/stock/kitchen/report?from&to&kitchen */
export async function getKitchenReportHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    const qs = event.queryStringParameters || {};
    const kitchen = await resolveKitchen(getUser(event), qs.kitchen);
    if (typeof kitchen !== 'string') return kitchen;
    if (!DATE_RE.test(qs.from || '') || !DATE_RE.test(qs.to || '') || qs.from! > qs.to!) {
      return badRequest('Rentang tanggal tidak valid');
    }
    return ok(await getKitchenReport(kitchen, qs.from!, qs.to!));
  } catch (err) {
    return serverError(err);
  }
}
