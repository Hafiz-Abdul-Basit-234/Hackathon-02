import { Request, Response } from 'express';
import { PayrollRun, Payslip, IPayslipDocument } from '../models/Payroll.js';
import { Employee, IEmployeeDocument } from '../models/Employee.js';
import { Attendance } from '../models/Attendance.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { Notification } from '../models/Communication.js';
import { PolicyService } from '../services/policyService.js';
import { PdfService } from '../services/pdfService.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/audit.js';

export async function generatePayrollDraft(req: AuthRequest, res: Response) {
  try {
    const { month } = req.body; // YYYY-MM

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Valid payroll month in YYYY-MM format is required.' });
    }

    // Check if payroll run already exists
    const existingRun = await PayrollRun.findOne({ month });
    if (existingRun && existingRun.status === 'finalized') {
      return res.status(409).json({
        success: false,
        message: `Payroll for month ${month} has already been FINALIZED and locked by Administrator. Modifications are prohibited.`,
      });
    }

    const [year, m] = month.split('-').map(Number);
    const monthWorkingDays = await PolicyService.getMonthWorkingDays(year, m);

    // Active & Probation employees
    const employees = await Employee.find({
      employmentStatus: { $in: ['active', 'probation'] },
    }).populate('department', 'name').populate('designation', 'title');

    if (employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active or probation employees found in the company database.',
      });
    }

    const startDateStr = `${month}-01`;
    const lastDayOfMonth = new Date(year, m, 0).getDate();
    const endDateStr = `${month}-${String(lastDayOfMonth).padStart(2, '0')}`;

    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    const generatedPayslips: IPayslipDocument[] = [];

    // Delete existing draft payslips for this month if regenerating
    await Payslip.deleteMany({ month, status: 'draft' });

    for (const emp of employees) {
      const basicSalary = emp.basicSalary;
      const hra = emp.salaryStructure.hra || Math.round(basicSalary * 0.4);
      const medicalAllowance = emp.salaryStructure.medicalAllowance || Math.round(basicSalary * 0.1);
      const otherAllowances = emp.salaryStructure.otherAllowances || 0;
      let grossSalary = emp.salaryStructure.grossSalary || Math.round(basicSalary * 1.5) + otherAllowances;

      // Joiner Prorating: Check if employee joined in this month
      let effectiveWorkingDays = monthWorkingDays;
      const joiningDate = new Date(emp.joiningDate);
      const joiningMonthStr = joiningDate.toISOString().substring(0, 7);

      if (joiningMonthStr === month) {
        const joinCalc = await PolicyService.calculateWorkingDays(
          joiningDate.toISOString().split('T')[0],
          endDateStr
        );
        effectiveWorkingDays = joinCalc.effectiveWorkingDays;
      }

      const dailySalary = Math.round(grossSalary / monthWorkingDays);

      // Query real attendance records for this employee in this month
      const attendanceRecords = await Attendance.find({
        employee: emp._id,
        date: { $gte: startDateStr, $lte: endDateStr },
      });

      // Count half-days and missing checkout
      let halfDaysCount = 0;
      let presentCount = 0;
      attendanceRecords.forEach((a) => {
        if (a.status === 'half_day') halfDaysCount++;
        else if (a.status === 'present' || a.status === 'late') presentCount++;
      });

      // Query approved unpaid leaves for this month
      const unpaidLeaves = await LeaveRequest.find({
        employee: emp._id,
        status: 'approved',
        startDate: { $gte: startDateStr },
        endDate: { $lte: endDateStr },
      }).populate('leaveType');

      let unpaidLeaveDays = 0;
      unpaidLeaves.forEach((l: any) => {
        if (l.leaveType && !l.leaveType.isPaid) {
          unpaidLeaveDays += l.workingDays || 0;
        }
      });

      // Absent Days: expected working days minus recorded present/late/half-days minus approved leaves
      const approvedLeaves = await LeaveRequest.find({
        employee: emp._id,
        status: 'approved',
        startDate: { $gte: startDateStr },
        endDate: { $lte: endDateStr },
      });
      const totalLeaveDays = approvedLeaves.reduce((acc, l) => acc + (l.workingDays || 0), 0);

      const accountedDays = presentCount + halfDaysCount + totalLeaveDays;
      const absentDays = Math.max(0, effectiveWorkingDays - accountedDays);

      // Deductions calculations per challenge formulas
      const attendanceDeductions = absentDays * dailySalary;
      const leaveDeductions = unpaidLeaveDays * dailySalary;
      const halfDayDeductions = Math.round(halfDaysCount * 0.5 * dailySalary);

      // Tax calculation
      const tax = PolicyService.calculateMonthlyTax(grossSalary);

      const totalEmpDeductions = attendanceDeductions + leaveDeductions + halfDayDeductions + tax;
      const netSalary = Math.max(0, grossSalary - totalEmpDeductions);

      totalGross += grossSalary;
      totalDeductions += totalEmpDeductions;
      totalNet += netSalary;

      const payslip = new Payslip({
        employee: emp._id,
        month,
        basicSalary,
        hra,
        medicalAllowance,
        otherAllowances,
        grossSalary,
        workingDays: monthWorkingDays,
        dailySalary,
        absentDays,
        attendanceDeductions,
        unpaidLeaveDays,
        halfDays: halfDaysCount,
        leaveDeductions,
        tax,
        netSalary,
        status: 'draft',
      });

      await payslip.save();
      generatedPayslips.push(payslip);
    }

    // Upsert PayrollRun
    let payrollRun = existingRun;
    if (!payrollRun) {
      payrollRun = new PayrollRun({
        month,
        year,
        status: 'draft',
        totalGross,
        totalDeductions,
        totalNet,
        employeeCount: employees.length,
        createdBy: req.user?._id,
        records: generatedPayslips.map((p) => p._id),
      });
    } else {
      payrollRun.totalGross = totalGross;
      payrollRun.totalDeductions = totalDeductions;
      payrollRun.totalNet = totalNet;
      payrollRun.employeeCount = employees.length;
      payrollRun.records = generatedPayslips.map((p) => p._id);
    }

    await payrollRun.save();

    // Link payslips to payrollRun
    await Payslip.updateMany({ month, status: 'draft' }, { payrollRun: payrollRun._id });

    await logAuditEvent(req, 'PAYROLL_DRAFT_GENERATED', 'PayrollRun', payrollRun._id.toString(), undefined, {
      month,
      employeeCount: employees.length,
      totalNet,
    });

    res.status(201).json({
      success: true,
      message: `Payroll draft for ${month} generated successfully for ${employees.length} employees. Ready for review.`,
      data: {
        payrollRun,
        payslipsCount: generatedPayslips.length,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error generating payroll draft';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function listPayrollRuns(req: Request, res: Response) {
  try {
    const runs = await PayrollRun.find()
      .populate('createdBy', 'email role')
      .populate('finalizedBy', 'email role')
      .sort({ month: -1 });

    res.json({ success: true, count: runs.length, data: runs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error listing payroll runs';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function getPayrollDetails(req: Request, res: Response) {
  try {
    const { month } = req.params;

    const payrollRun = await PayrollRun.findOne({ month })
      .populate('createdBy', 'email role')
      .populate('finalizedBy', 'email role');

    if (!payrollRun) {
      return res.status(404).json({ success: false, message: `No payroll run found for ${month}.` });
    }

    const payslips = await Payslip.find({ month })
      .populate({
        path: 'employee',
        populate: [{ path: 'department' }, { path: 'designation' }],
      })
      .sort({ 'employee.fullName': 1 });

    res.json({
      success: true,
      data: {
        payrollRun,
        payslips,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching payroll details';
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * ADMIN ONLY: Finalize and permanently lock payroll.
 */
export async function finalizePayroll(req: AuthRequest, res: Response) {
  try {
    const { month } = req.params;

    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Security violation: Only Administrator can finalize payroll runs. HR cannot finalize payroll.',
      });
    }

    const payrollRun = await PayrollRun.findOne({ month });
    if (!payrollRun) {
      return res.status(404).json({ success: false, message: `Payroll run for ${month} not found.` });
    }

    if (payrollRun.status === 'finalized') {
      return res.status(400).json({
        success: false,
        message: `Payroll for ${month} is already finalized and locked.`,
      });
    }

    payrollRun.status = 'finalized';
    payrollRun.finalizedBy = req.user._id;
    payrollRun.finalizedAt = new Date();
    await payrollRun.save();

    // Lock all payslips for this month
    await Payslip.updateMany({ month }, { status: 'finalized' });

    // Send notifications to all active employees that their payslip is available
    const payslips = await Payslip.find({ month }).populate('employee');
    for (const p of payslips) {
      const empUser = (p.employee as any)?.user;
      if (empUser) {
        await Notification.create({
          recipient: empUser,
          title: `Payslip Available for ${month}`,
          message: `Your payslip for ${month} has been published and finalized. Net salary: PKR ${p.netSalary.toLocaleString()}. You can now download your official PDF payslip.`,
          type: 'payroll',
          link: '/employee/payslips',
        });
      }
    }

    await logAuditEvent(req, 'PAYROLL_FINALIZED_AND_LOCKED', 'PayrollRun', payrollRun._id.toString(), { status: 'draft' }, { status: 'finalized' });

    res.json({
      success: true,
      message: `Payroll for ${month} finalized and permanently locked by Administrator. Payslips published to employees.`,
      data: payrollRun,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error finalizing payroll';
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * Download official PDF payslip.
 * Enforces employee ownership: employees can only download their own payslip!
 */
export async function downloadPayslipPdf(req: AuthRequest, res: Response) {
  try {
    const { payslipId } = req.params;

    const payslip = await Payslip.findById(payslipId).populate({
      path: 'employee',
      populate: [{ path: 'department' }, { path: 'designation' }],
    });

    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found.' });
    }

    // Role Scope Enforcement
    if (req.user?.role === 'employee') {
      const empObj = payslip.employee as any;
      const empId = empObj?._id ? empObj._id.toString() : String(empObj || '');

      if (empId !== req.employeeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are only authorized to download your own payslip.',
        });
      }
    }

    const employeeDoc = payslip.employee as unknown as IEmployeeDocument;
    const pdfBuffer = await PdfService.generatePayslipPdf(payslip, employeeDoc);

    const filename = `Payslip_${employeeDoc.employeeCode}_${payslip.month}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error generating PDF payslip';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function getMyPayslips(req: AuthRequest, res: Response) {
  try {
    if (!req.employeeId) {
      return res.status(403).json({ success: false, message: 'No employee profile linked to user.' });
    }

    const payslips = await Payslip.find({
      employee: req.employeeId,
      status: 'finalized', // Employees only see finalized payslips
    }).sort({ month: -1 });

    res.json({ success: true, count: payslips.length, data: payslips });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching payslips';
    res.status(500).json({ success: false, message: msg });
  }
}
