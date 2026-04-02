"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOutlets = getOutlets;
exports.getOutletByCodeHandler = getOutletByCodeHandler;
exports.createOutletHandler = createOutletHandler;
exports.updateOutletHandler = updateOutletHandler;
exports.deleteOutletHandler = deleteOutletHandler;
const outletService_1 = require("../services/outletService");
const jwt_1 = require("../utils/jwt");
const response_1 = require("../utils/response");
function getUser(event) {
    const token = (0, jwt_1.extractBearerToken)(event.headers['Authorization'] || event.headers['authorization']);
    return (0, jwt_1.verifyToken)(token);
}
function requireAdmin(user) {
    if (!user)
        return (0, response_1.unauthorized)('Access token required');
    if (user.type !== 'admin')
        return (0, response_1.forbidden)('Admin access required');
    return null;
}
/** GET /api/outlets */
async function getOutlets(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    const authErr = requireAdmin(user);
    if (authErr)
        return authErr;
    try {
        const outlets = await (0, outletService_1.getAllOutlets)();
        const safe = outlets.map(({ password: _pw, ...rest }) => rest);
        return (0, response_1.ok)(safe, 'Outlets retrieved successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** GET /api/outlets/{code} */
async function getOutletByCodeHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    const authErr = requireAdmin(user);
    if (authErr)
        return authErr;
    const { code } = event.pathParameters || {};
    if (!code)
        return (0, response_1.badRequest)('Outlet code path parameter is required');
    try {
        const outlet = await (0, outletService_1.getOutletByCode)(code);
        if (!outlet)
            return (0, response_1.notFound)('Outlet not found');
        const { password: _pw, ...safe } = outlet;
        return (0, response_1.ok)(safe, 'Outlet retrieved successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** POST /api/outlets */
async function createOutletHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    const authErr = requireAdmin(user);
    if (authErr)
        return authErr;
    try {
        const body = JSON.parse(event.body || '{}');
        const { code, name, password } = body;
        if (!code || !name || !password) {
            return (0, response_1.badRequest)('Code, name, and password are required');
        }
        const outlet = await (0, outletService_1.createOutlet)({ code, name, password });
        const { password: _pw, ...safe } = outlet;
        return (0, response_1.created)(safe, 'Outlet created successfully');
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
            return (0, response_1.badRequest)(err.message);
        }
        return (0, response_1.serverError)(err);
    }
}
/** PUT /api/outlets/{code} */
async function updateOutletHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    const authErr = requireAdmin(user);
    if (authErr)
        return authErr;
    const { code } = event.pathParameters || {};
    if (!code)
        return (0, response_1.badRequest)('Outlet code path parameter is required');
    try {
        const body = JSON.parse(event.body || '{}');
        const outlet = await (0, outletService_1.updateOutlet)(code, body);
        if (!outlet)
            return (0, response_1.notFound)('Outlet not found');
        const { password: _pw, ...safe } = outlet;
        return (0, response_1.ok)(safe, 'Outlet updated successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** DELETE /api/outlets/{code} */
async function deleteOutletHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    const authErr = requireAdmin(user);
    if (authErr)
        return authErr;
    const { code } = event.pathParameters || {};
    if (!code)
        return (0, response_1.badRequest)('Outlet code path parameter is required');
    try {
        await (0, outletService_1.deleteOutlet)(code);
        return (0, response_1.ok)(null, 'Outlet deleted successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
//# sourceMappingURL=outlets.js.map