"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginAdmin = loginAdmin;
exports.getAdminByUsername = getAdminByUsername;
exports.getAllAdmins = getAllAdmins;
exports.createAdmin = createAdmin;
exports.updateAdmin = updateAdmin;
exports.deleteAdmin = deleteAdmin;
exports.changePassword = changePassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const jwt_1 = require("../utils/jwt");
const dynamodb_1 = require("./dynamodb");
const TABLE = dynamodb_1.TABLES.ADMINS;
function toAdmin(item) {
    return {
        id: item.id,
        username: item.username,
        name: item.name,
        password: item.password,
        role: item.role,
        isActive: item.isActive ?? true,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}
async function loginAdmin(username, password) {
    const item = await (0, dynamodb_1.dbGet)(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' });
    if (!item)
        throw new Error('Username atau password salah');
    if (!item.isActive)
        throw new Error('Akun admin tidak aktif');
    const valid = await bcryptjs_1.default.compare(password, item.password);
    if (!valid)
        throw new Error('Username atau password salah');
    const token = (0, jwt_1.signToken)({
        username: item.username,
        name: item.name,
        role: item.role,
        type: 'admin',
    });
    return {
        success: true,
        message: 'Login berhasil',
        data: { token, username: item.username, name: item.name, role: item.role },
    };
}
async function getAdminByUsername(username) {
    const item = await (0, dynamodb_1.dbGet)(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' });
    if (!item)
        return null;
    const admin = toAdmin(item);
    const { password: _pw, ...safe } = admin;
    return safe;
}
async function getAllAdmins() {
    const items = await (0, dynamodb_1.dbScan)(TABLE);
    return items
        .filter((i) => i.SK === 'PROFILE')
        .map((i) => {
        const { password: _pw, ...safe } = toAdmin(i);
        return safe;
    })
        .sort((a, b) => a.username.localeCompare(b.username));
}
async function createAdmin(data) {
    const existing = await (0, dynamodb_1.dbGet)(TABLE, { PK: `ADMIN#${data.username}`, SK: 'PROFILE' });
    if (existing)
        throw new Error(`Admin with username ${data.username} already exists`);
    const hashed = await bcryptjs_1.default.hash(data.password, 10);
    const now = new Date().toISOString();
    const item = {
        PK: `ADMIN#${data.username}`,
        SK: 'PROFILE',
        id: (0, uuid_1.v4)(),
        username: data.username,
        name: data.name,
        password: hashed,
        role: data.role || 'admin',
        isActive: true,
        createdAt: now,
        updatedAt: now,
    };
    await (0, dynamodb_1.dbPut)(TABLE, item);
    const { password: _pw, ...safe } = toAdmin(item);
    return safe;
}
async function updateAdmin(username, updates) {
    const existing = await (0, dynamodb_1.dbGet)(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' });
    if (!existing)
        throw new Error('Admin not found');
    const payload = { updatedAt: new Date().toISOString() };
    if (updates.name !== undefined)
        payload.name = updates.name;
    if (updates.role !== undefined)
        payload.role = updates.role;
    if (updates.isActive !== undefined)
        payload.isActive = updates.isActive;
    const updated = await (0, dynamodb_1.dbUpdate)(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' }, payload);
    if (!updated)
        throw new Error('Failed to update admin');
    const { password: _pw, ...safe } = toAdmin(updated);
    return safe;
}
async function deleteAdmin(username) {
    const existing = await (0, dynamodb_1.dbGet)(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' });
    if (!existing)
        throw new Error('Admin not found');
    await (0, dynamodb_1.dbDelete)(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' });
    return { message: `Admin ${username} deleted successfully` };
}
async function changePassword(username, oldPassword, newPassword) {
    const item = await (0, dynamodb_1.dbGet)(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' });
    if (!item)
        throw new Error('Admin not found');
    const valid = await bcryptjs_1.default.compare(oldPassword, item.password);
    if (!valid)
        throw new Error('Password lama tidak sesuai');
    const hashed = await bcryptjs_1.default.hash(newPassword, 10);
    await (0, dynamodb_1.dbUpdate)(TABLE, { PK: `ADMIN#${username}`, SK: 'PROFILE' }, {
        password: hashed,
        updatedAt: new Date().toISOString(),
    });
    return { success: true, message: 'Password berhasil diubah' };
}
//# sourceMappingURL=adminService.js.map