export type UserRole = 'admin' | 'hr' | 'employee';

export interface IUser {
  _id: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  isTemporaryPassword?: boolean;
  employeeProfile?: string | IEmployee;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICompanySettings {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  officeStartTime: string; // e.g. "09:00"
  gracePeriodMinutes: number; // e.g. 15
  weekendDays: string[]; // e.g. ["saturday", "sunday"]
  halfDayHoursThreshold: number; // e.g. 5
  officeLatitude: number;
  officeLongitude: number;
  officeRadiusMeters: number; // e.g. 150
  attendanceRules?: string;
  setupCompleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IDepartment {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  employeeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IDesignation {
  _id: string;
  title: string;
  code: string;
  department: string | IDepartment;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ILeaveType {
  _id: string;
  name: string;
  code: string;
  yearlyQuota: number; // -1 for unlimited
  isPaid: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IHoliday {
  _id: string;
  title: string;
  date: string; // YYYY-MM-DD
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ISalaryStructure {
  basicSalary: number;
  hra: number;
  medicalAllowance: number;
  otherAllowances: number;
  grossSalary: number;
}

export type EmploymentStatus = 'probation' | 'active' | 'resigned' | 'terminated';

export interface IEmployee {
  _id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  department: string | IDepartment;
  designation: string | IDesignation;
  joiningDate: string;
  employmentStatus: EmploymentStatus;
  basicSalary: number;
  salaryStructure: ISalaryStructure;
  user?: string | IUser;
  createdAt?: string;
  updatedAt?: string;
}

export type AttendanceStatus =
  | 'present'
  | 'late'
  | 'half_day'
  | 'absent'
  | 'on_leave'
  | 'missing_checkout';

export interface IAttendance {
  _id: string;
  employee: string | IEmployee;
  user: string | IUser;
  date: string; // YYYY-MM-DD
  checkIn?: string;
  checkOut?: string;
  durationMinutes?: number;
  status: AttendanceStatus;
  location?: {
    latitude: number;
    longitude: number;
    distanceMeters?: number;
    isWithinRadius?: boolean;
  };
  faceDetected?: boolean;
  correctionRequested?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IAttendanceCorrection {
  _id: string;
  attendance?: string | IAttendance;
  employee: string | IEmployee;
  attendanceDate: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer?: string | IUser;
  reviewerComment?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ILeaveRequest {
  _id: string;
  employee: string | IEmployee;
  leaveType: string | ILeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  workingDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewer?: string | IUser;
  reviewerComment?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ILeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  leaveTypeCode: string;
  quota: number;
  used: number;
  pending: number;
  remaining: number;
  isPaid: boolean;
}

export interface IPayslip {
  _id?: string;
  payrollRun?: string;
  employee: string | IEmployee;
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
  createdAt?: string;
}

export interface IPayrollRun {
  _id: string;
  month: string; // YYYY-MM
  year: number;
  status: 'draft' | 'finalized';
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  createdBy: string | IUser;
  finalizedBy?: string | IUser;
  finalizedAt?: string;
  records: IPayslip[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IAnnouncement {
  _id: string;
  title: string;
  message: string;
  audience: 'all' | 'hr' | 'employee';
  createdBy: string | IUser;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface INotification {
  _id: string;
  recipient: string | IUser;
  title: string;
  message: string;
  type: 'leave' | 'attendance' | 'payroll' | 'announcement' | 'system';
  isRead: boolean;
  link?: string;
  createdAt?: string;
}

export interface IAuditLog {
  _id: string;
  actor: string | IUser;
  actorEmail: string;
  actorRole: UserRole;
  action: string;
  entity: string;
  entityId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export interface IAdminKPI {
  totalHeadcount: number;
  activeEmployees: number;
  probationEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  lateToday: number;
  payrollCost: number;
  averageSalary: number;
  attritionRateYTD: number;
}

export interface IHrKPI {
  totalEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  lateToday: number;
  pendingLeaveApprovals: number;
  pendingAttendanceCorrections: number;
  monthlyAttendanceRate: number;
}

export interface IEmployeeKPI {
  todayStatus: AttendanceStatus | 'not_checked_in';
  checkInTime?: string;
  checkOutTime?: string;
  hoursWorkedThisWeek: number;
  lateCountThisMonth: number;
  leaveBalances: ILeaveBalance[];
  latestPayslip?: IPayslip;
}
