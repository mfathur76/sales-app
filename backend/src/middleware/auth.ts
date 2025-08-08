import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        outlet?: string;
        name: string;
        username?: string;
        role?: string;
        type?: 'outlet' | 'admin';
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Handle both outlet and admin users
    if (decoded.type === 'admin') {
      req.user = {
        username: decoded.username,
        name: decoded.name,
        role: decoded.role,
        type: 'admin'
      };
    } else {
      // Legacy outlet user
      req.user = {
        outlet: decoded.outlet,
        name: decoded.name,
        type: 'outlet'
      };
    }
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

export const authorizeOutlet = (req: Request, res: Response, next: NextFunction) => {
  const userOutlet = req.user?.outlet;
  const requestedOutlet = req.params.outlet || req.body.outlet;

  if (!userOutlet) {
    return res.status(401).json({ 
      success: false, 
      message: 'User not authenticated' 
    });
  }

  if (userOutlet !== requestedOutlet) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: You can only access your own outlet data' 
    });
  }

  next();
}; 