import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing bearer token', code: 'UNAUTHORIZED' });
    return;
  }
  try {
    const decoded = verifyToken(header.slice('Bearer '.length));
    req.user = { id: decoded.sub, email: decoded.email, username: decoded.username };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
  }
}
