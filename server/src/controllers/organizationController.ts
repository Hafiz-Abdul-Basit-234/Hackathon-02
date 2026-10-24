import { Request, Response } from 'express';
import { CompanySettings } from '../models/CompanySettings.js';
import { Department } from '../models/Department.js';
import { Designation } from '../models/Designation.js';
import { LeaveType } from '../models/LeaveType.js';
import { Holiday } from '../models/Holiday.js';
import { Employee } from '../models/Employee.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/audit.js';

// ==================== COMPANY SETTINGS ====================
export async function getCompanySettings(req: Request, res: Response) {
  try {
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = await CompanySettings.create({
        name: 'Saylani HCM Enterprise',
        email: 'info@saylani.org',
        officeStartTime: '09:00',
        gracePeriodMinutes: 15,
        weekendDays: ['saturday', 'sunday'],
        halfDayHoursThreshold: 5,
        officeLatitude: 24.8607,
        officeLongitude: 67.0011,
        officeRadiusMeters: 150,
      });
    }
    res.json({ success: true, data: settings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching company settings';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function updateCompanySettings(req: AuthRequest, res: Response) {
  try {
    let settings = await CompanySettings.findOne();
    const beforeState = settings ? settings.toObject() : null;

    if (!settings) {
      settings = new CompanySettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }

    await settings.save();
    await logAuditEvent(req, 'COMPANY_SETTINGS_UPDATED', 'CompanySettings', settings._id.toString(), beforeState, settings.toObject());

    res.json({ success: true, message: 'Company settings updated successfully', data: settings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating company settings';
    res.status(500).json({ success: false, message: msg });
  }
}

// ==================== DEPARTMENTS ====================
export async function listDepartments(req: Request, res: Response) {
  try {
    const departments = await Department.find().sort({ name: 1 });
    // Count employees per department
    const counts = await Employee.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));

    const result = departments.map((d) => ({
      ...d.toObject(),
      employeeCount: countMap.get(d._id.toString()) || 0,
    }));

    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error listing departments';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function createDepartment(req: AuthRequest, res: Response) {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Department name and code are required.' });
    }

    const existing = await Department.findOne({ $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }] });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A department with this name or code already exists.' });
    }

    const dept = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || '',
      isActive: true,
    });

    await logAuditEvent(req, 'DEPARTMENT_CREATED', 'Department', dept._id.toString(), undefined, dept.toObject());
    res.status(201).json({ success: true, message: 'Department created successfully', data: dept });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating department';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function updateDepartment(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const beforeState = dept.toObject();
    if (name) dept.name = name.trim();
    if (code) dept.code = code.trim().toUpperCase();
    if (description !== undefined) dept.description = description;
    if (isActive !== undefined) dept.isActive = Boolean(isActive);

    await dept.save();
    await logAuditEvent(req, 'DEPARTMENT_UPDATED', 'Department', dept._id.toString(), beforeState, dept.toObject());

    res.json({ success: true, message: 'Department updated successfully', data: dept });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating department';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function deleteDepartment(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const dept = await Department.findById(id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    dept.isActive = !dept.isActive;
    await dept.save();

    await logAuditEvent(req, 'DEPARTMENT_STATUS_TOGGLED', 'Department', dept._id.toString());
    res.json({ success: true, message: `Department ${dept.isActive ? 'activated' : 'deactivated'}`, data: dept });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error toggling department';
    res.status(500).json({ success: false, message: msg });
  }
}

// ==================== DESIGNATIONS ====================
export async function listDesignations(req: Request, res: Response) {
  try {
    const { department } = req.query;
    const query: Record<string, unknown> = {};
    if (department) query.department = department;

    const designations = await Designation.find(query).populate('department', 'name code').sort({ title: 1 });
    res.json({ success: true, data: designations });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error listing designations';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function createDesignation(req: AuthRequest, res: Response) {
  try {
    const { title, code, department, description } = req.body;
    if (!title || !code || !department) {
      return res.status(400).json({ success: false, message: 'Title, code, and department are required.' });
    }

    const designation = await Designation.create({
      title: title.trim(),
      code: code.trim().toUpperCase(),
      department,
      description: description || '',
      isActive: true,
    });

    await logAuditEvent(req, 'DESIGNATION_CREATED', 'Designation', designation._id.toString(), undefined, designation.toObject());
    res.status(201).json({ success: true, message: 'Designation created successfully', data: designation });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating designation';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function updateDesignation(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const designation = await Designation.findById(id);
    if (!designation) return res.status(404).json({ success: false, message: 'Designation not found' });

    const beforeState = designation.toObject();
    Object.assign(designation, req.body);
    await designation.save();

    await logAuditEvent(req, 'DESIGNATION_UPDATED', 'Designation', designation._id.toString(), beforeState, designation.toObject());
    res.json({ success: true, message: 'Designation updated successfully', data: designation });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating designation';
    res.status(500).json({ success: false, message: msg });
  }
}

// ==================== LEAVE TYPES ====================
export async function listLeaveTypes(req: Request, res: Response) {
  try {
    const leaveTypes = await LeaveType.find().sort({ createdAt: 1 });
    res.json({ success: true, data: leaveTypes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error listing leave types';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function createLeaveType(req: AuthRequest, res: Response) {
  try {
    const { name, code, yearlyQuota, isPaid } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Name and code are required.' });
    }

    const leaveType = await LeaveType.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      yearlyQuota: yearlyQuota !== undefined ? Number(yearlyQuota) : 10,
      isPaid: isPaid !== undefined ? Boolean(isPaid) : true,
      isActive: true,
    });

    await logAuditEvent(req, 'LEAVE_TYPE_CREATED', 'LeaveType', leaveType._id.toString(), undefined, leaveType.toObject());
    res.status(201).json({ success: true, message: 'Leave type created successfully', data: leaveType });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating leave type';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function updateLeaveType(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const leaveType = await LeaveType.findById(id);
    if (!leaveType) return res.status(404).json({ success: false, message: 'Leave type not found' });

    const beforeState = leaveType.toObject();
    Object.assign(leaveType, req.body);
    await leaveType.save();

    await logAuditEvent(req, 'LEAVE_TYPE_UPDATED', 'LeaveType', leaveType._id.toString(), beforeState, leaveType.toObject());
    res.json({ success: true, message: 'Leave type updated successfully', data: leaveType });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating leave type';
    res.status(500).json({ success: false, message: msg });
  }
}

// ==================== PUBLIC HOLIDAYS ====================
export async function listHolidays(req: Request, res: Response) {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json({ success: true, data: holidays });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error listing holidays';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function createHoliday(req: AuthRequest, res: Response) {
  try {
    const { title, date, description } = req.body;
    if (!title || !date) {
      return res.status(400).json({ success: false, message: 'Title and date (YYYY-MM-DD) are required.' });
    }

    const existing = await Holiday.findOne({ date });
    if (existing) {
      return res.status(409).json({ success: false, message: `A holiday is already scheduled on ${date}.` });
    }

    const holiday = await Holiday.create({
      title: title.trim(),
      date,
      description: description || '',
    });

    await logAuditEvent(req, 'HOLIDAY_CREATED', 'Holiday', holiday._id.toString(), undefined, holiday.toObject());
    res.status(201).json({ success: true, message: 'Holiday created successfully', data: holiday });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating holiday';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function deleteHoliday(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const holiday = await Holiday.findByIdAndDelete(id);
    if (!holiday) return res.status(404).json({ success: false, message: 'Holiday not found' });

    await logAuditEvent(req, 'HOLIDAY_DELETED', 'Holiday', id, holiday.toObject());
    res.json({ success: true, message: 'Holiday deleted successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error deleting holiday';
    res.status(500).json({ success: false, message: msg });
  }
}
