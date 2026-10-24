import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, Clock, MapPin, CheckCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export function FirstRunSetup() {
  const navigate = useNavigate();
  const { checkSystemStatus, login } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState('Saylani Welfare International Trust');
  const [companyEmail, setCompanyEmail] = useState('hr@saylaniwelfare.com');
  const [companyPhone, setCompanyPhone] = useState('+92 21 111 729 526');
  const [companyAddress, setCompanyAddress] = useState('A-25, Bahadurabad Chowrangi, Karachi, Pakistan');

  const [officeStartTime, setOfficeStartTime] = useState('09:00');
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(15);
  const [weekendDays, setWeekendDays] = useState<string[]>(['saturday', 'sunday']);
  const [officeLatitude, setOfficeLatitude] = useState(24.8827);
  const [officeLongitude, setOfficeLongitude] = useState(67.0673);
  const [officeRadiusMeters, setOfficeRadiusMeters] = useState(150);

  const [adminName, setAdminName] = useState('Master Administrator');
  const [adminEmail, setAdminEmail] = useState('admin@saylani.org');
  const [adminPassword, setAdminPassword] = useState('Admin@Saylani2026!');

  const toggleWeekend = (day: string) => {
    if (weekendDays.includes(day)) {
      setWeekendDays(weekendDays.filter((d) => d !== day));
    } else {
      setWeekendDays([...weekendDays, day]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.runSetup({
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
        officeStartTime,
        gracePeriodMinutes,
        weekendDays,
        officeLatitude,
        officeLongitude,
        officeRadiusMeters,
        adminName,
        adminEmail,
        adminPassword,
      });

      if (res.success) {
        await checkSystemStatus();
        // Log in immediately as the new Admin
        const loginRes = await api.login({ email: adminEmail, password: adminPassword });
        if (loginRes.data) {
          login(loginRes.data.token, loginRes.data.user);
          navigate('/admin');
        } else {
          navigate('/login');
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'First-run setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-xl bg-blue-600 text-white items-center justify-center font-black text-xl mb-3 shadow-md shadow-blue-500/20">
            S
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Saylani HCM Lite</h2>
          <p className="text-xs text-slate-600 mt-1">First-Run Organization & Master Administrator Initialization</p>
        </div>

        {/* Step Tabs */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              step === 1 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> 1. Company & Rules
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              step === 2 ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" /> 2. Admin Account
          </button>
        </div>

        <div className="mt-6 bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold">Setup Error</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 1 ? (
              <>
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Company Profile Information</h3>
                  <p className="text-xs text-slate-500">Configure your organization details and office attendance parameters</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email *</label>
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={companyPhone}
                      onChange={(e) => setCompanyPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Office Location / Address</label>
                    <input
                      type="text"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 mt-4">
                  <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> Attendance & Office Rules (Challenge Defaults)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Office Start Time</label>
                      <input
                        type="time"
                        value={officeStartTime}
                        onChange={(e) => setOfficeStartTime(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Grace Period (Minutes)</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={gracePeriodMinutes}
                        onChange={(e) => setGracePeriodMinutes(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-numbers"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">Office Geofence Radius (m)</label>
                      <input
                        type="number"
                        min="50"
                        max="5000"
                        value={officeRadiusMeters}
                        onChange={(e) => setOfficeRadiusMeters(Number(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-numbers"
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Configured Weekend Days</label>
                    <div className="flex flex-wrap gap-2">
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWeekend(day)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                            weekendDays.includes(day)
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1.5"
                  >
                    Next: Admin Credentials <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-slate-900">Master Administrator Account</h3>
                  <p className="text-xs text-slate-500">Create the initial company administrator with full system permissions</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Administrator Full Name</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Administrator Email *</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Administrator Password *</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-blue-900 leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-blue-600" /> Ready to Initialize:
                  </p>
                  <p className="mt-1 text-[11px] text-blue-800">
                    Submitting this form will create the company profile, initialize the 4 standard leave types (Annual 14,
                    Sick 8, Casual 10, Unpaid unlimited), create starter departments, and provision the master Admin account.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Back to Company Details
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50"
                  >
                    {loading ? 'Initializing System...' : 'Complete First-Run Setup'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
