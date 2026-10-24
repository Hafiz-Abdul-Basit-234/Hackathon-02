import { Request, Response } from 'express';
import { CompanySettings } from '../models/CompanySettings.js';
import { User } from '../models/User.js';
import { LeaveType } from '../models/LeaveType.js';
import { Department } from '../models/Department.js';
import { Designation } from '../models/Designation.js';
import { connectDB, getDBStatus } from '../config/db.js';
import { ENV, validateEnvironment } from '../config/env.js';
import { logAuditEvent } from '../middleware/audit.js';

export async function getSetupStatus(req: Request, res: Response) {
  try {
    const configCheck = validateEnvironment();
    const dbStatus = getDBStatus();

    // Check if company exists in DB if DB is connected
    let hasCompany = false;
    let setupCompleted = false;
    let adminCount = 0;

    if (dbStatus.isConnected) {
      const company = await CompanySettings.findOne();
      if (company && company.setupCompleted) {
        hasCompany = true;
        setupCompleted = true;
      }
      adminCount = await User.countDocuments({ role: 'admin' });
    }

    res.json({
      success: true,
      data: {
        configValid: configCheck.isValid,
        missingVariables: configCheck.missingVariables,
        warnings: configCheck.warnings,
        dbStatus,
        hasCompany,
        setupCompleted,
        adminCount,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Status check failed';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function testDbConnection(req: Request, res: Response) {
  try {
    const { uri } = req.body;
    const result = await connectDB(uri);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection test failed';
    res.status(400).json({ success: false, message: msg });
  }
}

export async function runSetup(req: Request, res: Response) {
  try {
    const dbStatus = getDBStatus();
    if (!dbStatus.isConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database is disconnected. Please configure MONGODB_URI in your environment or connection settings first.',
      });
    }

    // Check if already completed
    const existingCompany = await CompanySettings.findOne();
    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingCompany && existingCompany.setupCompleted && existingAdmin) {
      return res.status(403).json({
        success: false,
        message: 'First-run setup has already been completed. Unauthorized access rejected.',
      });
    }

    const {
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      officeStartTime = '09:00',
      gracePeriodMinutes = 15,
      weekendDays = ['saturday', 'sunday'],
      officeLatitude = 24.8607,
      officeLongitude = 67.0011,
      officeRadiusMeters = 150,
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    if (!companyName || !companyEmail) {
      return res.status(400).json({ success: false, message: 'Company name and company email are required.' });
    }

    const finalAdminEmail = adminEmail || ENV.ADMIN_EMAIL;
    const finalAdminPassword = adminPassword || ENV.ADMIN_PASSWORD;

    if (!finalAdminEmail || !finalAdminPassword) {
      return res.status(400).json({ success: false, message: 'Admin email and password are required for initial setup.' });
    }

    // 1. Create or update Company Settings
    let company = existingCompany;
    if (!company) {
      company = new CompanySettings({
        name: companyName,
        email: companyEmail,
        phone: companyPhone || '',
        address: companyAddress || '',
        officeStartTime,
        gracePeriodMinutes: Number(gracePeriodMinutes),
        weekendDays,
        officeLatitude: Number(officeLatitude),
        officeLongitude: Number(officeLongitude),
        officeRadiusMeters: Number(officeRadiusMeters),
        setupCompleted: true,
      });
    } else {
      company.name = companyName;
      company.email = companyEmail;
      company.phone = companyPhone || '';
      company.address = companyAddress || '';
      company.officeStartTime = officeStartTime;
      company.gracePeriodMinutes = Number(gracePeriodMinutes);
      company.weekendDays = weekendDays;
      company.officeLatitude = Number(officeLatitude);
      company.officeLongitude = Number(officeLongitude);
      company.officeRadiusMeters = Number(officeRadiusMeters);
      company.setupCompleted = true;
    }
    await company.save();

    // 2. Create initial Admin Account if not exists
    let admin = existingAdmin;
    if (!admin) {
      admin = new User({
        email: finalAdminEmail.toLowerCase().trim(),
        password: finalAdminPassword,
        role: 'admin',
        status: 'active',
        isTemporaryPassword: false,
      });
      await admin.save();
    }

    // 3. Initialize challenge default Leave Types if not existing
    const leaveTypesCount = await LeaveType.countDocuments();
    if (leaveTypesCount === 0) {
      await LeaveType.insertMany([
        { name: 'Annual Leave', code: 'ANNUAL', yearlyQuota: 14, isPaid: true, isActive: true },
        { name: 'Sick Leave', code: 'SICK', yearlyQuota: 8, isPaid: true, isActive: true },
        { name: 'Casual Leave', code: 'CASUAL', yearlyQuota: 10, isPaid: true, isActive: true },
        { name: 'Unpaid Leave', code: 'UNPAID', yearlyQuota: -1, isPaid: false, isActive: true },
      ]);
    }

    // 4. Initialize starter departments if empty
    const deptCount = await Department.countDocuments();
    if (deptCount === 0) {
      const itDept = await Department.create({ name: 'Information Technology', code: 'IT', description: 'Core software development and IT infrastructure' });
      const hrDept = await Department.create({ name: 'Human Resources', code: 'HR', description: 'People operations and talent acquisition' });
      await Department.create({ name: 'Finance & Accounts', code: 'FIN', description: 'Financial management and accounting' });

      // Starter designations
      await Designation.create({ title: 'Software Engineer', code: 'SE', department: itDept._id });
      await Designation.create({ title: 'Senior Software Engineer', code: 'SSE', department: itDept._id });
      await Designation.create({ title: 'HR Officer', code: 'HRO', department: hrDept._id });
    }

    await logAuditEvent(
      { user: admin, ip: req.ip, socket: req.socket } as any,
      'FIRST_RUN_SETUP_COMPLETED',
      'CompanySettings',
      company._id.toString(),
      undefined,
      { companyName, adminEmail: finalAdminEmail }
    );

    res.status(201).json({
      success: true,
      message: 'Initial company and administrator configuration completed successfully!',
      data: {
        company,
        admin: {
          id: admin._id,
          email: admin.email,
          role: admin.role,
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Setup error';
    res.status(500).json({ success: false, message: msg });
  }
}
