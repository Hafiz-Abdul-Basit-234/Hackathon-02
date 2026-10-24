import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User, IUserDocument } from '../models/User.js';
import { UserRole } from '../../../shared/types.js';

export interface AuthRequest extends Request {
  user?: IUserDocument;
  employeeId?: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  role: UserRole;
  employeeProfile?: string;
}

export function generateToken(user: IUserDocument): string {
  const payload: JWTPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    employeeProfile: user.employeeProfile ? user.employeeProfile.toString() : undefined,
  };

  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: '7d',
  });
}

export async function authenticateJWT(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as JWTPayload;

    const user = await User.findById(decoded.id).populate('employeeProfile');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found or has been removed.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Please contact Administrator.' });
    }

    req.user = user;
    if (user.employeeProfile) {
      const prof = user.employeeProfile as any;
      req.employeeId = prof._id ? prof._id.toString() : String(prof);
    }

    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    return res.status(401).json({ success: false, message: `Authentication failed: ${message}` });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
}

export function checkEmployeeDataScope(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  // Admin and HR have company-wide or department-level scope
  if (req.user.role === 'admin' || req.user.role === 'hr') {
    return next();
  }

  // Employee must only access their own records
  const requestedEmployeeId = req.params.employeeId || req.query.employeeId || req.body.employeeId;
  if (requestedEmployeeId && req.employeeId && requestedEmployeeId.toString() !== req.employeeId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view or manage your own employee records.',
    });
  }

  next();
}
