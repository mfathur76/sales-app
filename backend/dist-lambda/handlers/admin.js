"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.listAdmins = listAdmins;
exports.createAdminHandler = createAdminHandler;
exports.updateAdminHandler = updateAdminHandler;
exports.deleteAdminHandler = deleteAdminHandler;
exports.changePasswordHandler = changePasswordHandler;
const adminService_1 = require("../services/adminService");
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
function requireSuperAdmin(user) {
    const err = requireAdmin(user);
    if (err)
        return err;
    if (user.role !== 'super_admin')
        return (0, response_1.forbidden)('Super admin access required');
    return null;
}
/** GET /api/admin/profile */
async function getProfile(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    const authErr = requireAdmin(user);
    if (authErr)
        return authErr;
    try {
        const admin = await (0, adminService_1.getAdminByUsername)(user.username);
        if (!admin)
            return (0, response_1.notFound)('Admin not found');
        return (0, response_1.ok)(admin, 'Admin profile retrieved successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** GET /api/admin/list */
async function listAdmins(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    const authErr = requireSuperAdmin(user);
    if (authErr)
        return authErr;
    try {
        const admins = await (0, adminService_1.getAllAdmins)();
        return (0, response_1.ok)(admins, 'Admin list retrieved successfully');
    }
    catch (err) {
        return (0, response_1.serverError)(err);
    }
}
/** POST /api/admin/create */
async function createAdminHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    const authErr = requireSuperAdmin(user);
    if (authErr)
        return authErr;
    try {
        const body = JSON.parse(event.body || '{}');
        const { username, name, password, role } = body;
        if (!username || !name || !password) {
            return (0, response_1.badRequest)('Username, name, and password are required');
        }
        const admin = await (0, adminService_1.createAdmin)({ username, name, password, role });
        return (0, response_1.created)(admin, 'Admin created successfully');
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('already exists')) {
            return (0, response_1.badRequest)(err.message);
        }
        return (0, response_1.serverError)(err);
    }
}
/** PUT /api/admin/{username} */
async function updateAdminHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    const authErr = requireSuperAdmin(user);
    if (authErr)
        return authErr;
    const { username } = event.pathParameters || {};
    if (!username)
        return (0, response_1.badRequest)('Username path parameter is required');
    try {
        const body = JSON.parse(event.body || '{}');
        const admin = await (0, adminService_1.updateAdmin)(username, body);
        return (0, response_1.ok)(admin, 'Admin updated successfully');
    }
    catch (err) {
        if (err instanceof Error && err.message === 'Admin not found')
            return (0, response_1.notFound)(err.message);
        return (0, response_1.serverError)(err);
    }
}
/** DELETE /api/admin/{username} */
async function deleteAdminHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    const authErr = requireSuperAdmin(user);
    if (authErr)
        return authErr;
    const { username } = event.pathParameters || {};
    if (!username)
        return (0, response_1.badRequest)('Username path parameter is required');
    // Prevent self-delete
    if (username === user.username)
        return (0, response_1.badRequest)('Cannot delete your own admin account');
    try {
        const result = await (0, adminService_1.deleteAdmin)(username);
        return (0, response_1.ok)(null, result.message);
    }
    catch (err) {
        if (err instanceof Error && err.message === 'Admin not found')
            return (0, response_1.notFound)(err.message);
        return (0, response_1.serverError)(err);
    }
}
/** POST /api/admin/change-password */
async function changePasswordHandler(event) {
    if (event.httpMethod === 'OPTIONS')
        return (0, response_1.preflight)();
    const user = getUser(event);
    const authErr = requireAdmin(user);
    if (authErr)
        return authErr;
    try {
        const body = JSON.parse(event.body || '{}');
        const { oldPassword, newPassword } = body;
        if (!oldPassword || !newPassword) {
            return (0, response_1.badRequest)('oldPassword and newPassword are required');
        }
        if (newPassword.length < 6) {
            return (0, response_1.badRequest)('New password must be at least 6 characters');
        }
        const result = await (0, adminService_1.changePassword)(user.username, oldPassword, newPassword);
        return (0, response_1.ok)(null, result.message);
    }
    catch (err) {
        if (err instanceof Error && err.message.includes('Password lama')) {
            return (0, response_1.badRequest)(err.message);
        }
        return (0, response_1.serverError)(err);
    }
}
//# sourceMappingURL=admin.js.map