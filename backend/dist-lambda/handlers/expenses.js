"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpenses = getExpenses;
exports.getExpense = getExpense;
exports.createExpenseHandler = createExpenseHandler;
exports.updateExpenseHandler = updateExpenseHandler;
exports.deleteExpenseHandler = deleteExpenseHandler;
exports.getCategories = getCategories;
exports.createCategoryHandler = createCategoryHandler;
exports.getItems = getItems;
exports.createItemHandler = createItemHandler;
const expenseService_1 = require("../services/expenseService");
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
function getUser(event) {
    const token = (0, jwt_1.extractBearerToken)(event.headers['Authorization'] || event.headers['authorization']);
    return (0, jwt_1.verifyToken)(token);
}
// ---- Expenses ----
/** GET /api/expenses */
async function getExpenses(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    try {
        const qs = event.queryStringParameters || {};
        const outletFilter = user.type === 'outlet' ? user.outlet : qs.outlet;
        const expenses = await (0, expenseService_1.getAllExpenses)(outletFilter, qs.categoryId, qs.startDate ? new Date(qs.startDate) : undefined, qs.endDate ? new Date(qs.endDate) : undefined, qs.status);
        return (0, response_1.ok)(expenses);
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** GET /api/expenses/{id} */
async function getExpense(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    const { id } = event.pathParameters || {};
    if (!id)
        return (0, response_1.badRequest)('Expense id path parameter is required');
    try {
        const expense = await (0, expenseService_1.getExpenseById)(id);
        if (!expense)
            return (0, response_1.notFound)('Expense not found');
        // Outlet users can only see their own
        if (user.type === 'outlet' && user.outlet !== expense.outlet) {
            return (0, response_1.forbidden)('Access denied: You can only view expenses for your own outlet');
        }
        return (0, response_1.ok)(expense);
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** POST /api/expenses */
async function createExpenseHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    try {
        const body = JSON.parse(event.body || '{}');
        const { outlet, itemId, date, quantity, actualPrice, notes, isCash } = body;
        if (!outlet || !itemId || !date || quantity === undefined || actualPrice === undefined) {
            return (0, response_1.badRequest)('Missing required fields: outlet, itemId, date, quantity, actualPrice');
        }
        if (quantity <= 0 || actualPrice <= 0) {
            return (0, response_1.badRequest)('Quantity and actualPrice must be greater than 0');
        }
        // Outlet users can only create for their own outlet
        if (user.type === 'outlet' && user.outlet !== outlet) {
            return (0, response_1.forbidden)('Access denied: You can only create expenses for your own outlet');
        }
        const expense = await (0, expenseService_1.createExpense)({
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
        return (0, response_1.created)(expense);
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** PUT /api/expenses/{id} */
async function updateExpenseHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    const { id } = event.pathParameters || {};
    if (!id)
        return (0, response_1.badRequest)('Expense id path parameter is required');
    try {
        const existing = await (0, expenseService_1.getExpenseById)(id);
        if (!existing)
            return (0, response_1.notFound)('Expense not found');
        if (user.type === 'outlet' && user.outlet !== existing.outlet) {
            return (0, response_1.forbidden)('Access denied: You can only update expenses for your own outlet');
        }
        const body = JSON.parse(event.body || '{}');
        if (body.quantity !== undefined && body.quantity <= 0) {
            return (0, response_1.badRequest)('Quantity must be greater than 0');
        }
        if (body.actualPrice !== undefined && body.actualPrice <= 0) {
            return (0, response_1.badRequest)('actualPrice must be greater than 0');
        }
        if (user.type === 'outlet' && body.outlet && body.outlet !== existing.outlet) {
            return (0, response_1.forbidden)('Access denied: You can only move expenses within your own outlet');
        }
        const updated = await (0, expenseService_1.updateExpense)(id, {
            outlet: body.outlet,
            itemId: body.itemId,
            date: body.date ? new Date(body.date) : undefined,
            quantity: body.quantity,
            actualPrice: body.actualPrice,
            notes: body.notes,
            isCash: typeof body.isCash === 'boolean' ? body.isCash : undefined,
            updatedBy: user.username ?? user.name,
        });
        if (!updated)
            return (0, response_1.notFound)('Expense not found');
        return (0, response_1.ok)(updated);
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** DELETE /api/expenses/{id}  – admin only */
async function deleteExpenseHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    if (user.type !== 'admin')
        return (0, response_1.forbidden)('Admin access required');
    const { id } = event.pathParameters || {};
    if (!id)
        return (0, response_1.badRequest)('Expense id path parameter is required');
    try {
        await (0, expenseService_1.deleteExpense)(id);
        return (0, response_1.ok)(null, 'Expense deleted successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
// ---- Categories ----
/** GET /api/expenses/categories */
async function getCategories(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    try {
        const categories = await (0, expenseService_1.getAllCategories)();
        return (0, response_1.ok)(categories);
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** POST /api/expenses/categories  – admin only */
async function createCategoryHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    if (user.type !== 'admin')
        return (0, response_1.forbidden)('Admin access required');
    try {
        const body = JSON.parse(event.body || '{}');
        if (!body.name)
            return (0, response_1.badRequest)('Category name is required');
        const category = await (0, expenseService_1.createCategory)(body);
        return (0, response_1.created)(category);
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
// ---- Item Masters ----
/** GET /api/expenses/items */
async function getItems(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    try {
        const qs = event.queryStringParameters || {};
        const items = await (0, expenseService_1.getAllItems)(qs.categoryId);
        return (0, response_1.ok)(items);
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** POST /api/expenses/items  – admin only */
async function createItemHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    if (user.type !== 'admin')
        return (0, response_1.forbidden)('Admin access required');
    try {
        const body = JSON.parse(event.body || '{}');
        if (!body.name || !body.categoryId)
            return (0, response_1.badRequest)('name and categoryId are required');
        const item = await (0, expenseService_1.createItem)(body);
        return (0, response_1.created)(item);
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
//# sourceMappingURL=expenses.js.map