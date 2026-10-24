import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncementDocument extends Document {
  title: string;
  message: string;
  audience: 'all' | 'hr' | 'employee';
  createdBy: mongoose.Types.ObjectId;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncementDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    audience: {
      type: String,
      enum: ['all', 'hr', 'employee'],
      default: 'all',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByName: {
      type: String,
      default: 'Administrator',
    },
  },
  {
    timestamps: true,
  }
);

export const Announcement = mongoose.model<IAnnouncementDocument>('Announcement', AnnouncementSchema);

export interface INotificationDocument extends Document {
  recipient: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'leave' | 'attendance' | 'payroll' | 'announcement' | 'system';
  isRead: boolean;
  link?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['leave', 'attendance', 'payroll', 'announcement', 'system'],
      default: 'system',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    link: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = mongoose.model<INotificationDocument>('Notification', NotificationSchema);
