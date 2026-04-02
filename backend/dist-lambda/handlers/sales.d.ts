import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/** GET /api/sales */
export declare function getSales(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** GET /api/sales/stats */
export declare function getSalesStats(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** GET /api/sales/options */
export declare function getSalesOutletOptions(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** GET /api/sales/{outlet}/{date} */
export declare function getSaleByOutletDate(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** POST /api/sales */
export declare function createSale(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** PUT /api/sales/{outlet}/{date} */
export declare function updateSale(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** PUT /api/sales/{outlet}/{date}/bank  – admin-only bank transfer update */
export declare function updateSaleBank(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** DELETE /api/sales/{outlet}/{date} */
export declare function deleteSale(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
//# sourceMappingURL=sales.d.ts.map