import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { IDesignation, IDepartment } from '../../../shared/types';

export function DesignationsPage() {
  const [designations, setDesignations] = useState<IDesignation[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDesig, setEditingDesig] = useState<IDesignation | null>(null);

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [department, setDepartment] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [desigsRes, deptsRes] = await Promise.all([api.listDesignations(), api.listDepartments()]);
      if (desigsRes.data) setDesignations(desigsRes.data);
      if (deptsRes.data) {
        setDepartments(deptsRes.data);
        if (deptsRes.data.length > 0 && !department) {
          setDepartment(deptsRes.data[0]._id);
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

  const openCreate = () => {
    setEditingDesig(null);
    setTitle('');
    setCode('');
    setDescription('');
    setError(null);
    setShowModal(true);
  };

  const openEdit = (d: IDesignation) => {
    setEditingDesig(d);
    setTitle(d.title);
    setCode(d.code);
    setDepartment(typeof d.department === 'object' ? (d.department as any)._id : d.department);
    setDescription(d.description || '');
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!department) {
      setError('Please select a department.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      if (editingDesig) {
        await api.updateDesignation(editingDesig._id, { title, code, department, description });
      } else {
        await api.createDesignation({ title, code, department, description });
      }
      setShowModal(false);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Designations & Job Titles</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage positions and job hierarchies assigned to departments</p>
        </div>

        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Add Designation
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-3.5">Title</th>
                <th className="px-6 py-3.5">Code</th>
                <th className="px-6 py-3.5">Department</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Loading designations...
                  </td>
                </tr>
              ) : designations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No designations created yet. Click "Add Designation" to begin.
                  </td>
                </tr>
              ) : (
                designations.map((desig) => (
                  <tr key={desig._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {desig.title}
                      {desig.description && (
                        <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                          {desig.description}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-blue-700">{desig.code}</td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-800">
                        {typeof desig.department === 'object' ? (desig.department as any).name : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[11px] font-semibold ${desig.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {desig.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openEdit(desig)}
                        className="p-1 text-slate-500 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
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
              {editingDesig ? 'Edit Designation' : 'Create New Designation'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Assign job title to a corporate department</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Software Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Designation Code *</label>
                <input
                  type="text"
                  placeholder="e.g. SSE, HRO, PM"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg uppercase font-mono focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Department *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  required
                >
                  <option value="">Select department...</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Role responsibilities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
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
                  {saving ? 'Saving...' : editingDesig ? 'Save Changes' : 'Create Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
