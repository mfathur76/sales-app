"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginOutlet = loginOutlet;
exports.getAllOutlets = getAllOutlets;
exports.getOutletByCode = getOutletByCode;
exports.createOutlet = createOutlet;
exports.updateOutlet = updateOutlet;
exports.deleteOutlet = deleteOutlet;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../utils/jwt");
const dynamodb_1 = require("./dynamodb");
const TABLE = dynamodb_1.TABLES.OUTLETS;
function toOutlet(item) {
    return {
        code: item.code,
        name: item.name,
        password: item.password,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
    };
}
async function loginOutlet(code, password) {
    const item = await (0, dynamodb_1.dbGet)(TABLE, { PK: `OUTLET#${code}`, SK: 'PROFILE' });
    if (!item) {
        return { success: false, message: 'Outlet tidak ditemukan' };
    }
    const valid = await bcryptjs_1.default.compare(password, item.password);
    if (!valid) {
        return { success: false, message: 'Password salah' };
    }
    const token = (0, jwt_1.signToken)({ outlet: item.code, name: item.name, type: 'outlet' });
    return {
        success: true,
        message: 'Login berhasil',
        data: { token, outlet: item.code, name: item.name },
    };
}
async function getAllOutlets() {
    const items = await (0, dynamodb_1.dbScan)(TABLE);
    return items
        .filter((i) => i.SK === 'PROFILE')
        .map(toOutlet)
        .sort((a, b) => a.code.localeCompare(b.code));
}
async function getOutletByCode(code) {
    const item = await (0, dynamodb_1.dbGet)(TABLE, { PK: `OUTLET#${code}`, SK: 'PROFILE' });
    return item ? toOutlet(item) : null;
}
async function createOutlet(data) {
    const existing = await (0, dynamodb_1.dbGet)(TABLE, { PK: `OUTLET#${data.code}`, SK: 'PROFILE' });
    if (existing)
        throw new Error(`Outlet with code ${data.code} already exists`);
    const hashed = await bcryptjs_1.default.hash(data.password, 10);
    const now = new Date().toISOString();
    const item = {
        PK: `OUTLET#${data.code}`,
        SK: 'PROFILE',
        code: data.code,
        name: data.name,
        password: hashed,
        createdAt: now,
        updatedAt: now,
    };
    await (0, dynamodb_1.dbPut)(TABLE, item);
    return toOutlet(item);
}
async function updateOutlet(code, updates) {
    const existing = await (0, dynamodb_1.dbGet)(TABLE, { PK: `OUTLET#${code}`, SK: 'PROFILE' });
    if (!existing)
        return null;
    const payload = { updatedAt: new Date().toISOString() };
    if (updates.name)
        payload.name = updates.name;
    if (updates.password)
        payload.password = await bcryptjs_1.default.hash(updates.password, 10);
    const { dbUpdate } = await Promise.resolve().then(() => __importStar(require('./dynamodb')));
    const updated = await dbUpdate(TABLE, { PK: `OUTLET#${code}`, SK: 'PROFILE' }, payload);
    return updated ? toOutlet(updated) : null;
}
async function deleteOutlet(code) {
    const { dbDelete } = await Promise.resolve().then(() => __importStar(require('./dynamodb')));
    await dbDelete(TABLE, { PK: `OUTLET#${code}`, SK: 'PROFILE' });
}
//# sourceMappingURL=outletService.js.map