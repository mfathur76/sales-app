"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outletLogin = outletLogin;
exports.listOutlets = listOutlets;
exports.adminLogin = adminLogin;
exports.healthCheck = healthCheck;
const outletService_1 = require("../services/outletService");
const adminService_1 = require("../services/adminService");
const response_1 = require("../utils/response");
/** POST /api/auth/login  – outlet login */
async function outletLogin(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    try {
        const body = JSON.parse(event.body || '{}');
        const { outlet, password } = body;
        if (!outlet || !password) {
            return (0, response_1.badRequest)('Outlet dan password harus diisi');
        }
        const result = await (0, outletService_1.loginOutlet)(outlet, password);
        if (!result.success)
            return (0, response_1.unauthorized)(result.message);
        return (0, response_1.ok)(result.data, result.message);
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** GET /api/auth/outlets  – list all outlets (public, for login dropdown) */
async function listOutlets(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    try {
        const outlets = await (0, outletService_1.getAllOutlets)();
        // Strip passwords before returning
        const safe = outlets.map(({ password: _pw, ...rest }) => rest);
        return (0, response_1.ok)(safe, 'Outlets retrieved successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** POST /api/admin/login  – admin login */
async function adminLogin(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    try {
        const body = JSON.parse(event.body || '{}');
        const { username, password } = body;
        if (!username || !password) {
            return (0, response_1.badRequest)('Username and password are required');
        }
        const result = await (0, adminService_1.loginAdmin)(username, password);
        return (0, response_1.ok)(result.data, result.message);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('salah')) {
            return (0, response_1.unauthorized)(err.message);
        }
        return (0, response_1.serverError)(err);
    }
}
/** GET /api/health */
async function healthCheck() {
    return (0, response_1.ok)({ status: 'OK', timestamp: new Date().toISOString() }, 'Sales API is running');
}
//# sourceMappingURL=auth.js.map