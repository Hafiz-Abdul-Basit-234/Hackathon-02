import { Request, Response } from 'express';
import { Employee } from '../models/Employee.js';
import { Attendance } from '../models/Attendance.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { LeaveType } from '../models/LeaveType.js';
import { PayrollRun, Payslip } from '../models/Payroll.js';
import { AttendanceCorrection } from '../models/AttendanceCorrection.js';
import { PolicyService } from '../services/policyService.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getAdminDashboard(req: Request, res: Response) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();
    const currentMonthStr = todayStr.substring(0, 7);

    // 1. KPI Aggregations
    const [
      totalHeadcount,
      activeEmployees,
      probationEmployees,
      resignedCount,
      todayAttendances,
      onLeaveTodayCount,
      latestPayroll,
      allEmployees,
      departmentStats,
      leaveTypes,
      approvedLeavesThisYear,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ employmentStatus: 'active' }),
      Employee.countDocuments({ employmentStatus: 'probation' }),
      Employee.countDocuments({ employmentStatus: { $in: ['resigned', 'terminated'] } }),
      Attendance.find({ date: todayStr }),
      LeaveRequest.countDocuments({
        status: 'approved',
        startDate: { $lte: todayStr },
        endDate: { $gte: todayStr },
      }),
      PayrollRun.findOne().sort({ month: -1 }),
      Employee.find({}, 'basicSalary salaryStructure joiningDate department designation employmentStatus').lean(),
      Employee.aggregate([
        { $lookup: { from: 'departments', localField: 'department', foreignField: '_id', as: 'dept' } },
        { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$dept.name',
            count: { $sum: 1 },
            totalSalary: { $sum: '$salaryStructure.grossSalary' },
          },
        },
      ]),
      LeaveType.find({ isActive: true }),
      LeaveRequest.find({
        status: 'approved',
        startDate: { $gte: `${currentYear}-01-01` },
      }),
    ]);

    let presentToday = 0;
    let lateToday = 0;
    todayAttendances.forEach((a) => {
      if (a.status === 'present') presentToday++;
      else if (a.status === 'late') lateToday++;
      else if (a.status === 'half_day') presentToday += 0.5;
    });

    // Company Payroll Cost
    let companyPayrollCost = 0;
    if (latestPayroll) {
      companyPayrollCost = latestPayroll.totalNet;
    } else {
      companyPayrollCost = allEmployees.reduce((sum, e: any) => sum + (e.salaryStructure?.grossSalary || e.basicSalary * 1.5 || 0), 0);
    }

    const averageSalary = allEmployees.length > 0
      ? Math.round(allEmployees.reduce((sum, e: any) => sum + (e.salaryStructure?.grossSalary || e.basicSalary * 1.5 || 0), 0) / allEmployees.length)
      : 0;

    // Attrition YTD: exits / average headcount
    const activeTotal = activeEmployees + probationEmployees;
    const averageHeadcount = Math.max(1, (activeTotal + (activeTotal + resignedCount)) / 2);
    const attritionRateYTD = Number(((resignedCount / averageHeadcount) * 100).toFixed(1));

    // 2. Attendance Trends (Last 7 days)
    const trendDates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendDates.push(d.toISOString().split('T')[0]);
    }

    const pastWeekAttendances = await Attendance.find({
      date: { $in: trendDates },
    });

    const attendanceTrends = trendDates.map((date) => {
      const dayRecords = pastWeekAttendances.filter((a) => a.date === date);
      const present = dayRecords.filter((a) => a.status === 'present').length;
      const late = dayRecords.filter((a) => a.status === 'late').length;
      const halfDay = dayRecords.filter((a) => a.status === 'half_day').length;
      return {
        date: date.substring(5), // MM-DD
        present,
        late,
        halfDay,
        total: dayRecords.length,
      };
    });

    // 3. Headcount & Payroll by Department
    const departmentDistribution = departmentStats.map((d) => ({
      name: d._id || 'Unassigned',
      headcount: d.count,
      payrollCost: d.totalSalary || 0,
    }));

    // 4. Salary Distribution Slabs
    const salarySlabs = [
      { slab: '< 50k', count: 0 },
      { slab: '50k - 100k', count: 0 },
      { slab: '100k - 150k', count: 0 },
      { slab: '150k - 200k', count: 0 },
      { slab: '> 200k', count: 0 },
    ];
    allEmployees.forEach((e: any) => {
      const gross = e.salaryStructure?.grossSalary || e.basicSalary * 1.5 || 0;
      if (gross < 50000) salarySlabs[0].count++;
      else if (gross < 100000) salarySlabs[1].count++;
      else if (gross < 150000) salarySlabs[2].count++;
      else if (gross < 200000) salarySlabs[3].count++;
      else salarySlabs[4].count++;
    });

    // 5. Employee Tenure
    const tenureStats = [
      { label: '< 6 Months', count: 0 },
      { label: '6 - 12 Months', count: 0 },
      { label: '1 - 2 Years', count: 0 },
      { label: '2+ Years', count: 0 },
    ];
    const now = new Date().getTime();
    allEmployees.forEach((e: any) => {
      const joinTime = new Date(e.joiningDate || now).getTime();
      const diffMonths = (now - joinTime) / (1000 * 60 * 60 * 24 * 30.4);
      if (diffMonths < 6) tenureStats[0].count++;
      else if (diffMonths < 12) tenureStats[1].count++;
      else if (diffMonths < 24) tenureStats[2].count++;
      else tenureStats[3].count++;
    });

    // 6. Leave Utilization
    const leaveUtilization = leaveTypes.map((lt) => {
      const used = approvedLeavesThisYear
        .filter((l) => l.leaveType.toString() === lt._id.toString())
        .reduce((sum, l) => sum + (l.workingDays || 0), 0);
      return {
        leaveType: lt.name,
        code: lt.code,
        quota: lt.yearlyQuota === -1 ? 'Unlimited' : lt.yearlyQuota * (totalHeadcount || 1),
        daysUsed: used,
      };
    });

    res.json({
      success: true,
      data: {
        kpis: {
          totalHeadcount,
          activeEmployees,
          probationEmployees,
          presentToday,
          onLeaveToday: onLeaveTodayCount,
          lateToday,
          companyPayrollCost,
          averageSalary,
          attritionRateYTD,
        },
        charts: {
          attendanceTrends,
          departmentDistribution,
          salarySlabs,
          tenureStats,
          leaveUtilization,
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching admin dashboard';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function getHrDashboard(req: Request, res: Response) {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    const [
      totalEmployees,
      todayAttendances,
      onLeaveTodayCount,
      pendingLeaveApprovals,
      pendingAttendanceCorrections,
      monthAttendances,
      departmentStats,
    ] = await Promise.all([
      Employee.countDocuments({ employmentStatus: { $in: ['active', 'probation'] } }),
      Attendance.find({ date: todayStr }),
      LeaveRequest.countDocuments({
        status: 'approved',
        startDate: { $lte: todayStr },
        endDate: { $gte: todayStr },
      }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      AttendanceCorrection.countDocuments({ status: 'pending' }),
      Attendance.find({ date: { $regex: `^${currentMonthStr}` } }),
      Employee.aggregate([
        { $lookup: { from: 'departments', localField: 'department', foreignField: '_id', as: 'dept' } },
        { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
        { $group: { _id: '$dept.name', count: { $sum: 1 } } },
      ]),
    ]);

    let presentToday = 0;
    let lateToday = 0;
    todayAttendances.forEach((a) => {
      if (a.status === 'present') presentToday++;
      else if (a.status === 'late') lateToday++;
      else if (a.status === 'half_day') presentToday += 0.5;
    });

    // Challenge Attendance Rate formula:
    // (Present + Late + Missing Checkout + 0.5 * Half Day) / (Working-day records - On Leave)
    let totalPresentSum = 0;
    monthAttendances.forEach((a) => {
      if (a.status === 'present' || a.status === 'late' || a.status === 'missing_checkout') {
        totalPresentSum += 1;
      } else if (a.status === 'half_day') {
        totalPresentSum += 0.5;
      }
    });

    const denominator = Math.max(1, monthAttendances.length);
    const monthlyAttendanceRate = Number(((totalPresentSum / denominator) * 100).toFixed(1));

    // Late comers statistics
    const lateRecords = await Attendance.find({ status: 'late' })
      .populate('employee', 'fullName employeeCode')
      .sort({ date: -1 })
      .limit(6)
      .lean();

    res.json({
      success: true,
      data: {
        kpis: {
          totalEmployees,
          presentToday,
          onLeaveToday: onLeaveTodayCount,
          lateToday,
          pendingLeaveApprovals,
          pendingAttendanceCorrections,
          monthlyAttendanceRate: Math.min(100, monthlyAttendanceRate),
        },
        departmentBreakdown: departmentStats.map((d) => ({ department: d._id || 'Unassigned', count: d.count })),
        recentLateComers: lateRecords.map((r: any) => ({
          name: r.employee?.fullName || 'N/A',
          code: r.employee?.employeeCode || 'N/A',
          date: r.date,
          checkIn: r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : 'N/A',
        })),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching HR dashboard';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function getEmployeeDashboard(req: AuthRequest, res: Response) {
  try {
    if (!req.employeeId) {
      return res.status(403).json({ success: false, message: 'No employee profile linked.' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7);

    // Get today's attendance record
    const todayAttendance = await Attendance.findOne({
      employee: req.employeeId,
      date: todayStr,
    });

    // Hours worked this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAttendances = await Attendance.find({
      employee: req.employeeId,
      date: { $gte: weekAgo.toISOString().split('T')[0] },
    });

    const totalMinutesThisWeek = weekAttendances.reduce((sum, a) => sum + (a.durationMinutes || 0), 0);
    const hoursWorkedThisWeek = Number((totalMinutesThisWeek / 60).toFixed(1));

    // Late count this month
    const lateCountThisMonth = await Attendance.countDocuments({
      employee: req.employeeId,
      date: { $regex: `^${currentMonthStr}` },
      status: 'late',
    });

    // Leave balances
    const [leaveTypes, approvedLeaves] = await Promise.all([
      LeaveType.find({ isActive: true }),
      LeaveRequest.find({
        employee: req.employeeId,
        status: 'approved',
        startDate: { $regex: `^${new Date().getFullYear()}` },
      }),
    ]);

    const leaveBalances = leaveTypes.map((lt) => {
      const used = approvedLeaves
        .filter((l) => l.leaveType.toString() === lt._id.toString())
        .reduce((sum, l) => sum + (l.workingDays || 0), 0);

      const remaining = lt.yearlyQuota === -1 ? 999 : Math.max(0, lt.yearlyQuota - used);
      return {
        leaveTypeId: lt._id,
        leaveTypeName: lt.name,
        leaveTypeCode: lt.code,
        quota: lt.yearlyQuota,
        used,
        pending: 0,
        remaining,
        isPaid: lt.isPaid,
      };
    });

    // Latest payslip
    const latestPayslip = await Payslip.findOne({
      employee: req.employeeId,
      status: 'finalized',
    }).sort({ month: -1 });

    res.json({
      success: true,
      data: {
        kpis: {
          todayStatus: todayAttendance ? todayAttendance.status : 'not_checked_in',
          checkInTime: todayAttendance?.checkIn ? new Date(todayAttendance.checkIn).toLocaleTimeString() : undefined,
          checkOutTime: todayAttendance?.checkOut ? new Date(todayAttendance.checkOut).toLocaleTimeString() : undefined,
          hoursWorkedThisWeek,
          lateCountThisMonth,
          leaveBalances,
          latestPayslip: latestPayslip || null,
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching employee dashboard';
    res.status(500).json({ success: false, message: msg });
  }
}
