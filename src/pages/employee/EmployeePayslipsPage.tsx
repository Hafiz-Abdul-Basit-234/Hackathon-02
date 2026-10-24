import React, { useState, useEffect } from 'react';
import { FileText, Download, DollarSign, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { IPayslip } from '../../../shared/types';
import { useAuth } from '../../contexts/AuthContext';

export function EmployeePayslipsPage() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<IPayslip[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPayslips = async () => {
    setLoading(true);
    try {
      const res = await api.getMyPayslips();
      if (res.data) setPayslips(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayslips();
  }, []);

  const handleDownloadPdf = async (payslipId: string, month: string) => {
    try {
      await api.downloadPayslipPdf(payslipId, `My_Payslip_${month}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF payslip.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Salary Payslips</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Download official PDF payslips reflecting finalized gross earnings, verified deductions, and tax withholdings
          </p>
        </div>

        <button
          onClick={loadPayslips}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-numbers">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px] font-sans">
              <tr>
                <th className="px-5 py-3.5">Payroll Month</th>
                <th className="px-5 py-3.5">Basic Salary</th>
                <th className="px-5 py-3.5">Gross Salary</th>
                <th className="px-5 py-3.5">Attendance Deductions</th>
                <th className="px-5 py-3.5">Income Tax</th>
                <th className="px-5 py-3.5">Net Salary Payable</th>
                <th className="px-5 py-3.5 text-right font-sans">Official Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-sans">
                    Loading your payslips...
                  </td>
                </tr>
              ) : payslips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-sans">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No finalized payslips available yet. Once Administrator finalizes monthly payroll, slips appear here.
                  </td>
                </tr>
              ) : (
                payslips.map((p: any) => (
                  <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-900 font-sans">{p.month}</td>
                    <td className="px-5 py-4 text-slate-700">PKR {p.basicSalary.toLocaleString()}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">PKR {p.grossSalary.toLocaleString()}</td>
                    <td className="px-5 py-4 text-rose-600">
                      PKR {(p.attendanceDeductions + p.leaveDeductions).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-rose-600">PKR {p.tax.toLocaleString()}</td>
                    <td className="px-5 py-4 font-bold text-emerald-700 text-sm">
                      PKR {p.netSalary.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right font-sans">
                      <button
                        onClick={() => handleDownloadPdf(p._id, p.month)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
