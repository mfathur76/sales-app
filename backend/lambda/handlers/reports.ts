import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { getProfitLoss } from '../services/reportService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import { ok, badRequest, unauthorized, forbidden, serverError, preflight } from '../utils/response';
import { JwtUser } from '../types';

const MAX_RANGE_DAYS = 366;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
