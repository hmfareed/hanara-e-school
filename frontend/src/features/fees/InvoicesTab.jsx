import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
  FileText,
  Plus,
  AlertCircle,
  Loader2,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GHS = (n) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n ?? 0);

const STATUS_COLORS = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  unpaid: 'bg-slate-100 text-slate-600 border-slate-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
};

const StatusBadge = ({ status }) => (
  <span
    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
      STATUS_COLORS[status] || STATUS_COLORS.unpaid
    }`}
  >
    {status}
  </span>
);

// ─── Generate Invoices Modal ──────────────────────────────────────────────────

const GenerateModal = ({ classes, academicYears, feeStructures, onClose, onGenerated }) => {
  const [form, setForm] = useState({ classId: '', feeStructureId: '', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Filter fee structures by selected class
  const filteredStructures = feeStructures.filter(
    (s) => !form.classId || (s.class?._id || s.class) === form.classId
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.classId || !form.feeStructureId) {
      setError('Please select both a class and a fee structure.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        classId: form.classId,
        feeStructureId: form.feeStructureId,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      };
      const res = await api.post('/fees/invoices/generate', payload);
      onGenerated(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate invoices');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Generate Invoices</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              value={form.classId}
              onChange={(e) =>
                setForm((f) => ({ ...f, classId: e.target.value, feeStructureId: '' }))
              }
              required
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Select class…</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Fee Structure <span className="text-red-500">*</span>
            </label>
            <select
              value={form.feeStructureId}
              onChange={(e) => setForm((f) => ({ ...f, feeStructureId: e.target.value }))}
              required
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="">Select fee structure…</option>
              {filteredStructures.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.termName} — {GHS(s.totalAmount)} ({s.academicYear?.name})
                </option>
              ))}
            </select>
            {form.classId && filteredStructures.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No fee structures found for this class. Create one first.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Due Date (optional)
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
            One invoice will be generated per <strong>active</strong> student in the selected class.
            Existing invoices will be skipped automatically.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Generate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Invoice Detail Drawer ────────────────────────────────────────────────────

const InvoiceDetail = ({ invoice }) => {
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/fees/invoices/${invoice._id}`);
        setPayments(res.data.data.payments || []);
      } catch {
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [invoice._id]);

  return (
    <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 space-y-3">
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Invoice #</p>
          <p className="font-mono font-bold text-slate-800">{invoice.invoiceNumber}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Amount Due</p>
          <p className="font-bold text-slate-800">{GHS(invoice.amountDue)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Balance</p>
          <p className={`font-bold ${invoice.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {GHS(invoice.balance)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 size={12} className="animate-spin" /> Loading payments…
        </div>
      ) : payments && payments.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Payment History
          </p>
          <div className="space-y-1.5">
            {payments.map((p) => (
              <div
                key={p._id}
                className="flex items-center justify-between text-sm bg-white border border-slate-200 rounded-xl px-4 py-2.5"
              >
                <div>
                  <span className="font-semibold text-slate-800">{GHS(p.amount)}</span>
                  <span className="text-slate-400 ml-2 capitalize">{p.method}</span>
                  {p.receiptNumber && (
                    <span className="font-mono text-xs text-slate-400 ml-2">
                      {p.receiptNumber}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(p.paidAt).toLocaleDateString('en-GH')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">No payments recorded yet</p>
      )}
    </div>
  );
};

// ─── Invoices Tab ─────────────────────────────────────────────────────────────

const InvoicesTab = () => {
  const [invoices, setInvoices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGenModal, setShowGenModal] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterClass) params.classId = filterClass;
      if (filterTerm) params.termName = filterTerm;

      const [iRes, cRes, yRes, sRes] = await Promise.all([
        api.get('/fees/invoices', { params }),
        api.get('/classes'),
        api.get('/academic-years'),
        api.get('/fees/structures'),
      ]);
      setInvoices(iRes.data.data);
      setClasses(cRes.data.data || []);
      setAcademicYears(yRes.data.data || []);
      setFeeStructures(sRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterClass, filterTerm]);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Client-side name search
  const visible = invoices.filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${inv.student?.firstName} ${inv.student?.lastName}`.toLowerCase();
    const admNo = (inv.student?.admissionNumber || '').toLowerCase();
    const invNo = (inv.invoiceNumber || '').toLowerCase();
    return name.includes(q) || admNo.includes(q) || invNo.includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 size={28} className="animate-spin mr-3" />
        Loading invoices…
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
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in">
          <Check size={15} className="text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 mb-5 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student / invoice…"
              className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52"
            />
          </div>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">All statuses</option>
            {['unpaid', 'partial', 'paid', 'overdue'].map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>

          {/* Class filter */}
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          {/* Term filter */}
          <select
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">All terms</option>
            {['Term 1', 'Term 2', 'Term 3'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <button
          id="btn-generate-invoices"
          onClick={() => setShowGenModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors"
        >
          <Plus size={16} />
          Generate Invoices
        </button>
      </div>

      {/* Summary stats */}
      {visible.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {['paid', 'partial', 'unpaid', 'overdue'].map((s) => {
            const count = visible.filter((i) => i.status === s).length;
            return (
              <div
                key={s}
                className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-center"
              >
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wide capitalize">
                  {s}
                </p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{count}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Invoice Table */}
      {visible.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No invoices found</p>
          <p className="text-xs mt-1">Adjust filters or generate invoices for a class</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((inv) => (
            <div
              key={inv._id}
              className="border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 transition-colors"
            >
              <div
                className="flex items-center justify-between px-5 py-3.5 bg-white cursor-pointer"
                onClick={() => setExpandedId(expandedId === inv._id ? null : inv._id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-slate-300">
                    {expandedId === inv._id ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {inv.student?.firstName} {inv.student?.lastName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {inv.student?.admissionNumber} · {inv.termName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-400">Balance</p>
                    <p
                      className={`text-sm font-bold ${
                        inv.balance > 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {GHS(inv.balance)}
                    </p>
                  </div>
                  <StatusBadge status={inv.status} />
                </div>
              </div>

              {expandedId === inv._id && <InvoiceDetail invoice={inv} />}
            </div>
          ))}
        </div>
      )}

      {showGenModal && (
        <GenerateModal
          classes={classes}
          academicYears={academicYears}
          feeStructures={feeStructures}
          onClose={() => setShowGenModal(false)}
          onGenerated={(msg) => {
            setShowGenModal(false);
            showToast(msg);
            load();
          }}
        />
      )}
    </>
  );
};

export default InvoicesTab;
