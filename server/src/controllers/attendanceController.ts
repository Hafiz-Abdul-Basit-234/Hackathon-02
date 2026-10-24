import { Request, Response } from 'express';
import { Attendance } from '../models/Attendance.js';
import { AttendanceCorrection } from '../models/AttendanceCorrection.js';
import { Employee } from '../models/Employee.js';
import { CompanySettings } from '../models/CompanySettings.js';
import { Notification } from '../models/Communication.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/audit.js';

// Haversine formula to compute distance in meters between two lat/lng coordinates
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export async function checkIn(req: AuthRequest, res: Response) {
  try {
    if (!req.user || !req.employeeId) {
      return res.status(403).json({ success: false, message: 'You must have an employee profile to record attendance.' });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Check if record already exists for today
    const existing = await Attendance.findOne({ employee: req.employeeId, date: todayStr });
    if (existing && existing.checkIn) {
      return res.status(409).json({
        success: false,
        message: 'Attendance check-in already recorded for today. Duplicate check-ins are rejected.',
        data: existing,
      });
    }

    const settings = (await CompanySettings.findOne()) || {
      officeStartTime: '09:00',
      gracePeriodMinutes: 15,
      officeLatitude: 24.8607,
      officeLongitude: 67.0011,
      officeRadiusMeters: 150,
    };

    // Calculate Late status based on server time
    const [startH, startM] = (settings.officeStartTime || '09:00').split(':').map(Number);
    const graceCutoff = new Date(now);
    graceCutoff.setHours(startH, startM + (settings.gracePeriodMinutes || 15), 0, 0);

    const isLate = now > graceCutoff;
    const initialStatus = isLate ? 'late' : 'present';

    // Location & Face detection bonus check
    const { latitude, longitude, faceDetected } = req.body;
    let locationData: any = undefined;

    if (latitude !== undefined && longitude !== undefined) {
      const distance = calculateHaversineDistance(
        Number(latitude),
        Number(longitude),
        settings.officeLatitude,
        settings.officeLongitude
      );
      const isWithinRadius = distance <= (settings.officeRadiusMeters || 150);
      locationData = {
        latitude: Number(latitude),
        longitude: Number(longitude),
        distanceMeters: distance,
        isWithinRadius,
      };
    }

    const attendance = new Attendance({
      employee: req.employeeId,
      user: req.user._id,
      date: todayStr,
      checkIn: now,
      status: initialStatus,
      location: locationData,
      faceDetected: Boolean(faceDetected),
    });

    await attendance.save();

    res.status(201).json({
      success: true,
      message: `Checked in successfully at ${now.toLocaleTimeString()}. Status: ${initialStatus.toUpperCase()}`,
      data: attendance,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Check-in failed';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function checkOut(req: AuthRequest, res: Response) {
  try {
    if (!req.user || !req.employeeId) {
      return res.status(403).json({ success: false, message: 'You must have an employee profile to record attendance.' });
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const attendance = await Attendance.findOne({ employee: req.employeeId, date: todayStr });
    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({ success: false, message: 'Cannot check out without an active check-in for today.' });
    }

    if (attendance.checkOut) {
      return res.status(409).json({
        success: false,
        message: 'Check-out has already been recorded for today.',
        data: attendance,
      });
    }

    const checkInTime = new Date(attendance.checkIn).getTime();
    const checkOutTime = now.getTime();
    const durationMinutes = Math.max(0, Math.round((checkOutTime - checkInTime) / (1000 * 60)));

    const settings = (await CompanySettings.findOne()) || { halfDayHoursThreshold: 5 };
    const halfDayMinutes = (settings.halfDayHoursThreshold || 5) * 60;

    let finalStatus = attendance.status;
    if (durationMinutes < halfDayMinutes) {
      finalStatus = 'half_day';
    }

    attendance.checkOut = now;
    attendance.durationMinutes = durationMinutes;
    attendance.status = finalStatus;
    await attendance.save();

    res.json({
      success: true,
      message: `Checked out successfully at ${now.toLocaleTimeString()}. Worked ${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m.`,
      data: attendance,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Check-out failed';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function getAttendanceBoard(req: Request, res: Response) {
  try {
    const { date, department, status, search } = req.query;
    const targetDate = (date as string) || new Date().toISOString().split('T')[0];

    const query: Record<string, unknown> = { date: targetDate };
    if (status) query.status = status;

    let attendances = await Attendance.find(query)
      .populate({
        path: 'employee',
        populate: [{ path: 'department' }, { path: 'designation' }],
      })
      .sort({ checkIn: -1 })
      .lean();

    // In-memory filter for department/search if needed
    if (department) {
      attendances = attendances.filter((a: any) => a.employee?.department?._id.toString() === department);
    }
    if (search) {
      const q = String(search).toLowerCase();
      attendances = attendances.filter(
        (a: any) =>
          a.employee?.fullName.toLowerCase().includes(q) ||
          a.employee?.employeeCode.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      date: targetDate,
      totalCount: attendances.length,
      data: attendances,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching attendance board';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function getMyAttendance(req: AuthRequest, res: Response) {
  try {
    if (!req.employeeId) {
      return res.status(403).json({ success: false, message: 'No employee profile linked to user.' });
    }

    const { month } = req.query; // YYYY-MM
    const currentMonth = (month as string) || new Date().toISOString().substring(0, 7);

    const attendances = await Attendance.find({
      employee: req.employeeId,
      date: { $regex: `^${currentMonth}` },
    }).sort({ date: -1 });

    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecord = attendances.find((a) => a.date === todayStr);

    res.json({
      success: true,
      month: currentMonth,
      todayRecord: todayRecord || null,
      records: attendances,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching attendance history';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function requestAttendanceCorrection(req: AuthRequest, res: Response) {
  try {
    if (!req.employeeId) {
      return res.status(403).json({ success: false, message: 'No employee profile linked.' });
    }

    const { attendanceDate, requestedCheckIn, requestedCheckOut, reason } = req.body;
    if (!attendanceDate || !requestedCheckIn || !requestedCheckOut || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Attendance date, requested check-in, requested check-out, and reason are required.',
      });
    }

    const existingAttendance = await Attendance.findOne({ employee: req.employeeId, date: attendanceDate });

    const correction = new AttendanceCorrection({
      attendance: existingAttendance ? existingAttendance._id : null,
      employee: req.employeeId,
      attendanceDate,
      requestedCheckIn: new Date(requestedCheckIn),
      requestedCheckOut: new Date(requestedCheckOut),
      reason: reason.trim(),
      status: 'pending',
    });

    await correction.save();

    if (existingAttendance) {
      existingAttendance.correctionRequested = true;
      await existingAttendance.save();
    }

    res.status(201).json({
      success: true,
      message: 'Attendance correction request submitted to HR for approval.',
      data: correction,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error submitting correction request';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function listCorrectionRequests(req: Request, res: Response) {
  try {
    const { status } = req.query;
    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const corrections = await AttendanceCorrection.find(query)
      .populate({
        path: 'employee',
        populate: [{ path: 'department' }, { path: 'designation' }],
      })
      .populate('reviewer', 'email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: corrections });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error listing corrections';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function reviewCorrectionRequest(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { action, comment } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'approve' or 'reject'." });
    }

    const correction = await AttendanceCorrection.findById(id).populate('employee');
    if (!correction) {
      return res.status(404).json({ success: false, message: 'Correction request not found.' });
    }

    if (correction.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${correction.status}.` });
    }

    const finalStatus = action === 'approve' ? 'approved' : 'rejected';
    correction.status = finalStatus;
    correction.reviewer = req.user?._id;
    correction.reviewerComment = comment || '';
    correction.reviewedAt = new Date();
    await correction.save();

    // If approved, update or create Attendance record
    if (finalStatus === 'approved') {
      let attendance = await Attendance.findOne({
        employee: correction.employee._id,
        date: correction.attendanceDate,
      });

      const start = new Date(correction.requestedCheckIn);
      const end = new Date(correction.requestedCheckOut);
      const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / (1000 * 60)));
      const settings = (await CompanySettings.findOne()) || { halfDayHoursThreshold: 5 };
      const status = durationMinutes < (settings.halfDayHoursThreshold || 5) * 60 ? 'half_day' : 'present';

      if (!attendance) {
        attendance = new Attendance({
          employee: correction.employee._id,
          user: (correction.employee as any).user,
          date: correction.attendanceDate,
          checkIn: start,
          checkOut: end,
          durationMinutes,
          status,
          correctionRequested: false,
        });
      } else {
        attendance.checkIn = start;
        attendance.checkOut = end;
        attendance.durationMinutes = durationMinutes;
        attendance.status = status;
        attendance.correctionRequested = false;
      }

      await attendance.save();
    }

    // Send notification to employee
    const empUser = (correction.employee as any).user;
    if (empUser) {
      await Notification.create({
        recipient: empUser,
        title: `Attendance Correction ${finalStatus.toUpperCase()}`,
        message: `Your attendance correction for ${correction.attendanceDate} has been ${finalStatus}. Note: ${comment || 'No comment provided.'}`,
        type: 'attendance',
        link: '/employee/attendance',
      });
    }

    await logAuditEvent(req, `ATTENDANCE_CORRECTION_${finalStatus.toUpperCase()}`, 'AttendanceCorrection', correction._id.toString(), undefined, {
      employeeId: correction.employee._id.toString(),
      date: correction.attendanceDate,
      comment,
    });

    res.json({
      success: true,
      message: `Attendance correction ${finalStatus} successfully.`,
      data: correction,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error reviewing correction';
    res.status(500).json({ success: false, message: msg });
  }
}
