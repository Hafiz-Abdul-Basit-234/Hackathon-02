import {
  IUser,
  ICompanySettings,
  IDepartment,
  IDesignation,
  ILeaveType,
  IHoliday,
  IEmployee,
  IAttendance,
  IAttendanceCorrection,
  ILeaveRequest,
  IPayrollRun,
  IPayslip,
  IAnnouncement,
  INotification,
  IAuditLog,
} from '../../shared/types';

const BASE_URL = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('saylani_hcm_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<{ success: boolean; data?: T; message?: string; errors?: any[]; [key: string]: any }> {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.message || `Request failed with status ${res.status}`);
    }
    return json;
  }
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return { success: true };
}

export const api = {
  // Setup & System
  async getSetupStatus() {
    const res = await fetch(`${BASE_URL}/setup/status`);
    return handleResponse<any>(res);
  },

  async runSetup(payload: any) {
    const res = await fetch(`${BASE_URL}/setup/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<any>(res);
  },

  async testDb(uri: string) {
    const res = await fetch(`${BASE_URL}/setup/db-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
    });
    return handleResponse<any>(res);
  },

  // Auth
  async login(credentials: { email: string; password: string }) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse<{ token: string; user: IUser }>(res);
  },

  async getMe() {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<IUser>(res);
  },

  async changePassword(passwords: { currentPassword?: string; newPassword: string }) {
    const res = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(passwords),
    });
    return handleResponse<any>(res);
  },

  async createHrAccount(payload: { email: string; password?: string }) {
    const res = await fetch(`${BASE_URL}/auth/create-hr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ user: IUser; temporaryPassword: string }>(res);
  },

  async listUsers(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BASE_URL}/auth/users${qs}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<IUser[]>(res);
  },

  async resetUserPassword(userId: string, newPassword?: string) {
    const res = await fetch(`${BASE_URL}/auth/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ newPassword }),
    });
    return handleResponse<{ temporaryPassword: string }>(res);
  },

  async toggleUserStatus(userId: string) {
    const res = await fetch(`${BASE_URL}/auth/users/${userId}/toggle-status`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<IUser>(res);
  },

  // Organization
  async getCompanySettings() {
    const res = await fetch(`${BASE_URL}/company`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<ICompanySettings>(res);
  },

  async updateCompanySettings(payload: Partial<ICompanySettings>) {
    const res = await fetch(`${BASE_URL}/company`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<ICompanySettings>(res);
  },

  async listDepartments() {
    const res = await fetch(`${BASE_URL}/departments`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<IDepartment[]>(res);
  },

  async createDepartment(payload: Partial<IDepartment>) {
    const res = await fetch(`${BASE_URL}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<IDepartment>(res);
  },

  async updateDepartment(id: string, payload: Partial<IDepartment>) {
    const res = await fetch(`${BASE_URL}/departments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<IDepartment>(res);
  },

  async listDesignations(deptId?: string) {
    const qs = deptId ? `?department=${deptId}` : '';
    const res = await fetch(`${BASE_URL}/designations${qs}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<IDesignation[]>(res);
  },

  async createDesignation(payload: Partial<IDesignation>) {
    const res = await fetch(`${BASE_URL}/designations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<IDesignation>(res);
  },

  async updateDesignation(id: string, payload: Partial<IDesignation>) {
    const res = await fetch(`${BASE_URL}/designations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<IDesignation>(res);
  },

  async listLeaveTypes() {
    const res = await fetch(`${BASE_URL}/leave-types`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<ILeaveType[]>(res);
  },

  async createLeaveType(payload: Partial<ILeaveType>) {
    const res = await fetch(`${BASE_URL}/leave-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<ILeaveType>(res);
  },

  async updateLeaveType(id: string, payload: Partial<ILeaveType>) {
    const res = await fetch(`${BASE_URL}/leave-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<ILeaveType>(res);
  },

  async listHolidays() {
    const res = await fetch(`${BASE_URL}/holidays`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<IHoliday[]>(res);
  },

  async createHoliday(payload: Partial<IHoliday>) {
    const res = await fetch(`${BASE_URL}/holidays`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<IHoliday>(res);
  },

  async deleteHoliday(id: string) {
    const res = await fetch(`${BASE_URL}/holidays/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  // Employees
  async listEmployees(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BASE_URL}/employees${qs}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ employees: IEmployee[]; pagination: any }>(res);
  },

  async createEmployee(payload: any) {
    const res = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ employee: IEmployee; temporaryPassword: string; loginEmail: string }>(res);
  },

  async getEmployee360(id: string) {
    const res = await fetch(`${BASE_URL}/employees/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ employee: IEmployee; recentAttendance: IAttendance[]; recentLeaves: ILeaveRequest[]; latestPayslip: IPayslip }>(res);
  },

  async updateEmployee(id: string, payload: any) {
    const res = await fetch(`${BASE_URL}/employees/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<IEmployee>(res);
  },

  async importEmployeesCsv(csvData: string, dryRun: boolean) {
    const res = await fetch(`${BASE_URL}/employees/import-csv`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ csvData, dryRun }),
    });
    return handleResponse<any>(res);
  },

  // Attendance
  async checkIn(payload?: { latitude?: number; longitude?: number; faceDetected?: boolean }) {
    const res = await fetch(`${BASE_URL}/attendance/check-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload || {}),
    });
    return handleResponse<IAttendance>(res);
  },

  async checkOut() {
    const res = await fetch(`${BASE_URL}/attendance/check-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({}),
    });
    return handleResponse<IAttendance>(res);
  },

  async getAttendanceBoard(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BASE_URL}/attendance/board${qs}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<IAttendance[]>(res);
  },

  async getMyAttendance(month?: string) {
    const qs = month ? `?month=${month}` : '';
    const res = await fetch(`${BASE_URL}/attendance/my${qs}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ month: string; todayRecord: IAttendance | null; records: IAttendance[] }>(res);
  },

  async requestAttendanceCorrection(payload: { attendanceDate: string; requestedCheckIn: string; requestedCheckOut: string; reason: string }) {
    const res = await fetch(`${BASE_URL}/attendance-corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<IAttendanceCorrection>(res);
  },

  async listAttendanceCorrections(status?: string) {
    const qs = status ? `?status=${status}` : '';
    const res = await fetch(`${BASE_URL}/attendance-corrections${qs}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<IAttendanceCorrection[]>(res);
  },

  async reviewAttendanceCorrection(id: string, action: 'approve' | 'reject', comment?: string) {
    const res = await fetch(`${BASE_URL}/attendance-corrections/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ action, comment }),
    });
    return handleResponse<any>(res);
  },

  // Leaves
  async applyLeave(payload: { leaveType: string; startDate: string; endDate: string; reason: string }) {
    const res = await fetch(`${BASE_URL}/leaves`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<ILeaveRequest>(res);
  },

  async getMyLeaveOverview() {
    const res = await fetch(`${BASE_URL}/leaves/my`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ balances: any[]; history: ILeaveRequest[] }>(res);
  },

  async cancelLeave(id: string) {
    const res = await fetch(`${BASE_URL}/leaves/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async listAllLeaves(params?: Record<string, string | undefined>) {
    const cleanParams: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') cleanParams[k] = v;
      });
    }
    const qs = Object.keys(cleanParams).length > 0 ? '?' + new URLSearchParams(cleanParams).toString() : '';
    const res = await fetch(`${BASE_URL}/leaves${qs}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<ILeaveRequest[]>(res);
  },

  async reviewLeave(id: string, action: 'approve' | 'reject', comment?: string) {
    const res = await fetch(`${BASE_URL}/leaves/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ action, comment }),
    });
    return handleResponse<any>(res);
  },

  // Payroll
  async generatePayrollDraft(month: string) {
    const res = await fetch(`${BASE_URL}/payroll/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ month }),
    });
    return handleResponse<{ payrollRun: IPayrollRun }>(res);
  },

  async listPayrollRuns() {
    const res = await fetch(`${BASE_URL}/payroll/runs`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<IPayrollRun[]>(res);
  },

  async getPayrollDetails(month: string) {
    const res = await fetch(`${BASE_URL}/payroll/runs/${month}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ payrollRun: IPayrollRun; payslips: IPayslip[] }>(res);
  },

  async finalizePayroll(month: string) {
    const res = await fetch(`${BASE_URL}/payroll/runs/${month}/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({}),
    });
    return handleResponse<IPayrollRun>(res);
  },

  async getMyPayslips() {
    const res = await fetch(`${BASE_URL}/payroll/payslips/my`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<IPayslip[]>(res);
  },

  async downloadPayslipPdf(payslipId: string, filename?: string) {
    const res = await fetch(`${BASE_URL}/payroll/payslips/${payslipId}/pdf`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) {
      throw new Error('Failed to download payslip PDF');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `Payslip_${payslipId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // Dashboards
  async getAdminDashboard() {
    const res = await fetch(`${BASE_URL}/dashboard/admin`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async getHrDashboard() {
    const res = await fetch(`${BASE_URL}/dashboard/hr`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async getEmployeeDashboard() {
    const res = await fetch(`${BASE_URL}/dashboard/employee`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  // Communications
  async listAnnouncements() {
    const res = await fetch(`${BASE_URL}/announcements`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<IAnnouncement[]>(res);
  },

  async createAnnouncement(payload: { title: string; message: string; audience: string }) {
    const res = await fetch(`${BASE_URL}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(payload),
    });
    return handleResponse<IAnnouncement>(res);
  },

  async deleteAnnouncement(id: string) {
    const res = await fetch(`${BASE_URL}/announcements/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async listNotifications() {
    const res = await fetch(`${BASE_URL}/notifications`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<INotification[]>(res);
  },

  async markNotificationRead(id: string) {
    const res = await fetch(`${BASE_URL}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${BASE_URL}/notifications/read-all`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
    });
    return handleResponse<any>(res);
  },

  // Audit Logs
  async listAuditLogs(params?: Record<string, string>) {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BASE_URL}/audit${qs}`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ logs: IAuditLog[]; pagination: any }>(res);
  },

  // AI Assistant
  async chatAi(message: string, history?: any[]) {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ message, history }),
    });
    return handleResponse<{ reply: string; toolCalls: any[] }>(res);
  },

  async summarizeDashboard(kpis: Record<string, any>) {
    const res = await fetch(`${BASE_URL}/ai/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ kpis }),
    });
    return handleResponse<{ insights: string[]; aiGenerated: boolean }>(res);
  },

  async smartLeave(prompt: string) {
    const res = await fetch(`${BASE_URL}/ai/smart-leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ prompt }),
    });
    return handleResponse<any>(res);
  },

  async getPolicies() {
    const res = await fetch(`${BASE_URL}/ai/policies`, {
      headers: { ...getAuthHeader() },
    });
    return handleResponse<{ policies: string }>(res);
  },
};
