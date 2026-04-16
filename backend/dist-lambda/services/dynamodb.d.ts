import { DynamoDBDocumentClient, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
export declare const dynamo: DynamoDBDocumentClient;
export declare const TABLES: {
    OUTLETS: string;
    ADMINS: string;
    SALES: string;
    EXPENSES: string;
    EXPENSE_CATEGORIES: string;
    ITEM_MASTERS: string;
};
export declare function dbGet(table: string, key: Record<string, unknown>): Promise<Record<string, any> | null>;
export declare function dbPut(table: string, item: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function dbUpdate(table: string, key: Record<string, unknown>, updates: Record<string, unknown>): Promise<Record<string, any> | null>;
export declare function dbDelete(table: string, key: Record<string, unknown>): Promise<void>;
export declare function dbQuery(params: QueryCommandInput): Promise<Record<string, any>[]>;
export declare function dbScan(table: string, filterExpression?: string, expressionValues?: Record<string, unknown>, expressionNames?: Record<string, string>): Promise<Record<string, any>[]>;
//# sourceMappingURL=dynamodb.d.ts.map