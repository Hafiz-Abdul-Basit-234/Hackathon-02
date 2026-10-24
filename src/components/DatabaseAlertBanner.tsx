import React, { useState } from 'react';
import { Database, AlertTriangle, CheckCircle, RefreshCw, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export function DatabaseAlertBanner() {
  const { dbConnected, dbError, checkSystemStatus } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [customUri, setCustomUri] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (dbConnected) {
    return null;
  }

  const handleTestConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUri.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testDb(customUri.trim());
      setTestResult({
        success: Boolean(res.success),
        message: res.message || (res.success ? 'Connection verified successfully.' : 'Connection test failed.'),
      });
      if (res.success) {
        await checkSystemStatus();
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-amber-900 dark:text-amber-200">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">MongoDB Atlas Disconnected:</span>
            <span className="text-amber-800 dark:text-amber-300">
              {dbError || 'MONGODB_URI is not configured in environment variables. Database persistence is paused.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded transition-colors whitespace-nowrap"
            >
              Connect Atlas Cluster
            </button>
            <button
              onClick={() => checkSystemStatus()}
              title="Refresh connection status"
              className="p-1 text-amber-700 hover:text-amber-900 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">MongoDB Atlas Connection</h3>
                <p className="text-xs text-slate-500">Connect your cloud MongoDB Atlas database</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
              Saylani HCM Lite requires a real MongoDB Atlas database. You can supply your connection string in your{' '}
              <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200 font-mono">
                MONGODB_URI
              </code>{' '}
              environment variable, or test a connection string directly below:
            </p>

            <form onSubmit={handleTestConnection} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  MongoDB Connection URI
                </label>
                <input
                  type="text"
                  placeholder="mongodb+srv://<username>:<password>@cluster0.mongodb.net/saylani_hcm"
                  value={customUri}
                  onChange={(e) => setCustomUri(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <a
                  href="https://cloud.mongodb.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Open MongoDB Atlas <ExternalLink className="w-3 h-3" />
                </a>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={testing}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testing ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" /> Connecting...
                      </>
                    ) : (
                      'Test & Connect'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
