import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Edit2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { ILeaveType } from '../../../shared/types';

export function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<ILeaveType | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [yearlyQuota, setYearlyQuota] = useState(10);
  const [isPaid, setIsPaid] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLeaveTypes = async () => {
    try {
      const res = await api.listLeaveTypes();
      if (res.data) setLeaveTypes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const openCreate = () => {
    setEditingType(null);
    setName('');
    setCode('');
    setYearlyQuota(10);
    setIsPaid(true);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (lt: ILeaveType) => {
    setEditingType(lt);
    setName(lt.name);
    setCode(lt.code);
    setYearlyQuota(lt.yearlyQuota);
    setIsPaid(lt.isPaid);
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingType) {
        await api.updateLeaveType(editingType._id, { name, code, yearlyQuota, isPaid });
      } else {
        await api.createLeaveType({ name, code, yearlyQuota, isPaid });
      }
      setShowModal(false);
      await loadLeaveTypes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Types Configuration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure annual quotas, paid/unpaid status, and leave policies (Challenge defaults applied)
          </p>
        </div>

        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Add Leave Type
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3.5">Leave Name</th>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Yearly Quota</th>
                <th className="px-6 py-3.5">Compensation</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Loading leave types...
                  </td>
                </tr>
              ) : leaveTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No leave types configured.
                  </td>
                </tr>
              ) : (
                leaveTypes.map((lt) => (
                  <tr key={lt._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{lt.name}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-blue-700">{lt.code}</td>
                    <td className="px-6 py-4 font-mono-numbers">
                      {lt.yearlyQuota === -1 ? (
                        <span className="text-slate-600 font-medium">Unlimited</span>
                      ) : (
                        <span className="font-semibold text-slate-900">{lt.yearlyQuota} Days / Year</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-semibold ${lt.isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {lt.isPaid ? 'Paid Leave' : 'Unpaid (Salary Deducted)'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-semibold ${lt.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {lt.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEdit(lt)}
                        className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
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
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingType ? 'Edit Leave Type' : 'Create Leave Type'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Set quota and compensation structure</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Leave, Maternity Leave"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Code *</label>
                <input
                  type="text"
                  placeholder="e.g. ANNUAL, SICK, CASUAL"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Yearly Quota (Days) · Set -1 for Unlimited
                </label>
                <input
                  type="number"
                  value={yearlyQuota}
                  onChange={(e) => setYearlyQuota(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono-numbers"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPaidCheckbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="isPaidCheckbox" className="text-xs font-semibold text-slate-700">
                  Paid Leave (If unchecked, absence days deduct from monthly payroll)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingType ? 'Save Changes' : 'Create Leave Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
