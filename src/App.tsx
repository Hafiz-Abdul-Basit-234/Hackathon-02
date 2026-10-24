import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SidebarLayout } from './components/SidebarLayout';
import { AiAssistantView } from './components/AiAssistantView';

// Public & Auth Pages
import { Login } from './pages/public/Login';
import { FirstRunSetup } from './pages/public/FirstRunSetup';
import { ChangePassword } from './pages/public/ChangePassword';
import { Unauthorized } from './pages/public/Unauthorized';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { CompanySettingsPage } from './pages/admin/CompanySettingsPage';
import { DepartmentsPage } from './pages/admin/DepartmentsPage';
import { DesignationsPage } from './pages/admin/DesignationsPage';
import { LeaveTypesPage } from './pages/admin/LeaveTypesPage';
import { HolidaysPage } from './pages/admin/HolidaysPage';
import { HrManagementPage } from './pages/admin/HrManagementPage';
import { PayrollAdminPage } from './pages/admin/PayrollAdminPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

// HR Pages
import { HrDashboard } from './pages/hr/HrDashboard';
import { EmployeeDirectoryPage } from './pages/hr/EmployeeDirectoryPage';
import { CsvImportExportPage } from './pages/hr/CsvImportExportPage';
import { AttendanceBoardPage } from './pages/hr/AttendanceBoardPage';
import { AttendanceCorrectionsPage } from './pages/hr/AttendanceCorrectionsPage';
import { LeaveApprovalInboxPage } from './pages/hr/LeaveApprovalInboxPage';
import { PayrollDraftPage } from './pages/hr/PayrollDraftPage';

// Employee Pages
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { EmployeeAttendancePage } from './pages/employee/EmployeeAttendancePage';
import { EmployeeLeavesPage } from './pages/employee/EmployeeLeavesPage';
import { EmployeePayslipsPage } from './pages/employee/EmployeePayslipsPage';
import { EmployeeProfilePage } from './pages/employee/EmployeeProfilePage';

// Shared Pages
import { AnnouncementsPage } from './pages/shared/AnnouncementsPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'admin' | 'hr' | 'employee'>;
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, setupRequired } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-600">Verifying security session...</span>
        </div>
      </div>
    );
  }

  if (setupRequired) {
    return <Navigate to="/setup" replace />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.isTemporaryPassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  const userRole = (user.role || '').toLowerCase() as 'admin' | 'hr' | 'employee';
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <SidebarLayout>{children}</SidebarLayout>;
}

function RootRedirect() {
  const { user, isAuthenticated, isLoading, setupRequired } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-slate-600">Loading Saylani HCM...</span>
        </div>
      </div>
    );
  }

  if (setupRequired) {
    return <Navigate to="/setup" replace />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.isTemporaryPassword) {
    return <Navigate to="/change-password" replace />;
  }

  const role = (user.role || 'employee').toLowerCase();
  return <Navigate to={`/${role}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<FirstRunSetup />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/company"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <CompanySettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/departments"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DepartmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/designations"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DesignationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leave-types"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LeaveTypesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/holidays"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <HolidaysPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/hr-management"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <HrManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/employees"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <EmployeeDirectoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/attendance"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AttendanceBoardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/leaves"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LeaveApprovalInboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/payroll"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <PayrollAdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/announcements"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AuditLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ai-assistant"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AiAssistantView />
              </ProtectedRoute>
            }
          />

          {/* HR Routes */}
          <Route
            path="/hr"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <HrDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/employees"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <EmployeeDirectoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/csv-import"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <CsvImportExportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/attendance"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <AttendanceBoardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/attendance-corrections"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <AttendanceCorrectionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/leaves"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <LeaveApprovalInboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/payroll"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <PayrollDraftPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/announcements"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <AnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/ai-assistant"
            element={
              <ProtectedRoute allowedRoles={['hr']}>
                <AiAssistantView />
              </ProtectedRoute>
            }
          />

          {/* Employee Routes */}
          <Route
            path="/employee"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/attendance"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/leaves"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeLeavesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/payslips"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeePayslipsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/profile"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/announcements"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <AnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/ai-assistant"
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <AiAssistantView />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
