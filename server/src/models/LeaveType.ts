import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveTypeDocument extends Document {
  name: string;
  code: string;
  yearlyQuota: number; // -1 for unlimited
  isPaid: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveTypeSchema = new Schema<ILeaveTypeDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    yearlyQuota: {
      type: Number,
      required: true,
      default: 10,
    },
    isPaid: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LeaveType = mongoose.model<ILeaveTypeDocument>('LeaveType', LeaveTypeSchema);
