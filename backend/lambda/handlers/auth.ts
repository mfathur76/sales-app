import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { loginOutlet, getAllOutlets } from '../services/outletService';
import { loginAdmin } from '../services/adminService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import { ok, badRequest, unauthorized, serverError, preflight } from '../utils/response';

/** POST /api/auth/login  – outlet login */
export async function outletLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    const body = JSON.parse(event.body || '{}');
    const { outlet, password } = body;

    if (!outlet || !password) {
      return badRequest('Outlet dan password harus diisi');
    }

    const result = await loginOutlet(outlet, password);
    if (!result.success) return unauthorized(result.message);

    return ok(result.data, result.message);
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/auth/outlets  – list all outlets (public, for login dropdown) */
export async function listOutlets(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    const outlets = await getAllOutlets();
    // Strip passwords before returning
    const safe = outlets.map(({ password: _pw, ...rest }) => rest);
    return ok(safe, 'Outlets retrieved successfully');
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/admin/login  – admin login */
export async function adminLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  try {
    const body = JSON.parse(event.body || '{}');
    const { username, password } = body;

    if (!username || !password) {
      return badRequest('Username and password are required');
    }

    const result = await loginAdmin(username, password);
    return ok(result.data, result.message);
  } catch (err) {
    if (err instanceof Error && err.message.includes('salah')) {
      return unauthorized(err.message);
    }
    return serverError(err);
  }
}

/** GET /api/health */
export async function healthCheck(): Promise<APIGatewayProxyResult> {
  return ok({ status: 'OK', timestamp: new Date().toISOString() }, 'Sales API is running');
}
