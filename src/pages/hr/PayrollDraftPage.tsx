import React, { useState, useEffect } from 'react';
import { DollarSign, FileSpreadsheet, Lock, RefreshCw, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { api } from '../../services/api';
import { IPayrollRun, IPayslip } from '../../../shared/types';

export function PayrollDraftPage() {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [draftDetails, setDraftDetails] = useState<{ payrollRun: IPayrollRun; payslips: IPayslip[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadPayroll = async (month: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.getPayrollDetails(month);
      if (res.data) setDraftDetails(res.data);
      else setDraftDetails(null);
    } catch {
      setDraftDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll(selectedMonth);
  }, [selectedMonth]);

  const handleGenerateDraft = async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await api.generatePayrollDraft(selectedMonth);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `Payroll draft generated successfully for ${selectedMonth}.`,
        });
        await loadPayroll(selectedMonth);
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Draft generation failed',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Salary Structures & Monthly Payroll Draft</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit automatic attendance deductions, leave penalties, and tax slabs based on challenge rules
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-mono-numbers bg-white"
          />
          <button
            onClick={handleGenerateDraft}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {generating ? 'Calculating Formulas...' : 'Generate / Recalculate Draft'}
          </button>
        </div>
      </div>

      {/* Role Notice */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Role Permission Boundary (Challenge Rule):</span>
          <p className="mt-0.5 text-blue-800 text-[11px]">
            HR Officers can configure salary structures, simulate drafts, audit absence deductions, and review figures.
            Only the Master Administrator has authority to finalize and lock the payroll.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading payroll details...</div>
      ) : !draftDetails ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-2xs">
          <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-900">No Payroll Draft for {selectedMonth}</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Click "Generate / Recalculate Draft" above to evaluate active employee attendance records and compute monthly salaries.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono-numbers">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-sans text-slate-500 block mb-1">Total Gross Payroll</span>
              <p className="text-xl font-bold text-slate-900">
                PKR {draftDetails.payrollRun.totalGross.toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-sans text-slate-500 block mb-1">Total Deductions & Tax</span>
              <p className="text-xl font-bold text-rose-600">
                PKR {draftDetails.payrollRun.totalDeductions.toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-sans text-slate-500 block mb-1">Total Net Payable</span>
              <p className="text-xl font-bold text-emerald-600">
                PKR {draftDetails.payrollRun.totalNet.toLocaleString()}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-sans text-slate-500 block mb-1">Lifecycle State</span>
              <p className="text-xl font-bold text-slate-800 uppercase font-sans">
                {draftDetails.payrollRun.status}
              </p>
            </div>
          </div>

          {/* Payslips Detail Grid */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider">
                Audited Employee Calculations ({draftDetails.payslips.length})
              </span>
              <span className="text-slate-500 font-mono-numbers">Working Days: {draftDetails.payslips[0]?.workingDays || 22}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono-numbers">
                <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] font-sans">
                  <tr>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-4 py-3">Basic</th>
                    <th className="px-4 py-3">Gross (1.5x)</th>
                    <th className="px-4 py-3">Daily Rate</th>
                    <th className="px-4 py-3">Absent Days</th>
                    <th className="px-4 py-3">Half Days</th>
                    <th className="px-4 py-3">Tax</th>
                    <th className="px-4 py-3 text-right">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draftDetails.payslips.map((p: any) => (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-sans">
                        <span className="font-bold text-slate-900 block">{p.employee?.fullName}</span>
                        <span className="text-[11px] text-blue-600 font-mono">{p.employee?.employeeCode}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">PKR {p.basicSalary.toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">PKR {p.grossSalary.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-500">PKR {p.dailySalary.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-slate-700">
                        {p.absentDays > 0 ? (
                          <span className="text-rose-600 font-semibold">{p.absentDays}d (-PKR {p.attendanceDeductions.toLocaleString()})</span>
                        ) : (
                          '0d'
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">{p.halfDays}</td>
                      <td className="px-4 py-3.5 text-rose-600">PKR {p.tax.toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-700 text-sm">
                        PKR {p.netSalary.toLocaleString()}
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
