import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  X,
  Check,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GHS = (n) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n ?? 0);

const StatusPill = ({ children, color = 'slate' }) => {
  const map = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${map[color]}`}>
      {children}
    </span>
  );
};

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

const StructureModal = ({ structure, classes, academicYears, onClose, onSaved }) => {
  const isEdit = Boolean(structure);

  const [form, setForm] = useState({
    class: structure?.class?._id || structure?.class || '',
    academicYear: structure?.academicYear?._id || structure?.academicYear || '',
    termName: structure?.termName || 'Term 1',
    notes: structure?.notes || '',
    items: structure?.items?.length
      ? structure.items
      : [{ name: '', amount: '' }],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setItem = (idx, field, value) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, items };
    });
  };

  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, { name: '', amount: '' }] }));

  const removeItem = (idx) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const totalPreview = form.items.reduce(
    (s, i) => s + (parseFloat(i.amount) || 0),
    0
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side guard
    const validItems = form.items.filter((i) => i.name.trim() && parseFloat(i.amount) > 0);
    if (validItems.length === 0) {
      setError('Add at least one valid fee item with a name and positive amount.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        items: validItems.map((i) => ({ name: i.name.trim(), amount: parseFloat(i.amount) })),
      };

      if (isEdit) {
        await api.patch(`/fees/structures/${structure._id}`, payload);
      } else {
        await api.post('/fees/structures', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            {isEdit ? 'Edit Fee Structure' : 'New Fee Structure'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Class */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={form.class}
                onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
                required
                disabled={isEdit}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Select class…</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                value={form.academicYear}
                onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
                required
                disabled={isEdit}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">Select year…</option>
                {academicYears.map((y) => (
                  <option key={y._id} value={y._id}>
                    {y.name}
                    {y.isCurrent ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Term */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Term <span className="text-red-500">*</span>
              </label>
              <select
                value={form.termName}
                onChange={(e) => setForm((f) => ({ ...f, termName: e.target.value }))}
                required
                disabled={isEdit}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
              >
                {['Term 1', 'Term 2', 'Term 3'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Notes (optional)
              </label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Includes feeding allowance"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Fee Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">
                Fee Items <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1"
              >
                <Plus size={13} /> Add item
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => setItem(idx, 'name', e.target.value)}
                    placeholder="Item name (e.g. Tuition)"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => setItem(idx, 'amount', e.target.value)}
                    placeholder="Amount"
                    className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={form.items.length === 1}
                    className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 text-right text-sm font-bold text-slate-700">
              Total:{' '}
              <span className="text-emerald-700">{GHS(totalPreview)}</span>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {isEdit ? 'Save Changes' : 'Create Structure'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Fee Structures Tab ───────────────────────────────────────────────────────

const FeeStructuresTab = () => {
  const [structures, setStructures] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [sRes, cRes, yRes] = await Promise.all([
        api.get('/fees/structures'),
        api.get('/classes'),
        api.get('/academic-years'),
      ]);
      setStructures(sRes.data.data);
      setClasses(cRes.data.data || []);
      setAcademicYears(yRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load fee structures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this fee structure? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.delete(`/fees/structures/${id}`);
      setStructures((s) => s.filter((x) => x._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 size={28} className="animate-spin mr-3" />
        Loading fee structures…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
        <AlertCircle size={16} />
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">
          {structures.length} fee structure{structures.length !== 1 ? 's' : ''} defined
        </p>
        <button
          id="btn-create-fee-structure"
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors"
        >
          <Plus size={16} />
          New Structure
        </button>
      </div>

      {structures.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <Receipt size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No fee structures yet</p>
          <p className="text-xs mt-1">Click "New Structure" to create the first one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {structures.map((s) => (
            <div
              key={s._id}
              className="border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-colors"
            >
              {/* Row Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-white">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setExpandedId(expandedId === s._id ? null : s._id)}
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {expandedId === s._id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {s.class?.name || '—'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {s.academicYear?.name} · {s.termName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-800 hidden sm:block">
                    {GHS(s.totalAmount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditing(s); setShowModal(true); }}
                      className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(s._id)}
                      disabled={deleting === s._id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                      title="Delete"
                    >
                      {deleting === s._id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Item Breakdown */}
              {expandedId === s._id && (
                <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400 font-semibold uppercase tracking-wide">
                        <th className="text-left pb-2">Item</th>
                        <th className="text-right pb-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.items?.map((item, i) => (
                        <tr key={i} className="border-t border-slate-100 first:border-0">
                          <td className="py-2 text-slate-700">{item.name}</td>
                          <td className="py-2 text-right font-medium text-slate-800">
                            {GHS(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 font-bold">
                        <td className="pt-2 text-slate-900">Total</td>
                        <td className="pt-2 text-right text-emerald-700">
                          {GHS(s.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  {s.notes && (
                    <p className="text-xs text-slate-500 italic mt-3">{s.notes}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <StructureModal
          structure={editing}
          classes={classes}
          academicYears={academicYears}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
    </>
  );
};

export default FeeStructuresTab;
