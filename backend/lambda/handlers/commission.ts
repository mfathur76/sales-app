import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { listEmployees, createEmployee, updateEmployee } from '../services/commissionService';
import { getAllOutlets } from '../services/outletService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import {
  ok, created, badRequest, unauthorized, forbidden, notFound, serverError, preflight,
} from '../utils/response';
import { JwtUser } from '../types';

function getUser(event: APIGatewayProxyEvent): JwtUser | null {
  const token = extractBearerToken(event.headers['Authorization'] || event.headers['authorization']);
  return verifyToken(token);
}

/** Admin only. Returns the user, or the response to send back. */
function requireAdmin(event: APIGatewayProxyEvent): JwtUser | APIGatewayProxyResult {
  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Hanya admin yang boleh mengatur komisi');
  return user;
}

const isResponse = (x: JwtUser | APIGatewayProxyResult): x is APIGatewayProxyResult => 'statusCode' in x;

/** Outlet codes must be shops (not the kitchen), each listed once. */
async function parseOutlets(outlets: unknown): Promise<string | string[]> {
  if (!Array.isArray(outlets) || outlets.length === 0) return 'Pilih minimal satu outlet';
  const shops = new Set((await getAllOutlets()).filter((o) => o.role !== 'dapur').map((o) => o.code));
  const codes = [...new Set(outlets.map(String))];
  const unknown = codes.filter((c) => !shops.has(c));
  if (unknown.length) return `Outlet tidak dikenal: ${unknown.join(', ')}`;
  return codes.sort();
}

/** GET /api/commission/employees */
export async function getEmployeesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();
  const user = requireAdmin(event);
  if (isResponse(user)) return user;

  try {
    return ok(await listEmployees());
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/commission/employees — Body: { name, outlets: string[] } */
export async function createEmployeeHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();
  const user = requireAdmin(event);
  if (isResponse(user)) return user;

  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.name || !String(body.name).trim()) return badRequest('Nama karyawan wajib diisi');
    const outlets = await parseOutlets(body.outlets);
    if (typeof outlets === 'string') return badRequest(outlets);
    return created(await createEmployee({ name: String(body.name), outlets }), 'Karyawan tersimpan');
  } catch (err) {
    return serverError(err);
  }
}

/** PUT /api/commission/employees/{id} — Body: { name?, outlets?, isActive? } */
export async function updateEmployeeHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();
  const user = requireAdmin(event);
  if (isResponse(user)) return user;

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Employee id path parameter is required');

  try {
    const body = JSON.parse(event.body || '{}');
    if (body.name !== undefined && !String(body.name).trim()) return badRequest('Nama karyawan wajib diisi');
    let outlets: string[] | undefined;
    if (body.outlets !== undefined) {
      const parsed = await parseOutlets(body.outlets);
      if (typeof parsed === 'string') return badRequest(parsed);
      outlets = parsed;
    }
    const employee = await updateEmployee(id, {
      name: body.name !== undefined ? String(body.name) : undefined,
      outlets,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
    });
    if (!employee) return notFound('Karyawan tidak ditemukan');
    return ok(employee, 'Karyawan tersimpan');
  } catch (err) {
    return serverError(err);
  }
}
