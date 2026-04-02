"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TABLES = exports.dynamo = void 0;
exports.dbGet = dbGet;
exports.dbPut = dbPut;
exports.dbUpdate = dbUpdate;
exports.dbDelete = dbDelete;
exports.dbQuery = dbQuery;
exports.dbScan = dbScan;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
// ---- Client singleton ----
const rawClient = new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-southeast-1',
});
exports.dynamo = lib_dynamodb_1.DynamoDBDocumentClient.from(rawClient, {
    marshallOptions: { removeUndefinedValues: true },
});
// ---- Table names from environment ----
exports.TABLES = {
    OUTLETS: process.env.OUTLETS_TABLE || 'sales-app-outlets',
    ADMINS: process.env.ADMINS_TABLE || 'sales-app-admins',
    SALES: process.env.SALES_TABLE || 'sales-app-sales',
    EXPENSES: process.env.EXPENSES_TABLE || 'sales-app-expenses',
    EXPENSE_CATEGORIES: process.env.EXPENSE_CATEGORIES_TABLE || 'sales-app-expense-categories',
    ITEM_MASTERS: process.env.ITEM_MASTERS_TABLE || 'sales-app-item-masters',
};
// ---- Generic helpers ----
async function dbGet(table, key) {
    const res = await exports.dynamo.send(new lib_dynamodb_1.GetCommand({ TableName: table, Key: key }));
    return res.Item ?? null;
}
async function dbPut(table, item) {
    await exports.dynamo.send(new lib_dynamodb_1.PutCommand({ TableName: table, Item: item }));
    return item;
}
async function dbUpdate(table, key, updates) {
    const setExpressions = [];
    const names = {};
    const values = {};
    for (const [k, v] of Object.entries(updates)) {
        const attrName = `#${k}`;
        const attrVal = `:${k}`;
        setExpressions.push(`${attrName} = ${attrVal}`);
        names[attrName] = k;
        values[attrVal] = v;
    }
    const res = await exports.dynamo.send(new lib_dynamodb_1.UpdateCommand({
        TableName: table,
        Key: key,
        UpdateExpression: `SET ${setExpressions.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: 'ALL_NEW',
    }));
    return res.Attributes ?? null;
}
async function dbDelete(table, key) {
    await exports.dynamo.send(new lib_dynamodb_1.DeleteCommand({ TableName: table, Key: key }));
}
async function dbQuery(params) {
    const res = await exports.dynamo.send(new lib_dynamodb_1.QueryCommand(params));
    return res.Items ?? [];
}
async function dbScan(table, filterExpression, expressionValues) {
    const res = await exports.dynamo.send(new lib_dynamodb_1.ScanCommand({
        TableName: table,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionValues,
    }));
    return res.Items ?? [];
}
//# sourceMappingURL=dynamodb.js.map