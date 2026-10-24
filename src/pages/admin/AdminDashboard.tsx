import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  CalendarDays,
  AlertCircle,
  DollarSign,
  TrendingUp,
  Percent,
  Sparkles,
  Bot,
  RefreshCw,
  Building2,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '../../services/api';
import { IAdminKPI } from '../../../shared/types';

export function AdminDashboard() {
  const [data, setData] = useState<{ kpis: IAdminKPI; charts: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[] | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminDashboard();
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
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
      if (res.data?.insights) {
        setAiInsights(res.data.insights);
      }
    } catch (err) {
      console.error('AI Summarize failed:', err);
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          <span>Aggregating company metrics from MongoDB...</span>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const charts = data?.charts;

  return (
    <div className="space-y-6">
      {/* Top Header & AI Summarize Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive HR & Workforce Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated company intelligence, headcount distributions, and payroll commitments
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboard}
            title="Refresh metrics"
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
            {summarizing ? 'Generating AI Summary...' : 'Summarize with Gemini AI'}
          </button>
        </div>
      </div>

      {/* AI Dashboard Summary Callout */}
      {aiInsights && (
        <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-blue-600" /> Gemini AI Dashboard Summary
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

      {/* 9 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {/* Headcount */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Headcount</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono-numbers">{kpis?.totalHeadcount || 0}</p>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="text-emerald-600 font-semibold font-mono-numbers">{kpis?.activeEmployees || 0} active</span>
            <span>·</span>
            <span className="text-amber-600 font-semibold font-mono-numbers">{kpis?.probationEmployees || 0} probation</span>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Present Today</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono-numbers">{kpis?.presentToday || 0}</p>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="text-amber-600 font-semibold font-mono-numbers">{kpis?.lateToday || 0} arrived late</span>
            <span>·</span>
            <span className="text-blue-600 font-semibold font-mono-numbers">{kpis?.onLeaveToday || 0} on leave</span>
          </div>
        </div>

        {/* Company Payroll Cost */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Monthly Payroll Cost</span>
            <DollarSign className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono-numbers">
            PKR {(kpis?.payrollCost || 0).toLocaleString()}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            Average: <span className="font-semibold text-slate-800 font-mono-numbers">PKR {(kpis?.averageSalary || 0).toLocaleString()}</span>
          </p>
        </div>

        {/* On Leave Today */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Employees On Leave</span>
            <CalendarDays className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono-numbers">{kpis?.onLeaveToday || 0}</p>
          <p className="mt-2 text-[11px] text-slate-500">Authorized leaves active today</p>
        </div>

        {/* Late Arrivals */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Late Today (&gt;09:15 AM)</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono-numbers">{kpis?.lateToday || 0}</p>
          <p className="mt-2 text-[11px] text-slate-500">Subject to grace period thresholds</p>
        </div>

        {/* Attrition YTD */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Attrition Rate (YTD)</span>
            <Percent className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono-numbers">{kpis?.attritionRateYTD || 0}%</p>
          <p className="mt-2 text-[11px] text-slate-500">Exits divided by average headcount</p>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trends (7 Days) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Attendance Trends (Last 7 Days)</h3>
            <span className="text-[11px] text-slate-500">Daily check-in volumes</span>
          </div>
          <div className="h-64 w-full">
            {charts?.attendanceTrends && charts.attendanceTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.attendanceTrends}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="present" stroke="#2563eb" fillOpacity={1} fill="url(#colorPresent)" name="Present" />
                  <Area type="monotone" dataKey="late" stroke="#f59e0b" fill="#fef3c7" name="Late" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No attendance trend records yet.
              </div>
            )}
          </div>
        </div>

        {/* Headcount by Department */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Headcount by Department</h3>
            <span className="text-[11px] text-slate-500">Total staff distribution</span>
          </div>
          <div className="h-64 w-full">
            {charts?.departmentDistribution && charts.departmentDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.departmentDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="headcount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Headcount" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No department records created yet.
              </div>
            )}
          </div>
        </div>

        {/* Salary Distribution Slabs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Salary Distribution Slabs</h3>
            <span className="text-[11px] text-slate-500">Gross remuneration ranges</span>
          </div>
          <div className="h-64 w-full">
            {charts?.salarySlabs ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.salarySlabs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="slab" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Employees" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No salary distribution data.
              </div>
            )}
          </div>
        </div>

        {/* Leave Quota Utilization */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Leave Utilization (Days Used)</h3>
            <span className="text-[11px] text-slate-500">Current annual cycle</span>
          </div>
          <div className="h-64 w-full">
            {charts?.leaveUtilization && charts.leaveUtilization.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.leaveUtilization}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="leaveType" stroke="#94a3b8" fontSize={10} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '11px' }}
                  />
                  <Bar dataKey="daysUsed" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Days Taken" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No leaves recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
