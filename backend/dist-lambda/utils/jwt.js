"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.extractBearerToken = extractBearerToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
/**
 * Sign a JWT token with 24h expiry.
 */
function signToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
/**
 * Verify a JWT token and return the user payload.
 * Returns null if the token is invalid or expired.
 */
function verifyToken(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        if (decoded.type === 'admin') {
            return {
                username: decoded.username,
                name: decoded.name,
                role: decoded.role,
                type: 'admin',
            };
        }
        return {
            outlet: decoded.outlet,
            name: decoded.name,
            type: 'outlet',
        };
    }
    catch {
        return null;
    }
}
/**
 * Extract the bearer token from an Authorization header string.
 * Returns empty string if not found.
 */
function extractBearerToken(authHeader) {
    if (!authHeader)
        return '';
    const parts = authHeader.split(' ');
    return parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : '';
}
//# sourceMappingURL=jwt.js.map