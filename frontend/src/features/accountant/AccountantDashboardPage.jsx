import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getStaffGreeting } from '../../utils/greetingUtils';
import { subscribeToEvent, unsubscribeFromEvent } from '../../services/socket';
import {
  ClipboardList,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Clock,
  TrendingUp,
  Banknote,
  Bus,
  RefreshCw,
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

const StatCard = ({ label, value, sub, icon: Icon, color, loading }) => (
  <div
    className="bg-white rounded-2xl p-6 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    style={{ border: '1px solid #e2e8f0' }}
  >
    <div className="space-y-1">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
      {loading ? (
        <div className="h-9 w-24 bg-slate-100 rounded-lg animate-pulse" />
      ) : (
        <h3 className={`text-3xl font-black ${color}`}>{value}</h3>
      )}
      <span className="text-[10px] text-slate-400 block">{sub}</span>
    </div>
    <div
      className="h-13 w-13 rounded-2xl flex items-center justify-center shrink-0 p-3"
      style={{ background: 'rgba(20, 184, 166, 0.08)', border: '1px solid rgba(20, 184, 166, 0.15)' }}
    >
      <Icon size={22} className="text-teal-600" />
    </div>
  </div>
);

const statusBadge = {
  pending:            'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:          'bg-emerald-50 text-emerald-700 border-emerald-200',
  discrepancy_flagged:'bg-red-50 text-red-700 border-red-200',
  resolved:           'bg-slate-100 text-slate-600 border-slate-200',
};

const FINANCE_QUOTES = [
  "Beware of little expenses; a small leak will sink a great ship.",
  "Financial integrity is the foundation of trust and sustainable institutional excellence.",
  "A budget is telling your money where to go instead of wondering where it went.",
  "Accounting is the language of transparency and responsible stewardship.",
  "Precision in numbers creates clarity in vision and purpose.",
  "Stewardship is the responsible overseeing and protection of resources worth preserving.",
  "Transparency and fiscal diligence are the true hallmarks of effective management.",
  "Every cedi accounted for is an investment in our students' brighter future.",
  "Diligent financial records build the confidence upon which schools thrive.",
];

const AccountantDashboardPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [fadeQuote, setFadeQuote] = useState(true);

  // 5-second finance quote rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setFadeQuote(false);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % FINANCE_QUOTES.length);
        setFadeQuote(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Today's stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['accountantStats'],
    queryFn: async () => {
      const res = await api.get('/fees/daily-register/stats/today');
      return res.data?.data;
    },
    refetchInterval: 60000,
  });

  // Recent submissions (last 8 of any status)
  const { data: allSubmissions, isLoading: subLoading } = useQuery({
    queryKey: ['recentSubmissions'],
    queryFn: async () => {
      const res = await api.get('/fees/daily-register/submissions');
      return (res.data?.data || []).slice(0, 8);
    },
  });

  useEffect(() => {
    if (allSubmissions) setRecentSubmissions(allSubmissions);
  }, [allSubmissions]);

  // Socket: prepend new submissions live
  const handleNewSub = useCallback((data) => {
    setRecentSubmissions((prev) => [data, ...prev].slice(0, 8));
    refetchStats();
    queryClient.invalidateQueries({ queryKey: ['pendingSubmissions'] });
  }, [refetchStats, queryClient]);

  useEffect(() => {
    subscribeToEvent('newSubmission', handleNewSub);
    return () => unsubscribeFromEvent('newSubmission', handleNewSub);
  }, [handleNewSub]);

  const pending      = stats?.pendingCount ?? 0;
  const discrepancies = stats?.openDiscrepancyCount ?? 0;
  const todayTotal   = stats?.todayConfirmed?.grandTotal ?? 0;
  const todayFeeding = stats?.todayConfirmed?.feedingTotal ?? 0;
  const todayBus     = stats?.todayConfirmed?.busFareTotal ?? 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            {getStaffGreeting(user)} 👋
          </h1>
          <div className={`transition-all duration-300 min-h-[22px] flex items-center mt-0.5 ${fadeQuote ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}>
            <p className="text-sm text-slate-500 italic font-medium">
              "{FINANCE_QUOTES[quoteIndex]}"
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">
            {new Date().toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Accounts Overview
          </p>
        </div>
        <button
          onClick={() => { refetchStats(); queryClient.invalidateQueries({ queryKey: ['recentSubmissions'] }); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
          style={{ border: '1px solid rgba(20,184,166,0.3)', background: 'rgba(20,184,166,0.06)' }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Pending Submissions"
          value={pending}
          sub="Awaiting cash confirmation"
          icon={ClipboardList}
          color={pending > 0 ? 'text-amber-600' : 'text-slate-800'}
          loading={statsLoading}
        />

        {/* Today's confirmed — wider card */}
        <div
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 sm:col-span-2"
          style={{ border: '1px solid #e2e8f0' }}
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Today Confirmed</span>
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          {statsLoading ? (
            <div className="h-9 w-32 bg-slate-100 rounded-lg animate-pulse mb-3" />
          ) : (
            <h3 className="text-3xl font-black text-emerald-600 mb-3">{GHS(todayTotal)}</h3>
          )}
          <div className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Banknote size={13} className="text-teal-500" />
              <span className="text-xs font-semibold text-slate-500">
                Feeding: <span className="text-slate-700">{GHS(todayFeeding)}</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bus size={13} className="text-blue-500" />
              <span className="text-xs font-semibold text-slate-500">
                Bus Fare: <span className="text-slate-700">{GHS(todayBus)}</span>
              </span>
            </div>
          </div>
        </div>

        <StatCard
          label="Open Discrepancies"
          value={discrepancies}
          sub="Require investigation"
          icon={AlertTriangle}
          color={discrepancies > 0 ? 'text-red-600' : 'text-slate-800'}
          loading={statsLoading}
        />
      </div>

      {/* Bottom row: Recent feed + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Submissions Feed */}
        <div
          className="lg:col-span-2 bg-white rounded-2xl shadow-sm overflow-hidden"
          style={{ border: '1px solid #e2e8f0' }}
        >
          <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div>
              <h3 className="text-sm font-black text-slate-800">Recent Submissions</h3>
              <p className="text-xs text-slate-400 mt-0.5">Live feed — new entries appear automatically</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Live</span>
            </div>
          </div>

          <div className="divide-y divide-slate-50">
            {subLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                  <div className="h-9 w-9 rounded-xl bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-40" />
                    <div className="h-2 bg-slate-100 rounded w-28" />
                  </div>
                  <div className="h-5 w-16 bg-slate-100 rounded-lg" />
                </div>
              ))
            ) : recentSubmissions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <TrendingUp size={32} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">No submissions yet today</p>
                <p className="text-xs text-slate-300 mt-1">New submissions will appear here in real time</p>
              </div>
            ) : (
              recentSubmissions.map((sub, idx) => (
                <Link
                  key={sub._id || idx}
                  to={`/accountant/pending/${sub._id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 transition-colors group"
                >
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                  >
                    {(sub.class?.name || 'C')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{sub.class?.name || '—'}</p>
                    <p className="text-xs text-slate-400 truncate">{sub.submittingTeacher?.email || 'Unknown teacher'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusBadge[sub.status] || statusBadge.pending}`}
                    >
                      {sub.status?.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={9} />
                      {timeAgo(sub.submissionTimestamp || sub.createdAt)}
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors shrink-0" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">Quick Links</h3>
          {[
            {
              to: '/accountant/pending',
              icon: ClipboardList,
              label: 'Pending Queue',
              desc: 'Confirm incoming cash submissions',
              badge: pending > 0 ? `${pending} waiting` : null,
              badgeClass: 'bg-amber-500',
            },
            {
              to: '/accountant/discrepancies',
              icon: AlertTriangle,
              label: 'Discrepancies',
              desc: 'Investigate flagged mismatches',
              badge: discrepancies > 0 ? `${discrepancies} open` : null,
              badgeClass: 'bg-red-500',
            },
            {
              to: '/accountant/reports',
              icon: TrendingUp,
              label: 'Reports',
              desc: 'Daily and term-to-date summaries',
              badge: null,
              badgeClass: '',
            },
            {
              to: '/accountant/history',
              icon: CheckCircle,
              label: 'Confirmed Ledger',
              desc: 'Permanent record of settled cash',
              badge: null,
              badgeClass: '',
            },
          ].map(({ to, icon: Icon, label, desc, badge, badgeClass }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <div
                className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.15)' }}
              >
                <Icon size={20} className="text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                  {badge && (
                    <span className={`text-[9px] font-black text-white px-1.5 py-0.5 rounded-full ${badgeClass}`}>
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{desc}</p>
              </div>
              <ArrowRight size={16} className="text-slate-300 group-hover:text-teal-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AccountantDashboardPage;
