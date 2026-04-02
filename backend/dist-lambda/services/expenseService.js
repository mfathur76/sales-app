"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCategories = getAllCategories;
exports.createCategory = createCategory;
exports.getAllItems = getAllItems;
exports.getItemById = getItemById;
exports.createItem = createItem;
exports.getAllExpenses = getAllExpenses;
exports.getExpenseById = getExpenseById;
exports.createExpense = createExpense;
exports.updateExpense = updateExpense;
exports.approveExpense = approveExpense;
exports.rejectExpense = rejectExpense;
exports.deleteExpense = deleteExpense;
const uuid_1 = require("uuid");
const dynamodb_1 = require("./dynamodb");
// ---- Expense Categories ----
const CAT_TABLE = dynamodb_1.TABLES.EXPENSE_CATEGORIES;
const ITEM_TABLE = dynamodb_1.TABLES.ITEM_MASTERS;
const EXP_TABLE = dynamodb_1.TABLES.EXPENSES;
async function getAllCategories() {
    const items = await (0, dynamodb_1.dbScan)(CAT_TABLE);
    return items.filter((i) => i.isActive !== false);
}
async function createCategory(data) {
    const now = new Date().toISOString();
    const item = {
        PK: `CATEGORY#${data.name.toUpperCase()}`,
        SK: 'PROFILE',
        id: (0, uuid_1.v4)(),
        name: data.name,
        description: data.description,
        isActive: true,
        createdAt: now,
        updatedAt: now,
    };
    await (0, dynamodb_1.dbPut)(CAT_TABLE, item);
    return item;
}
// ---- Item Masters ----
async function getAllItems(categoryId) {
    const items = await (0, dynamodb_1.dbScan)(ITEM_TABLE);
    let filtered = items.filter((i) => i.isActive !== false);
    if (categoryId)
        filtered = filtered.filter((i) => i.categoryId === categoryId);
    return filtered;
}
async function getItemById(id) {
    const items = await (0, dynamodb_1.dbScan)(ITEM_TABLE, 'id = :id', { ':id': id });
    return items[0] ?? null;
}
async function createItem(data) {
    const now = new Date().toISOString();
    const item = {
        PK: `ITEM#${(0, uuid_1.v4)()}`,
        SK: 'PROFILE',
        id: (0, uuid_1.v4)(),
        name: data.name,
        categoryId: data.categoryId,
        standardPrice: data.standardPrice,
        unit: data.unit || 'kg',
        isActive: true,
        createdAt: now,
        updatedAt: now,
    };
    await (0, dynamodb_1.dbPut)(ITEM_TABLE, item);
    return item;
}
// ---- Expenses ----
function toExpense(item) {
    return {
        id: item.id,
        outlet: item.outlet,
        itemId: item.itemId,
        date: item.date,
        quantity: item.quantity,
        actualPrice: item.actualPrice,
        totalPrice: item.totalPrice,
        notes: item.notes,
        isCash: item.isCash ?? true,
        status: item.status ?? 'pending',
        approvedBy: item.approvedBy,
        approvedAt: item.approvedAt,
        rejectionReason: item.rejectionReason,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        createdBy: item.createdBy,
    };
}
async function getAllExpenses(outlet, categoryId, startDate, endDate, status) {
    if (outlet) {
        const params = {
            TableName: EXP_TABLE,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': `EXPENSE#${outlet}` },
            ScanIndexForward: false,
        };
        if (startDate && endDate) {
            const start = startDate.toISOString().split('T')[0];
            const end = endDate.toISOString().split('T')[0];
            params.KeyConditionExpression += ' AND begins_with(SK, :datePrefix) AND SK BETWEEN :start AND :end';
            params.ExpressionAttributeValues[':start'] = `DATE#${start}`;
            params.ExpressionAttributeValues[':end'] = `DATE#${end}~`;
        }
        const items = await (0, dynamodb_1.dbQuery)(params);
        let expenses = items.map(toExpense);
        if (status)
            expenses = expenses.filter((e) => e.status === status);
        return expenses;
    }
    // Scan all (admin use)
    const items = await (0, dynamodb_1.dbScan)(EXP_TABLE);
    let expenses = items.map(toExpense);
    if (status)
        expenses = expenses.filter((e) => e.status === status);
    if (startDate)
        expenses = expenses.filter((e) => new Date(e.date) >= startDate);
    if (endDate)
        expenses = expenses.filter((e) => new Date(e.date) <= endDate);
    return expenses;
}
async function getExpenseById(id) {
    const items = await (0, dynamodb_1.dbScan)(EXP_TABLE, '#id = :id', { ':id': id });
    return items.length > 0 ? toExpense(items[0]) : null;
}
async function createExpense(data) {
    const id = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    const dateStr = data.date.toISOString().split('T')[0];
    const item = {
        PK: `EXPENSE#${data.outlet}`,
        SK: `DATE#${dateStr}#ID#${id}`,
        id,
        outlet: data.outlet,
        itemId: data.itemId,
        date: dateStr,
        quantity: data.quantity,
        actualPrice: data.actualPrice,
        totalPrice: data.totalPrice,
        notes: data.notes,
        isCash: data.isCash ?? true,
        status: 'pending',
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now,
    };
    await (0, dynamodb_1.dbPut)(EXP_TABLE, item);
    return toExpense(item);
}
async function updateExpense(id, updates) {
    const existing = await getExpenseById(id);
    if (!existing)
        return null;
    const quantity = updates.quantity ?? existing.quantity;
    const actualPrice = updates.actualPrice ?? existing.actualPrice;
    const totalPrice = quantity * actualPrice;
    const payload = {
        totalPrice,
        updatedAt: new Date().toISOString(),
    };
    if (updates.itemId !== undefined)
        payload.itemId = updates.itemId;
    if (updates.quantity !== undefined)
        payload.quantity = updates.quantity;
    if (updates.actualPrice !== undefined)
        payload.actualPrice = updates.actualPrice;
    if (updates.notes !== undefined)
        payload.notes = updates.notes;
    if (updates.date !== undefined)
        payload.date = updates.date.toISOString().split('T')[0];
    const dateStr = existing.date;
    const updated = await (0, dynamodb_1.dbUpdate)(EXP_TABLE, { PK: `EXPENSE#${existing.outlet}`, SK: `DATE#${dateStr}#ID#${id}` }, payload);
    return updated ? toExpense(updated) : null;
}
async function approveExpense(id, adminUsername) {
    const existing = await getExpenseById(id);
    if (!existing)
        return null;
    const updated = await (0, dynamodb_1.dbUpdate)(EXP_TABLE, { PK: `EXPENSE#${existing.outlet}`, SK: `DATE#${existing.date}#ID#${id}` }, {
        status: 'approved',
        approvedBy: adminUsername,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });
    return updated ? toExpense(updated) : null;
}
async function rejectExpense(id, adminUsername, reason) {
    const existing = await getExpenseById(id);
    if (!existing)
        return null;
    const updated = await (0, dynamodb_1.dbUpdate)(EXP_TABLE, { PK: `EXPENSE#${existing.outlet}`, SK: `DATE#${existing.date}#ID#${id}` }, {
        status: 'rejected',
        approvedBy: adminUsername,
        rejectionReason: reason,
        updatedAt: new Date().toISOString(),
    });
    return updated ? toExpense(updated) : null;
}
async function deleteExpense(id) {
    const existing = await getExpenseById(id);
    if (!existing)
        return;
    await (0, dynamodb_1.dbDelete)(EXP_TABLE, {
        PK: `EXPENSE#${existing.outlet}`,
        SK: `DATE#${existing.date}#ID#${id}`,
    });
}
//# sourceMappingURL=expenseService.js.map