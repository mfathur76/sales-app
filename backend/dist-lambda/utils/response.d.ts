import { APIGatewayProxyResult } from 'aws-lambda';
export declare function ok(data: unknown, message?: string): APIGatewayProxyResult;
export declare function created(data: unknown, message?: string): APIGatewayProxyResult;
export declare function noContent(): APIGatewayProxyResult;
export declare function badRequest(error: string): APIGatewayProxyResult;
export declare function unauthorized(message?: string): APIGatewayProxyResult;
export declare function forbidden(message?: string): APIGatewayProxyResult;
export declare function notFound(error?: string): APIGatewayProxyResult;
export declare function serverError(error: unknown): APIGatewayProxyResult;
/** CORS preflight response */
export declare function preflight(): APIGatewayProxyResult;
//# sourceMappingURL=response.d.ts.map