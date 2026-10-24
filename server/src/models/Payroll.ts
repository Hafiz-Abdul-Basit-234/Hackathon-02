import mongoose, { Schema, Document } from 'mongoose';

export interface IPayslipDocument extends Document {
  payrollRun?: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  month: string; // YYYY-MM
  basicSalary: number;
  hra: number;
  medicalAllowance: number;
  otherAllowances: number;
  grossSalary: number;
  workingDays: number;
  dailySalary: number;
  absentDays: number;
  attendanceDeductions: number;
  unpaidLeaveDays: number;
  halfDays: number;
  leaveDeductions: number;
  tax: number;
  netSalary: number;
  status: 'draft' | 'finalized';
  createdAt: Date;
  updatedAt: Date;
}

export const PayslipSchema = new Schema<IPayslipDocument>(
  {
    payrollRun: {
      type: Schema.Types.ObjectId,
      ref: 'PayrollRun',
      default: null,
      index: true,
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    month: {
      type: String,
      required: true,
      index: true,
    },
    basicSalary: { type: Number, required: true },
    hra: { type: Number, required: true },
    medicalAllowance: { type: Number, required: true },
    otherAllowances: { type: Number, default: 0 },
    grossSalary: { type: Number, required: true },
    workingDays: { type: Number, required: true },
    dailySalary: { type: Number, required: true },
    absentDays: { type: Number, default: 0 },
    attendanceDeductions: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    leaveDeductions: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'finalized'],
      default: 'draft',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PayslipSchema.index({ employee: 1, month: 1 }, { unique: true });

export const Payslip = mongoose.model<IPayslipDocument>('Payslip', PayslipSchema);

export interface IPayrollRunDocument extends Document {
  month: string; // YYYY-MM
  year: number;
  status: 'draft' | 'finalized';
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  createdBy: mongoose.Types.ObjectId;
  finalizedBy?: mongoose.Types.ObjectId;
  finalizedAt?: Date;
  records: mongoose.Types.ObjectId[] | IPayslipDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const PayrollRunSchema = new Schema<IPayrollRunDocument>(
  {
    month: {
      type: String,
      required: true,
      unique: true, // Only one payroll run per month
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'finalized'],
      default: 'draft',
      index: true,
    },
    totalGross: {
      type: Number,
      required: true,
      default: 0,
    },
    totalDeductions: {
      type: Number,
      required: true,
      default: 0,
    },
    totalNet: {
      type: Number,
      required: true,
      default: 0,
    },
    employeeCount: {
      type: Number,
      required: true,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    finalizedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    finalizedAt: {
      type: Date,
      default: null,
    },
    records: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Payslip',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const PayrollRun = mongoose.model<IPayrollRunDocument>('PayrollRun', PayrollRunSchema);
