import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getAllCategories,
  createCategory,
  getAllItems,
  createItem,
} from '../services/expenseService';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import {
  ok, created, badRequest, unauthorized, forbidden, notFound, serverError, preflight,
} from '../utils/response';
import { JwtUser } from '../types';

function getUser(event: APIGatewayProxyEvent): JwtUser | null {
  const token = extractBearerToken(event.headers['Authorization'] || event.headers['authorization']);
  return verifyToken(token);
}

// ---- Expenses ----

/** GET /api/expenses */
export async function getExpenses(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const qs = event.queryStringParameters || {};
    const outletFilter = user.type === 'outlet' ? user.outlet : qs.outlet;

    const expenses = await getAllExpenses(
      outletFilter,
      qs.categoryId,
      qs.startDate ? new Date(qs.startDate) : undefined,
      qs.endDate   ? new Date(qs.endDate)   : undefined,
      qs.status,
    );

    return ok(expenses);
  } catch (err) {
    return serverError(err);
  }
}

/** GET /api/expenses/{id} */
export async function getExpense(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Expense id path parameter is required');

  try {
    const expense = await getExpenseById(id);
    if (!expense) return notFound('Expense not found');

    // Outlet users can only see their own
    if (user.type === 'outlet' && user.outlet !== expense.outlet) {
      return forbidden('Access denied: You can only view expenses for your own outlet');
    }

    return ok(expense);
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/expenses */
export async function createExpenseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const body = JSON.parse(event.body || '{}');
    const { outlet, itemId, date, quantity, actualPrice, notes, isCash } = body;

    if (!outlet || !itemId || !date || quantity === undefined || actualPrice === undefined) {
      return badRequest('Missing required fields: outlet, itemId, date, quantity, actualPrice');
    }
    if (quantity <= 0 || actualPrice <= 0) {
      return badRequest('Quantity and actualPrice must be greater than 0');
    }

    // Outlet users can only create for their own outlet
    if (user.type === 'outlet' && user.outlet !== outlet) {
      return forbidden('Access denied: You can only create expenses for your own outlet');
    }

    const expense = await createExpense({
      outlet,
      itemId,
      date: new Date(date),
      quantity: parseFloat(quantity),
      actualPrice: parseFloat(actualPrice),
      totalPrice: parseFloat(quantity) * parseFloat(actualPrice),
      notes,
      isCash: typeof isCash === 'boolean' ? isCash : true,
      createdBy: user.type === 'admin' ? user.username : undefined,
    });

    return created(expense);
  } catch (err) {
    return serverError(err);
  }
}

/** PUT /api/expenses/{id} */
export async function updateExpenseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Expense id path parameter is required');

  try {
    const existing = await getExpenseById(id);
    if (!existing) return notFound('Expense not found');

    if (user.type === 'outlet' && user.outlet !== existing.outlet) {
      return forbidden('Access denied: You can only update expenses for your own outlet');
    }

    const body = JSON.parse(event.body || '{}');
    if (body.quantity !== undefined && body.quantity <= 0) {
      return badRequest('Quantity must be greater than 0');
    }
    if (body.actualPrice !== undefined && body.actualPrice <= 0) {
      return badRequest('actualPrice must be greater than 0');
    }
    if (user.type === 'outlet' && body.outlet && body.outlet !== existing.outlet) {
      return forbidden('Access denied: You can only move expenses within your own outlet');
    }

    const updated = await updateExpense(id, {
      outlet: body.outlet,
      itemId: body.itemId,
      date: body.date ? new Date(body.date) : undefined,
      quantity: body.quantity,
      actualPrice: body.actualPrice,
      notes: body.notes,
      isCash: typeof body.isCash === 'boolean' ? body.isCash : undefined,
      updatedBy: user.username ?? user.name,
    });

    if (!updated) return notFound('Expense not found');
    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/expenses/{id}  – admin only */
export async function deleteExpenseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Admin access required');

  const { id } = event.pathParameters || {};
  if (!id) return badRequest('Expense id path parameter is required');

  try {
    await deleteExpense(id);
    return ok(null, 'Expense deleted successfully');
  } catch (err) {
    return serverError(err);
  }
}

// ---- Categories ----

/** GET /api/expenses/categories */
export async function getCategories(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const categories = await getAllCategories();
    return ok(categories);
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/expenses/categories  – admin only */
export async function createCategoryHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Admin access required');

  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.name) return badRequest('Category name is required');
    const category = await createCategory(body);
    return created(category);
  } catch (err) {
    return serverError(err);
  }
}

// ---- Item Masters ----

/** GET /api/expenses/items */
export async function getItems(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');

  try {
    const qs = event.queryStringParameters || {};
    const items = await getAllItems(qs.categoryId);
    return ok(items);
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/expenses/items  – admin only */
export async function createItemHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const user = getUser(event);
  if (!user) return unauthorized('Access token required');
  if (user.type !== 'admin') return forbidden('Admin access required');

  try {
    const body = JSON.parse(event.body || '{}');
    if (!body.name || !body.categoryId) return badRequest('name and categoryId are required');
    const item = await createItem(body);
    return created(item);
  } catch (err) {
    return serverError(err);
  }
}
