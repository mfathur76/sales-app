import { JwtUser } from '../types';
export interface TokenPayload {
    outlet?: string;
    username?: string;
    role?: string;
    name: string;
    type?: 'outlet' | 'admin';
}
/**
 * Sign a JWT token with 24h expiry.
 */
export declare function signToken(payload: TokenPayload): string;
/**
 * Verify a JWT token and return the user payload.
 * Returns null if the token is invalid or expired.
 */
export declare function verifyToken(token: string): JwtUser | null;
/**
 * Extract the bearer token from an Authorization header string.
 * Returns empty string if not found.
 */
export declare function extractBearerToken(authHeader?: string | null): string;
//# sourceMappingURL=jwt.d.ts.map