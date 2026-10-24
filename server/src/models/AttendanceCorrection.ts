import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendanceCorrectionDocument extends Document {
  attendance?: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  attendanceDate: string;
  requestedCheckIn: Date;
  requestedCheckOut: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer?: mongoose.Types.ObjectId;
  reviewerComment?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceCorrectionSchema = new Schema<IAttendanceCorrectionDocument>(
  {
    attendance: {
      type: Schema.Types.ObjectId,
      ref: 'Attendance',
      default: null,
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    attendanceDate: {
      type: String,
      required: true,
    },
    requestedCheckIn: {
      type: Date,
      required: true,
    },
    requestedCheckOut: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewerComment: {
      type: String,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const AttendanceCorrection = mongoose.model<IAttendanceCorrectionDocument>(
  'AttendanceCorrection',
  AttendanceCorrectionSchema
);
