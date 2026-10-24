import mongoose, { Schema, Document } from 'mongoose';

export interface ICompanySettingsDocument extends Document {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  officeStartTime: string;
  gracePeriodMinutes: number;
  weekendDays: string[];
  halfDayHoursThreshold: number;
  officeLatitude: number;
  officeLongitude: number;
  officeRadiusMeters: number;
  attendanceRules?: string;
  setupCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySettingsSchema = new Schema<ICompanySettingsDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    officeStartTime: {
      type: String,
      default: '09:00',
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15,
    },
    weekendDays: {
      type: [String],
      default: ['saturday', 'sunday'],
    },
    halfDayHoursThreshold: {
      type: Number,
      default: 5,
    },
    officeLatitude: {
      type: Number,
      default: 24.8607, // Default Karachi / Saylani reference or configurable
    },
    officeLongitude: {
      type: Number,
      default: 67.0011,
    },
    officeRadiusMeters: {
      type: Number,
      default: 150,
    },
    attendanceRules: {
      type: String,
      default: 'Standard office hours start at 09:00 AM. 15-minute grace period applies until 09:15 AM. Work under 5 hours counts as Half Day.',
    },
    setupCompleted: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CompanySettings = mongoose.model<ICompanySettingsDocument>(
  'CompanySettings',
  CompanySettingsSchema
);
