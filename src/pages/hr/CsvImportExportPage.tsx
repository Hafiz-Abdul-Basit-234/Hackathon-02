import React, { useState } from 'react';
import { UploadCloud, Download, CheckCircle, AlertTriangle, FileText, ArrowRight, RefreshCw, X } from 'lucide-react';
import { api } from '../../services/api';

const sampleCsv = `full_name,email,phone,department_code,basic_salary,code
Tariq Mehmood,tariq.m@saylani.org,+92 321 9876543,IT,120000,EMP-0301
Ayesha Khan,ayesha.k@saylani.org,+92 333 1122334,HR,95000,EMP-0302
Bilal Siddiqui,bilal.s@saylani.org,+92 345 5566778,FIN,110000,EMP-0303`;

export function CsvImportExportPage() {
  const [csvText, setCsvText] = useState(sampleCsv);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Dry run result
  const [dryRunResult, setDryRunResult] = useState<{
    summary: { totalRows: number; validCount: number; errorCount: number };
    errors: Array<{ row: number; field: string; reason: string }>;
    validPreview: any[];
  } | null>(null);

  // Final commit result
  const [commitResult, setCommitResult] = useState<{
    message: string;
    importedCount: number;
    employees: Array<{ code: string; name: string; email: string; tempPass: string }>;
  } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      setDryRunResult(null);
      setCommitResult(null);
    };
    reader.readAsText(file);
  };

  const handleDryRun = async () => {
    if (!csvText.trim()) return;
    setAnalyzing(true);
    setDryRunResult(null);
    setCommitResult(null);

    try {
      const res = await api.importEmployeesCsv(csvText.trim(), true);
      if (res.data || res.dryRun) {
        setDryRunResult(res.data || res);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Dry run failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCommitImport = async () => {
    if (!csvText.trim()) return;
    setImporting(true);

    try {
      const res = await api.importEmployeesCsv(csvText.trim(), false);
      if (res.success) {
        setCommitResult({
          message: res.message || 'Import completed successfully',
          importedCount: res.importedCount || 0,
          employees: res.employees || [],
        });
        setDryRunResult(null);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Import commit failed');
    } finally {
      setImporting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/employees/export-csv', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('saylani_hcm_token')}`,
        },
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'saylani_employees_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">CSV Batch Import & Export</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Bulk register workforce records with dry-run validation, row-level error reporting, and CSV data export
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? 'Exporting...' : 'Export All Employees (CSV)'}
        </button>
      </div>

      {/* Commit Result Success Card */}
      {commitResult && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{commitResult.message}</span>
          </div>
          <p className="text-xs text-emerald-800">
            {commitResult.importedCount} employees were added to MongoDB Atlas and provisioned with temporary passwords:
          </p>
          <div className="max-h-60 overflow-y-auto bg-white border border-emerald-200 rounded-lg p-3 text-xs font-mono space-y-2">
            {commitResult.employees.map((emp, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between gap-2 py-1 border-b border-slate-100 last:border-0">
                <span className="font-sans font-bold text-slate-900">{emp.name} ({emp.code})</span>
                <span className="text-slate-500">{emp.email}</span>
                <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">Pass: {emp.tempPass}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSV Input Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Upload or Paste CSV Records</h2>
            <p className="text-xs text-slate-500">
              Headers: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-mono">full_name, email, phone, department_code, basic_salary, code</code>
            </p>
          </div>

          <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors inline-flex items-center gap-1.5 shrink-0">
            <UploadCloud className="w-3.5 h-3.5" /> Upload .csv file
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            setDryRunResult(null);
            setCommitResult(null);
          }}
          rows={8}
          className="w-full p-3 font-mono text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
          placeholder="Paste raw CSV lines here..."
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">
            Dry-run validates rows against unique emails, codes, and departments without modifying the database.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDryRun}
              disabled={analyzing || !csvText.trim()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Validating...
                </>
              ) : (
                'Run Dry-Run Validation'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Dry Run Report */}
      {dryRunResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Dry-Run Inspection Report</h3>
              <p className="text-xs text-slate-500">
                {dryRunResult.summary.totalRows} rows evaluated · {dryRunResult.summary.validCount} valid ·{' '}
                {dryRunResult.summary.errorCount} errors detected
              </p>
            </div>

            {dryRunResult.summary.validCount > 0 && (
              <button
                onClick={handleCommitImport}
                disabled={importing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Importing to Atlas...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" /> Confirm & Import {dryRunResult.summary.validCount} Valid Records
                  </>
                )}
              </button>
            )}
          </div>

          {/* Row Errors */}
          {dryRunResult.errors.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-red-700 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Row-Level Validation Errors ({dryRunResult.errors.length})
              </h4>
              <div className="border border-red-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-red-50 text-red-900 font-semibold text-[11px] border-b border-red-200">
                    <tr>
                      <th className="px-4 py-2">Row #</th>
                      <th className="px-4 py-2">Field</th>
                      <th className="px-4 py-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 font-mono text-[11px] text-red-950">
                    {dryRunResult.errors.map((err, idx) => (
                      <tr key={idx} className="bg-red-50/30">
                        <td className="px-4 py-2 font-bold">{err.row}</td>
                        <td className="px-4 py-2 text-red-700">{err.field}</td>
                        <td className="px-4 py-2 font-sans">{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Valid Preview */}
          {dryRunResult.validPreview.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Preview Valid Rows to Import
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs font-mono-numbers">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2">Code</th>
                      <th className="px-4 py-2 font-sans">Name</th>
                      <th className="px-4 py-2 font-mono">Email</th>
                      <th className="px-4 py-2 font-sans">Department</th>
                      <th className="px-4 py-2 text-right">Basic Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dryRunResult.validPreview.map((v, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 font-mono font-bold text-blue-700">{v.employeeCode}</td>
                        <td className="px-4 py-2 font-sans font-semibold text-slate-900">{v.fullName}</td>
                        <td className="px-4 py-2 font-mono text-slate-500">{v.email}</td>
                        <td className="px-4 py-2 font-sans text-slate-700">{v.departmentName}</td>
                        <td className="px-4 py-2 text-right font-semibold text-slate-800">
                          PKR {v.basicSalary.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
