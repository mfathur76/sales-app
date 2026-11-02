import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getProfitLoss } from '../services/reportService';
import { saveFixedCosts } from '../services/fixedCostService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import { ok, badRequest, unauthorized, forbidden, serverError, preflight } from '../utils/response';
import { FixedCost, JwtUser } from '../types';

const MAX_RANGE_DAYS = 366;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const MAX_FIXED_COSTS = 100;

function getUser(event: APIGatewayProxyEvent): JwtUser | null {
  const token = extractBearerToken(event.headers['Authorization'] || event.headers['authorization']);
  return verifyToken(token);
}

/** GET /api/reports/profit-loss?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD (admin only) */
export async function getProfitLossHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Admin access required');

  try {
    const { startDate, endDate } = event.queryStringParameters || {};
    if (!startDate || !endDate || !DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
      return badRequest('startDate and endDate (YYYY-MM-DD) are required');
    }
    const days = (Date.parse(endDate) - Date.parse(startDate)) / 86400000;
    if (Number.isNaN(days) || days < 0) return badRequest('endDate must not be before startDate');
    if (days >= MAX_RANGE_DAYS) return badRequest(`Range is limited to ${MAX_RANGE_DAYS} days`);

    return ok(await getProfitLoss(startDate, endDate));
  } catch (err) {
    return serverError(err);
  }
}

/** Returns an error message, or the cleaned-up list. */
function parseFixedCosts(items: unknown): string | FixedCost[] {
  if (!Array.isArray(items)) return 'Daftar biaya tetap tidak valid';
  if (items.length > MAX_FIXED_COSTS) return `Maksimal ${MAX_FIXED_COSTS} biaya tetap`;
  const out: FixedCost[] = [];
  for (const [i, c] of (items as any[]).entries()) {
    const row = `Baris ${i + 1}`;
    const category = typeof c?.category === 'string' ? c.category.trim() : '';
    if (!category) return `${row}: jenis biaya wajib diisi`;
    if (typeof c.amount !== 'number' || !Number.isFinite(c.amount) || c.amount <= 0) return `${row}: jumlah harus lebih dari 0`;
    if (c.period !== 'bulan' && c.period !== 'tahun') return `${row}: pilih per bulan atau per tahun`;
    if (!MONTH_RE.test(c.startMonth || '')) return `${row}: bulan mulai tidak valid`;
    if (c.endMonth && (!MONTH_RE.test(c.endMonth) || c.endMonth < c.startMonth)) return `${row}: bulan selesai tidak valid`;
    const isAsset = c.assetCost !== undefined && c.assetCost !== null;
    if (isAsset && (typeof c.assetCost !== 'number' || c.assetCost <= 0 || !Number.isInteger(c.lifeYears) || c.lifeYears < 1 || c.lifeYears > 50)) {
      return `${row}: harga beli dan umur aset (1-50 tahun) wajib diisi`;
    }
    out.push({
      id: typeof c.id === 'string' && c.id ? c.id : `fc-${Date.now()}-${i}`,
      category,
      name: typeof c.name === 'string' && c.name.trim() ? c.name.trim() : undefined,
      amount: Math.round(c.amount),
      period: c.period,
      startMonth: c.startMonth,
      endMonth: c.endMonth || undefined,
      assetCost: isAsset ? Math.round(c.assetCost) : undefined,
      lifeYears: isAsset ? c.lifeYears : undefined,
    });
  }
  return out;
}

/** PUT /api/reports/fixed-costs — Body: { items: FixedCost[] } replaces the whole list (admin only) */
export async function saveFixedCostsHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Admin access required');

  try {
    const parsed = parseFixedCosts(JSON.parse(event.body || '{}').items);
    if (typeof parsed === 'string') return badRequest(parsed);
    return ok(await saveFixedCosts(parsed, user.username), 'Biaya tetap tersimpan');
  } catch (err) {
    return serverError(err);
  }
}
