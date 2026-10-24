import mongoose, { Schema, Document } from 'mongoose';

export interface IDesignationDocument extends Document {
  title: string;
  code: string;
  department: mongoose.Types.ObjectId;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DesignationSchema = new Schema<IDesignationDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
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

DesignationSchema.index({ code: 1, department: 1 }, { unique: true });

export const Designation = mongoose.model<IDesignationDocument>('Designation', DesignationSchema);
