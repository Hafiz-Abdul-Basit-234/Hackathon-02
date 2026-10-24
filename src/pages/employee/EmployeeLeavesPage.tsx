import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Sparkles,
  Bot,
  Send,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
  Clock,
  Trash2,
} from 'lucide-react';
import { api } from '../../services/api';
import { ILeaveType, ILeaveRequest, ILeaveBalance } from '../../../shared/types';

export function EmployeeLeavesPage() {
  const [balances, setBalances] = useState<ILeaveBalance[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<ILeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
  const [loading, setLoading] = useState(true);

  // Smart Leave AI state
  const [smartPrompt, setSmartPrompt] = useState('');
  const [smartExtracting, setSmartExtracting] = useState(false);
  const [smartMessage, setSmartMessage] = useState<string | null>(null);

  // Form State
  const [selectedType, setSelectedType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, typesRes] = await Promise.all([
        api.getMyLeaveOverview(),
        api.listLeaveTypes(),
      ]);

      if (overviewRes.data) {
        setBalances(overviewRes.data.balances);
        setLeaveHistory(overviewRes.data.history);
      }
      if (typesRes.data) {
        const activeTypes = typesRes.data.filter((t) => t.isActive);
        setLeaveTypes(activeTypes);
        if (activeTypes.length > 0 && !selectedType) {
          setSelectedType(activeTypes[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSmartLeaveExtract = async () => {
    if (!smartPrompt.trim() || smartExtracting) return;
    setSmartExtracting(true);
    setSmartMessage(null);

    try {
      const res = await api.smartLeave(smartPrompt.trim());
      if (res.data) {
        const { leaveTypeCode, startDate: sDate, endDate: eDate, reason: rReason, clarificationNeeded, clarificationMessage } = res.data;

        if (sDate) setStartDate(sDate);
        if (eDate) setEndDate(eDate);
        if (rReason) setReason(rReason);

        if (leaveTypeCode) {
          const match = leaveTypes.find((t) => t.code.toUpperCase() === leaveTypeCode.toUpperCase());
          if (match) setSelectedType(match._id);
        }

        if (clarificationNeeded && clarificationMessage) {
          setSmartMessage(clarificationMessage);
        } else {
          setSmartMessage('Leave details extracted! Please review the dates and click Submit Application.');
        }
      }
    } catch (err: unknown) {
      setSmartMessage('Could not extract leave dates. Please select them manually.');
    } finally {
      setSmartExtracting(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await api.applyLeave({
        leaveType: selectedType,
        startDate,
        endDate,
        reason,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || 'Leave application submitted successfully. Status: PENDING HR approval.',
        });
        setStartDate('');
        setEndDate('');
        setReason('');
        setSmartPrompt('');
        setSmartMessage(null);
        await loadData();
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Leave application failed',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this pending leave request?')) return;
    try {
      await api.cancelLeave(id);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Cancellation failed');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Apply for Leave & Balance Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit leave requests with Smart Gemini assistance, monitor annual quotas, and manage history
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
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

      {/* Quotas Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {balances.map((b) => (
          <div key={b.leaveTypeCode} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs font-mono-numbers">
            <span className="text-xs font-bold text-slate-800 font-sans block">{b.leaveTypeName}</span>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {b.quota === -1 ? 'Unlimited' : `${b.remaining}d`}
            </p>
            <div className="mt-1 text-[11px] text-slate-500 font-sans flex items-center gap-1">
              <span>{b.used}d approved</span>
              <span>·</span>
              <span className="text-amber-600">{b.pending}d pending</span>
            </div>
          </div>
        ))}
      </div>

      {/* Smart Leave Assistant Callout */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 border border-blue-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
            Smart Leave Natural Language Prefill (Gemini AI)
          </h3>
        </div>
        <p className="text-xs text-blue-800 mb-3">
          Type your leave in natural English or Roman Urdu, and Gemini will automatically extract the dates and prefill the form below:
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={smartPrompt}
            onChange={(e) => setSmartPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSmartLeaveExtract()}
            placeholder="e.g. I need next Monday and Tuesday off for my sister's wedding..."
            className="flex-1 px-3 py-2 text-xs bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
          <button
            type="button"
            onClick={handleSmartLeaveExtract}
            disabled={smartExtracting || !smartPrompt.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 shrink-0"
          >
            {smartExtracting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Extract Details
          </button>
        </div>

        {smartMessage && (
          <p className="text-[11px] font-semibold text-blue-900 mt-2 bg-blue-100/60 p-2 rounded-lg">
            {smartMessage}
          </p>
        )}
      </div>

      {/* Leave Application Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
          Leave Application Form
        </h2>

        <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Leave Type *</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                required
              >
                {leaveTypes.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.yearlyQuota === -1 ? 'Unlimited' : `${t.yearlyQuota}d quota`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono-numbers focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason for Absence *</label>
            <textarea
              placeholder="State purpose of leave request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              required
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Weekends (Saturday & Sunday) and public holidays are automatically excluded from working-day counts.
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {submitting ? 'Validating Application...' : 'Submit Leave Application'}
            </button>
          </div>
        </form>
      </div>

      {/* Leave History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider">My Leave History</span>
          <span className="text-slate-500 font-mono-numbers">{leaveHistory.length} Total Requests</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-numbers">
            <thead className="bg-slate-50/60 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px] font-sans">
              <tr>
                <th className="px-5 py-3">Leave Type</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Working Days</th>
                <th className="px-4 py-3 font-sans">Reason</th>
                <th className="px-4 py-3 font-sans">Status</th>
                <th className="px-4 py-3 text-right font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-sans">
                    Loading leave history...
                  </td>
                </tr>
              ) : leaveHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-sans">
                    No leave requests submitted yet.
                  </td>
                </tr>
              ) : (
                leaveHistory.map((l: any) => (
                  <tr key={l._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-sans font-semibold text-slate-900">{l.leaveType?.name}</td>
                    <td className="px-4 py-3 text-slate-700">{l.startDate}</td>
                    <td className="px-4 py-3 text-slate-700">{l.endDate}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{l.workingDays}d</td>
                    <td className="px-4 py-3 font-sans text-slate-600 max-w-xs truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          l.status === 'approved'
                            ? 'text-emerald-700'
                            : l.status === 'rejected'
                            ? 'text-rose-700'
                            : l.status === 'cancelled'
                            ? 'text-slate-400'
                            : 'text-amber-700'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-sans">
                      {l.status === 'pending' && (
                        <button
                          onClick={() => handleCancelLeave(l._id)}
                          className="px-2 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded text-[11px] font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      )}
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
