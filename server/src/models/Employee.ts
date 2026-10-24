import mongoose, { Schema, Document } from 'mongoose';

export interface ISalaryStructureSubdocument {
  basicSalary: number;
  hra: number;
  medicalAllowance: number;
  otherAllowances: number;
  grossSalary: number;
}

export interface IEmployeeDocument extends Document {
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  department: mongoose.Types.ObjectId;
  designation: mongoose.Types.ObjectId;
  joiningDate: Date;
  employmentStatus: 'probation' | 'active' | 'resigned' | 'terminated';
  basicSalary: number;
  salaryStructure: ISalaryStructureSubdocument;
  user?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SalaryStructureSchema = new Schema<ISalaryStructureSubdocument>(
  {
    basicSalary: { type: Number, required: true },
    hra: { type: Number, required: true },
    medicalAllowance: { type: Number, required: true },
    otherAllowances: { type: Number, default: 0 },
    grossSalary: { type: Number, required: true },
  },
  { _id: false }
);

const EmployeeSchema = new Schema<IEmployeeDocument>(
  {
    employeeCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
      index: true,
    },
    designation: {
      type: Schema.Types.ObjectId,
      ref: 'Designation',
      required: true,
      index: true,
    },
    joiningDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    employmentStatus: {
      type: String,
      enum: ['probation', 'active', 'resigned', 'terminated'],
      default: 'probation',
      index: true,
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 1,
    },
    salaryStructure: {
      type: SalaryStructureSchema,
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate challenge default gross and allowances if basicSalary changed
EmployeeSchema.pre('validate', function () {
  if (this.basicSalary) {
    const basic = Number(this.basicSalary);
    const hra = Math.round(basic * 0.4);
    const medical = Math.round(basic * 0.1);
    const other = this.salaryStructure?.otherAllowances || 0;
    const gross = Math.round(basic * 1.5) + other;

    this.salaryStructure = {
      basicSalary: basic,
      hra,
      medicalAllowance: medical,
      otherAllowances: other,
      grossSalary: gross,
    };
  }
});

export const Employee = mongoose.model<IEmployeeDocument>('Employee', EmployeeSchema);
