import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/** GET /api/admin/profile */
export declare function getProfile(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** GET /api/admin/list */
export declare function listAdmins(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** POST /api/admin/create */
export declare function createAdminHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** PUT /api/admin/{username} */
export declare function updateAdminHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** DELETE /api/admin/{username} */
export declare function deleteAdminHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** POST /api/admin/change-password */
export declare function changePasswordHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
//# sourceMappingURL=admin.d.ts.map