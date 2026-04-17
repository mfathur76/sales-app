#!/usr/bin/env ts-node
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
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_sts_1 = require("@aws-sdk/client-sts");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
dotenv.config({ path: path.join(__dirname, '../../.env') });
const region = process.env.AWS_REGION || 'ap-southeast-3';
const stage = process.env.STAGE || 'prod';
const service = 'sales-app-api';
const defaultAdminsTable = process.env.ADMINS_TABLE || `${service}-admins-${stage}`;
const raw = new client_dynamodb_1.DynamoDBClient({ region });
const db = lib_dynamodb_1.DynamoDBDocumentClient.from(raw, {
    marshallOptions: { removeUndefinedValues: true },
});
const sts = new client_sts_1.STSClient({ region });
async function resolveAdminsTable() {
    const candidates = Array.from(new Set([
        defaultAdminsTable,
        `${service}-admins-${stage}`,
        `sales-app-admins-${stage}`,
        'sales-app-admins',
    ].filter(Boolean)));
    for (const table of candidates) {
        try {
            await raw.send(new client_dynamodb_1.DescribeTableCommand({ TableName: table }));
            return table;
        }
        catch (error) {
            if (error?.name !== 'ResourceNotFoundException') {
                throw error;
            }
        }
    }
    throw new Error(`Admin table not found in region ${region}. Tried: ${candidates.join(', ')}`);
}
async function main() {
    const username = process.argv[2] || 'admin';
    const password = process.argv[3] || 'dapur123';
    const name = process.argv[4] || 'Administrator';
    const identity = await sts.send(new client_sts_1.GetCallerIdentityCommand({}));
    const adminsTable = await resolveAdminsTable();
    const PK = `ADMIN#${username}`;
    const SK = 'PROFILE';
    const now = new Date().toISOString();
    const existing = await db.send(new lib_dynamodb_1.GetCommand({
        TableName: adminsTable,
        Key: { PK, SK },
    }));
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const item = {
        PK,
        SK,
        id: existing.Item?.id || (0, crypto_1.randomUUID)(),
        username,
        name,
        password: passwordHash,
        role: existing.Item?.role || 'admin',
        isActive: true,
        createdAt: existing.Item?.createdAt || now,
        updatedAt: now,
    };
    await db.send(new lib_dynamodb_1.PutCommand({
        TableName: adminsTable,
        Item: item,
    }));
    console.log('Admin credential updated successfully');
    console.log('Account:', identity.Account || 'unknown');
    console.log('Region :', region);
    console.log('Table  :', adminsTable);
    console.log('User   :', username);
}
main().catch((error) => {
    console.error('Failed to reset admin password:', error);
    process.exit(1);
});
//# sourceMappingURL=reset-admin-password.js.map