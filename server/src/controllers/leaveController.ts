import { Request, Response } from 'express';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { LeaveType } from '../models/LeaveType.js';
import { Employee } from '../models/Employee.js';
import { Notification } from '../models/Communication.js';
import { PolicyService } from '../services/policyService.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/audit.js';

export async function applyLeave(req: AuthRequest, res: Response) {
  try {
    if (!req.employeeId) {
      return res.status(403).json({ success: false, message: 'You must have an employee profile to apply for leave.' });
    }

    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Leave type, start date, end date, and reason are required.',
      });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, message: 'Start date cannot be after end date.' });
    }

    // 1. Verify leave type
    const leaveTypeDoc = await LeaveType.findById(leaveType);
    if (!leaveTypeDoc || !leaveTypeDoc.isActive) {
      return res.status(404).json({ success: false, message: 'Invalid or inactive leave type selected.' });
    }

    // 2. Check for overlapping leaves
    const overlapping = await LeaveRequest.findOne({
      employee: req.employeeId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    });

    if (overlapping) {
      return res.status(422).json({
        success: false,
        message: `Overlapping leave request detected from ${overlapping.startDate} to ${overlapping.endDate} (${overlapping.status}).`,
      });
    }

    // 3. Calculate working days (excluding weekends & public holidays)
    const calculation = await PolicyService.calculateWorkingDays(startDate, endDate);
    const requestedWorkingDays = calculation.effectiveWorkingDays;

    if (requestedWorkingDays <= 0) {
      return res.status(422).json({
        success: false,
        message: 'The selected date range contains no working days (all days fall on weekends or public holidays).',
      });
    }

    // 4. Validate remaining quota balance (except unpaid leave)
    if (leaveTypeDoc.yearlyQuota !== -1) {
      const currentYear = new Date(startDate).getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;

      const approvedLeavesThisYear = await LeaveRequest.find({
        employee: req.employeeId,
        leaveType: leaveTypeDoc._id,
        status: 'approved',
        startDate: { $gte: yearStart },
        endDate: { $lte: yearEnd },
      });

      const usedDays = approvedLeavesThisYear.reduce((acc, l) => acc + l.workingDays, 0);
      const remainingDays = Math.max(0, leaveTypeDoc.yearlyQuota - usedDays);

      if (requestedWorkingDays > remainingDays) {
        return res.status(422).json({
          success: false,
          message: `Insufficient leave balance. You requested ${requestedWorkingDays} day(s), but have only ${remainingDays} day(s) remaining for ${leaveTypeDoc.name}.`,
          data: {
            requested: requestedWorkingDays,
            remaining: remainingDays,
            yearlyQuota: leaveTypeDoc.yearlyQuota,
            used: usedDays,
          },
        });
      }
    }

    // 5. Create pending leave request
    const leave = new LeaveRequest({
      employee: req.employeeId,
      leaveType: leaveTypeDoc._id,
      startDate,
      endDate,
      workingDays: requestedWorkingDays,
      reason: reason.trim(),
      status: 'pending',
    });

    await leave.save();

    await logAuditEvent(req, 'LEAVE_APPLICATION_SUBMITTED', 'LeaveRequest', leave._id.toString(), undefined, {
      employeeId: req.employeeId,
      leaveTypeName: leaveTypeDoc.name,
      workingDays: requestedWorkingDays,
      startDate,
      endDate,
    });

    res.status(201).json({
      success: true,
      message: `Leave application for ${requestedWorkingDays} working day(s) submitted successfully. Status: PENDING HR approval.`,
      data: leave,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error applying for leave';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function getMyLeaveOverview(req: AuthRequest, res: Response) {
  try {
    if (!req.employeeId) {
      return res.status(403).json({ success: false, message: 'No employee profile linked to user.' });
    }

    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    const [leaveTypes, leaves] = await Promise.all([
      LeaveType.find({ isActive: true }),
      LeaveRequest.find({ employee: req.employeeId })
        .populate('leaveType', 'name code isPaid yearlyQuota')
        .sort({ createdAt: -1 }),
    ]);

    const approvedLeavesThisYear = leaves.filter(
      (l) => l.status === 'approved' && l.startDate >= yearStart && l.startDate <= yearEnd
    );
    const pendingLeavesThisYear = leaves.filter(
      (l) => l.status === 'pending' && l.startDate >= yearStart && l.startDate <= yearEnd
    );

    const balances = leaveTypes.map((lt) => {
      const used = approvedLeavesThisYear
        .filter((l) => (l.leaveType as any)?._id.toString() === lt._id.toString())
        .reduce((sum, l) => sum + (l.workingDays || 0), 0);

      const pending = pendingLeavesThisYear
        .filter((l) => (l.leaveType as any)?._id.toString() === lt._id.toString())
        .reduce((sum, l) => sum + (l.workingDays || 0), 0);

      const quota = lt.yearlyQuota;
      const remaining = quota === -1 ? 999 : Math.max(0, quota - used);

      return {
        leaveTypeId: lt._id,
        leaveTypeName: lt.name,
        leaveTypeCode: lt.code,
        quota,
        used,
        pending,
        remaining,
        isPaid: lt.isPaid,
      };
    });

    res.json({
      success: true,
      year: currentYear,
      balances,
      history: leaves,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching leave overview';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function cancelLeave(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const leave = await LeaveRequest.findById(id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leave.employee.toString() !== req.employeeId?.toString()) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own leave requests.' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Only pending leave requests can be cancelled. Current status is ${leave.status}.`,
      });
    }

    leave.status = 'cancelled';
    await leave.save();

    await logAuditEvent(req, 'LEAVE_CANCELLED', 'LeaveRequest', leave._id.toString());
    res.json({ success: true, message: 'Leave request cancelled successfully', data: leave });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error cancelling leave';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function listAllLeaves(req: Request, res: Response) {
  try {
    const { status, employeeId, startDate, endDate } = req.query;
    const query: Record<string, unknown> = {};

    if (status) query.status = status;
    if (employeeId) query.employee = employeeId;
    if (startDate && endDate) {
      query.startDate = { $gte: startDate };
      query.endDate = { $lte: endDate };
    }

    const leaves = await LeaveRequest.find(query)
      .populate({
        path: 'employee',
        populate: [{ path: 'department' }, { path: 'designation' }],
      })
      .populate('leaveType', 'name code isPaid yearlyQuota')
      .populate('reviewer', 'email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: leaves.length, data: leaves });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error listing leave requests';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function reviewLeave(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { action, comment } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'approve' or 'reject'." });
    }

    const leave = await LeaveRequest.findById(id).populate('employee').populate('leaveType');
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Leave request has already been ${leave.status}.` });
    }

    const finalStatus = action === 'approve' ? 'approved' : 'rejected';
    leave.status = finalStatus;
    leave.reviewer = req.user?._id;
    leave.reviewerComment = comment || '';
    leave.reviewedAt = new Date();
    await leave.save();

    // Create Notification for the employee
    const empUser = (leave.employee as any)?.user;
    if (empUser) {
      await Notification.create({
        recipient: empUser,
        title: `Leave Request ${finalStatus.toUpperCase()}`,
        message: `Your ${ (leave.leaveType as any)?.name } request for ${leave.startDate} to ${leave.endDate} has been ${finalStatus}. HR comment: ${comment || 'Approved'}`,
        type: 'leave',
        link: '/employee/leaves',
      });
    }

    await logAuditEvent(req, `LEAVE_REQUEST_${finalStatus.toUpperCase()}`, 'LeaveRequest', leave._id.toString(), undefined, {
      employeeId: leave.employee._id.toString(),
      status: finalStatus,
      comment,
    });

    res.json({
      success: true,
      message: `Leave request ${finalStatus} successfully.`,
      data: leave,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error reviewing leave request';
    res.status(500).json({ success: false, message: msg });
  }
}
