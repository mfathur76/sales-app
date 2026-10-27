import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  listOrders,
  getOrderById,
  createOrder,
  updateOrder,
  addPayment,
  removePayment,
  deleteOrder,
  OrderInput,
  PaymentInput,
} from '../services/orderService';
import { getCustomerById } from '../services/customerService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import {
  ok, created, badRequest, unauthorized, forbidden, notFound, serverError, preflight,
} from '../utils/response';
import { JwtUser, Order, OrderStatus, PaymentStatus } from '../types';

const ORDER_STATUSES: OrderStatus[] = ['baru', 'diproses', 'siap', 'selesai', 'batal'];
const PAYMENT_STATUSES: PaymentStatus[] = ['belum_bayar', 'dp', 'lunas'];
const PAYMENT_METHODS = ['cash', 'transfer', 'qris'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function getUser(event: APIGatewayProxyEvent): JwtUser | null {
  const token = extractBearerToken(event.headers['Authorization'] || event.headers['authorization']);
  return verifyToken(token);
}

function actor(user: JwtUser): string | undefined {
  return user.type === 'admin' ? user.username : user.outlet;
}

/** Outlet staff may only change orders that belong to their own outlet. */
function canModify(user: JwtUser, order: Order): boolean {
  return user.type === 'admin' || user.outlet === order.outlet;
}

function isAmount(v: unknown): boolean {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

/**
 * Validate order fields. With `partial`, only fields present in the body are checked
 * (used by PUT). Returns an error message, or the cleaned input.
 */
function parseOrderInput(body: any, partial: boolean): string | Partial<OrderInput> {
  const out: Partial<OrderInput> = {};
  const has = (k: string) => body[k] !== undefined;

  if (!partial || has('orderDate')) {
    if (!DATE_RE.test(body.orderDate || '')) return 'Tanggal order tidak valid';
    out.orderDate = body.orderDate;
  }
  if (!partial || has('pickupDate')) {
    if (!DATE_RE.test(body.pickupDate || '')) return 'Tanggal ambil/antar wajib diisi';
    out.pickupDate = body.pickupDate;
  }
  if (has('pickupTime')) {
    if (body.pickupTime && !TIME_RE.test(body.pickupTime)) return 'Jam ambil tidak valid';
    out.pickupTime = body.pickupTime || '';
  }
  if (!partial || has('fulfillment')) {
    const f = body.fulfillment || 'ambil';
    if (f !== 'ambil' && f !== 'antar') return 'Pilihan ambil/antar tidak valid';
    out.fulfillment = f;
  }
  if (has('deliveryAddress')) out.deliveryAddress = String(body.deliveryAddress || '');
  if (has('deliveryFee')) {
    if (!isAmount(body.deliveryFee)) return 'Ongkir tidak valid';
    out.deliveryFee = body.deliveryFee;
  }
  if (!partial || has('items')) {
    if (!body.items || !String(body.items).trim()) return 'Isi order wajib diisi';
    out.items = String(body.items);
  }
  if (!partial || has('total')) {
    if (!isAmount(body.total)) return 'Total harga tidak valid';
    out.total = body.total;
  }
  if (has('status')) {
    if (!ORDER_STATUSES.includes(body.status)) return 'Status order tidak valid';
    out.status = body.status;
  }
  if (has('notes')) out.notes = String(body.notes || '');

  if (out.fulfillment === 'antar' && !partial && !String(out.deliveryAddress || '').trim()) {
    return 'Alamat pengiriman wajib diisi untuk order yang diantar';
  }
  return out;
}

function parsePayment(body: any): string | PaymentInput {
  if (!isAmount(body.amount) || body.amount <= 0) return 'Jumlah pembayaran harus lebih dari 0';
  if (!PAYMENT_METHODS.includes(body.method)) return 'Metode bayar harus cash, transfer, atau qris';
  if (!DATE_RE.test(body.date || '')) return 'Tanggal pembayaran tidak valid';
  return { amount: body.amount, method: body.method, date: body.date, note: body.note };
}

/**
 * GET /api/orders
 * Query: outlet, customerId, pickupFrom, pickupTo, status, paymentStatus, unpaid=1
 */
export async function getOrders(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const qs = event.queryStringParameters || {};
    if (qs.status && !ORDER_STATUSES.includes(qs.status as OrderStatus)) return badRequest('Invalid status');
    if (qs.paymentStatus && !PAYMENT_STATUSES.includes(qs.paymentStatus as PaymentStatus)) {
      return badRequest('Invalid paymentStatus');
    }

    const orders = await listOrders({
      outlet: qs.outlet,
      customerId: qs.customerId,
      pickupFrom: qs.pickupFrom,
      pickupTo: qs.pickupTo,
      status: qs.status as OrderStatus | undefined,
      paymentStatus: qs.paymentStatus as PaymentStatus | undefined,
      unpaidOnly: qs.unpaid === '1' || qs.unpaid === 'true',
    });
    return ok(orders);
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/orders/{id} */
export async function getOrder(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Order id path parameter is required');

  try {
    const order = await getOrderById(id);
    if (!order) return notFound('Order tidak ditemukan');
    return ok(order);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/orders
 * Body: { customerId, outlet?, orderDate, pickupDate, pickupTime?, fulfillment, deliveryAddress?,
 *         deliveryFee?, items, total, status?, notes?, payment?: { amount, method, date, note? } }
 */
export async function createOrderHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const body = JSON.parse(event.body || '{}');

    const outlet = user.type === 'outlet' ? user.outlet : body.outlet;
    if (!outlet) return badRequest('Outlet wajib diisi');
    if (!body.customerId) return badRequest('Customer wajib dipilih');

    const input = parseOrderInput(body, false);
    if (typeof input === 'string') return badRequest(input);

    let payment: PaymentInput | undefined;
    if (body.payment && body.payment.amount) {
      const p = parsePayment(body.payment);
      if (typeof p === 'string') return badRequest(p);
      payment = p;
    }

    const customer = await getCustomerById(body.customerId);
    if (!customer) return badRequest('Customer tidak ditemukan');

    const order = await createOrder(customer, { ...(input as OrderInput), outlet }, payment, actor(user));
    return created(order, 'Order berhasil disimpan');
  } catch (err) {
    return serverError(err);
  }
}

/** PUT /api/orders/{id} — partial update; payments go through the payments endpoints */
export async function updateOrderHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Order id path parameter is required');

  try {
    const existing = await getOrderById(id);
    if (!existing) return notFound('Order tidak ditemukan');
    if (!canModify(user, existing)) return forbidden('Order ini milik outlet lain');

    const body = JSON.parse(event.body || '{}');
    const input = parseOrderInput(body, true);
    if (typeof input === 'string') return badRequest(input);

    // Only admins can move an order to another outlet
    if (user.type === 'admin' && body.outlet) input.outlet = body.outlet;

    const fulfillment = input.fulfillment ?? existing.fulfillment;
    const address = input.deliveryAddress ?? existing.deliveryAddress;
    if (fulfillment === 'antar' && !String(address || '').trim()) {
      return badRequest('Alamat pengiriman wajib diisi untuk order yang diantar');
    }

    let customer;
    if (body.customerId && body.customerId !== existing.customerId) {
      customer = await getCustomerById(body.customerId);
      if (!customer) return badRequest('Customer tidak ditemukan');
    }

    const order = await updateOrder(id, input, customer || undefined);
    return ok(order, 'Order berhasil diperbarui');
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/orders/{id}/payments — Body: { amount, method, date, note? } */
export async function addPaymentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Order id path parameter is required');

  try {
    const existing = await getOrderById(id);
    if (!existing) return notFound('Order tidak ditemukan');
    if (!canModify(user, existing)) return forbidden('Order ini milik outlet lain');

    const payment = parsePayment(JSON.parse(event.body || '{}'));
    if (typeof payment === 'string') return badRequest(payment);

    const order = await addPayment(id, payment, actor(user));
    return created(order, 'Pembayaran berhasil dicatat');
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/orders/{id}/payments/{paymentId} — admin only */
export async function deletePaymentHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Hanya admin yang boleh menghapus pembayaran');

  const { id, paymentId } = event.pathParameters || {};
  if (!id || !paymentId) return badRequest('Order id and payment id path parameters are required');

  try {
    const order = await removePayment(id, paymentId);
    if (!order) return notFound('Order tidak ditemukan');
    return ok(order, 'Pembayaran berhasil dihapus');
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/orders/{id} — admin only */
export async function deleteOrderHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Hanya admin yang boleh menghapus order');

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Order id path parameter is required');

  try {
    await deleteOrder(id);
    return ok(null, 'Order berhasil dihapus');
  } catch (err) {
    return serverError(err);
  }
}
