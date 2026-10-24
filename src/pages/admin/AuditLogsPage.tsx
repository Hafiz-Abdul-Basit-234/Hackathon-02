import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw, Eye, Database } from 'lucide-react';
import { api } from '../../services/api';
import { IAuditLog } from '../../../shared/types';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<IAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<IAuditLog | null>(null);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await api.listAuditLogs({ search });
      if (res.data?.logs) setLogs(res.data.logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Security Audit Trail</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable system logs tracking administrative actions, approvals, and mutations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search action or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadAuditLogs()}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg w-56 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={loadAuditLogs}
            className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-6 py-3.5">Actor</th>
                <th className="px-6 py-3.5">Role</th>
                <th className="px-6 py-3.5">Action</th>
                <th className="px-6 py-3.5">Target Entity</th>
                <th className="px-6 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-sans">
                    Loading audit trail records...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-sans">
                    <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No audit records matching search criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5 font-sans font-semibold text-slate-900">{log.actorEmail}</td>
                    <td className="px-6 py-3.5">
                      <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-800">{log.action}</td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {log.entity} {log.entityId ? `(#${log.entityId.substring(0, 8)})` : ''}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-sans font-semibold transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View Snapshot
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[80vh] flex flex-col">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-600" /> Audit Log Event Snapshot
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-mono text-[11px]">
              {selectedLog.action} · {new Date(selectedLog.createdAt).toLocaleString()}
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">Actor:</span>
                <span className="font-mono text-slate-900">{selectedLog.actorEmail} ({selectedLog.actorRole})</span>
              </div>

              {selectedLog.ip && (
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Origin IP:</span>
                  <span className="font-mono text-slate-900">{selectedLog.ip}</span>
                </div>
              )}

              {selectedLog.beforeState && (
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px] mb-1">State Before Mutation:</span>
                  <pre className="p-3 bg-slate-950 text-slate-200 rounded-lg text-[11px] overflow-x-auto font-mono">
                    {JSON.stringify(selectedLog.beforeState, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.afterState && (
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px] mb-1">State After Mutation:</span>
                  <pre className="p-3 bg-slate-950 text-slate-200 rounded-lg text-[11px] overflow-x-auto font-mono">
                    {JSON.stringify(selectedLog.afterState, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
