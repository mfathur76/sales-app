import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  getAdminByUsername,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  changePassword,
} from '../services/adminService';
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

function requireSuperAdmin(user: JwtUser | null): APIGatewayProxyResult | null {
  const err = requireAdmin(user);
  if (err) return err;
  if (user!.role !== 'super_admin') return forbidden('Super admin access required');
  return null;
}

/** GET /api/admin/profile */
export async function getProfile(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  const authErr = requireAdmin(user);
  if (authErr) return authErr;

  try {
    const admin = await getAdminByUsername(user!.username!);
    if (!admin) return notFound('Admin not found');
    return ok(admin, 'Admin profile retrieved successfully');
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/admin/list */
export async function listAdmins(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  const authErr = requireSuperAdmin(user);
  if (authErr) return authErr;

  try {
    const admins = await getAllAdmins();
    return ok(admins, 'Admin list retrieved successfully');
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/admin/create */
export async function createAdminHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  const authErr = requireSuperAdmin(user);
  if (authErr) return authErr;

  try {
    const body = JSON.parse(event.body || '{}');
    const { username, name, password, role } = body;

    if (!username || !name || !password) {
      return badRequest('Username, name, and password are required');
    }

    const admin = await createAdmin({ username, name, password, role });
    return created(admin, 'Admin created successfully');
  } catch (err) {
    if (err instanceof Error && err.message.includes('already exists')) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}

/** PUT /api/admin/{username} */
export async function updateAdminHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  const authErr = requireSuperAdmin(user);
  if (authErr) return authErr;

  const { username } = event.pathParameters || {};
  if (!username) return badRequest('Username path parameter is required');

  try {
    const body = JSON.parse(event.body || '{}');
    const admin = await updateAdmin(username, body);
    return ok(admin, 'Admin updated successfully');
  } catch (err) {
    if (err instanceof Error && err.message === 'Admin not found') return notFound(err.message);
    return serverError(err);
  }
}

/** DELETE /api/admin/{username} */
export async function deleteAdminHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  const authErr = requireSuperAdmin(user);
  if (authErr) return authErr;

  const { username } = event.pathParameters || {};
  if (!username) return badRequest('Username path parameter is required');

  // Prevent self-delete
  if (username === user!.username) return badRequest('Cannot delete your own admin account');

  try {
    const result = await deleteAdmin(username);
    return ok(null, result.message);
  } catch (err) {
    if (err instanceof Error && err.message === 'Admin not found') return notFound(err.message);
    return serverError(err);
  }
}

/** POST /api/admin/change-password */
export async function changePasswordHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  const authErr = requireAdmin(user);
  if (authErr) return authErr;

  try {
    const body = JSON.parse(event.body || '{}');
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return badRequest('oldPassword and newPassword are required');
    }
    if (newPassword.length < 6) {
      return badRequest('New password must be at least 6 characters');
    }

    const result = await changePassword(user!.username!, oldPassword, newPassword);
    return ok(null, result.message);
  } catch (err) {
    if (err instanceof Error && err.message.includes('Password lama')) {
      return badRequest(err.message);
    }
    return serverError(err);
  }
}
