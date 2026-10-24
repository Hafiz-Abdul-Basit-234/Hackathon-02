import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceDocument extends Document {
  employee: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  checkIn?: Date;
  checkOut?: Date;
  durationMinutes: number;
  status: 'present' | 'late' | 'half_day' | 'absent' | 'on_leave' | 'missing_checkout';
  location?: {
    latitude: number;
    longitude: number;
    distanceMeters?: number;
    isWithinRadius?: boolean;
  };
  faceDetected?: boolean;
  correctionRequested: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendanceDocument>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['present', 'late', 'half_day', 'absent', 'on_leave', 'missing_checkout'],
      required: true,
      default: 'present',
      index: true,
    },
    location: {
      latitude: Number,
      longitude: Number,
      distanceMeters: Number,
      isWithinRadius: Boolean,
    },
    faceDetected: {
      type: Boolean,
      default: false,
    },
    correctionRequested: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// One attendance record per employee per day
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendanceDocument>('Attendance', AttendanceSchema);
