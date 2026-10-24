import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Power, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { IDepartment } from '../../../shared/types';

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<IDepartment | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDepartments = async () => {
    try {
      const res = await api.listDepartments();
      if (res.data) setDepartments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const openCreate = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setDescription('');
    setError(null);
    setShowModal(true);
  };

  const openEdit = (dept: IDepartment) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setDescription(dept.description || '');
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingDept) {
        await api.updateDepartment(editingDept._id, { name, code, description });
      } else {
        await api.createDepartment({ name, code, description });
      }
      setShowModal(false);
      await loadDepartments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (dept: IDepartment) => {
    try {
      await api.updateDepartment(dept._id, { isActive: !dept.isActive });
      await loadDepartments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Department Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Define corporate divisions, unit codes, and employee assignments</p>
        </div>

        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Add Department
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3.5">Department Name</th>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Employees</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Loading departments...
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No departments created yet. Click "Add Department" to get started.
                  </td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {dept.name}
                      {dept.description && (
                        <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                          {dept.description}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-blue-700">{dept.code}</td>
                    <td className="px-6 py-4 font-mono-numbers">
                      <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {dept.employeeCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block text-[11px] font-semibold ${
                          dept.isActive ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEdit(dept)}
                        className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleStatus(dept)}
                        className={`p-1 transition-colors ${
                          dept.isActive ? 'text-slate-400 hover:text-amber-600' : 'text-emerald-600 hover:text-emerald-700'
                        }`}
                        title={dept.isActive ? 'Deactivate' : 'Activate'}
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

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingDept ? 'Edit Department' : 'Create New Department'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Set department identity and unique short code</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Information Technology"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Department Code *</label>
                <input
                  type="text"
                  placeholder="e.g. IT, HR, FIN"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Department scope and responsibilities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingDept ? 'Save Changes' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
