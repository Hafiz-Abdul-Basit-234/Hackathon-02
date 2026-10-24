import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Clock,
  CalendarDays,
  AlertCircle,
  CheckSquare,
  FileSpreadsheet,
  TrendingUp,
  Sparkles,
  Bot,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { api } from '../../services/api';
import { IHrKPI } from '../../../shared/types';

export function HrDashboard() {
  const [data, setData] = useState<{ kpis: IHrKPI; departmentBreakdown: any[]; recentLateComers: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[] | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getHrDashboard();
      if (res.data) setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleAiSummarize = async () => {
    if (!data?.kpis || summarizing) return;
    setSummarizing(true);
    try {
      const res = await api.summarizeDashboard(data.kpis);
      if (res.data?.insights) setAiInsights(res.data.insights);
    } catch (err) {
      console.error(err);
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Loading HR operational metrics...</span>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">People Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Attendance monitoring, pending approvals, and operational staff workflows
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboard}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleAiSummarize}
            disabled={summarizing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {summarizing ? 'Analyzing with AI...' : 'Summarize with Gemini AI'}
          </button>
        </div>
      </div>

      {/* AI Dashboard Summary */}
      {aiInsights && (
        <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-blue-600" /> HR Operations AI Summary
            </span>
            <span className="text-[10px] bg-blue-200/60 text-blue-800 px-2 py-0.5 rounded font-mono font-medium">
              AI-GENERATED INSIGHTS
            </span>
          </div>
          <ul className="space-y-1.5 text-xs text-blue-950">
            {aiInsights.map((insight, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">·</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block mb-1">Total Active Staff</span>
          <p className="text-2xl font-bold text-slate-900 font-mono-numbers">{kpis?.totalEmployees || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Active & probation workforce</span>
        </div>

        {/* Present Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block mb-1">Present Today</span>
          <p className="text-2xl font-bold text-emerald-600 font-mono-numbers">{kpis?.presentToday || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Checked in on web or mobile</span>
        </div>

        {/* On Leave Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block mb-1">On Leave Today</span>
          <p className="text-2xl font-bold text-blue-600 font-mono-numbers">{kpis?.onLeaveToday || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Approved leave applications</span>
        </div>

        {/* Late Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-medium text-slate-500 block mb-1">Late Arrivals (&gt;09:15)</span>
          <p className="text-2xl font-bold text-amber-600 font-mono-numbers">{kpis?.lateToday || 0}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Past 15m grace window</span>
        </div>

        {/* Pending Leave Approvals */}
        <Link
          to="/hr/leaves"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Pending Leave Approvals</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono-numbers">{kpis?.pendingLeaveApprovals || 0}</p>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">Review approval inbox &rarr;</span>
        </Link>

        {/* Pending Attendance Corrections */}
        <Link
          to="/hr/attendance-corrections"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 transition-colors group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Attendance Corrections</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono-numbers">
            {kpis?.pendingAttendanceCorrections || 0}
          </p>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">Review corrections &rarr;</span>
        </Link>

        {/* Monthly Attendance Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Monthly Attendance Rate</span>
            <span className="text-[11px] font-mono text-slate-400">Challenge Formula Grounded</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono-numbers">{kpis?.monthlyAttendanceRate || 0}%</p>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(100, kpis?.monthlyAttendanceRate || 0)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid: Department Breakdown & Late Comers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Department Workforce Count</h3>
          <div className="space-y-3">
            {data?.departmentBreakdown && data.departmentBreakdown.length > 0 ? (
              data.departmentBreakdown.map((dept, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                  <span className="font-semibold text-slate-800">{dept.department}</span>
                  <span className="font-mono-numbers font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                    {dept.count} Staff
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 text-center py-4">No department allocations yet.</p>
            )}
          </div>
        </div>

        {/* Recent Late Comers */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">Late Arrivals Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-100">
                <tr>
                  <th className="pb-2">Employee</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Check-In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono-numbers">
                {data?.recentLateComers && data.recentLateComers.length > 0 ? (
                  data.recentLateComers.map((r, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 font-sans font-semibold text-slate-900">
                        {r.name} <span className="font-mono text-[11px] text-slate-400">({r.code})</span>
                      </td>
                      <td className="py-2.5 text-slate-600">{r.date}</td>
                      <td className="py-2.5 text-right font-bold text-amber-700">{r.checkIn}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400 font-sans">
                      No late arrivals recorded today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
