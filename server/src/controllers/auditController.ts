import { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog.js';

export async function listAuditLogs(req: Request, res: Response) {
  try {
    const { action, entity, search, limit = '50', page = '1' } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10)));
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, unknown> = {};
    if (action) query.action = action;
    if (entity) query.entity = entity;
    if (search) {
      query.$or = [
        { actorEmail: { $regex: String(search), $options: 'i' } },
        { action: { $regex: String(search), $options: 'i' } },
        { entity: { $regex: String(search), $options: 'i' } },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching audit logs';
    res.status(500).json({ success: false, message: msg });
  }
}
