import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/** POST /api/auth/login  – outlet login */
export declare function outletLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** GET /api/auth/outlets  – list all outlets (public, for login dropdown) */
export declare function listOutlets(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** POST /api/admin/login  – admin login */
export declare function adminLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** GET /api/health */
export declare function healthCheck(): Promise<APIGatewayProxyResult>;
//# sourceMappingURL=auth.d.ts.map