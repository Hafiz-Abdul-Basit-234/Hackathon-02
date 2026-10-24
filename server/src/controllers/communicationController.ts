import { Request, Response } from 'express';
import { Announcement, Notification } from '../models/Communication.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/audit.js';

// ==================== ANNOUNCEMENTS ====================
export async function listAnnouncements(req: AuthRequest, res: Response) {
  try {
    const role = req.user?.role || 'employee';
    const audienceFilter: Record<string, any> = role === 'admin' ? {} : { audience: { $in: ['all', role] } };

    const announcements = await Announcement.find(audienceFilter).sort({ createdAt: -1 });
    res.json({ success: true, data: announcements });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching announcements';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function createAnnouncement(req: AuthRequest, res: Response) {
  try {
    const { title, message, audience = 'all' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required.' });
    }

    const announcement = new Announcement({
      title: title.trim(),
      message: message.trim(),
      audience,
      createdBy: req.user?._id,
      createdByName: req.user?.email || 'Administrator',
    });

    await announcement.save();
    await logAuditEvent(req, 'ANNOUNCEMENT_CREATED', 'Announcement', announcement._id.toString(), undefined, { title, audience });

    res.status(201).json({ success: true, message: 'Announcement published successfully', data: announcement });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating announcement';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function deleteAnnouncement(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const deleted = await Announcement.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Announcement not found' });

    await logAuditEvent(req, 'ANNOUNCEMENT_DELETED', 'Announcement', id);
    res.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error deleting announcement';
    res.status(500).json({ success: false, message: msg });
  }
}

// ==================== NOTIFICATIONS ====================
export async function listMyNotifications(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    res.json({
      success: true,
      unreadCount,
      data: notifications,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching notifications';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function markNotificationAsRead(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user?._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: notification });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating notification';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function markAllNotificationsAsRead(req: AuthRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });

    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error marking all notifications';
    res.status(500).json({ success: false, message: msg });
  }
}
