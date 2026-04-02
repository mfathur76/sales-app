import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  getAllOutlets,
  getOutletByCode,
  createOutlet,
  updateOutlet,
  deleteOutlet,
} from '../services/outletService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import {
  ok, created, badRequest, unauthorized, forbidden, notFound, serverError, preflight,
} from '../utils/response';
import { JwtUser } from '../types';

function getUser(event: APIGatewayProxyEvent): JwtUser | null {
  const token = extractBearerToken(event.headers['Authorization'] || event.headers['authorization']);
  return verifyToken(token);
}

function requireAdmin(user: JwtUser | null): APIGatewayProxyResult | null {
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Admin access required');
  return null;
}

/** GET /api/outlets */
export async function getOutlets(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  const authErr = requireAdmin(user);
  if (authErr) return authErr;

  try {
    const outlets = await getAllOutlets();
    const safe = outlets.map(({ password: _pw, ...rest }) => rest);
    return ok(safe, 'Outlets retrieved successfully');
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/outlets/{code} */
export async function getOutletByCodeHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  const authErr = requireAdmin(user);
  if (authErr) return authErr;

  const { code } = event.pathParameters || {};
  if (!code) return badRequest('Outlet code path parameter is required');

  try {
    const outlet = await getOutletByCode(code);
    if (!outlet) return notFound('Outlet not found');
    const { password: _pw, ...safe } = outlet;
    return ok(safe, 'Outlet retrieved successfully');
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/outlets */
export async function createOutletHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  const authErr = requireAdmin(user);
  if (authErr) return authErr;

  try {
    const body = JSON.parse(event.body || '{}');
    const { code, name, password } = body;

    if (!code || !name || !password) {
      return badRequest('Code, name, and password are required');
    }

    const outlet = await createOutlet({ code, name, password });
    const { password: _pw, ...safe } = outlet;
    return created(safe, 'Outlet created successfully');
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}

/** PUT /api/outlets/{code} */
export async function updateOutletHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  const authErr = requireAdmin(user);
  if (authErr) return authErr;

  const { code } = event.pathParameters || {};
  if (!code) return badRequest('Outlet code path parameter is required');

  try {
    const body = JSON.parse(event.body || '{}');
    const outlet = await updateOutlet(code, body);
    if (!outlet) return notFound('Outlet not found');
    const { password: _pw, ...safe } = outlet;
    return ok(safe, 'Outlet updated successfully');
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/outlets/{code} */
export async function deleteOutletHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  const authErr = requireAdmin(user);
  if (authErr) return authErr;

  const { code } = event.pathParameters || {};
  if (!code) return badRequest('Outlet code path parameter is required');

  try {
    await deleteOutlet(code);
    return ok(null, 'Outlet deleted successfully');
  } catch (err) {
    return serverError(err);
  }
}
