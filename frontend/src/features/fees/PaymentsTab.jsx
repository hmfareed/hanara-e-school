import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import {
  CreditCard,
  Plus,
  AlertCircle,
  Loader2,
  X,
  Check,
  Search,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GHS = (n) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(n ?? 0);

const METHOD_LABELS = { cash: 'Cash', bank: 'Bank Transfer', momo: 'Mobile Money', card: 'Card' };

// ─── Record Payment Modal ─────────────────────────────────────────────────────

const PaymentModal = ({ onClose, onSaved }) => {
  const [step, setStep] = useState('search'); // 'search' | 'pay'
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [invoiceResults, setInvoiceResults] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [form, setForm] = useState({ amount: '', method: 'cash', transactionRef: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const searchInvoices = async () => {
    if (!invoiceQuery.trim()) return;
    setSearching(true);
    try {
      // Search by student name or invoice number
      const res = await api.get('/fees/invoices', {
        params: { limit: 10 },
      });
      const q = invoiceQuery.toLowerCase();
      const filtered = res.data.data.filter((inv) => {
        const name = `${inv.student?.firstName} ${inv.student?.lastName}`.toLowerCase();
        const admNo = (inv.student?.admissionNumber || '').toLowerCase();
        const invNo = (inv.invoiceNumber || '').toLowerCase();
        return (name.includes(q) || admNo.includes(q) || invNo.includes(q)) && inv.balance > 0;
      });
      setInvoiceResults(filtered);
    } catch {
      setInvoiceResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectInvoice = (inv) => {
    setSelectedInvoice(inv);
    setForm((f) => ({ ...f, amount: inv.balance.toFixed(2) }));
    setStep('pay');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setError('Enter a valid payment amount.');
      return;
    }
    if (amount > selectedInvoice.balance) {
      setError(`Amount cannot exceed outstanding balance of ${GHS(selectedInvoice.balance)}.`);
      return;
    }
    setSaving(true);
    try {
      await api.post('/fees/payments', {
        invoiceId: selectedInvoice._id,
        amount,
        method: form.method,
        transactionRef: form.transactionRef || undefined,
        notes: form.notes || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record payment');
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
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Record Payment</h2>
            {step === 'pay' && selectedInvoice && (
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedInvoice.student?.firstName} {selectedInvoice.student?.lastName} ·{' '}
                {selectedInvoice.invoiceNumber}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1 — Search invoice */}
          {step === 'search' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Search for a student or invoice number with an outstanding balance:
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={invoiceQuery}
                    onChange={(e) => setInvoiceQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchInvoices()}
                    placeholder="Student name or invoice #…"
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={searchInvoices}
                  disabled={searching}
                  className="px-4 py-2.5 text-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-xl transition-colors"
                >
                  {searching ? <Loader2 size={15} className="animate-spin" /> : 'Search'}
                </button>
              </div>

              {invoiceResults.length > 0 && (
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {invoiceResults.map((inv) => (
                    <button
                      key={inv._id}
                      onClick={() => selectInvoice(inv)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {inv.student?.firstName} {inv.student?.lastName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {inv.invoiceNumber} · {inv.termName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">{GHS(inv.balance)}</p>
                        <p className="text-[11px] text-slate-400">outstanding</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {invoiceResults.length === 0 && invoiceQuery && !searching && (
                <p className="text-sm text-slate-400 text-center py-4">
                  No outstanding invoices found for "{invoiceQuery}"
                </p>
              )}
            </div>
          )}

          {/* Step 2 — Payment form */}
          {step === 'pay' && selectedInvoice && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Invoice summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Due</p>
                  <p className="font-bold text-slate-800">{GHS(selectedInvoice.amountDue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Paid</p>
                  <p className="font-bold text-emerald-700">{GHS(selectedInvoice.amountPaid)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase">Balance</p>
                  <p className="font-bold text-red-600">{GHS(selectedInvoice.balance)}</p>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Amount (GHS) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={selectedInvoice.balance}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['cash', 'bank'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, method: m }))}
                      className={`py-2.5 text-sm font-semibold rounded-xl border transition-colors ${
                        form.method === m
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction Ref */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Transaction Reference (optional)
                </label>
                <input
                  type="text"
                  value={form.transactionRef}
                  onChange={(e) => setForm((f) => ({ ...f, transactionRef: e.target.value }))}
                  placeholder="Bank slip no. or reference"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. First installment"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('search')}
                  className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors disabled:opacity-60"
                >
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Record Payment
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Payments Tab ─────────────────────────────────────────────────────────────

const PaymentsTab = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/fees/payments', { params: { limit: 100 } });
      setPayments(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Client-side search
  const visible = payments.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = `${p.student?.firstName} ${p.student?.lastName}`.toLowerCase();
    const admNo = (p.student?.admissionNumber || '').toLowerCase();
    const rcp = (p.receiptNumber || '').toLowerCase();
    return name.includes(q) || admNo.includes(q) || rcp.includes(q);
  });

  const totalCollected = visible.reduce((s, p) => s + (p.amount || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 size={28} className="animate-spin mr-3" />
        Loading payment records…
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
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <Check size={15} className="text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student / receipt…"
              className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 w-52"
            />
          </div>
          {visible.length > 0 && (
            <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              Total: {GHS(totalCollected)}
            </span>
          )}
        </div>
        <button
          id="btn-record-payment"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition-colors"
        >
          <Plus size={16} />
          Record Payment
        </button>
      </div>

      {/* Table */}
      {visible.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <CreditCard size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No payments recorded yet</p>
          <p className="text-xs mt-1">Record a payment using the button above</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Receipt #', 'Student', 'Amount', 'Method', 'Invoice', 'Date', 'Recorded By'].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {visible.map((p, idx) => (
                <tr
                  key={p._id}
                  className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                    {p.receiptNumber || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-semibold text-slate-800">
                      {p.student?.firstName} {p.student?.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{p.student?.admissionNumber}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-700 whitespace-nowrap">
                    {GHS(p.amount)}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600 whitespace-nowrap">
                    {METHOD_LABELS[p.method] || p.method}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">
                    {p.invoice?.invoiceNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(p.paidAt).toLocaleDateString('en-GH')}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                    {p.recordedBy?.email?.split('@')[0] || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <PaymentModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            showToast('Payment recorded successfully');
            load();
          }}
        />
      )}
    </>
  );
};

export default PaymentsTab;
