import React, { useState, useEffect } from 'react';
import { Clock, Filter, CalendarDays, MapPin, CheckCircle, AlertCircle, RefreshCw, User } from 'lucide-react';
import { api } from '../../services/api';
import { IAttendance, IDepartment } from '../../../shared/types';

export function AttendanceBoardPage() {
  const [attendances, setAttendances] = useState<IAttendance[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attRes, deptRes] = await Promise.all([
        api.getAttendanceBoard({
          date: selectedDate,
          department: selectedDept,
          status: selectedStatus,
        }),
        api.listDepartments(),
      ]);
      if (attRes.data) setAttendances(attRes.data);
      if (deptRes.data) setDepartments(deptRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedDept, selectedStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <span className="text-emerald-700 font-bold">Present</span>;
      case 'late':
        return <span className="text-amber-700 font-bold">Late Arrival</span>;
      case 'half_day':
        return <span className="text-purple-700 font-bold">Half Day (&lt;5h)</span>;
      case 'missing_checkout':
        return <span className="text-rose-700 font-bold">Missing Check-Out</span>;
      case 'on_leave':
        return <span className="text-blue-700 font-bold">On Approved Leave</span>;
      default:
        return <span className="text-slate-500 font-bold capitalize">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Attendance Board</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily workforce check-ins, office arrival times, and geofence verification
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Date & Department Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Calendar Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-numbers bg-white text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-slate-800"
            >
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late Arrival</option>
              <option value="half_day">Half Day</option>
              <option value="missing_checkout">Missing Checkout</option>
            </select>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-500 font-mono-numbers block">{attendances.length} Check-ins Recorded</span>
          <span className="text-[11px] text-slate-400 font-mono-numbers">Target Date: {selectedDate}</span>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-numbers">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px] font-sans">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Check-In</th>
                <th className="px-5 py-3.5">Check-Out</th>
                <th className="px-5 py-3.5">Working Duration</th>
                <th className="px-5 py-3.5">Geofence / Verification</th>
                <th className="px-5 py-3.5 text-right font-sans">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-sans">
                    Loading attendance board records...
                  </td>
                </tr>
              ) : attendances.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-sans">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No attendance records for {selectedDate}.
                  </td>
                </tr>
              ) : (
                attendances.map((a: any) => {
                  const durationHours = a.durationMinutes
                    ? `${Math.floor(a.durationMinutes / 60)}h ${a.durationMinutes % 60}m`
                    : a.checkIn && !a.checkOut
                    ? 'In Progress'
                    : '—';

                  return (
                    <tr key={a._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-sans">
                        <span className="font-semibold text-slate-900 block">{a.employee?.fullName}</span>
                        <span className="text-[11px] text-blue-600 font-mono">{a.employee?.employeeCode}</span>
                      </td>
                      <td className="px-5 py-3.5 font-sans text-slate-700">
                        {a.employee?.department?.name || 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-900 font-semibold">
                        {a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{durationHours}</td>
                      <td className="px-5 py-3.5 font-sans">
                        {a.location ? (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                              a.location.isWithinRadius ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            <MapPin className="w-3 h-3" />
                            {a.location.isWithinRadius ? 'Inside Office' : `${a.location.distanceMeters}m away`}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Standard Web</span>
                        )}
                        {a.faceDetected && (
                          <span className="ml-2 text-[10px] text-blue-600 font-semibold font-mono">
                            Face Verified
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right font-sans">{getStatusBadge(a.status)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
