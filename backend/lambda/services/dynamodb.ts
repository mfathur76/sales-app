import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  QueryCommandInput,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';

// ---- Client singleton ----
const rawClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-southeast-1',
});

export const dynamo = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// ---- Table names from environment ----
export const TABLES = {
  OUTLETS: process.env.OUTLETS_TABLE || 'sales-app-outlets',
  ADMINS: process.env.ADMINS_TABLE || 'sales-app-admins',
  SALES: process.env.SALES_TABLE || 'sales-app-sales',
  EXPENSES: process.env.EXPENSES_TABLE || 'sales-app-expenses',
  EXPENSE_CATEGORIES: process.env.EXPENSE_CATEGORIES_TABLE || 'sales-app-expense-categories',
  ITEM_MASTERS: process.env.ITEM_MASTERS_TABLE || 'sales-app-item-masters',
  CUSTOMERS: process.env.CUSTOMERS_TABLE || 'sales-app-customers',
  ORDERS: process.env.ORDERS_TABLE || 'sales-app-orders',
  PRODUCTS: process.env.PRODUCTS_TABLE || 'sales-app-products',
  STOCK: process.env.STOCK_TABLE || 'sales-app-stock',
};

// ---- Generic helpers ----

export async function dbGet(table: string, key: Record<string, unknown>) {
  const res = await dynamo.send(new GetCommand({ TableName: table, Key: key }));
  return res.Item ?? null;
}

export async function dbPut(table: string, item: Record<string, unknown>) {
  await dynamo.send(new PutCommand({ TableName: table, Item: item }));
  return item;
}

export async function dbUpdate(
  table: string,
  key: Record<string, unknown>,
  updates: Record<string, unknown>,
) {
  const setExpressions: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) continue;
    const attrName = `#${k}`;
    const attrVal = `:${k}`;
    setExpressions.push(`${attrName} = ${attrVal}`);
    names[attrName] = k;
    values[attrVal] = v;
  }

  if (setExpressions.length === 0) {
    return dbGet(table, key);
  }

  const res = await dynamo.send(
    new UpdateCommand({
      TableName: table,
      Key: key,
      UpdateExpression: `SET ${setExpressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }),
  );

  return res.Attributes ?? null;
}

export async function dbDelete(table: string, key: Record<string, unknown>) {
  await dynamo.send(new DeleteCommand({ TableName: table, Key: key }));
}

// Query and Scan return at most 1 MB per call, so follow LastEvaluatedKey until done.

export async function dbQuery(params: QueryCommandInput) {
  const items: Record<string, any>[] = [];
  let startKey: Record<string, any> | undefined;
  do {
    const res = await dynamo.send(new QueryCommand({ ...params, ExclusiveStartKey: startKey }));
    items.push(...(res.Items ?? []));
    startKey = res.LastEvaluatedKey;
  } while (startKey);
  return items;
}

export async function dbScan(
  table: string,
  filterExpression?: string,
  expressionValues?: Record<string, unknown>,
  expressionNames?: Record<string, string>,
) {
  const items: Record<string, any>[] = [];
  let startKey: Record<string, any> | undefined;
  do {
    const res = await dynamo.send(
      new ScanCommand({
        TableName: table,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionValues as any,
        ExpressionAttributeNames: expressionNames,
        ExclusiveStartKey: startKey,
      }),
    );
    items.push(...(res.Items ?? []));
    startKey = res.LastEvaluatedKey;
  } while (startKey);
  return items;
}

/** All-or-nothing put of up to 100 items (DynamoDB transaction limit). */
export async function dbTransactPut(table: string, items: Record<string, unknown>[]) {
  if (items.length === 0) return;
  if (items.length > 100) throw new Error('dbTransactPut supports at most 100 items');
  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: items.map((Item) => ({ Put: { TableName: table, Item } })),
    }),
  );
}
