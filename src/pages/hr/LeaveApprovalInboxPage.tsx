import React, { useState, useEffect } from 'react';
import { CheckSquare, CalendarDays, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { ILeaveRequest } from '../../../shared/types';

export function LeaveApprovalInboxPage() {
  const [leaves, setLeaves] = useState<ILeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  const [selectedLeave, setSelectedLeave] = useState<ILeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [comment, setComment] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.listAllLeaves({ status: selectedStatus || undefined });
      if (res.data) setLeaves(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, [selectedStatus]);

  const openActionModal = (leave: ILeaveRequest, action: 'approve' | 'reject') => {
    setSelectedLeave(leave);
    setActionType(action);
    setComment('');
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave) return;
    setProcessing(true);

    try {
      await api.reviewLeave(selectedLeave._id, actionType, comment);
      setSelectedLeave(null);
      await loadLeaves();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Review action failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leave Approvals & Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review staff leave applications, audit working-day calculations, and authorize absence requests
          </p>
        </div>

        <button
          onClick={loadLeaves}
          className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Inbox
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['pending', 'approved', 'rejected', ''].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              selectedStatus === st
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {st ? `${st} Requests` : 'All Applications'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-numbers">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px] font-sans">
              <tr>
                <th className="px-5 py-3.5">Employee</th>
                <th className="px-5 py-3.5">Leave Type</th>
                <th className="px-5 py-3.5">Date Range</th>
                <th className="px-5 py-3.5">Working Days</th>
                <th className="px-5 py-3.5 font-sans">Reason</th>
                <th className="px-5 py-3.5 font-sans">Status</th>
                <th className="px-5 py-3.5 text-right font-sans">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-sans">
                    Loading leave requests...
                  </td>
                </tr>
              ) : leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-sans">
                    <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No leave requests found in this view.
                  </td>
                </tr>
              ) : (
                leaves.map((l: any) => (
                  <tr key={l._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-sans">
                      <span className="font-semibold text-slate-900 block">{l.employee?.fullName}</span>
                      <span className="text-[11px] text-blue-600 font-mono">{l.employee?.employeeCode}</span>
                    </td>
                    <td className="px-5 py-3.5 font-sans">
                      <span className="font-semibold text-slate-800">{l.leaveType?.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {l.leaveType?.isPaid ? 'Paid' : 'Unpaid (Deducted)'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      {l.startDate} &rarr; {l.endDate}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">{l.workingDays}d</td>
                    <td className="px-5 py-3.5 font-sans text-slate-600 max-w-xs truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="px-5 py-3.5 font-sans">
                      <span
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          l.status === 'approved'
                            ? 'text-emerald-700'
                            : l.status === 'rejected'
                            ? 'text-rose-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-sans space-x-1.5">
                      {l.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => openActionModal(l, 'approve')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px] transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => openActionModal(l, 'reject')}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded font-semibold text-[11px] transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal */}
      {selectedLeave && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 capitalize">
              {actionType} Leave Request
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Employee: {(selectedLeave.employee as any)?.fullName} · {selectedLeave.workingDays} working days ({selectedLeave.startDate} to {selectedLeave.endDate})
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  HR Reviewer Comments {actionType === 'reject' ? '*' : '(Optional)'}
                </label>
                <textarea
                  placeholder="State review comment or instructions for the employee..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required={actionType === 'reject'}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedLeave(null)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className={`px-4 py-1.5 text-white rounded-lg font-bold transition-colors disabled:opacity-50 ${
                    actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {processing ? 'Processing...' : `Confirm ${actionType.toUpperCase()}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
