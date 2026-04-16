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
        status: item.status ?? 'approved',
        approvedBy: item.approvedBy,
        approvedAt: item.approvedAt,
        rejectionReason: item.rejectionReason,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        createdBy: item.createdBy,
    };
}
function buildExpenseItem(data) {
    return {
        PK: `EXPENSE#${data.outlet}`,
        SK: `DATE#${data.date}#ID#${data.id}`,
        id: data.id,
        outlet: data.outlet,
        itemId: data.itemId,
        date: data.date,
        quantity: data.quantity,
        actualPrice: data.actualPrice,
        totalPrice: data.totalPrice,
        notes: data.notes,
        isCash: data.isCash,
        status: data.status,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt,
        rejectionReason: data.rejectionReason,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        createdBy: data.createdBy,
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
    const items = await (0, dynamodb_1.dbScan)(EXP_TABLE, '#id = :id', { ':id': id }, { '#id': 'id' });
    return items.length > 0 ? toExpense(items[0]) : null;
}
async function createExpense(data) {
    const id = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    const dateStr = data.date.toISOString().split('T')[0];
    const item = buildExpenseItem({
        id,
        outlet: data.outlet,
        itemId: data.itemId,
        date: dateStr,
        quantity: data.quantity,
        actualPrice: data.actualPrice,
        totalPrice: data.totalPrice,
        notes: data.notes,
        isCash: data.isCash ?? true,
        status: 'approved',
        approvedBy: data.createdBy,
        approvedAt: now,
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now,
    });
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
    const nextDate = updates.date ? updates.date.toISOString().split('T')[0] : existing.date;
    const nextOutlet = updates.outlet ?? existing.outlet;
    const now = new Date().toISOString();
    const updatedItem = buildExpenseItem({
        id,
        outlet: nextOutlet,
        itemId: updates.itemId ?? existing.itemId,
        date: nextDate,
        quantity,
        actualPrice,
        totalPrice,
        notes: updates.notes !== undefined ? updates.notes : existing.notes,
        isCash: updates.isCash ?? existing.isCash,
        status: 'approved',
        approvedBy: existing.approvedBy ?? updates.updatedBy ?? existing.createdBy,
        approvedAt: existing.approvedAt ?? now,
        createdAt: existing.createdAt,
        updatedAt: now,
        createdBy: existing.createdBy,
    });
    const oldKey = {
        PK: `EXPENSE#${existing.outlet}`,
        SK: `DATE#${existing.date}#ID#${id}`,
    };
    const newKey = {
        PK: `EXPENSE#${nextOutlet}`,
        SK: `DATE#${nextDate}#ID#${id}`,
    };
    if (oldKey.PK !== newKey.PK || oldKey.SK !== newKey.SK) {
        await (0, dynamodb_1.dbPut)(EXP_TABLE, updatedItem);
        await (0, dynamodb_1.dbDelete)(EXP_TABLE, oldKey);
        return toExpense(updatedItem);
    }
    const payload = {
        itemId: updatedItem.itemId,
        quantity: updatedItem.quantity,
        actualPrice: updatedItem.actualPrice,
        totalPrice: updatedItem.totalPrice,
        notes: updatedItem.notes,
        isCash: updatedItem.isCash,
        status: updatedItem.status,
        approvedBy: updatedItem.approvedBy,
        approvedAt: updatedItem.approvedAt,
        rejectionReason: undefined,
        updatedAt: updatedItem.updatedAt,
    };
    const updated = await (0, dynamodb_1.dbUpdate)(EXP_TABLE, oldKey, payload);
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