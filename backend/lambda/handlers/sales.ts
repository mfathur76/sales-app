import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  getAllOutletSales,
  getOutletSaleByOutletAndDate,
  createOutletSale,
  updateOutletSale,
  updateBankTransfer,
  deleteOutletSale,
  getOutletSalesStats,
  getOutletOptions,
} from '../services/salesService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import {
  ok, created, badRequest, unauthorized, forbidden, notFound, serverError, preflight,
} from '../utils/response';
import { JwtUser } from '../types';

function getUser(event: APIGatewayProxyEvent): JwtUser | null {
  const token = extractBearerToken(event.headers['Authorization'] || event.headers['authorization']);
  return verifyToken(token);
}

/** GET /api/sales */
export async function getSales(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const qs = event.queryStringParameters || {};
    const filters = {
      start_date: qs.start_date,
      end_date: qs.end_date,
      // Outlet users can only see their own data
      outlet: user.type === 'outlet' ? user.outlet : qs.outlet,
    };

    const sales = await getAllOutletSales(filters);
    return ok(sales, 'Outlet sales records retrieved successfully');
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/sales/stats */
export async function getSalesStats(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const qs = event.queryStringParameters || {};
    const filters = {
      start_date: qs.start_date,
      end_date: qs.end_date,
      outlet: user.type === 'outlet' ? user.outlet : qs.outlet,
    };

    const stats = await getOutletSalesStats(filters);
    return ok(stats, 'Outlet sales statistics retrieved successfully');
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/sales/options */
export async function getSalesOutletOptions(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const options = await getOutletOptions();
    return ok(options, 'Outlet options retrieved successfully');
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/sales/{outlet}/{date} */
export async function getSaleByOutletDate(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { outlet, date } = event.pathParameters || {};
  if (!outlet || !date) return badRequest('Outlet and date path parameters are required');

  // Outlet users can only access their own data
  if (user.type === 'outlet' && user.outlet !== outlet) {
    return forbidden('Access denied: You can only view your own outlet data');
  }

  try {
    const sale = await getOutletSaleByOutletAndDate(outlet, date);
    if (!sale) return notFound(`No sale record found for outlet ${outlet} on ${date}`);
    return ok(sale, 'Outlet sale record retrieved successfully');
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/sales */
export async function createSale(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const body = JSON.parse(event.body || '{}');
    const { outlet, date, cash, qris, gojek, shopee, grab } = body;

    if (!outlet || !date) return badRequest('Outlet and date are required');
    if (cash === undefined && qris === undefined && gojek === undefined &&
        shopee === undefined && grab === undefined) {
      return badRequest('At least one sales value is required');
    }

    // Outlet users can only create for their outlet
    if (user.type === 'outlet' && user.outlet !== outlet) {
      return forbidden('Access denied: You can only create sales for your own outlet');
    }

    const sale = await createOutletSale({
      outlet,
      date,
      cash: cash ?? 0,
      qris: qris ?? 0,
      gojek: gojek ?? 0,
      shopee: shopee ?? 0,
      grab: grab ?? 0,
    });

    return created(sale, 'Outlet sale created successfully');
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}

/** PUT /api/sales/{outlet}/{date} */
export async function updateSale(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { outlet, date } = event.pathParameters || {};
  if (!outlet || !date) return badRequest('Outlet and date path parameters are required');

  if (user.type === 'outlet' && user.outlet !== outlet) {
    return forbidden('Access denied: You can only update your own outlet data');
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const updated = await updateOutletSale(outlet, date, body);
    if (!updated) return notFound(`Sale record not found for outlet ${outlet} on ${date}`);
    return ok(updated, 'Outlet sale updated successfully');
  } catch (err) {
    return serverError(err);
  }
}

/** PUT /api/sales/{outlet}/{date}/bank  – admin-only bank transfer update */
export async function updateSaleBank(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Admin access required');

  const { outlet, date } = event.pathParameters || {};
  if (!outlet || !date) return badRequest('Outlet and date path parameters are required');

  try {
    const body = JSON.parse(event.body || '{}');
    const updated = await updateBankTransfer(outlet, date, {
      ...body,
      verifiedBy: user.username,
    });
    if (!updated) return notFound(`Sale record not found for outlet ${outlet} on ${date}`);
    return ok(updated, 'Bank transfer data updated successfully');
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/sales/{outlet}/{date} */
export async function deleteSale(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Admin access required');

  const { outlet, date } = event.pathParameters || {};
  if (!outlet || !date) return badRequest('Outlet and date path parameters are required');

  try {
    await deleteOutletSale(outlet, date);
    return ok(null, 'Sale record deleted successfully');
  } catch (err) {
    return serverError(err);
  }
}
