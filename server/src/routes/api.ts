import { Router } from 'express';
import { authenticateJWT, requireRole, checkEmployeeDataScope } from '../middleware/auth.js';

// Controllers
import * as setupCtrl from '../controllers/setupController.js';
import * as authCtrl from '../controllers/authController.js';
import * as orgCtrl from '../controllers/organizationController.js';
import * as empCtrl from '../controllers/employeeController.js';
import * as attCtrl from '../controllers/attendanceController.js';
import * as leaveCtrl from '../controllers/leaveController.js';
import * as payCtrl from '../controllers/payrollController.js';
import * as dashCtrl from '../controllers/dashboardController.js';
import * as commCtrl from '../controllers/communicationController.js';
import * as auditCtrl from '../controllers/auditController.js';
import * as aiCtrl from '../controllers/aiController.js';

const router = Router();

// ==================== SETUP ====================
router.get('/setup/status', setupCtrl.getSetupStatus);
router.post('/setup/init', setupCtrl.runSetup);
router.post('/setup/db-test', setupCtrl.testDbConnection);

// ==================== AUTH ====================
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', authenticateJWT, authCtrl.getMe);
router.post('/auth/change-password', authenticateJWT, authCtrl.changePassword);
router.post('/auth/create-hr', authenticateJWT, requireRole('admin'), authCtrl.createHrAccount);
router.post('/auth/users/:userId/reset-password', authenticateJWT, requireRole('admin'), authCtrl.resetUserPassword);
router.patch('/auth/users/:userId/toggle-status', authenticateJWT, requireRole('admin'), authCtrl.toggleUserStatus);
router.get('/auth/users', authenticateJWT, requireRole('admin'), authCtrl.listUsers);

// ==================== ORGANIZATION ====================
router.get('/company', orgCtrl.getCompanySettings);
router.put('/company', authenticateJWT, requireRole('admin'), orgCtrl.updateCompanySettings);

router.get('/departments', orgCtrl.listDepartments);
router.post('/departments', authenticateJWT, requireRole('admin'), orgCtrl.createDepartment);
router.put('/departments/:id', authenticateJWT, requireRole('admin'), orgCtrl.updateDepartment);
router.delete('/departments/:id', authenticateJWT, requireRole('admin'), orgCtrl.deleteDepartment);

router.get('/designations', orgCtrl.listDesignations);
router.post('/designations', authenticateJWT, requireRole('admin'), orgCtrl.createDesignation);
router.put('/designations/:id', authenticateJWT, requireRole('admin'), orgCtrl.updateDesignation);

router.get('/leave-types', orgCtrl.listLeaveTypes);
router.post('/leave-types', authenticateJWT, requireRole('admin'), orgCtrl.createLeaveType);
router.put('/leave-types/:id', authenticateJWT, requireRole('admin'), orgCtrl.updateLeaveType);

router.get('/holidays', orgCtrl.listHolidays);
router.post('/holidays', authenticateJWT, requireRole('admin'), orgCtrl.createHoliday);
router.delete('/holidays/:id', authenticateJWT, requireRole('admin'), orgCtrl.deleteHoliday);

// ==================== EMPLOYEES ====================
router.get('/employees', authenticateJWT, requireRole('admin', 'hr'), empCtrl.listEmployees);
router.post('/employees', authenticateJWT, requireRole('admin', 'hr'), empCtrl.createEmployee);
router.post('/employees/import-csv', authenticateJWT, requireRole('admin', 'hr'), empCtrl.importEmployeesCsv);
router.get('/employees/export-csv', authenticateJWT, requireRole('admin', 'hr'), empCtrl.exportEmployeesCsv);
router.get('/employees/:id', authenticateJWT, checkEmployeeDataScope, empCtrl.getEmployee360);
router.put('/employees/:id', authenticateJWT, requireRole('admin', 'hr'), empCtrl.updateEmployee);

// ==================== ATTENDANCE ====================
router.post('/attendance/check-in', authenticateJWT, attCtrl.checkIn);
router.post('/attendance/check-out', authenticateJWT, attCtrl.checkOut);
router.get('/attendance/board', authenticateJWT, requireRole('admin', 'hr'), attCtrl.getAttendanceBoard);
router.get('/attendance/my', authenticateJWT, attCtrl.getMyAttendance);

// ==================== ATTENDANCE CORRECTIONS ====================
router.post('/attendance-corrections', authenticateJWT, attCtrl.requestAttendanceCorrection);
router.get('/attendance-corrections', authenticateJWT, requireRole('admin', 'hr'), attCtrl.listCorrectionRequests);
router.post('/attendance-corrections/:id/review', authenticateJWT, requireRole('admin', 'hr'), attCtrl.reviewCorrectionRequest);

// ==================== LEAVES ====================
router.post('/leaves', authenticateJWT, leaveCtrl.applyLeave);
router.get('/leaves/my', authenticateJWT, leaveCtrl.getMyLeaveOverview);
router.delete('/leaves/:id', authenticateJWT, leaveCtrl.cancelLeave);
router.get('/leaves', authenticateJWT, requireRole('admin', 'hr'), leaveCtrl.listAllLeaves);
router.post('/leaves/:id/review', authenticateJWT, requireRole('admin', 'hr'), leaveCtrl.reviewLeave);

// ==================== PAYROLL ====================
router.post('/payroll/draft', authenticateJWT, requireRole('admin', 'hr'), payCtrl.generatePayrollDraft);
router.get('/payroll/runs', authenticateJWT, requireRole('admin', 'hr'), payCtrl.listPayrollRuns);
router.get('/payroll/runs/:month', authenticateJWT, requireRole('admin', 'hr'), payCtrl.getPayrollDetails);
router.post('/payroll/runs/:month/finalize', authenticateJWT, requireRole('admin'), payCtrl.finalizePayroll);
router.get('/payroll/payslips/my', authenticateJWT, payCtrl.getMyPayslips);
router.get('/payroll/payslips/:payslipId/pdf', authenticateJWT, payCtrl.downloadPayslipPdf);

// ==================== DASHBOARDS ====================
router.get('/dashboard/admin', authenticateJWT, requireRole('admin'), dashCtrl.getAdminDashboard);
router.get('/dashboard/hr', authenticateJWT, requireRole('admin', 'hr'), dashCtrl.getHrDashboard);
router.get('/dashboard/employee', authenticateJWT, dashCtrl.getEmployeeDashboard);

// ==================== COMMUNICATIONS ====================
router.get('/announcements', authenticateJWT, commCtrl.listAnnouncements);
router.post('/announcements', authenticateJWT, requireRole('admin', 'hr'), commCtrl.createAnnouncement);
router.delete('/announcements/:id', authenticateJWT, requireRole('admin'), commCtrl.deleteAnnouncement);

router.get('/notifications', authenticateJWT, commCtrl.listMyNotifications);
router.patch('/notifications/:id/read', authenticateJWT, commCtrl.markNotificationAsRead);
router.post('/notifications/read-all', authenticateJWT, commCtrl.markAllNotificationsAsRead);

// ==================== AUDIT LOGS ====================
router.get('/audit', authenticateJWT, requireRole('admin'), auditCtrl.listAuditLogs);

// ==================== AI ASSISTANT ====================
router.post('/ai/chat', authenticateJWT, aiCtrl.chatWithAi);
router.post('/ai/summarize', authenticateJWT, requireRole('admin', 'hr'), aiCtrl.summarizeDashboard);
router.post('/ai/smart-leave', authenticateJWT, aiCtrl.smartLeaveExtract);
router.get('/ai/policies', authenticateJWT, aiCtrl.getCompanyPolicies);

export default router;
