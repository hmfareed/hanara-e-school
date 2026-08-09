import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { subscribeToEvent, unsubscribeFromEvent } from '../../services/socket';
import {
  Search,
  Filter,
  Clock,
  ChevronRight,
  RefreshCw,
  ClipboardList,
  Banknote,
  Bus,
} from 'lucide-react';

const GHS = (n) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(n ?? 0);

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const PendingQueuePage = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState({ classId: '', date: '', teacher: '' });
  const [newIds, setNewIds] = useState(new Set()); // IDs that just arrived via socket

  const { data: submissions = [], isLoading, refetch } = useQuery({
    queryKey: ['pendingSubmissions'],
    queryFn: async () => {
      const res = await api.get('/fees/daily-register/submissions?status=pending');
      return res.data?.data || [];
    },
    refetchInterval: 120000,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classesList'],
    queryFn: async () => (await api.get('/classes')).data?.data || [],
    staleTime: 10 * 60 * 1000,
  });

  // Socket: prepend new submissions, highlight briefly
  const handleNewSub = useCallback((data) => {
    queryClient.setQueryData(['pendingSubmissions'], (prev = []) => {
      if (prev.find((s) => s._id === data._id)) return prev;
      return [data, ...prev];
    });
    setNewIds((prev) => new Set(prev).add(data._id));
    setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev);
        next.delete(data._id);
        return next;
      });
    }, 4000);
  }, [queryClient]);

  // Socket: remove confirmed/flagged from pending queue
  const handleStatusChanged = useCallback(({ submissionId, status }) => {
    if (status !== 'pending') {
      queryClient.setQueryData(['pendingSubmissions'], (prev = []) =>
        prev.filter((s) => s._id !== submissionId)
      );
    }
  }, [queryClient]);

  useEffect(() => {
    subscribeToEvent('newSubmission', handleNewSub);
    subscribeToEvent('submissionStatusChanged', handleStatusChanged);
    return () => {
      unsubscribeFromEvent('newSubmission', handleNewSub);
      unsubscribeFromEvent('submissionStatusChanged', handleStatusChanged);
    };
  }, [handleNewSub, handleStatusChanged]);

  // Apply local filters
  const filtered = submissions.filter((s) => {
    const classMatch = !filter.classId || s.class?._id === filter.classId;
    const dateMatch = !filter.date || s.date?.startsWith(filter.date);
    const teacherMatch =
      !filter.teacher || s.submittingTeacher?.email?.toLowerCase().includes(filter.teacher.toLowerCase());
    return classMatch && dateMatch && teacherMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Pending Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''} awaiting confirmation
          </p>
        </div>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors shrink-0"
          style={{ border: '1px solid rgba(20,184,166,0.3)', background: 'rgba(20,184,166,0.06)' }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div
        className="bg-white rounded-2xl p-5 shadow-sm"
        style={{ border: '1px solid #e2e8f0' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Class filter */}
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filter.classId}
              onChange={(e) => setFilter((f) => ({ ...f, classId: e.target.value }))}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 appearance-none"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Date filter */}
          <input
            type="date"
            value={filter.date}
            onChange={(e) => setFilter((f) => ({ ...f, date: e.target.value }))}
            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />

          {/* Teacher filter */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by teacher email..."
              value={filter.teacher}
              onChange={(e) => setFilter((f) => ({ ...f, teacher: e.target.value }))}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        style={{ border: '1px solid #e2e8f0' }}
      >
        {isLoading ? (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-100 rounded w-32" />
                  <div className="h-2.5 bg-slate-100 rounded w-48" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-3 bg-slate-100 rounded w-16 ml-auto" />
                  <div className="h-3 bg-slate-100 rounded w-12 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList size={40} className="text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400">
              {submissions.length === 0 ? 'No pending submissions' : 'No results match your filters'}
            </p>
            <p className="text-xs text-slate-300 mt-1">
              {submissions.length === 0
                ? 'New submissions from teachers will appear here in real time'
                : 'Try clearing some filters'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div
              className="grid grid-cols-12 gap-4 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400"
              style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
            >
              <div className="col-span-3">Class</div>
              <div className="col-span-3">Teacher</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2 text-right">
                <span className="flex items-center gap-1 justify-end"><Banknote size={10} />Feeding</span>
              </div>
              <div className="col-span-1 text-right">
                <span className="flex items-center gap-1 justify-end"><Bus size={10} />Bus</span>
              </div>
              <div className="col-span-1 text-right">Grand</div>
            </div>

            <div className="divide-y divide-slate-50">
              {filtered.map((sub) => {
                const isNew = newIds.has(sub._id);
                return (
                  <Link
                    key={sub._id}
                    to={`/accountant/pending/${sub._id}`}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/80 transition-all duration-200 group"
                    style={isNew ? { background: 'rgba(20,184,166,0.06)', animation: 'fadeIn 0.3s ease-out' } : {}}
                  >
                    <div className="col-span-3 flex items-center gap-3">
                      {isNew && (
                        <span
                          className="h-2 w-2 rounded-full bg-teal-400 animate-pulse shrink-0"
                          title="New submission"
                        />
                      )}
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                        style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                      >
                        {(sub.class?.name || 'C')[0]}
                      </div>
                      <span className="text-sm font-bold text-slate-800 truncate">
                        {sub.class?.name || '—'}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-xs text-slate-500 truncate block">
                        {sub.submittingTeacher?.email || '—'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-slate-600 font-medium">
                        {sub.date ? new Date(sub.date).toLocaleDateString('en-GH') : '—'}
                      </span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-xs font-bold text-slate-700">{GHS(sub.totals?.feedingTotal)}</span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="text-xs font-bold text-slate-700">{GHS(sub.totals?.busFareTotal)}</span>
                    </div>
                    <div className="col-span-1 text-right flex items-center justify-end gap-2">
                      <div className="text-right">
                        <span className="text-sm font-black text-teal-700">{GHS(sub.totals?.grandTotal)}</span>
                        <span className="block text-[9px] text-slate-400 flex items-center gap-0.5 justify-end">
                          <Clock size={8} />
                          {timeAgo(sub.submissionTimestamp || sub.createdAt)}
                        </span>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-teal-500 transition-colors shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PendingQueuePage;
