import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, KeyRound, Power, AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';
import { IUser } from '../../../shared/types';

export function HrManagementPage() {
  const [hrUsers, setHrUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPass: string } | null>(null);

  const loadHrUsers = async () => {
    try {
      const res = await api.listUsers({ role: 'hr' });
      if (res.data) setHrUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHrUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setCreatedCredentials(null);

    try {
      const res = await api.createHrAccount({ email, password: password || undefined });
      if (res.success && res.data) {
        setCreatedCredentials({
          email: res.data.user.email,
          tempPass: res.data.temporaryPassword,
        });
        setEmail('');
        setPassword('');
        await loadHrUsers();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create HR account');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (userId: string, targetEmail: string) => {
    if (!confirm(`Reset temporary password for ${targetEmail}?`)) return;
    try {
      const res = await api.resetUserPassword(userId);
      if (res.data) {
        alert(`New Temporary Password for ${targetEmail}: ${res.data.temporaryPassword}\n\nThe user must change this on next login.`);
        await loadHrUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await api.toggleUserStatus(userId);
      await loadHrUsers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">HR Personnel Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Provision and manage HR accounts, access states, and temporary credentials</p>
        </div>

        <button
          onClick={() => {
            setShowCreateModal(true);
            setCreatedCredentials(null);
            setError(null);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Provision HR Account
        </button>
      </div>

      {createdCredentials && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">HR Account Provisioned Successfully</p>
            <p className="mt-1 text-[11px] text-emerald-800">
              Provide these temporary credentials to the HR officer. They will be forced to change this password on first login:
            </p>
            <div className="mt-2 p-2.5 bg-white border border-emerald-200 rounded-lg font-mono text-[11px]">
              <div>Email: <span className="font-bold text-slate-900">{createdCredentials.email}</span></div>
              <div>Temporary Password: <span className="font-bold text-blue-700">{createdCredentials.tempPass}</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3.5">HR Email Address</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Password State</th>
                <th className="px-6 py-3.5">Created Date</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">Loading HR accounts...</td>
                </tr>
              ) : hrUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No HR accounts provisioned yet. Click "Provision HR Account" to add people operations managers.
                  </td>
                </tr>
              ) : (
                hrUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-semibold ${user.status === 'active' ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.isTemporaryPassword ? (
                        <span className="text-[11px] text-amber-700 font-medium">Temporary (Requires Change)</span>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Permanent
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono-numbers">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => handleResetPassword(user._id, user.email)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        title="Generate temporary password"
                      >
                        <KeyRound className="w-3 h-3" /> Reset Password
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user._id)}
                        className={`p-1 transition-colors ${
                          user.status === 'active' ? 'text-slate-400 hover:text-amber-600' : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                        title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Provision HR Officer Account</h3>
            <p className="text-xs text-slate-500 mb-4">Creates credentials with people operations permissions</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">HR Email Address *</label>
                <input
                  type="email"
                  placeholder="hr.officer@saylani.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Custom Temporary Password (Leave blank to auto-generate)
                </label>
                <input
                  type="password"
                  placeholder="Leave empty for secure random password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create HR Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
