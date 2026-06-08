import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthPayload } from '../types';

function extractUser(req: Request): AuthPayload | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.slice(7), env.JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

/** Attaches user to req if token present — does NOT block unauthenticated requests */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = extractUser(req) ?? undefined;
  next();
}

/** Requires any valid login (user, admin, super_admin) */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = extractUser(req);
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  req.user = user;
  next();
}

/** Requires admin or super_admin role */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = extractUser(req);
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    res.status(403).json({ error: 'Admin access required' }); return;
  }
  req.user = user;
  next();
}

/** Requires super_admin role */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const user = extractUser(req);
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }
  if (user.role !== 'super_admin') {
    res.status(403).json({ error: 'Super-admin access required' }); return;
  }
  req.user = user;
  next();
}
