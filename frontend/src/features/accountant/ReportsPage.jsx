import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  Banknote,
  Bus,
  Download,
  BarChart3,
} from 'lucide-react';

const GHS = (n) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(n ?? 0);

const GHSShort = (n) => `GHS ${Number(n ?? 0).toFixed(2)}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="bg-white rounded-xl p-3 shadow-xl text-xs"
      style={{ border: '1px solid #e2e8f0' }}
    >
      <p className="font-black text-slate-800 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{GHSShort(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const TABS = ['Daily Summary', 'Class Breakdown', 'Term-to-Date'];

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['collectionReports', dateRange.start, dateRange.end],
    queryFn: async () => {
      const res = await api.get(
        `/fees/daily-register/reports?startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      return res.data?.data;
    },
  });

  const { data: todayReports, isLoading: todayLoading } = useQuery({
    queryKey: ['dailySummary', singleDate],
    queryFn: async () => {
      const res = await api.get(
        `/fees/daily-register/reports?startDate=${singleDate}&endDate=${singleDate}`
      );
      return res.data?.data;
    },
  });

  const dailySummary = reports?.dailySummary || [];
  const classSummaries = reports?.classSummaries || [];
  const termToDate = reports?.termToDate || { feedingTotal: 0, busFareTotal: 0, grandTotal: 0, count: 0 };
  const todayTotals = todayReports?.totals || { feedingTotal: 0, busFareTotal: 0, grandTotal: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Cash collection analytics and summaries</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-500 cursor-not-allowed"
          style={{ border: '1px solid #e2e8f0', background: '#f8fafc' }}
          title="Export — coming in a later phase"
          disabled
        >
          <Download size={14} />
          Export (Coming Soon)
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit" style={{ border: '1px solid #e2e8f0' }}>
        {TABS.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(i)}
            className={`px-5 py-2 text-sm font-bold rounded-xl transition-all ${
              activeTab === i
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Daily Summary ── */}
      {activeTab === 0 && (
        <div className="space-y-6">
          {/* Date picker */}
          <div className="flex items-center gap-4 bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
            <Calendar size={16} className="text-slate-400" />
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date</label>
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {todayLoading ? (
            <div className="grid grid-cols-3 gap-5">
              {[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse" style={{ border: '1px solid #e2e8f0' }} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                { label: 'Feeding Collected', value: todayTotals.feedingTotal, icon: Banknote, color: 'text-teal-700' },
                { label: 'Bus Fare Collected', value: todayTotals.busFareTotal, icon: Bus, color: 'text-blue-700' },
                { label: 'Total Confirmed', value: todayTotals.grandTotal, icon: TrendingUp, color: 'text-emerald-700' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                    <Icon size={16} className={color} />
                  </div>
                  <p className={`text-2xl font-black ${color}`}>{GHS(value)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 1: Class Breakdown ── */}
      {activeTab === 1 && (
        <div className="space-y-6">
          {/* Date range */}
          <div className="flex flex-wrap items-center gap-4 bg-white rounded-2xl p-5 shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
            <Calendar size={16} className="text-slate-400" />
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">From</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))}
              className="px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">To</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
              className="px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {isLoading ? (
            <div className="h-64 bg-white rounded-2xl animate-pulse" style={{ border: '1px solid #e2e8f0' }} />
          ) : classSummaries.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl" style={{ border: '1px solid #e2e8f0' }}>
              <BarChart3 size={40} className="text-slate-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-400">No confirmed data in this date range</p>
            </div>
          ) : (
            <>
              {/* Bar chart */}
              <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
                <h3 className="text-sm font-black text-slate-800 mb-6">Feeding vs Bus Fare by Class</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={classSummaries} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="className" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `GHS ${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="feeding" name="Feeding" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="bus" name="Bus Fare" fill="#0891b2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Class summary table */}
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid #e2e8f0' }}>
                <div className="grid grid-cols-4 gap-4 px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400" style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <div>Class</div>
                  <div className="text-right">Feeding</div>
                  <div className="text-right">Bus Fare</div>
                  <div className="text-right">Total</div>
                </div>
                <div className="divide-y divide-slate-50">
                  {classSummaries.map((cls) => (
                    <div key={cls.className} className="grid grid-cols-4 gap-4 px-6 py-4 text-sm items-center">
                      <span className="font-bold text-slate-800">{cls.className}</span>
                      <span className="text-right font-semibold text-teal-700">{GHS(cls.feeding)}</span>
                      <span className="text-right font-semibold text-blue-700">{GHS(cls.bus)}</span>
                      <span className="text-right font-black text-slate-800">{GHS(cls.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab 2: Term-to-Date ── */}
      {activeTab === 2 && (
        <div className="space-y-6">
          {/* Running totals */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { label: 'Total Feeding Collected', value: termToDate.feedingTotal, icon: Banknote, color: 'text-teal-700', bg: 'rgba(20,184,166,0.08)' },
              { label: 'Total Bus Fare Collected', value: termToDate.busFareTotal, icon: Bus, color: 'text-blue-700', bg: 'rgba(14,116,144,0.08)' },
              { label: 'Term Grand Total', value: termToDate.grandTotal, icon: TrendingUp, color: 'text-emerald-700', bg: 'rgba(5,150,105,0.08)' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="rounded-2xl p-6 shadow-sm"
                style={{ border: '1px solid #e2e8f0', background: bg }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                  <Icon size={16} className={color} />
                </div>
                <p className={`text-2xl font-black ${color}`}>{GHS(value)}</p>
                <p className="text-xs text-slate-400 mt-2">Across {termToDate.count} confirmed submissions</p>
              </div>
            ))}
          </div>

          {/* Trend chart */}
          {!isLoading && dailySummary.length > 1 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid #e2e8f0' }}>
              <h3 className="text-sm font-black text-slate-800 mb-6">Daily Collection Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={dailySummary} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="feeding" name="Feeding" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="bus" name="Bus Fare" stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
