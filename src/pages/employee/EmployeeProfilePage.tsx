import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Building2, Briefcase, Calendar, DollarSign, Save, CheckCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { IEmployee } from '../../../shared/types';

export function EmployeeProfilePage() {
  const { user, refreshMe } = useAuth();
  const [profile, setProfile] = useState<IEmployee | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (user?.employeeProfile) {
        const empId = typeof user.employeeProfile === 'object' && '_id' in user.employeeProfile
          ? (user.employeeProfile as any)._id
          : user.employeeProfile;

        try {
          const res = await api.getEmployee360(empId);
          if (res.data?.employee) {
            setProfile(res.data.employee);
            setPhone(res.data.employee.phone || '');
            setAddress(res.data.employee.address || '');
          }
        } catch (err) {
          console.error(err);
        }
      }
    }
    load();
  }, [user]);

  const handleUpdateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setFeedback(null);

    try {
      await api.updateEmployee(profile._id, { phone, address });
      setFeedback('Contact details updated successfully.');
      await refreshMe();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Personnel Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">Corporate appointment record, salary structure, and contact information</p>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {profile && (
        <div className="space-y-6">
          {/* Identity Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl uppercase shadow-sm">
                  {profile.fullName[0]}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">{profile.fullName}</h2>
                  <p className="text-xs text-slate-500 font-mono">
                    {profile.employeeCode} · {profile.email}
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200 self-start sm:self-auto capitalize">
                {profile.employmentStatus}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs font-mono-numbers">
              <div>
                <span className="text-[11px] font-sans text-slate-400 block mb-0.5">Department</span>
                <span className="font-bold text-slate-800 font-sans">
                  {(profile.department as any)?.name || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-sans text-slate-400 block mb-0.5">Designation</span>
                <span className="font-bold text-slate-800 font-sans">
                  {(profile.designation as any)?.title || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-sans text-slate-400 block mb-0.5">Joining Date</span>
                <span className="font-semibold text-slate-700">
                  {profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : '—'}
                </span>
              </div>
              <div>
                <span className="text-[11px] font-sans text-slate-400 block mb-0.5">Gross Remuneration</span>
                <span className="font-bold text-slate-900">
                  PKR {(profile.salaryStructure?.grossSalary || profile.basicSalary * 1.5).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Salary Structure Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Remuneration & Allowances Breakdown
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono-numbers">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-sans text-slate-500 block mb-0.5">Basic Salary</span>
                <span className="font-bold text-slate-900">PKR {profile.basicSalary.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-sans text-slate-500 block mb-0.5">House Rent (HRA 40%)</span>
                <span className="font-bold text-slate-900">PKR {profile.salaryStructure?.hra?.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[11px] font-sans text-slate-500 block mb-0.5">Medical Allowance (10%)</span>
                <span className="font-bold text-slate-900">PKR {profile.salaryStructure?.medicalAllowance?.toLocaleString()}</span>
              </div>
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <span className="text-[11px] font-sans text-blue-700 block mb-0.5 font-bold">Total Gross Pay</span>
                <span className="font-bold text-blue-900">PKR {profile.salaryStructure?.grossSalary?.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Update Personal Contact Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
              Update Contact Information
            </h3>
            <form onSubmit={handleUpdateContact} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors shadow-2xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
