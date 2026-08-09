import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  Search,
  Filter,
  CheckCircle,
  User,
  Calendar,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

const GHS = (n) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(n ?? 0);

const ConfirmedHistoryPage = () => {
  const [filter, setFilter] = useState({ classId: '', dateFrom: '', dateTo: '', teacher: '' });

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ['confirmedSubmissions', filter],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'confirmed' });
      if (filter.dateFrom) params.append('date', filter.dateFrom);
      const res = await api.get(`/fees/daily-register/submissions?${params.toString()}`);
      return res.data?.data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classesList'],
    queryFn: async () => (await api.get('/classes')).data?.data || [],
    staleTime: 10 * 60 * 1000,
  });

  // Apply local filters
  const filtered = submissions.filter((s) => {
    const classMatch = !filter.classId || s.class?._id === filter.classId;
    const fromMatch = !filter.dateFrom || new Date(s.date) >= new Date(filter.dateFrom);
    const toMatch = !filter.dateTo || new Date(s.date) <= new Date(filter.dateTo);
    const teacherMatch =
      !filter.teacher || s.submittingTeacher?.email?.toLowerCase().includes(filter.teacher.toLowerCase());
    return classMatch && fromMatch && toMatch && teacherMatch;
  });

  const totalFeeding = filtered.reduce((a, s) => a + (s.totals?.feedingTotal || 0), 0);
  const totalBus = filtered.reduce((a, s) => a + (s.totals?.busFareTotal || 0), 0);
  const grandTotal = totalFeeding + totalBus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Confirmed Ledger</h1>
        <p className="text-sm text-slate-500 mt-0.5">Permanent record of all settled cash collections</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filter.classId}
              onChange={(e) => setFilter((f) => ({ ...f, classId: e.target.value }))}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 appearance-none"
            >
              <option value="">All Classes</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <input
            type="date"
            placeholder="From"
            value={filter.dateFrom}
            onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
          <input
            type="date"
            placeholder="To"
            value={filter.dateTo}
            onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Teacher email..."
              value={filter.teacher}
              onChange={(e) => setFilter((f) => ({ ...f, teacher: e.target.value }))}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Running totals banner */}
      {filtered.length > 0 && (
        <div
          className="grid grid-cols-3 gap-4 p-5 rounded-2xl"
          style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(14,116,144,0.06))', border: '1px solid rgba(20,184,166,0.2)' }}
        >
          <div className="text-center">
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Feeding Total</span>
            <span className="text-xl font-black text-slate-800">{GHS(totalFeeding)}</span>
          </div>
          <div className="text-center" style={{ borderLeft: '1px solid rgba(20,184,166,0.2)', borderRight: '1px solid rgba(20,184,166,0.2)' }}>
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Bus Fare Total</span>
            <span className="text-xl font-black text-slate-800">{GHS(totalBus)}</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Grand Total</span>
            <span className="text-xl font-black text-teal-700">{GHS(grandTotal)}</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
        {isLoading ? (
          <div className="divide-y divide-slate-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                <div className="h-9 w-9 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-36" />
                  <div className="h-2 bg-slate-100 rounded w-48" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-20" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen size={40} className="text-slate-200 mx-auto mb-4" />
            <p className="text-sm font-bold text-slate-400">No confirmed submissions found</p>
            <p className="text-xs text-slate-300 mt-1">Adjust your date range or class filters</p>
          </div>
        ) : (
          <>
            <div
              className="grid grid-cols-12 gap-3 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400"
              style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
            >
              <div className="col-span-2">Class</div>
              <div className="col-span-3">Teacher</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2 text-right">Feeding</div>
              <div className="col-span-1 text-right">Bus</div>
              <div className="col-span-1 text-right">Total</div>
              <div className="col-span-1 text-right">Confirmed By</div>
            </div>
            <div className="divide-y divide-slate-50">
              {filtered.map((sub) => (
                <Link
                  key={sub._id}
                  to={`/accountant/pending/${sub._id}`}
                  className="grid grid-cols-12 gap-3 px-6 py-4 items-center hover:bg-slate-50/60 transition-colors group text-xs"
                >
                  <div className="col-span-2 flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                    >
                      {(sub.class?.name || 'C')[0]}
                    </div>
                    <span className="font-bold text-slate-700 truncate">{sub.class?.name || '—'}</span>
                  </div>
                  <div className="col-span-3 text-slate-500 truncate">{sub.submittingTeacher?.email || '—'}</div>
                  <div className="col-span-2 flex items-center gap-1 text-slate-600">
                    <Calendar size={10} className="text-slate-400" />
                    {sub.date ? new Date(sub.date).toLocaleDateString('en-GH') : '—'}
                  </div>
                  <div className="col-span-2 text-right font-bold text-slate-700">{GHS(sub.totals?.feedingTotal)}</div>
                  <div className="col-span-1 text-right font-bold text-slate-700">{GHS(sub.totals?.busFareTotal)}</div>
                  <div className="col-span-1 text-right font-black text-emerald-700">{GHS(sub.totals?.grandTotal)}</div>
                  <div className="col-span-1 text-right">
                    <div className="flex flex-col items-end">
                      <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                        <CheckCircle size={10} />
                        <span className="truncate max-w-[80px]">{sub.confirmedBy?.email?.split('@')[0] || '—'}</span>
                      </span>
                      {sub.confirmedAt && (
                        <span className="text-[9px] text-slate-400 flex items-center gap-0.5">
                          <User size={8} />
                          {new Date(sub.confirmedAt).toLocaleDateString('en-GH')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmedHistoryPage;
