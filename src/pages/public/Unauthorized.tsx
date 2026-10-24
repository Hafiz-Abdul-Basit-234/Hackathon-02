import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Unauthorized() {
  const { user } = useAuth();
  const role = user?.role || 'employee';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
        <ShieldX className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
      <p className="text-xs text-slate-600 max-w-md mt-2 leading-relaxed">
        You do not have administrative or appropriate role privileges to access this requested resource.
        All security exceptions and access attempts are recorded in the audit trail.
      </p>
      <Link
        to={`/${role}`}
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Return to My Dashboard
      </Link>
    </div>
  );
}
