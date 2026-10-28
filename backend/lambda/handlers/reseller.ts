import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  listResellerSales,
  getResellerSale,
  createResellerSale,
  updateResellerSale,
  addResellerPayment,
  removeResellerPayment,
  deleteResellerSale,
  outstandingByReseller,
  PaymentInput,
} from '../services/resellerService';
import { getCustomerById } from '../services/customerService';
import { listProducts } from '../services/productService';
import { resolveKitchen, lockedFor } from './kitchen';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import {
  ok, created, badRequest, forbidden, notFound, serverError, preflight,
} from '../utils/response';
import { JwtUser, ResellerSaleLine } from '../types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAYMENT_METHODS = ['cash', 'transfer', 'qris'];
const COUNTED_MSG = 'Dapur sudah opname di tanggal ini atau sesudahnya, jadi pengambilan ini terkunci. Minta admin untuk mengubahnya.';

function getUser(event: APIGatewayProxyEvent): JwtUser | null {
  const token = extractBearerToken(event.headers['Authorization'] || event.headers['authorization']);
  return verifyToken(token);
}

const actor = (u: JwtUser) => (u.type === 'admin' ? u.username : u.outlet);

function isQty(v: unknown): boolean {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

function isAmount(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

/** Lines with the reseller price filled in from the product unless one is given. */
async function parseLines(lines: unknown): Promise<string | ResellerSaleLine[]> {
  if (!Array.isArray(lines)) return 'Daftar barang wajib diisi';
  const products = new Map((await listProducts()).map((p) => [p.id, p]));
  const out: ResellerSaleLine[] = [];
  const seen = new Set<string>();
  for (const l of lines as any[]) {
    if (!isQty(l?.qty)) return 'Jumlah harus bilangan bulat 0 atau lebih';
    if (l.qty === 0) continue;
    const p = products.get(l.productId);
    if (!p) return 'Produk tidak ditemukan atau sudah tidak aktif';
    if (seen.has(p.id)) return `Produk ${p.name} tercantum dua kali`;
    seen.add(p.id);
    const price = l.price ?? p.resellerPrice;
    if (!isAmount(price)) return `Harga reseller ${p.name} belum diatur. Isi di Master Produk atau ketik harganya.`;
    out.push({ productId: p.id, name: p.name, qty: l.qty, price });
  }
  if (out.length === 0) return 'Isi minimal satu barang';
  return out;
}

function parsePayment(body: any): string | PaymentInput {
  if (!isAmount(body?.amount) || body.amount <= 0) return 'Jumlah pembayaran harus lebih dari 0';
  if (!PAYMENT_METHODS.includes(body.method)) return 'Metode bayar harus cash, transfer, atau qris';
  if (!DATE_RE.test(body.date || '')) return 'Tanggal pembayaran tidak valid';
  return { amount: body.amount, method: body.method, date: body.date, note: body.note };
}

/** GET /api/resellers/sales?customerId&from&to&unpaid=1 — kitchen or admin */
export async function getResellerSalesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    const qs = event.queryStringParameters || {};
    const kitchen = await resolveKitchen(getUser(event), qs.kitchen);
    if (typeof kitchen !== 'string') return kitchen;
    return ok(await listResellerSales({
      kitchen,
      customerId: qs.customerId,
      from: qs.from,
      to: qs.to,
      unpaidOnly: qs.unpaid === '1' || qs.unpaid === 'true',
    }));
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/resellers/summary?today — open bills per reseller, overdue first */
export async function getResellerSummaryHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    const qs = event.queryStringParameters || {};
    const kitchen = await resolveKitchen(getUser(event), qs.kitchen);
    if (typeof kitchen !== 'string') return kitchen;
    // The client's date, so "overdue" follows the business's day rather than the server's UTC clock
    const today = DATE_RE.test(qs.today || '') ? qs.today! : new Date().toISOString().slice(0, 10);
    const open = await listResellerSales({ kitchen, unpaidOnly: true });
    return ok(outstandingByReseller(open, today));
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/resellers/sales — kitchen or admin.
 * Body: { customerId, date, dueDate?, lines: [{ productId, qty, price? }], payment?: { amount, method, date, note? }, notes? }
 */
export async function createResellerSaleHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    const user = getUser(event);
    const body = JSON.parse(event.body || '{}');
    const kitchen = await resolveKitchen(user, body.kitchen);
    if (typeof kitchen !== 'string') return kitchen;

    if (!DATE_RE.test(body.date || '')) return badRequest('Tanggal ambil tidak valid');
    if (body.dueDate !== undefined && body.dueDate !== '' && (!DATE_RE.test(body.dueDate) || body.dueDate < body.date)) {
      return badRequest('Jatuh tempo tidak valid');
    }
    if (await lockedFor(user!, kitchen, body.date)) return badRequest(COUNTED_MSG);

    const customer = body.customerId ? await getCustomerById(body.customerId) : null;
    if (!customer) return badRequest('Reseller wajib dipilih');
    if (!customer.isReseller) return badRequest(`${customer.name} belum ditandai sebagai reseller`);

    const lines = await parseLines(body.lines);
    if (typeof lines === 'string') return badRequest(lines);

    let payment: PaymentInput | undefined;
    if (body.payment && body.payment.amount) {
      const p = parsePayment(body.payment);
      if (typeof p === 'string') return badRequest(p);
      payment = p;
    }

    const sale = await createResellerSale({
      kitchen, customer, date: body.date, dueDate: body.dueDate || undefined, lines, payment, notes: body.notes, createdBy: actor(user!),
    });
    return created(sale, 'Pengambilan reseller tercatat');
  } catch (err) {
    return serverError(err);
  }
}

/** PUT /api/resellers/sales/{id} — Body: { date?, dueDate?, lines?, notes? }; payments go through their own endpoints */
export async function updateResellerSaleHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Sale id path parameter is required');

  try {
    const user = getUser(event);
    const body = JSON.parse(event.body || '{}');
    const kitchen = await resolveKitchen(user, body.kitchen);
    if (typeof kitchen !== 'string') return kitchen;

    const existing = await getResellerSale(id);
    if (!existing || existing.kitchen !== kitchen) return notFound('Pengambilan tidak ditemukan');
    if (body.date !== undefined && !DATE_RE.test(body.date)) return badRequest('Tanggal ambil tidak valid');
    const date = body.date ?? existing.date;
    if (body.dueDate !== undefined && (!DATE_RE.test(body.dueDate) || body.dueDate < date)) return badRequest('Jatuh tempo tidak valid');

    // Changing what left the kitchen, or when, moves the kitchen's stock; the due date and notes do not
    const touchesStock = body.lines !== undefined || (body.date !== undefined && body.date !== existing.date);
    if (touchesStock && (await lockedFor(user!, kitchen, existing.date, date))) return badRequest(COUNTED_MSG);

    let lines;
    if (body.lines !== undefined) {
      lines = await parseLines(body.lines);
      if (typeof lines === 'string') return badRequest(lines);
    }

    const sale = await updateResellerSale(existing, { date: body.date, dueDate: body.dueDate, lines, notes: body.notes });
    return ok(sale, 'Pengambilan diperbarui');
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/resellers/sales/{id} — admin, or the kitchen while unpaid and not yet counted */
export async function deleteResellerSaleHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Sale id path parameter is required');

  try {
    const user = getUser(event);
    const kitchen = await resolveKitchen(user, event.queryStringParameters?.kitchen);
    if (typeof kitchen !== 'string') return kitchen;

    const existing = await getResellerSale(id);
    if (!existing || existing.kitchen !== kitchen) return notFound('Pengambilan tidak ditemukan');
    if (user!.type !== 'admin' && existing.payments.length > 0) {
      return forbidden('Pengambilan ini sudah ada pembayaran. Minta admin untuk menghapusnya.');
    }
    if (await lockedFor(user!, kitchen, existing.date)) return badRequest(COUNTED_MSG);

    await deleteResellerSale(id);
    return ok(null, 'Pengambilan dihapus');
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/resellers/sales/{id}/payments — Body: { amount, method, date, note? } */
export async function addResellerPaymentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Sale id path parameter is required');

  try {
    const user = getUser(event);
    const body = JSON.parse(event.body || '{}');
    const kitchen = await resolveKitchen(user, body.kitchen);
    if (typeof kitchen !== 'string') return kitchen;

    const existing = await getResellerSale(id);
    if (!existing || existing.kitchen !== kitchen) return notFound('Pengambilan tidak ditemukan');

    const payment = parsePayment(body);
    if (typeof payment === 'string') return badRequest(payment);
    if (payment.amount > existing.remaining) return badRequest('Pembayaran lebih besar dari sisa tagihan');

    return created(await addResellerPayment(existing, payment, actor(user!)), 'Pembayaran tercatat');
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/resellers/sales/{id}/payments/{paymentId} — admin only */
export async function deleteResellerPaymentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const { id, paymentId } = event.pathParameters || {};
  if (!id || !paymentId) return badRequest('Sale id and payment id path parameters are required');

  try {
    const user = getUser(event);
    const kitchen = await resolveKitchen(user, event.queryStringParameters?.kitchen);
    if (typeof kitchen !== 'string') return kitchen;
    if (user!.type !== 'admin') return forbidden('Hanya admin yang boleh menghapus pembayaran');

    const existing = await getResellerSale(id);
    if (!existing || existing.kitchen !== kitchen) return notFound('Pengambilan tidak ditemukan');
    return ok(await removeResellerPayment(existing, paymentId), 'Pembayaran dihapus');
  } catch (err) {
    return serverError(err);
  }
}
