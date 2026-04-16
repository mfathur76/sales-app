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

export async function dbQuery(params: QueryCommandInput) {
  const res = await dynamo.send(new QueryCommand(params));
  return res.Items ?? [];
}

export async function dbScan(
  table: string,
  filterExpression?: string,
  expressionValues?: Record<string, unknown>,
  expressionNames?: Record<string, string>,
) {
  const res = await dynamo.send(
    new ScanCommand({
      TableName: table,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionValues as any,
      ExpressionAttributeNames: expressionNames,
    }),
  );
  return res.Items ?? [];
}
