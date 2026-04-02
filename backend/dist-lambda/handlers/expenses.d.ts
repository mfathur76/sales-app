import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/** GET /api/expenses */
export declare function getExpenses(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** GET /api/expenses/{id} */
export declare function getExpense(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** POST /api/expenses */
export declare function createExpenseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** PUT /api/expenses/{id} */
export declare function updateExpenseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** POST /api/expenses/{id}/approve  – admin only */
export declare function approveExpenseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** POST /api/expenses/{id}/reject  – admin only */
export declare function rejectExpenseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** DELETE /api/expenses/{id}  – admin only */
export declare function deleteExpenseHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** GET /api/expenses/categories */
export declare function getCategories(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** POST /api/expenses/categories  – admin only */
export declare function createCategoryHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** GET /api/expenses/items */
export declare function getItems(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** POST /api/expenses/items  – admin only */
export declare function createItemHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
//# sourceMappingURL=expenses.d.ts.map