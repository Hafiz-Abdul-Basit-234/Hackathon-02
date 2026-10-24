import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CalendarDays, FileText, CheckCircle, AlertCircle, ArrowRight, Bot, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { IEmployeeKPI } from '../../../shared/types';
import { useAuth } from '../../contexts/AuthContext';

export function EmployeeDashboard() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<IEmployeeKPI | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getEmployeeDashboard();
      if (res.data?.kpis) setKpis(res.data.kpis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading personal employee metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">Employee Portal</span>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
            Welcome back, {user?.email}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Personal attendance record, approved leave quotas, and finalized remuneration
          </p>
        </div>

        <Link
          to="/employee/attendance"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <Clock className="w-4 h-4" /> Go to Web Check-In &rarr;
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono-numbers">
        {/* Today's Status */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-sans text-slate-500 block mb-1">Today's Attendance</span>
          <p className="text-lg font-bold capitalize text-slate-900 font-sans">
            {kpis?.todayStatus === 'not_checked_in' ? 'Not Checked In' : kpis?.todayStatus}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {kpis?.checkInTime ? `Checked in: ${kpis.checkInTime}` : 'Office hours: 09:00 AM'}
          </span>
        </div>

        {/* Weekly Hours */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-sans text-slate-500 block mb-1">Hours Worked This Week</span>
          <p className="text-2xl font-bold text-slate-900">{kpis?.hoursWorkedThisWeek || 0} hrs</p>
          <span className="text-[11px] text-slate-400 mt-1 block font-sans">Accumulated on server time</span>
        </div>

        {/* Late Count */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-sans text-slate-500 block mb-1">Late Arrivals (This Month)</span>
          <p className="text-2xl font-bold text-amber-600">{kpis?.lateCountThisMonth || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block font-sans">Beyond 15m grace window</span>
        </div>

        {/* Latest Payslip */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-sans text-slate-500 block mb-1">Latest Payslip</span>
          <p className="text-lg font-bold text-emerald-600 truncate">
            {kpis?.latestPayslip ? `PKR ${kpis.latestPayslip.netSalary.toLocaleString()}` : 'Pending Publication'}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block font-sans">
            {kpis?.latestPayslip ? `Period: ${kpis.latestPayslip.month}` : 'No finalized slips'}
          </span>
        </div>
      </div>

      {/* Leave Balances Grid */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">My Remaining Leave Quotas</h2>
            <p className="text-[11px] text-slate-500">Decremented automatically upon HR approval</p>
          </div>
          <Link
            to="/employee/leaves"
            className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
          >
            Apply for Leave <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis?.leaveBalances?.map((lb) => (
            <div key={lb.leaveTypeCode} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 font-mono-numbers">
              <span className="text-xs font-bold text-slate-800 font-sans block">{lb.leaveTypeName}</span>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {lb.quota === -1 ? 'Unlimited' : `${lb.remaining}d`}
              </p>
              <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                <span>{lb.used}d used</span>
                {lb.quota !== -1 && <span>· of {lb.quota}d</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Assistant Callout */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-blue-400 text-xs font-bold flex items-center gap-1 mb-1">
            <Bot className="w-4 h-4" /> Personal AI Assistant & Smart Leave
          </span>
          <h3 className="text-base font-bold text-white">Have questions about policies, leaves, or payslips?</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            You can type natural language leave requests (e.g. "I need next Monday off for a doctor appointment") or ask questions about office timing and tax slabs.
          </p>
        </div>
        <Link
          to="/employee/ai-assistant"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          Chat with AI Assistant &rarr;
        </Link>
      </div>
    </div>
  );
}
