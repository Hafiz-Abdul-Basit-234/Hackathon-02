import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, AlertTriangle, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseAlertBanner } from '../../components/DatabaseAlertBanner';

export function Login() {
  const navigate = useNavigate();
  const { login, setupRequired } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.login({ email, password });
      if (res.data) {
        login(res.data.token, res.data.user);

        // Check if forced password change on first login
        if (res.data.user.isTemporaryPassword) {
          navigate('/change-password');
        } else {
          // Route to appropriate role dashboard
          const role = res.data.user.role;
          navigate(`/${role}`);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  // Quick helper for evaluation testing
  const setDemoCredentials = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center">
      <DatabaseAlertBanner />

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-xl bg-blue-600 text-white items-center justify-center font-black text-xl mb-3 shadow-md shadow-blue-500/20">
            S
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Saylani HCM Lite</h2>
          <p className="text-xs text-slate-600 mt-1">Enterprise Human Capital Management & Workforce Portal</p>
        </div>

        {setupRequired && (
          <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
            <p className="font-bold">Fresh Installation Detected</p>
            <p className="mt-0.5 text-blue-800">
              Company and Master Admin have not been initialized yet.
            </p>
            <Link
              to="/setup"
              className="mt-2 inline-block px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition-colors"
            >
              Launch First-Run Setup &rarr;
            </Link>
          </div>
        )}

        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Corporate Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@saylani.org"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Sign In to HCM
                </>
              )}
            </button>
          </form>

          {/* Testing shortcut helper */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block mb-2">Evaluation Testing Credentials:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoCredentials('admin@saylani.org', 'Admin@Saylani2026!')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-bold text-slate-900 block">Admin</span>
                <span className="text-[10px] text-slate-500 block truncate">admin@saylani.org</span>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('hr@saylani.org', 'HR_Officer2026!')}
                className="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-bold text-slate-900 block">HR Officer</span>
                <span className="text-[10px] text-slate-500 block truncate">hr@saylani.org</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
