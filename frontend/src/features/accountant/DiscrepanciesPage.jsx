import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Filter,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  TrendingDown,
} from 'lucide-react';

const GHS = (n) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(n ?? 0);

const DiscrepancyCard = ({ sub, onResolve }) => {
  const [showResolve, setShowResolve] = useState(false);
  const [resolutionNote, setResolutionNote] = useState('');
  const isOpen = sub.status === 'discrepancy_flagged';
  const delta = (sub.actuallyCountedAmount ?? 0) - (sub.totals?.grandTotal ?? 0);

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-200 ${
        isOpen ? 'ring-1 ring-red-400/30' : ''
      }`}
      style={{ border: isOpen ? '1px solid #fca5a5' : '1px solid #e2e8f0' }}
    >
      {/* Card header */}
      <div
        className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ background: isOpen ? '#fff7f7' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
      >
        <div className="flex items-center gap-4">
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
              isOpen ? 'bg-red-100' : 'bg-slate-100'
            }`}
          >
            {isOpen ? (
              <AlertTriangle size={20} className="text-red-600" />
            ) : (
              <CheckCircle size={20} className="text-slate-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-800">{sub.class?.name || '—'}</span>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                  isOpen
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {isOpen ? 'Open' : 'Resolved'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {sub.submittingTeacher?.email || '—'} ·{' '}
              {sub.date ? new Date(sub.date).toLocaleDateString('en-GH') : '—'}
            </p>
          </div>
        </div>

        {/* Amounts */}
        <div className="flex items-center gap-6 text-right">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expected</span>
            <span className="text-sm font-black text-slate-700">{GHS(sub.totals?.grandTotal)}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Counted</span>
            <span className="text-sm font-black text-slate-700">{GHS(sub.actuallyCountedAmount)}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Difference</span>
            <span className={`text-sm font-black ${delta < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {delta >= 0 ? '+' : ''}{GHS(delta)}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-4 space-y-3">
        {/* Discrepancy note */}
        <div className="flex items-start gap-2">
          <MessageSquare size={13} className="text-slate-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-600 italic">
            {sub.discrepancyNotes || 'No note recorded'}
          </p>
        </div>

        {/* Flagged by + when */}
        {sub.confirmedBy && (
          <div className="flex items-center gap-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <User size={9} />
              Flagged by {sub.confirmedBy?.email}
            </span>
            {sub.confirmedAt && (
              <span className="flex items-center gap-1">
                <Clock size={9} />
                {new Date(sub.confirmedAt).toLocaleString('en-GH')}
              </span>
            )}
          </div>
        )}

        {/* Resolve section (open only) */}
        {isOpen && (
          <div className="pt-2">
            <button
              onClick={() => setShowResolve(!showResolve)}
              className="flex items-center gap-2 text-xs font-bold text-teal-700 hover:text-teal-900 transition-colors"
            >
              {showResolve ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showResolve ? 'Cancel resolution' : 'Resolve this discrepancy'}
            </button>

            {showResolve && (
              <div className="mt-3 space-y-3">
                <textarea
                  rows={2}
                  placeholder="Resolution note — what was agreed, who signed off, what adjustment was made..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-slate-200 rounded-xl resize-none text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <button
                  onClick={() => onResolve(sub._id, resolutionNote)}
                  disabled={resolutionNote.trim().length < 5}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                >
                  <CheckCircle size={14} />
                  Mark as Resolved
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const DiscrepanciesPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'resolved'

  const { data: discrepancies = [], isLoading } = useQuery({
    queryKey: ['discrepancies', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await api.get(`/fees/daily-register/discrepancies${params}`);
      return res.data?.data || [];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, resolutionNotes }) =>
      api.post(`/fees/daily-register/submissions/${id}/resolve`, { resolutionNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discrepancies'] });
      queryClient.invalidateQueries({ queryKey: ['accountantStats'] });
    },
  });

  const openCount = discrepancies.filter((d) => d.status === 'discrepancy_flagged').length;
  const resolvedCount = discrepancies.filter((d) => d.status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Discrepancies</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {openCount > 0 ? (
              <span className="text-red-600 font-bold">{openCount} open</span>
            ) : (
              <span className="text-emerald-600 font-bold">No open discrepancies</span>
            )}
            {resolvedCount > 0 && <span className="text-slate-400"> · {resolvedCount} resolved</span>}
          </p>
        </div>

        {/* Status filter tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl" style={{ border: '1px solid #e2e8f0' }}>
          {[['all', 'All'], ['open', 'Open'], ['resolved', 'Resolved']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === val
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert banner if open discrepancies exist */}
      {openCount > 0 && (
        <div
          className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ background: '#fff7f7', border: '1px solid #fca5a5' }}
        >
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">
              {openCount} submission{openCount !== 1 ? 's' : ''} flagged with discrepancies
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              These do not count toward confirmed totals until resolved. Both the System Administrator and the submitting teacher have been notified.
            </p>
          </div>
        </div>
      )}

      {/* Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 animate-pulse" style={{ border: '1px solid #e2e8f0' }}>
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-slate-100" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-100 rounded w-32" />
                  <div className="h-3 bg-slate-100 rounded w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : discrepancies.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl" style={{ border: '1px solid #e2e8f0' }}>
          <TrendingDown size={40} className="text-slate-200 mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400">
            {statusFilter === 'open' ? 'No open discrepancies' : 'No discrepancies found'}
          </p>
          <p className="text-xs text-slate-300 mt-1">
            {statusFilter === 'open' ? 'All submitted registers are reconciling correctly.' : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {discrepancies.map((sub) => (
            <DiscrepancyCard
              key={sub._id}
              sub={sub}
              onResolve={(id, note) => resolveMutation.mutate({ id, resolutionNotes: note })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscrepanciesPage;
