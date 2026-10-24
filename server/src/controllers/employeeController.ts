import { Request, Response } from 'express';
import crypto from 'crypto';
import { Employee, IEmployeeDocument } from '../models/Employee.js';
import { User } from '../models/User.js';
import { Department } from '../models/Department.js';
import { Designation } from '../models/Designation.js';
import { Attendance } from '../models/Attendance.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { Payslip } from '../models/Payroll.js';
import { AuthRequest } from '../middleware/auth.js';
import { logAuditEvent } from '../middleware/audit.js';

export async function listEmployees(req: Request, res: Response) {
  try {
    const {
      page = '1',
      limit = '10',
      search = '',
      department = '',
      status = '',
      sort = '-createdAt',
    } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10)));
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, unknown> = {};

    if (search) {
      const regex = { $regex: String(search).trim(), $options: 'i' };
      query.$or = [{ fullName: regex }, { employeeCode: regex }, { email: regex }, { phone: regex }];
    }

    if (department) {
      query.department = department;
    }

    if (status) {
      query.employmentStatus = status;
    }

    const [employees, total] = await Promise.all([
      Employee.find(query)
        .populate('department', 'name code')
        .populate('designation', 'title code')
        .sort(String(sort))
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Employee.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error listing employees';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function createEmployee(req: AuthRequest, res: Response) {
  try {
    const {
      employeeCode,
      fullName,
      email,
      phone,
      address,
      department,
      designation,
      joiningDate = new Date(),
      employmentStatus = 'probation',
      basicSalary,
      customAllowances = 0,
    } = req.body;

    // 1. Validation
    if (!fullName || !email || !phone || !department || !designation || !basicSalary) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, phone, department, designation, and basic salary are required.',
      });
    }

    const numericSalary = Number(basicSalary);
    if (isNaN(numericSalary) || numericSalary <= 0) {
      return res.status(400).json({ success: false, message: 'Basic salary must be a positive number.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check unique email in Employee and User
    const [existingEmpEmail, existingUserEmail] = await Promise.all([
      Employee.findOne({ email: normalizedEmail }),
      User.findOne({ email: normalizedEmail }),
    ]);

    if (existingEmpEmail || existingUserEmail) {
      return res.status(409).json({ success: false, message: 'An employee with this email already exists.' });
    }

    // Determine or generate unique employee code
    let finalCode = employeeCode ? String(employeeCode).trim().toUpperCase() : '';
    if (!finalCode) {
      const count = await Employee.countDocuments();
      finalCode = `EMP-${String(count + 101).padStart(4, '0')}`;
    }

    const existingCode = await Employee.findOne({ employeeCode: finalCode });
    if (existingCode) {
      return res.status(409).json({ success: false, message: `Employee code '${finalCode}' is already taken.` });
    }

    // Verify department and designation exist
    const [deptExists, desigExists] = await Promise.all([
      Department.findById(department),
      Designation.findById(designation),
    ]);

    if (!deptExists) {
      return res.status(400).json({ success: false, message: 'Selected department does not exist.' });
    }
    if (!desigExists) {
      return res.status(400).json({ success: false, message: 'Selected designation does not exist.' });
    }

    // Calculate Salary Structure
    const basic = numericSalary;
    const hra = Math.round(basic * 0.4);
    const medicalAllowance = Math.round(basic * 0.1);
    const otherAllowances = Number(customAllowances) || 0;
    const grossSalary = Math.round(basic * 1.5) + otherAllowances;

    // Create Employee record
    const employee = new Employee({
      employeeCode: finalCode,
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      address: address ? address.trim() : 'N/A',
      department,
      designation,
      joiningDate: new Date(joiningDate),
      employmentStatus,
      basicSalary: basic,
      salaryStructure: {
        basicSalary: basic,
        hra,
        medicalAllowance,
        otherAllowances,
        grossSalary,
      },
    });

    await employee.save();

    // Create login account with secure temporary password
    const temporaryPassword = `Saylani@${crypto.randomBytes(3).toString('hex')}`;
    const user = new User({
      email: normalizedEmail,
      password: temporaryPassword,
      role: 'employee',
      status: 'active',
      isTemporaryPassword: true,
      employeeProfile: employee._id,
    });
    await user.save();

    employee.user = user._id;
    await employee.save();

    await logAuditEvent(req, 'EMPLOYEE_REGISTERED', 'Employee', employee._id.toString(), undefined, {
      employeeCode: finalCode,
      fullName,
      email: normalizedEmail,
    });

    res.status(201).json({
      success: true,
      message: `Employee ${fullName} registered successfully.`,
      data: {
        employee,
        temporaryPassword, // Provided securely once to HR
        loginEmail: normalizedEmail,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error registering employee';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function getEmployee360(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const employee = await Employee.findById(id)
      .populate('department', 'name code')
      .populate('designation', 'title code')
      .populate('user', 'status isTemporaryPassword role')
      .lean();

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // 360 Related Data: Recent 10 Attendance, Recent Leaves, Latest Payslip
    const [recentAttendance, recentLeaves, latestPayslip] = await Promise.all([
      Attendance.find({ employee: id }).sort({ date: -1 }).limit(10).lean(),
      LeaveRequest.find({ employee: id }).populate('leaveType', 'name code').sort({ createdAt: -1 }).limit(5).lean(),
      Payslip.findOne({ employee: id }).sort({ month: -1 }).lean(),
    ]);

    res.json({
      success: true,
      data: {
        employee,
        recentAttendance,
        recentLeaves,
        latestPayslip,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching employee 360 view';
    res.status(500).json({ success: false, message: msg });
  }
}

export async function updateEmployee(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const beforeState = employee.toObject();
    const {
      fullName,
      phone,
      address,
      department,
      designation,
      employmentStatus,
      basicSalary,
      otherAllowances,
    } = req.body;

    if (fullName) employee.fullName = fullName.trim();
    if (phone) employee.phone = phone.trim();
    if (address !== undefined) employee.address = address.trim();
    if (department) employee.department = department;
    if (designation) employee.designation = designation;
    if (employmentStatus) employee.employmentStatus = employmentStatus;

    if (basicSalary) {
      const basic = Number(basicSalary);
      const hra = Math.round(basic * 0.4);
      const medical = Math.round(basic * 0.1);
      const other = otherAllowances !== undefined ? Number(otherAllowances) : employee.salaryStructure.otherAllowances;
      const gross = Math.round(basic * 1.5) + other;

      employee.basicSalary = basic;
      employee.salaryStructure = {
        basicSalary: basic,
        hra,
        medicalAllowance: medical,
        otherAllowances: other,
        grossSalary: gross,
      };
    }

    await employee.save();
    await logAuditEvent(req, 'EMPLOYEE_UPDATED', 'Employee', employee._id.toString(), beforeState, employee.toObject());

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: employee,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating employee';
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * CSV Import with Dry-Run, row-level error reporting, and commit.
 */
export async function importEmployeesCsv(req: AuthRequest, res: Response) {
  try {
    const { csvData, dryRun = true } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid CSV text string is required in csvData.' });
    }

    const lines = csvData
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV must contain a header row and at least 1 data row.' });
    }

    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const expectedHeaders = ['full_name', 'email', 'phone', 'department_code', 'basic_salary'];

    // Map column indices
    const nameIdx = header.findIndex((h) => h.includes('name'));
    const emailIdx = header.findIndex((h) => h.includes('email'));
    const phoneIdx = header.findIndex((h) => h.includes('phone'));
    const deptIdx = header.findIndex((h) => h.includes('dept') || h.includes('department'));
    const salaryIdx = header.findIndex((h) => h.includes('salary'));
    const desigIdx = header.findIndex((h) => h.includes('desig') || h.includes('title'));
    const codeIdx = header.findIndex((h) => h.includes('code'));

    if (nameIdx === -1 || emailIdx === -1 || deptIdx === -1 || salaryIdx === -1) {
      return res.status(400).json({
        success: false,
        message: 'CSV headers must include at least: full_name, email, department_code, basic_salary',
      });
    }

    // Cache departments & designations
    const departments = await Department.find();
    const deptCodeMap = new Map(departments.map((d) => [d.code.toUpperCase(), d]));
    const deptNameMap = new Map(departments.map((d) => [d.name.toLowerCase(), d]));

    const existingEmails = new Set((await User.find({}, 'email')).map((u) => u.email.toLowerCase()));
    const existingCodes = new Set((await Employee.find({}, 'employeeCode')).map((e) => e.employeeCode.toUpperCase()));

    const errors: Array<{ row: number; field: string; reason: string }> = [];
    const validRows: Array<{
      row: number;
      employeeCode: string;
      fullName: string;
      email: string;
      phone: string;
      departmentId: string;
      departmentName: string;
      basicSalary: number;
    }> = [];

    let generatedCodeCounter = (await Employee.countDocuments()) + 200;

    for (let i = 1; i < lines.length; i++) {
      const rowNum = i + 1;
      const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

      const fullName = cols[nameIdx] || '';
      const email = (cols[emailIdx] || '').toLowerCase();
      const phone = cols[phoneIdx] || 'N/A';
      const deptRaw = (cols[deptIdx] || '').toUpperCase();
      const salaryRaw = cols[salaryIdx] || '';
      const customCode = codeIdx !== -1 && cols[codeIdx] ? cols[codeIdx].toUpperCase() : '';

      // Validate name
      if (!fullName || fullName.length < 2) {
        errors.push({ row: rowNum, field: 'full_name', reason: 'Full name is required.' });
        continue;
      }

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        errors.push({ row: rowNum, field: 'email', reason: 'Invalid email address format.' });
        continue;
      }
      if (existingEmails.has(email)) {
        errors.push({ row: rowNum, field: 'email', reason: 'Email already exists in database.' });
        continue;
      }

      // Validate department
      const dept = deptCodeMap.get(deptRaw) || deptNameMap.get(deptRaw.toLowerCase());
      if (!dept) {
        errors.push({
          row: rowNum,
          field: 'department',
          reason: `Department '${deptRaw}' does not exist. Available: ${Array.from(deptCodeMap.keys()).join(', ')}`,
        });
        continue;
      }

      // Validate salary
      const salary = Number(salaryRaw);
      if (isNaN(salary) || salary <= 0) {
        errors.push({ row: rowNum, field: 'basic_salary', reason: 'Basic salary must be a positive number.' });
        continue;
      }

      // Code assignment
      let code = customCode;
      if (code && existingCodes.has(code)) {
        errors.push({ row: rowNum, field: 'employee_code', reason: `Employee code '${code}' already exists.` });
        continue;
      }
      if (!code) {
        code = `EMP-${String(generatedCodeCounter++).padStart(4, '0')}`;
      }

      existingEmails.add(email);
      existingCodes.add(code);

      validRows.push({
        row: rowNum,
        employeeCode: code,
        fullName,
        email,
        phone,
        departmentId: dept._id.toString(),
        departmentName: dept.name,
        basicSalary: salary,
      });
    }

    if (dryRun) {
      return res.json({
        success: true,
        dryRun: true,
        summary: {
          totalRows: lines.length - 1,
          validCount: validRows.length,
          errorCount: errors.length,
        },
        errors,
        validPreview: validRows.slice(0, 10),
      });
    }

    // Actual Database Insertion
    if (validRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid rows found to import.',
        errors,
      });
    }

    // Fetch default designation for departments
    const designations = await Designation.find();
    const deptDesigMap = new Map<string, string>();
    designations.forEach((d) => {
      deptDesigMap.set(d.department.toString(), d._id.toString());
    });

    const insertedEmployees = [];

    for (const r of validRows) {
      const basic = r.basicSalary;
      const hra = Math.round(basic * 0.4);
      const medical = Math.round(basic * 0.1);
      const gross = Math.round(basic * 1.5);

      const desigId = deptDesigMap.get(r.departmentId) || designations[0]?._id;

      const employee = new Employee({
        employeeCode: r.employeeCode,
        fullName: r.fullName,
        email: r.email,
        phone: r.phone,
        address: 'N/A',
        department: r.departmentId,
        designation: desigId,
        joiningDate: new Date(),
        employmentStatus: 'active',
        basicSalary: basic,
        salaryStructure: {
          basicSalary: basic,
          hra,
          medicalAllowance: medical,
          otherAllowances: 0,
          grossSalary: gross,
        },
      });

      await employee.save();

      const tempPassword = `Saylani@${crypto.randomBytes(3).toString('hex')}`;
      const user = new User({
        email: r.email,
        password: tempPassword,
        role: 'employee',
        status: 'active',
        isTemporaryPassword: true,
        employeeProfile: employee._id,
      });
      await user.save();

      employee.user = user._id;
      await employee.save();

      insertedEmployees.push({
        id: employee._id,
        code: employee.employeeCode,
        name: employee.fullName,
        email: employee.email,
        tempPassword,
      });
    }

    await logAuditEvent(req, 'EMPLOYEES_IMPORTED_CSV', 'Employee', undefined, undefined, {
      count: insertedEmployees.length,
    });

    res.status(201).json({
      success: true,
      message: `Successfully imported and activated ${insertedEmployees.length} employees.`,
      importedCount: insertedEmployees.length,
      employees: insertedEmployees,
      errors,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error importing CSV';
    res.status(500).json({ success: false, message: msg });
  }
}

/**
 * Export employees as CSV string.
 */
export async function exportEmployeesCsv(req: Request, res: Response) {
  try {
    const employees = await Employee.find()
      .populate('department', 'name code')
      .populate('designation', 'title')
      .sort({ employeeCode: 1 });

    const header = 'Employee Code,Full Name,Email,Phone,Department,Designation,Status,Basic Salary,Gross Salary,Joining Date\n';
    const rows = employees.map((e: any) => {
      const dept = e.department?.name || 'N/A';
      const desig = e.designation?.title || 'N/A';
      const dateStr = e.joiningDate ? new Date(e.joiningDate).toISOString().split('T')[0] : 'N/A';
      return `"${e.employeeCode}","${e.fullName}","${e.email}","${e.phone}","${dept}","${desig}","${e.employmentStatus}",${e.basicSalary},${e.salaryStructure?.grossSalary || e.basicSalary * 1.5},"${dateStr}"`;
    });

    const csvContent = header + rows.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="saylani_employees_export.csv"');
    res.send(csvContent);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error exporting employees';
    res.status(500).json({ success: false, message: msg });
  }
}
