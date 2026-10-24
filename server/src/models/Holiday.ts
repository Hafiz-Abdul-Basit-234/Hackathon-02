import mongoose, { Schema, Document } from 'mongoose';

export interface IHolidayDocument extends Document {
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HolidaySchema = new Schema<IHolidayDocument>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Holiday = mongoose.model<IHolidayDocument>('Holiday', HolidaySchema);
