import React, { useState, useEffect } from 'react';
import { DollarSign, Lock, Unlock, Download, Eye, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { IPayrollRun, IPayslip } from '../../../shared/types';

export function PayrollAdminPage() {
  const [runs, setRuns] = useState<IPayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [monthDetails, setMonthDetails] = useState<{ payrollRun: IPayrollRun; payslips: IPayslip[] } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadRuns = async () => {
    try {
      const res = await api.listPayrollRuns();
      if (res.data) {
        setRuns(res.data);
        if (res.data.length > 0 && !selectedMonth) {
          viewMonth(res.data[0].month);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRuns();
  }, []);

  const viewMonth = async (month: string) => {
    setSelectedMonth(month);
    setDetailsLoading(true);
    setFeedback(null);
    try {
      const res = await api.getPayrollDetails(month);
      if (res.data) setMonthDetails(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleFinalize = async (month: string) => {
    if (!confirm(`Are you sure you want to FINALIZE and permanently LOCK the payroll for ${month}? Once finalized, numbers cannot be altered and payslips are published to employees.`)) {
      return;
    }

    setFinalizing(true);
    setFeedback(null);
    try {
      const res = await api.finalizePayroll(month);
      if (res.success) {
        setFeedback(`Payroll for ${month} has been finalized and permanently locked! All employees have received notifications.`);
        await loadRuns();
        await viewMonth(month);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Finalization failed');
    } finally {
      setFinalizing(false);
    }
  };

  const handleDownloadPdf = async (payslipId: string, employeeCode: string) => {
    try {
      await api.downloadPayslipPdf(payslipId, `Payslip_${employeeCode}_${selectedMonth}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF payslip.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Payroll Finalization & Review</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin exclusive approval: Review monthly payroll runs, audit deductions, and lock payroll
          </p>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Monthly Runs Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {loading ? (
          <span className="text-xs text-slate-400">Loading payroll runs...</span>
        ) : runs.length === 0 ? (
          <div className="p-4 bg-white border border-slate-200 rounded-xl w-full text-xs text-slate-500">
            No payroll drafts generated yet. HR can generate drafts in the HR Payroll workspace.
          </div>
        ) : (
          runs.map((run) => (
            <button
              key={run._id}
              onClick={() => viewMonth(run.month)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shrink-0 ${
                selectedMonth === run.month
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{run.month}</span>
              {run.status === 'finalized' ? (
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Selected Month Details */}
      {monthDetails && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Payroll Cycle: {monthDetails.payrollRun.month}</h2>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded ${
                    monthDetails.payrollRun.status === 'finalized'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {monthDetails.payrollRun.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {monthDetails.payrollRun.employeeCount} eligible employees · Total Net: PKR{' '}
                <span className="font-bold text-slate-900 font-mono-numbers">
                  {monthDetails.payrollRun.totalNet.toLocaleString()}
                </span>
              </p>
            </div>

            {monthDetails.payrollRun.status === 'draft' ? (
              <button
                onClick={() => handleFinalize(monthDetails.payrollRun.month)}
                disabled={finalizing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                {finalizing ? 'Finalizing...' : 'Finalize & Lock Payroll'}
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                <Lock className="w-3.5 h-3.5" /> Locked & Published to Employees
              </div>
            )}
          </div>

          {/* Payslips Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Employee Payslips</span>
              <span className="text-xs text-slate-500 font-mono-numbers">{monthDetails.payslips.length} Records</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-4 py-3">Basic Salary</th>
                    <th className="px-4 py-3">Gross Salary</th>
                    <th className="px-4 py-3">Absent Days</th>
                    <th className="px-4 py-3">Half Days</th>
                    <th className="px-4 py-3">Tax</th>
                    <th className="px-4 py-3">Net Salary</th>
                    <th className="px-4 py-3 text-right">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-numbers">
                  {monthDetails.payslips.map((p: any) => (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-sans">
                        <span className="font-bold text-slate-900 block">{p.employee?.fullName}</span>
                        <span className="text-[11px] text-blue-600 font-mono">{p.employee?.employeeCode}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">PKR {p.basicSalary.toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">PKR {p.grossSalary.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-700">{p.absentDays}d</td>
                      <td className="px-4 py-3.5 text-slate-700">{p.halfDays}</td>
                      <td className="px-4 py-3.5 text-rose-600">PKR {p.tax.toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-bold text-emerald-700">PKR {p.netSalary.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right font-sans">
                        <button
                          onClick={() => handleDownloadPdf(p._id, p.employee?.employeeCode || 'EMP')}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                          title="Download PDF payslip"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
