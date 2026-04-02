import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/** GET /api/outlets */
export declare function getOutlets(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** GET /api/outlets/{code} */
export declare function getOutletByCodeHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** POST /api/outlets */
export declare function createOutletHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** PUT /api/outlets/{code} */
export declare function updateOutletHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
/** DELETE /api/outlets/{code} */
export declare function deleteOutletHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;
//# sourceMappingURL=outlets.d.ts.map