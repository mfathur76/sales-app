import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  normalizePhone,
  DuplicatePhoneError,
} from '../services/customerService';
import { listOrders, syncCustomerOnOrders } from '../services/orderService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import {
  ok, created, badRequest, unauthorized, forbidden, notFound, serverError, preflight,
} from '../utils/response';
import { JwtUser } from '../types';

function getUser(event: APIGatewayProxyEvent): JwtUser | null {
  const token = extractBearerToken(event.headers['Authorization'] || event.headers['authorization']);
  return verifyToken(token);
}

function validPhone(phone: unknown): boolean {
  const n = normalizePhone(String(phone || ''));
  return n.length >= 9 && n.length <= 15;
}

/** Customers are shared by every outlet, so a duplicate points staff at the existing record. */
function duplicateResponse(err: DuplicatePhoneError): APIGatewayProxyResult {
  const res = badRequest(err.message);
  const body = JSON.parse(res.body);
  return { ...res, body: JSON.stringify({ ...body, existingCustomer: err.existing }) };
}

/** GET /api/customers?q= */
export async function getCustomers(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const qs = event.queryStringParameters || {};
    return ok(await listCustomers(qs.q));
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/customers/{id} — the customer plus their order history */
export async function getCustomer(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Customer id path parameter is required');

  try {
    const customer = await getCustomerById(id);
    if (!customer) return notFound('Customer tidak ditemukan');

    const orders = await listOrders({ customerId: id });
    orders.sort((a, b) => b.pickupDate.localeCompare(a.pickupDate));
    return ok({ ...customer, orders });
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/customers */
export async function createCustomerHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, phone, address, notes } = body;

    if (!name || !String(name).trim()) return badRequest('Nama customer wajib diisi');
    if (!validPhone(phone)) return badRequest('Nomor HP/WA tidak valid');

    // Outlet staff always register under their own outlet
    const outlet = user.type === 'outlet' ? user.outlet : body.outlet;
    if (!outlet) return badRequest('Outlet wajib diisi');

    const customer = await createCustomer({
      name,
      phone,
      address,
      notes,
      outlet,
      createdBy: user.type === 'admin' ? user.username : user.outlet,
    });
    return created(customer, 'Customer berhasil ditambahkan');
  } catch (err) {
    if (err instanceof DuplicatePhoneError) return duplicateResponse(err);
    return serverError(err);
  }
}

/** PUT /api/customers/{id} */
export async function updateCustomerHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Customer id path parameter is required');

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, phone, address, notes } = body;

    if (name !== undefined && !String(name).trim()) return badRequest('Nama customer wajib diisi');
    if (phone !== undefined && !validPhone(phone)) return badRequest('Nomor HP/WA tidak valid');

    const customer = await updateCustomer(id, { name, phone, address, notes });
    if (!customer) return notFound('Customer tidak ditemukan');

    await syncCustomerOnOrders(customer);
    return ok(customer, 'Customer berhasil diperbarui');
  } catch (err) {
    if (err instanceof DuplicatePhoneError) return duplicateResponse(err);
    return serverError(err);
  }
}

/** DELETE /api/customers/{id} — admin only, and only when the customer has no orders */
export async function deleteCustomerHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Hanya admin yang boleh menghapus customer');

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Customer id path parameter is required');

  try {
    const orders = await listOrders({ customerId: id });
    if (orders.length > 0) {
      return badRequest(`Customer masih punya ${orders.length} order. Hapus order-nya dulu.`);
    }
    await deleteCustomer(id);
    return ok(null, 'Customer berhasil dihapus');
  } catch (err) {
    return serverError(err);
  }
}
