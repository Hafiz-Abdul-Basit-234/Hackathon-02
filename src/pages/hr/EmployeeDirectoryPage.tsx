import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  CalendarDays,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { IEmployee, IDepartment, IDesignation } from '../../../shared/types';
import { useAuth } from '../../contexts/AuthContext';

export function EmployeeDirectoryPage() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [designations, setDesignations] = useState<IDesignation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Registration Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<{ name: string; email: string; tempPass: string } | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formDesig, setFormDesig] = useState('');
  const [formSalary, setFormSalary] = useState('');
  const [formStatus, setFormStatus] = useState<'probation' | 'active'>('probation');

  // Edit Modal State
  const [editingEmployee, setEditingEmployee] = useState<IEmployee | null>(null);

  // 360 View State
  const [viewing360, setViewing360] = useState<any | null>(null);
  const [loading360, setLoading360] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, desigRes] = await Promise.all([
        api.listEmployees({
          page: String(page),
          search,
          department: selectedDept,
          status: selectedStatus,
        }),
        api.listDepartments(),
        api.listDesignations(),
      ]);

      if (empRes.data) {
        setEmployees(empRes.data.employees);
        setTotalPages(empRes.data.pagination.pages);
        setTotalCount(empRes.data.pagination.total);
      }
      if (deptRes.data) setDepartments(deptRes.data);
      if (desigRes.data) setDesignations(desigRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, selectedDept, selectedStatus]);

  const openRegister = () => {
    setFormCode('');
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormSalary('85000');
    setFormStatus('probation');
    setFormDept(departments[0]?._id || '');
    setFormDesig(designations[0]?._id || '');
    setError(null);
    setCreatedResult(null);
    setShowRegisterModal(true);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setCreatedResult(null);

    try {
      const res = await api.createEmployee({
        employeeCode: formCode || undefined,
        fullName: formName,
        email: formEmail,
        phone: formPhone,
        address: formAddress,
        department: formDept,
        designation: formDesig,
        basicSalary: Number(formSalary),
        employmentStatus: formStatus,
      });

      if (res.success && res.data) {
        setCreatedResult({
          name: res.data.employee.fullName,
          email: res.data.loginEmail,
          tempPass: res.data.temporaryPassword,
        });
        await loadData();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  const open360 = async (empId: string) => {
    setLoading360(true);
    setViewing360(null);
    try {
      const res = await api.getEmployee360(empId);
      if (res.data) setViewing360(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading360(false);
    }
  };

  const openEdit = (emp: IEmployee) => {
    setEditingEmployee(emp);
    setFormName(emp.fullName);
    setFormPhone(emp.phone);
    setFormAddress(emp.address || '');
    setFormSalary(String(emp.basicSalary));
    setFormStatus(emp.employmentStatus as any);
    setFormDept(typeof emp.department === 'object' ? (emp.department as any)._id : emp.department);
    setFormDesig(typeof emp.designation === 'object' ? (emp.designation as any)._id : emp.designation);
    setError(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setSaving(true);
    setError(null);

    try {
      await api.updateEmployee(editingEmployee._id, {
        fullName: formName,
        phone: formPhone,
        address: formAddress,
        basicSalary: Number(formSalary),
        employmentStatus: formStatus,
        department: formDept,
        designation: formDesig,
      });
      setEditingEmployee(null);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Employee Directory & Profiles</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered corporate staff records, salary structures, and 360-degree attendance overviews
          </p>
        </div>

        <button
          onClick={openRegister}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Register New Employee
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, employee code, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="resigned">Resigned</option>
            <option value="terminated">Terminated</option>
          </select>

          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
        </div>

        <span className="text-xs text-slate-500 font-mono-numbers">{totalCount} Employees Total</span>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Full Name</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Designation</th>
                <th className="px-5 py-3.5">Basic Salary</th>
                <th className="px-5 py-3.5">Gross Salary</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                    Loading employee directory...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No employees found matching filter criteria. Click "Register New Employee" to add staff.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-700">{emp.employeeCode}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-900 block">{emp.fullName}</span>
                      <span className="text-[11px] text-slate-400 block">{emp.email}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {typeof emp.department === 'object' ? (emp.department as any)?.name : 'N/A'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {typeof emp.designation === 'object' ? (emp.designation as any)?.title : 'N/A'}
                    </td>
                    <td className="px-5 py-3.5 font-mono-numbers text-slate-700">
                      PKR {emp.basicSalary.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-mono-numbers font-semibold text-slate-900">
                      PKR {(emp.salaryStructure?.grossSalary || emp.basicSalary * 1.5).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`text-[11px] font-semibold capitalize ${
                          emp.employmentStatus === 'active'
                            ? 'text-emerald-700'
                            : emp.employmentStatus === 'probation'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {emp.employmentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5">
                      <button
                        onClick={() => open360(emp._id)}
                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        title="360 View"
                      >
                        <Eye className="w-3 h-3" /> 360 View
                      </button>
                      <button
                        onClick={() => openEdit(emp)}
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border border-slate-200 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Register Employee & Provision Account</h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createdResult ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Employee Registered Successfully
                </div>
                <p className="text-[11px] text-emerald-900">
                  Please securely deliver these login credentials to the employee:
                </p>
                <div className="p-3 bg-white border border-emerald-200 rounded-lg text-xs font-mono space-y-1">
                  <div>Employee: <span className="font-bold text-slate-900">{createdResult.name}</span></div>
                  <div>Login Email: <span className="font-bold text-slate-900">{createdResult.email}</span></div>
                  <div>Temporary Password: <span className="font-bold text-blue-700">{createdResult.tempPass}</span></div>
                </div>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setShowRegisterModal(false);
                      setCreatedResult(null);
                    }}
                    className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4 text-xs">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Muhammad Ali"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employee Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="Auto if left blank (EMP-0101)"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Corporate Email *</label>
                    <input
                      type="email"
                      placeholder="ali@saylani.org"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      placeholder="+92 300 1234567"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Department *</label>
                    <select
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select department...</option>
                      {departments.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Designation *</label>
                    <select
                      value={formDesig}
                      onChange={(e) => setFormDesig(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select designation...</option>
                      {designations.map((d) => (
                        <option key={d._id} value={d._id}>
                          {d.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Basic Salary (PKR) *</label>
                    <input
                      type="number"
                      min="1"
                      value={formSalary}
                      onChange={(e) => setFormSalary(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Gross = 1.5x Basic (PKR {Math.round(Number(formSalary || 0) * 1.5).toLocaleString()})
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employment Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="probation">Probation</option>
                      <option value="active">Active</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    placeholder="Karachi, Pakistan"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50"
                  >
                    {saving ? 'Registering...' : 'Register Employee'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Edit Employee: {editingEmployee.fullName}</h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">{editingEmployee.employeeCode} · {editingEmployee.email}</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <select
                    value={formDesig}
                    onChange={(e) => setFormDesig(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    {designations.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Basic Salary (PKR)</label>
                  <input
                    type="number"
                    value={formSalary}
                    onChange={(e) => setFormSalary(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="probation">Probation</option>
                    <option value="active">Active</option>
                    <option value="resigned">Resigned</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 360 View Modal */}
      {(viewing360 || loading360) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[85vh] overflow-y-auto">
            {loading360 ? (
              <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" /> Loading 360 profile...
              </div>
            ) : viewing360 ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{viewing360.employee.fullName}</h3>
                    <p className="text-xs text-slate-500 font-mono">
                      {viewing360.employee.employeeCode} · {viewing360.employee.email}
                    </p>
                  </div>
                  <button onClick={() => setViewing360(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Remuneration & Department */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono-numbers">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-sans">Department</span>
                    <span className="font-bold text-slate-800">{viewing360.employee.department?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-sans">Designation</span>
                    <span className="font-bold text-slate-800">{viewing360.employee.designation?.title || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-sans">Gross Salary</span>
                    <span className="font-bold text-slate-900">
                      PKR {viewing360.employee.salaryStructure?.grossSalary?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block font-sans">Status</span>
                    <span className="font-bold text-emerald-700 capitalize">{viewing360.employee.employmentStatus}</span>
                  </div>
                </div>

                {/* Recent Attendance */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> Recent Attendance History
                  </h4>
                  <div className="border border-slate-100 rounded-lg overflow-hidden text-xs">
                    {viewing360.recentAttendance.length === 0 ? (
                      <p className="p-3 text-slate-400 text-center">No attendance logged yet.</p>
                    ) : (
                      <table className="w-full text-left font-mono-numbers">
                        <thead className="bg-slate-50 text-[11px] text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="px-3 py-1.5">Date</th>
                            <th className="px-3 py-1.5">Check-In</th>
                            <th className="px-3 py-1.5">Check-Out</th>
                            <th className="px-3 py-1.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {viewing360.recentAttendance.map((a: any) => (
                            <tr key={a._id}>
                              <td className="px-3 py-2 text-slate-600">{a.date}</td>
                              <td className="px-3 py-2">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : '—'}</td>
                              <td className="px-3 py-2">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : '—'}</td>
                              <td className="px-3 py-2 font-semibold capitalize text-slate-800">{a.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* Recent Leaves */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-600" /> Approved Leaves
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {viewing360.recentLeaves.length === 0 ? (
                      <p className="text-slate-400">No leaves submitted.</p>
                    ) : (
                      viewing360.recentLeaves.map((l: any) => (
                        <div key={l._id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-slate-900">{l.leaveType?.name}</span>
                            <span className="text-[11px] text-slate-500 block">
                              {l.startDate} to {l.endDate} ({l.workingDays} working days)
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded capitalize">
                            {l.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
