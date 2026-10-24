import { Request } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { AuthRequest } from './auth.js';

export async function logAuditEvent(
  req: Request | AuthRequest,
  action: string,
  entity: string,
  entityId?: string,
  beforeState?: any,
  afterState?: any
) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user) return;

    await AuditLog.create({
      actor: authReq.user._id,
      actorEmail: authReq.user.email,
      actorRole: authReq.user.role,
      action,
      entity,
      entityId: entityId || '',
      beforeState: beforeState || null,
      afterState: afterState || null,
      ip: req.ip || req.socket.remoteAddress || '',
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
