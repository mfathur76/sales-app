"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ok = ok;
exports.created = created;
exports.noContent = noContent;
exports.badRequest = badRequest;
exports.unauthorized = unauthorized;
exports.forbidden = forbidden;
exports.notFound = notFound;
exports.serverError = serverError;
exports.preflight = preflight;
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json',
};
function ok(data, message) {
    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, data, message }),
    };
}
function created(data, message) {
    return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, data, message }),
    };
}
function noContent() {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
}
function badRequest(error) {
    return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error }),
    };
}
function unauthorized(message = 'Unauthorized') {
    return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message }),
    };
}
function forbidden(message = 'Forbidden') {
    return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message }),
    };
}
function notFound(error = 'Not found') {
    return {
        statusCode: 404,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error }),
    };
}
function serverError(error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: message }),
    };
}
/** CORS preflight response */
function preflight() {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
}
//# sourceMappingURL=response.js.map