import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle, Clock, MapPin } from 'lucide-react';
import { api } from '../../services/api';
import { ICompanySettings } from '../../../shared/types';

export function CompanySettingsPage() {
  const [settings, setSettings] = useState<Partial<ICompanySettings>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getCompanySettings();
        if (res.data) setSettings(res.data);
      } catch (err: unknown) {
        setFeedback({ type: 'error', message: 'Failed to load company settings' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.updateCompanySettings(settings);
      if (res.success && res.data) {
        setSettings(res.data);
        setFeedback({ type: 'success', message: 'Company settings updated successfully.' });
      }
    } catch (err: unknown) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const toggleWeekend = (day: string) => {
    const current = settings.weekendDays || ['saturday', 'sunday'];
    if (current.includes(day)) {
      setSettings({ ...settings, weekendDays: current.filter((d) => d !== day) });
    } else {
      setSettings({ ...settings, weekendDays: [...current, day] });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-500">Loading company settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Organization & Attendance Rules</h1>
        <p className="text-xs text-slate-500 mt-0.5">Configure company profile, working hours, grace period, and geofence</p>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
        <div>
          <h2 className="text-sm font-bold text-slate-900 mb-3">General Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
              <input
                type="text"
                value={settings.name || ''}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Official Email</label>
              <input
                type="email"
                value={settings.email || ''}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={settings.phone || ''}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Office Address</label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Attendance Timing & Grace Period Rules
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Office Start Time</label>
              <input
                type="time"
                value={settings.officeStartTime || '09:00'}
                onChange={(e) => setSettings({ ...settings, officeStartTime: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 09:00 AM</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period (Minutes)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.gracePeriodMinutes || 15}
                onChange={(e) => setSettings({ ...settings, gracePeriodMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono-numbers"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Late after 09:15 AM</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Half-Day Threshold (Hours)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={settings.halfDayHoursThreshold || 5}
                onChange={(e) => setSettings({ ...settings, halfDayHoursThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono-numbers"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Under 5 hours = Half Day</span>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Configured Weekend Days</label>
            <div className="flex flex-wrap gap-2">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                const isSelected = (settings.weekendDays || ['saturday', 'sunday']).includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekend(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" /> Geofencing & Office Location Coordinates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={settings.officeLatitude || 24.8607}
                onChange={(e) => setSettings({ ...settings, officeLatitude: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono-numbers"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={settings.officeLongitude || 67.0011}
                onChange={(e) => setSettings({ ...settings, officeLongitude: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono-numbers"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Allowed Radius (Meters)</label>
              <input
                type="number"
                min="20"
                max="5000"
                value={settings.officeRadiusMeters || 150}
                onChange={(e) => setSettings({ ...settings, officeRadiusMeters: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono-numbers"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Settings...' : 'Save Company Rules'}
          </button>
        </div>
      </form>
    </div>
  );
}
