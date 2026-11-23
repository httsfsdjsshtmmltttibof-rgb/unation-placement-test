import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  admin?: { username: string };
}

export function adminAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized: Missing or malformed token' });
    return;
  }

  const token = authHeader.slice(7).trim();
  const secret = process.env.JWT_SECRET || 'unation_default_jwt_fallback_secret_key';

  try {
    const decoded = jwt.verify(token, secret) as { username: string };
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired session token' });
  }
}
