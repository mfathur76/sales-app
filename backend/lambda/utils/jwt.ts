import jwt from 'jsonwebtoken';
import { JwtUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface TokenPayload {
  // outlet user
  outlet?: string;
  // admin user
  username?: string;
  role?: string;
  name: string;
  type?: 'outlet' | 'admin';
}

/**
 * Sign a JWT token with 24h expiry.
 */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verify a JWT token and return the user payload.
 * Returns null if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

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
  } catch {
    return null;
  }
}

/**
 * Extract the bearer token from an Authorization header string.
 * Returns empty string if not found.
 */
export function extractBearerToken(authHeader?: string | null): string {
  if (!authHeader) return '';
  const parts = authHeader.split(' ');
  return parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : '';
}
