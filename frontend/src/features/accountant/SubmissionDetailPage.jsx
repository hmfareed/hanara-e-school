import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Banknote,
  Bus,
  Clock,
  User,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const GHS = (n) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(n ?? 0);

const statusColors = {
  paid:   { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  unpaid: { dot: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200' },
  absent: { dot: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
};

const FeeStatusBadge = ({ status }) => {
  const c = statusColors[status] || statusColors.unpaid;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} uppercase tracking-wider`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
};

const SubmissionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [countedFeeding, setCountedFeeding] = useState('');
  const [countedBus, setCountedBus] = useState('');
  const [flagNote, setFlagNote] = useState('');
  const [showCorrections, setShowCorrections] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['submissionDetail', id],
    queryFn: async () => {
      const res = await api.get(`/fees/daily-register/submissions/${id}`);
      return res.data;
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (payload) =>
      api.post(`/fees/daily-register/submissions/${id}/confirm`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingSubmissions'] });
      queryClient.invalidateQueries({ queryKey: ['accountantStats'] });
      queryClient.invalidateQueries({ queryKey: ['confirmedSubmissions'] });
      navigate('/accountant/pending');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl">
        <div className="h-10 w-48 bg-slate-200 rounded-xl" />
        <div className="h-64 bg-white rounded-2xl border border-slate-200" />
        <div className="h-48 bg-white rounded-2xl border border-slate-200" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 max-w-4xl">
        <p className="font-bold">Submission not found</p>
        <Link to="/accountant/pending" className="text-sm underline mt-1 block">← Back to queue</Link>
      </div>
    );
  }

  const { data: submission, reconciledLineItems = [], reconciledTotals = {}, corrections = [] } = data;

  const expectedFeeding = reconciledTotals.feedingTotal ?? 0;
  const expectedBus     = reconciledTotals.busFareTotal ?? 0;
  const expectedGrand   = reconciledTotals.grandTotal ?? 0;

  const countedFeedingNum = parseFloat(countedFeeding) || 0;
  const countedBusNum     = parseFloat(countedBus) || 0;
  const countedTotal      = countedFeedingNum + countedBusNum;
  const delta             = countedTotal - expectedGrand;
  const exactMatch        = Math.abs(delta) < 0.01;
  const hasEnteredAmounts = countedFeeding !== '' && countedBus !== '';

  const canConfirm = exactMatch && hasEnteredAmounts;
  const canFlag    = !exactMatch && hasEnteredAmounts && flagNote.trim().length >= 5;
  const isLocked   = submission.status !== 'pending';

  const handleConfirm = () => {
    confirmMutation.mutate({ actuallyCountedAmount: countedTotal, action: 'confirm' });
  };

  const handleFlag = () => {
    confirmMutation.mutate({
      actuallyCountedAmount: countedTotal,
      action: 'flag',
      discrepancyNotes: flagNote,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/accountant/pending"
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-800">
              {submission.class?.name || '—'} — {submission.date
                ? new Date(submission.date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Submitted by {submission.submittingTeacher?.email || '—'}
            </p>
          </div>
        </div>
        <span
          className={`self-start sm:self-auto text-xs font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider ${
            submission.status === 'confirmed'         ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : submission.status === 'discrepancy_flagged' ? 'bg-red-50 text-red-700 border-red-200'
            : submission.status === 'resolved'            ? 'bg-slate-100 text-slate-600 border-slate-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          {submission.status?.replace('_', ' ')}
        </span>
      </div>

      {/* Student Line Items */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
        <div className="px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <h3 className="text-sm font-black text-slate-800">Student Line Items</h3>
          <p className="text-xs text-slate-400 mt-0.5">{reconciledLineItems.length} students</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <th className="px-6 py-3 text-left font-bold text-slate-400 uppercase tracking-wider">Student</th>
                <th className="px-4 py-3 text-center font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1 justify-center"><Banknote size={10} />Feeding</span>
                </th>
                <th className="px-4 py-3 text-right font-bold text-slate-400 uppercase tracking-wider">Amt</th>
                <th className="px-4 py-3 text-center font-bold text-slate-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1 justify-center"><Bus size={10} />Bus Fare</span>
                </th>
                <th className="px-4 py-3 text-right font-bold text-slate-400 uppercase tracking-wider">Amt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {reconciledLineItems.map((item, idx) => {
                const isAbsent = item.feedingStatus === 'absent';
                return (
                  <React.Fragment key={idx}>
                    <tr className={`transition-colors ${isAbsent ? 'opacity-50' : 'hover:bg-slate-50/80'}`}>
                      <td className="px-6 py-3.5">
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <span className="text-slate-400 font-mono text-[10px]">{item.admissionNumber}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center"><FeeStatusBadge status={item.feedingStatus} /></td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-700">
                        {item.feedingStatus === 'paid' ? GHS(item.feedingAmount) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center"><FeeStatusBadge status={item.busStatus} /></td>
                      <td className="px-4 py-3.5 text-right font-bold text-slate-700">
                        {item.busStatus === 'paid' ? GHS(item.busAmount) : '—'}
                      </td>
                    </tr>

                    {/* Inline correction rows */}
                    {item.studentCorrections?.map((corr, ci) => (
                      <tr key={`corr-${idx}-${ci}`} className="bg-amber-50/60">
                        <td className="px-6 py-2.5 pl-10" colSpan={5}>
                          <div className="flex items-start gap-2">
                            <RotateCcw size={11} className="text-amber-500 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-bold text-amber-700 text-[10px] uppercase tracking-wider">Correction — </span>
                              <span className="text-slate-600 text-[10px]">{corr.reason}</span>
                              <span className="block text-slate-400 text-[10px]">
                                by {corr.correctedBy} · {new Date(corr.timestamp).toLocaleString('en-GH')}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Expected totals footer */}
        <div className="px-6 py-4 flex flex-wrap gap-6 justify-end" style={{ borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expected Feeding</span>
            <span className="text-base font-black text-slate-700">{GHS(expectedFeeding)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expected Bus Fare</span>
            <span className="text-base font-black text-slate-700">{GHS(expectedBus)}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-teal-500 uppercase tracking-wider block">Grand Total</span>
            <span className="text-xl font-black text-teal-700">{GHS(expectedGrand)}</span>
          </div>
        </div>
      </div>

      {/* Correction history panel (collapsed by default) */}
      {corrections.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setShowCorrections(!showCorrections)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <RotateCcw size={15} className="text-amber-500" />
              <span className="text-sm font-bold text-slate-700">Correction History ({corrections.length})</span>
            </div>
            {showCorrections ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {showCorrections && (
            <div className="px-6 pb-5 space-y-3" style={{ borderTop: '1px solid #f1f5f9' }}>
              {corrections.map((corr, i) => (
                <div key={i} className="p-4 rounded-xl bg-amber-50/60" style={{ border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User size={12} className="text-amber-600" />
                      <span className="text-xs font-bold text-amber-700">{corr.correctedBy?.email}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock size={9} />
                      {new Date(corr.timestamp).toLocaleString('en-GH')}
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 italic">"{corr.reason}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Confirmation Panel or Settled State ── */}
      {!isLocked ? (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
          <div className="px-6 py-5" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <h3 className="text-sm font-black text-slate-800">Cash Reconciliation</h3>
            <p className="text-xs text-slate-400 mt-0.5">Enter the cash you physically counted from this teacher</p>
          </div>
          <div className="p-6 space-y-5">
            {/* Amount inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  <Banknote size={11} className="inline mr-1 text-teal-500" />
                  Counted Feeding Cash (GHS)
                </label>
                <input
                  type="number" min="0" step="0.01"
                  placeholder={`Expected: ${expectedFeeding.toFixed(2)}`}
                  value={countedFeeding}
                  onChange={(e) => setCountedFeeding(e.target.value)}
                  className="w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono font-bold text-slate-800"
                  style={{ border: '1px solid #e2e8f0' }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  <Bus size={11} className="inline mr-1 text-blue-500" />
                  Counted Bus Fare Cash (GHS)
                </label>
                <input
                  type="number" min="0" step="0.01"
                  placeholder={`Expected: ${expectedBus.toFixed(2)}`}
                  value={countedBus}
                  onChange={(e) => setCountedBus(e.target.value)}
                  className="w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono font-bold text-slate-800"
                  style={{ border: '1px solid #e2e8f0' }}
                />
              </div>
            </div>

            {/* Live match indicator */}
            {hasEnteredAmounts && (
              <div
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
                  exactMatch ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                }`}
              >
                {exactMatch
                  ? <CheckCircle size={20} className="text-emerald-600 shrink-0" />
                  : <AlertTriangle size={20} className="text-red-600 shrink-0" />
                }
                <div>
                  <p className={`text-sm font-black ${exactMatch ? 'text-emerald-700' : 'text-red-700'}`}>
                    {exactMatch ? 'Amounts match — ready to confirm' : 'Amounts do not match'}
                  </p>
                  <p className={`text-xs mt-0.5 ${exactMatch ? 'text-emerald-600' : 'text-red-600'}`}>
                    Counted: {GHS(countedTotal)} · Expected: {GHS(expectedGrand)}
                    {!exactMatch && ` · Difference: ${delta > 0 ? '+' : ''}${GHS(delta)}`}
                  </p>
                </div>
              </div>
            )}

            {/* Discrepancy note field (only when mismatch detected) */}
            {!exactMatch && hasEnteredAmounts && (
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                  Discrepancy Note <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain what happened — missing notes, wrong denomination, teacher not present, etc."
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                  className="w-full px-4 py-3 text-sm border rounded-xl resize-none text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  style={{ border: '1px solid #fca5a5' }}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {exactMatch && hasEnteredAmounts && (
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm || confirmMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
                >
                  <CheckCircle size={16} />
                  {confirmMutation.isPending ? 'Confirming...' : 'Confirm & Settle'}
                </button>
              )}
              {!exactMatch && hasEnteredAmounts && (
                <button
                  onClick={handleFlag}
                  disabled={!canFlag || confirmMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
                >
                  <AlertTriangle size={16} />
                  {confirmMutation.isPending ? 'Flagging...' : 'Flag Discrepancy'}
                </button>
              )}
            </div>

            {confirmMutation.error && (
              <p className="text-sm text-red-600 font-medium">
                {confirmMutation.error.response?.data?.message || 'An error occurred. Please try again.'}
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Already processed — read-only summary */
        <div
          className="p-6 rounded-2xl"
          style={{
            background: submission.status === 'confirmed' ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${submission.status === 'confirmed' ? '#bbf7d0' : '#fde68a'}`,
          }}
        >
          <div className="flex items-start gap-3">
            {submission.status === 'confirmed'
              ? <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              : <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            }
            <div>
              <p className={`text-sm font-black ${submission.status === 'confirmed' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {submission.status === 'confirmed' ? 'Confirmed & Settled' : `Status: ${submission.status?.replace('_', ' ')}`}
              </p>
              {submission.confirmedBy && (
                <p className="text-xs text-slate-500 mt-1">
                  Processed by {submission.confirmedBy?.email} on {new Date(submission.confirmedAt).toLocaleString('en-GH')}
                </p>
              )}
              {submission.actuallyCountedAmount != null && (
                <p className="text-xs text-slate-600 mt-0.5">Cash counted: {GHS(submission.actuallyCountedAmount)}</p>
              )}
              {submission.discrepancyNotes && (
                <p className="text-xs text-slate-600 italic mt-1">"{submission.discrepancyNotes}"</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionDetailPage;
