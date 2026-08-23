import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  ClipboardList, CheckCircle, Clock, AlertTriangle, RefreshCw, 
  BarChart2, Settings, Users, Send, Check, X, ChevronRight, 
  Loader2, Filter, Calendar, DollarSign, Bus, Utensils,
  ShieldAlert, Eye, MessageSquare, AlertCircle, Search, User, BookOpen
} from 'lucide-react';
import { subscribeToEvent, unsubscribeFromEvent, getSocket } from '../../services/socket';

const GHS = (n) =>
  new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS', minimumFractionDigits: 2 }).format(n ?? 0);

const timeAgo = (dateStr) => {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Confirmed by Accountant',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: CheckCircle,
      };
    case 'discrepancy_flagged':
      return {
        label: 'Discrepancy Flagged',
        className: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
        icon: AlertTriangle,
      };
    case 'resolved':
      return {
        label: 'Discrepancy Resolved',
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: Check,
      };
    default:
      return {
        label: 'Pending Accountant Confirmation',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
      };
  }
};

const AdminDailyFeeOverview = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('submissions'); // 'submissions' | 'confirmed' | 'defaulters' | 'reports' | 'rates'

  // Submissions filter state
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Confirmed History filter state
  const [confirmedFilter, setConfirmedFilter] = useState({
    classId: '',
    dateFrom: '',
    dateTo: '',
    teacher: '',
  });

  // Selected submission modal
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [detailedSubmission, setDetailedSubmission] = useState(null);
  const [detailedLoading, setDetailedLoading] = useState(false);

  // Defaulters state
  const [defaulterDate, setDefaulterDate] = useState(new Date().toISOString().split('T')[0]);
  const [defaulterClass, setDefaulterClass] = useState('');
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsTargetStudents, setSmsTargetStudents] = useState([]);
  const [customSmsMessage, setCustomSmsMessage] = useState('');
  const [smsFeedback, setSmsFeedback] = useState(null);

  // Reports date range
  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().split('T')[0]
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Rates state
  const [settingsFeeding, setSettingsFeeding] = useState('');
  const [settingsBus, setSettingsBus] = useState('');
  const [settingsClass, setSettingsClass] = useState('');
  const [settingsLevel, setSettingsLevel] = useState('');
  const [settingsStartDate, setSettingsStartDate] = useState(new Date().toISOString().split('T')[0]);

  // ── 1. Fetch Classes List ──────────────────────────────────────────────
  const { data: classes = [] } = useQuery({
    queryKey: ['classesListAdminDailyFees'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // ── 2. Fetch Today's Overall Stats ────────────────────────────────────
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['adminDailyFeeStatsToday'],
    queryFn: async () => {
      const res = await api.get('/fees/daily-register/stats/today');
      return res.data?.data || {};
    },
    refetchInterval: 30000,
  });

  // ── 3. Fetch Submissions ──────────────────────────────────────────────
  const { data: submissions = [], isLoading: subLoading, refetch: refetchSubmissions } = useQuery({
    queryKey: ['adminDailySubmissions', filterDate, filterClass, filterStatus],
    queryFn: async () => {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterClass) params.classId = filterClass;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get('/fees/daily-register/submissions', { params });
      return res.data?.data || [];
    },
  });

  // ── 4. Fetch Confirmed Submissions ────────────────────────────────────
  const { data: confirmedSubmissions = [], isLoading: confirmedLoading, refetch: refetchConfirmed } = useQuery({
    queryKey: ['adminConfirmedSubmissions', confirmedFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'confirmed' });
      if (confirmedFilter.dateFrom) params.append('startDate', confirmedFilter.dateFrom);
      if (confirmedFilter.dateTo) params.append('endDate', confirmedFilter.dateTo);
      if (confirmedFilter.classId) params.append('classId', confirmedFilter.classId);
      const res = await api.get(`/fees/daily-register/submissions?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: activeTab === 'confirmed' || activeTab === 'submissions',
  });

  // Filter confirmed submissions locally
  const filteredConfirmed = confirmedSubmissions.filter((s) => {
    const classMatch = !confirmedFilter.classId || (s.class?._id || s.class) === confirmedFilter.classId;
    const fromMatch = !confirmedFilter.dateFrom || new Date(s.date) >= new Date(confirmedFilter.dateFrom);
    const toMatch = !confirmedFilter.dateTo || new Date(s.date) <= new Date(confirmedFilter.dateTo);
    const teacherMatch =
      !confirmedFilter.teacher ||
      s.submittingTeacher?.email?.toLowerCase().includes(confirmedFilter.teacher.toLowerCase());
    return classMatch && fromMatch && toMatch && teacherMatch;
  });

  const confirmedFeedingTotal = filteredConfirmed.reduce((a, s) => a + (s.totals?.feedingTotal || 0), 0);
  const confirmedBusTotal = filteredConfirmed.reduce((a, s) => a + (s.totals?.busFareTotal || 0), 0);
  const confirmedGrandTotal = confirmedFeedingTotal + confirmedBusTotal;

  // ── 5. Fetch Defaulters List ──────────────────────────────────────────
  const { data: defaulters = [], isLoading: defaultersLoading, refetch: refetchDefaulters } = useQuery({
    queryKey: ['adminDailyDefaulters', defaulterDate, defaulterClass],
    queryFn: async () => {
      const params = {};
      if (defaulterDate) params.date = defaulterDate;
      if (defaulterClass) params.classId = defaulterClass;
      const res = await api.get('/fees/daily-register/unpaid', { params });
      return res.data?.data || [];
    },
    enabled: activeTab === 'defaulters',
  });

  // ── 6. Fetch Reports Data ─────────────────────────────────────────────
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['adminDailyReports', reportStartDate, reportEndDate],
    queryFn: async () => {
      const res = await api.get('/fees/daily-register/reports', {
        params: { startDate: reportStartDate, endDate: reportEndDate },
      });
      return res.data?.data || {};
    },
    enabled: activeTab === 'reports',
  });

  // ── 7. Fetch Fee Rates ────────────────────────────────────────────────
  const { data: ratesHistory = [], isLoading: ratesLoading, refetch: refetchRates } = useQuery({
    queryKey: ['adminDailyFeeRatesHistory'],
    queryFn: async () => {
      const res = await api.get('/fees/daily-register/structures');
      return res.data?.data || [];
    },
    enabled: activeTab === 'rates',
  });

  // ── Socket.io Live Updates ────────────────────────────────────────────
  const handleSocketUpdate = useCallback(() => {
    refetchStats();
    refetchSubmissions();
    refetchConfirmed();
    if (selectedSubId) {
      fetchDetailedSubmission(selectedSubId);
    }
  }, [refetchStats, refetchSubmissions, refetchConfirmed, selectedSubId]);

  useEffect(() => {
    subscribeToEvent('newSubmission', handleSocketUpdate);
    subscribeToEvent('submissionStatusChanged', handleSocketUpdate);
    subscribeToEvent('newCorrection', handleSocketUpdate);

    const socket = getSocket();
    socket?.on('reconnect', handleSocketUpdate);

    return () => {
      unsubscribeFromEvent('newSubmission', handleSocketUpdate);
      unsubscribeFromEvent('submissionStatusChanged', handleSocketUpdate);
      unsubscribeFromEvent('newCorrection', handleSocketUpdate);
      socket?.off('reconnect', handleSocketUpdate);
    };
  }, [handleSocketUpdate]);

  // ── Fetch Detailed Submission ─────────────────────────────────────────
  const fetchDetailedSubmission = async (subId) => {
    setDetailedLoading(true);
    try {
      const res = await api.get(`/fees/daily-register/submissions/${subId}`);
      if (res.data?.success) {
        setDetailedSubmission(res.data);
      }
    } catch (err) {
      console.error('Failed to load submission details:', err);
    } finally {
      setDetailedLoading(false);
    }
  };

  const handleOpenDetailModal = (subId) => {
    setSelectedSubId(subId);
    fetchDetailedSubmission(subId);
  };

  const handleCloseDetailModal = () => {
    setSelectedSubId(null);
    setDetailedSubmission(null);
  };

  // ── Send SMS Mutation ────────────────────────────────────────────────
  const sendSmsMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/fees/daily-register/unpaid/send-sms', payload);
    },
    onSuccess: (res) => {
      const data = res.data?.data || {};
      setSmsFeedback({
        type: 'success',
        message: `✓ ${data.sentCount || 0} SMS reminders dispatched successfully (${data.failedCount || 0} failed / no phone).`,
      });
      setTimeout(() => {
        setSmsModalOpen(false);
        setSmsFeedback(null);
      }, 2500);
    },
    onError: (err) => {
      setSmsFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to dispatch SMS alerts.',
      });
    },
  });

  const handleDispatchSms = () => {
    if (smsTargetStudents.length === 0) return;
    const studentIds = smsTargetStudents.map((s) => s.studentId);
    sendSmsMutation.mutate({
      studentIds,
      customMessage: customSmsMessage.trim() || undefined,
      date: defaulterDate,
    });
  };

  // ── Rate Mutation ────────────────────────────────────────────────────
  const rateMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/fees/daily-register/structures', payload);
    },
    onSuccess: () => {
      refetchRates();
      setSettingsFeeding('');
      setSettingsBus('');
      setSettingsClass('');
      setSettingsLevel('');
      alert('✓ New daily fee structure rate registered successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to save daily fee rates.');
    },
  });

  const handleCreateRate = () => {
    const feed = parseFloat(settingsFeeding);
    const bus = parseFloat(settingsBus);
    if (isNaN(feed) || feed < 0 || isNaN(bus) || bus < 0) {
      alert('Please provide valid positive numbers for feeding fee and bus fare.');
      return;
    }
    rateMutation.mutate({
      feedingFeeAmount: feed,
      busFareAmount: bus,
      class: settingsClass || null,
      level: settingsLevel || null,
      effectiveStartDate: new Date(settingsStartDate).toISOString(),
    });
  };

  // Stats calculation
  const totalClassesCount = classes.length || 13;
  const submittedClassesToday = submissions.filter(
    (s) => new Date(s.date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
  );
  const submittedClassIds = new Set(
    submittedClassesToday.map((s) => (s.class?._id || s.class)?.toString())
  );
  const pendingClasses = classes.filter((c) => !submittedClassIds.has(c._id.toString()));

  const todayConfirmedTotal = stats?.todayConfirmed?.grandTotal ?? 0;
  const todayFeedingTotal = stats?.todayConfirmed?.feedingTotal ?? 0;
  const todayBusTotal = stats?.todayConfirmed?.busFareTotal ?? 0;
  const pendingCount = stats?.pendingCount ?? 0;
  const discrepancyCount = stats?.openDiscrepancyCount ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Top Executive Banner ─────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
              Superadmin &amp; Head Teacher Oversight
            </span>
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Connected
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Daily Fee Collection &amp; Revenue Monitor</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time administrative oversight of teacher submissions, accountant confirmations, confirmed history ledger, and defaulters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchStats();
              refetchSubmissions();
              refetchConfirmed();
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={14} className={subLoading || statsLoading || confirmedLoading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Confirmed Cash */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Today's Confirmed Cash</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">{GHS(todayConfirmedTotal)}</div>
          <div className="flex justify-between text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-100">
            <span>Feeding: {GHS(todayFeedingTotal)}</span>
            <span>Bus: {GHS(todayBusTotal)}</span>
          </div>
        </div>

        {/* Card 2: Pending Accountant Verification */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Awaiting Accountant</span>
            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{pendingCount} Classes</div>
          <div className="text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-100">
            Submitted by teachers, pending cash verification
          </div>
        </div>

        {/* Card 3: Cash Discrepancies */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Open Discrepancies</span>
            <div className="h-8 w-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className={`text-2xl font-black ${discrepancyCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
            {discrepancyCount} Flagged
          </div>
          <div className="text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-100">
            {discrepancyCount === 0 ? '✓ Zero cash mismatches today' : 'Requires accountant resolution'}
          </div>
        </div>

        {/* Card 4: Submission Progress */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Today's Class Turnout</span>
            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardList size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {submittedClassesToday.length} <span className="text-sm font-semibold text-slate-400">/ {totalClassesCount} Classes</span>
          </div>
          <div className="text-[11px] text-slate-500 font-semibold pt-1 border-t border-slate-100 truncate">
            {pendingClasses.length === 0
              ? '✓ All classes submitted registers'
              : `Pending: ${pendingClasses.slice(0, 3).map((c) => c.name).join(', ')}${pendingClasses.length > 3 ? ` +${pendingClasses.length - 3} more` : ''}`}
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'submissions'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Clock size={16} />
            Live Queue &amp; Monitoring ({submissions.length})
          </button>
          <button
            onClick={() => setActiveTab('confirmed')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'confirmed'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CheckCircle size={16} />
            Confirmed History Ledger ({confirmedSubmissions.length})
          </button>
          <button
            onClick={() => setActiveTab('defaulters')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'defaulters'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <AlertCircle size={16} />
            Unpaid Students (Defaulters)
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'reports'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BarChart2 size={16} />
            Revenue Analytics &amp; Reports
          </button>
          <button
            onClick={() => setActiveTab('rates')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'rates'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Settings size={16} />
            Daily Fee Rate Settings
          </button>
        </div>

        {/* ── TAB 1: LIVE SUBMISSIONS & MONITORING ────────────────────────── */}
        {activeTab === 'submissions' && (
          <div className="p-6 space-y-6">
            {/* Filter Bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Class</label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none min-w-[150px]"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none min-w-[170px]"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">🟡 Pending Confirmation</option>
                  <option value="confirmed">🟢 Confirmed</option>
                  <option value="discrepancy_flagged">🔴 Discrepancy Flagged</option>
                  <option value="resolved">🔵 Resolved</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setFilterDate('');
                  setFilterClass('');
                  setFilterStatus('');
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2 px-3 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>

            {/* Submissions Table */}
            {subLoading ? (
              <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="animate-spin text-emerald-600 h-8 w-8" />
                <span className="text-xs font-bold text-slate-400">Loading daily collection sheets...</span>
              </div>
            ) : submissions.length === 0 ? (
              <div className="py-16 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-2xl">
                <ClipboardList className="mx-auto h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No submissions found</p>
                <p className="text-xs text-slate-400">No class collections match the selected date and filter parameters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-black text-[10px]">
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Submitting Teacher</th>
                      <th className="py-3 px-4 text-right">Feeding</th>
                      <th className="py-3 px-4 text-right">Bus Fare</th>
                      <th className="py-3 px-4 text-right">Expected Total</th>
                      <th className="py-3 px-4 text-center">Accountant Status</th>
                      <th className="py-3 px-4 text-right">Actually Counted</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {submissions.map((sub) => {
                      const badge = getStatusBadge(sub.status);
                      const BadgeIcon = badge.icon;
                      return (
                        <tr key={sub._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-black text-slate-900 text-sm">
                            {sub.class?.name || 'Unknown Class'}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-semibold">
                            {new Date(sub.date).toLocaleDateString('en-GH', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="font-bold text-slate-800 block">
                              {sub.submittingTeacher?.email || 'Teacher'}
                            </span>
                            <span className="text-[10px] text-slate-400">{timeAgo(sub.createdAt)}</span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700 font-bold">
                            {GHS(sub.totals?.feedingTotal)}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-700 font-bold">
                            {GHS(sub.totals?.busFareTotal)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-800 text-sm">
                            {GHS(sub.totals?.grandTotal)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${badge.className}`}
                            >
                              <BadgeIcon size={12} />
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {sub.status === 'confirmed' || sub.status === 'resolved' ? (
                              <span className="font-black text-slate-900">{GHS(sub.actuallyCountedAmount)}</span>
                            ) : sub.status === 'discrepancy_flagged' ? (
                              <span className="font-black text-rose-600">{GHS(sub.actuallyCountedAmount)}</span>
                            ) : (
                              <span className="text-slate-400 italic">Pending Count</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleOpenDetailModal(sub._id)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 mx-auto cursor-pointer"
                            >
                              <Eye size={13} />
                              Inspect Ledger
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: CONFIRMED FEE HISTORY LEDGER ────────────────────────── */}
        {activeTab === 'confirmed' && (
          <div className="p-6 space-y-6">
            {/* Running Totals Banner */}
            {filteredConfirmed.length > 0 && (
              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(14,116,144,0.06))',
                  border: '1px solid rgba(20,184,166,0.25)',
                }}
              >
                <div className="text-center">
                  <span className="text-[10px] font-black text-teal-700 uppercase tracking-wider block">
                    Confirmed Feeding Total
                  </span>
                  <span className="text-2xl font-black text-slate-800 mt-1 block">
                    {GHS(confirmedFeedingTotal)}
                  </span>
                </div>
                <div
                  className="text-center"
                  style={{
                    borderLeft: '1px solid rgba(20,184,166,0.2)',
                    borderRight: '1px solid rgba(20,184,166,0.2)',
                  }}
                >
                  <span className="text-[10px] font-black text-teal-700 uppercase tracking-wider block">
                    Confirmed Bus Fare Total
                  </span>
                  <span className="text-2xl font-black text-slate-800 mt-1 block">
                    {GHS(confirmedBusTotal)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-black text-teal-700 uppercase tracking-wider block">
                    Grand Settled Total
                  </span>
                  <span className="text-2xl font-black text-teal-700 mt-1 block">
                    {GHS(confirmedGrandTotal)}
                  </span>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Class</label>
                <select
                  value={confirmedFilter.classId}
                  onChange={(e) => setConfirmedFilter((f) => ({ ...f, classId: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">All Classes</option>
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">From Date</label>
                <input
                  type="date"
                  value={confirmedFilter.dateFrom}
                  onChange={(e) => setConfirmedFilter((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">To Date</label>
                <input
                  type="date"
                  value={confirmedFilter.dateTo}
                  onChange={(e) => setConfirmedFilter((f) => ({ ...f, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="relative">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Search Teacher</label>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Teacher email..."
                    value={confirmedFilter.teacher}
                    onChange={(e) => setConfirmedFilter((f) => ({ ...f, teacher: e.target.value }))}
                    className="w-full pl-8 pr-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Confirmed Ledger Table */}
            {confirmedLoading ? (
              <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="animate-spin text-emerald-600 h-8 w-8" />
                <span className="text-xs font-bold text-slate-400">Loading confirmed fee history...</span>
              </div>
            ) : filteredConfirmed.length === 0 ? (
              <div className="py-16 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-2xl">
                <BookOpen className="mx-auto h-8 w-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No confirmed fee records found</p>
                <p className="text-xs text-slate-400">No settled collections match the specified date range or filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-black text-[10px]">
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Submitting Teacher</th>
                      <th className="py-3 px-4">Collection Date</th>
                      <th className="py-3 px-4 text-right">Feeding</th>
                      <th className="py-3 px-4 text-right">Bus Fare</th>
                      <th className="py-3 px-4 text-right">Settled Cash</th>
                      <th className="py-3 px-4 text-center">Confirmed By</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredConfirmed.map((sub) => (
                      <tr key={sub._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-black text-slate-900 text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-7 w-7 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0"
                              style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
                            >
                              {(sub.class?.name || 'C')[0]}
                            </div>
                            <span>{sub.class?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-bold">
                          {sub.submittingTeacher?.email || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-400" />
                            {sub.date ? new Date(sub.date).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 font-bold">
                          {GHS(sub.totals?.feedingTotal)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-700 font-bold">
                          {GHS(sub.totals?.busFareTotal)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-800 text-sm">
                          {GHS(sub.actuallyCountedAmount || sub.totals?.grandTotal)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                              <CheckCircle size={12} />
                              {sub.confirmedBy?.email?.split('@')[0] || 'Accountant'}
                            </span>
                            {sub.confirmedAt && (
                              <span className="text-[10px] text-slate-400">
                                {new Date(sub.confirmedAt).toLocaleDateString('en-GH', { month: 'short', day: 'numeric' })} · {new Date(sub.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenDetailModal(sub._id)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 mx-auto cursor-pointer"
                          >
                            <Eye size={13} />
                            Inspect Ledger
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: UNPAID STUDENTS (DEFAULTERS) ────────────────────────── */}
        {activeTab === 'defaulters' && (
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-wrap gap-4 items-end justify-between">
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Date</label>
                  <input
                    type="date"
                    value={defaulterDate}
                    onChange={(e) => setDefaulterDate(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Class</label>
                  <select
                    value={defaulterClass}
                    onChange={(e) => setDefaulterClass(e.target.value)}
                    className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none min-w-[150px]"
                  >
                    <option value="">All Classes</option>
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {defaulters.length > 0 && (
                <button
                  onClick={() => {
                    setSmsTargetStudents(defaulters);
                    setCustomSmsMessage('');
                    setSmsFeedback(null);
                    setSmsModalOpen(true);
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Send size={14} />
                  Send SMS to All Defaulters ({defaulters.length})
                </button>
              )}
            </div>

            {defaultersLoading ? (
              <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="animate-spin text-emerald-600 h-8 w-8" />
                <span className="text-xs font-bold text-slate-400">Querying unpaid student ledger...</span>
              </div>
            ) : defaulters.length === 0 ? (
              <div className="py-16 text-center space-y-2 border-2 border-dashed border-slate-200 rounded-2xl">
                <CheckCircle className="mx-auto h-8 w-8 text-emerald-400" />
                <p className="text-sm font-bold text-slate-700">Zero Unpaid Students Found</p>
                <p className="text-xs text-slate-400">All registered students for this date are fully paid or absent.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-black text-[10px]">
                      <th className="py-3 px-4">Admission No.</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Unpaid Fee Type</th>
                      <th className="py-3 px-4">Guardian / Parent Contact</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {defaulters.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-600">{d.admissionNumber}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{d.name}</td>
                        <td className="py-3 px-4 text-slate-700">{d.className}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                            {d.unpaidFeeding && d.unpaidBus
                              ? 'Feeding & Bus Fare'
                              : d.unpaidFeeding
                              ? 'Feeding Only'
                              : 'Bus Fare Only'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {d.guardianPhone ? (
                            <span className="font-semibold">{d.guardianPhone}</span>
                          ) : (
                            <span className="text-slate-400 italic">No phone on file</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => {
                              setSmsTargetStudents([d]);
                              setCustomSmsMessage('');
                              setSmsFeedback(null);
                              setSmsModalOpen(true);
                            }}
                            disabled={!d.guardianPhone}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors flex items-center gap-1 mx-auto cursor-pointer ${
                              d.guardianPhone
                                ? 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 border-slate-200'
                                : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                            }`}
                          >
                            <Send size={11} />
                            Send SMS
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: REPORTS & ANALYTICS ─────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">End Date</label>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => refetchReports()}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Generate Report
              </button>
            </div>

            {reportsLoading ? (
              <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="animate-spin text-emerald-600 h-8 w-8" />
                <span className="text-xs font-bold text-slate-400">Aggregating collection reports...</span>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Aggregate Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center">
                    <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">Total Confirmed Revenue</span>
                    <span className="text-2xl font-black text-emerald-900 mt-1 block">
                      {GHS(reportsData?.totals?.grandTotal || 0)}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Total Feeding Fees</span>
                    <span className="text-2xl font-black text-slate-800 mt-1 block">
                      {GHS(reportsData?.totals?.feedingTotal || 0)}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Total Bus Fare</span>
                    <span className="text-2xl font-black text-slate-800 mt-1 block">
                      {GHS(reportsData?.totals?.busFareTotal || 0)}
                    </span>
                  </div>
                </div>

                {/* Class by Class Breakdown */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-black text-[10px]">
                        <th className="py-3 px-4">Class</th>
                        <th className="py-3 px-4 text-center">Registers Submitted</th>
                        <th className="py-3 px-4 text-right">Feeding Total</th>
                        <th className="py-3 px-4 text-right">Bus Total</th>
                        <th className="py-3 px-4 text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(reportsData?.byClass || []).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{row.className || 'Unknown'}</td>
                          <td className="py-3 px-4 text-center text-slate-700 font-semibold">{row.submissionCount || 0}</td>
                          <td className="py-3 px-4 text-right text-slate-700 font-bold">{GHS(row.feedingTotal)}</td>
                          <td className="py-3 px-4 text-right text-slate-700 font-bold">{GHS(row.busFareTotal)}</td>
                          <td className="py-3 px-4 text-right font-black text-emerald-800 text-sm">{GHS(row.grandTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: DAILY FEE RATE SETTINGS ─────────────────────────────── */}
        {activeTab === 'rates' && (
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Configure Active Daily Fee Rates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                    Feeding Fee Rate (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={settingsFeeding}
                    onChange={(e) => setSettingsFeeding(e.target.value)}
                    placeholder="e.g. 4.00"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                    Bus Fare Rate (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={settingsBus}
                    onChange={(e) => setSettingsBus(e.target.value)}
                    placeholder="e.g. 5.00"
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">
                    Effective Start Date
                  </label>
                  <input
                    type="date"
                    value={settingsStartDate}
                    onChange={(e) => setSettingsStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleCreateRate}
                    disabled={rateMutation.isPending}
                    className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {rateMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                    Save Daily Rates
                  </button>
                </div>
              </div>
            </div>

            {/* Rate History Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-black text-[10px]">
                    <th className="py-3 px-4">Effective Date</th>
                    <th className="py-3 px-4">Class / Level Scope</th>
                    <th className="py-3 px-4 text-right">Daily Feeding Fee</th>
                    <th className="py-3 px-4 text-right">Daily Bus Fare</th>
                    <th className="py-3 px-4">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ratesHistory.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {new Date(r.effectiveStartDate).toLocaleDateString('en-GH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.class?.name || (r.level ? `Level: ${r.level}` : 'School-Wide (All Classes)')}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-800">{GHS(r.feedingFeeAmount)}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-800">{GHS(r.busFareAmount)}</td>
                      <td className="py-3 px-4 text-slate-500">{r.createdBy?.email || 'Admin'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── READ-ONLY SUBMISSION INSPECTION MODAL ───────────────────────── */}
      {selectedSubId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Read-Only Inspection Ledger
                </span>
                <h3 className="text-base font-black text-slate-900">
                  {detailedSubmission?.submission?.class?.name || 'Class'} Daily Collection Ledger
                </h3>
              </div>
              <button
                onClick={handleCloseDetailModal}
                className="h-8 w-8 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {detailedLoading ? (
                <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="animate-spin text-emerald-600 h-8 w-8" />
                  <span className="text-xs font-bold text-slate-400">Loading student entries...</span>
                </div>
              ) : detailedSubmission ? (
                <>
                  {/* Status Strip */}
                  <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Submission Status</span>
                      <div className="mt-0.5">
                        {(() => {
                          const badge = getStatusBadge(detailedSubmission.submission.status);
                          const Icon = badge.icon;
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase border ${badge.className}`}
                            >
                              <Icon size={13} />
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Submitting Teacher</span>
                      <span className="font-bold text-slate-800">
                        {detailedSubmission.submission.submittingTeacher?.email || 'Teacher'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Date of Register</span>
                      <span className="font-bold text-slate-800">
                        {new Date(detailedSubmission.submission.date).toLocaleDateString('en-GH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Total Feeding</span>
                      <span className="text-sm font-black text-slate-800">
                        {GHS(detailedSubmission.reconciledTotals.feedingTotal)}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl">
                      <span className="text-[9px] font-black uppercase text-slate-400 block">Total Bus Fare</span>
                      <span className="text-sm font-black text-slate-800">
                        {GHS(detailedSubmission.reconciledTotals.busFareTotal)}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                      <span className="text-[9px] font-black uppercase text-emerald-700 block">Total Expected Cash</span>
                      <span className="text-sm font-black text-emerald-900">
                        {GHS(detailedSubmission.reconciledTotals.grandTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Accountant Verification Details */}
                  {(detailedSubmission.submission.status === 'confirmed' ||
                    detailedSubmission.submission.status === 'discrepancy_flagged' ||
                    detailedSubmission.submission.status === 'resolved') && (
                    <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200 space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                        Accountant Cash Verification Details
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500">Verified By:</span>{' '}
                          <span className="font-bold text-slate-800">
                            {detailedSubmission.submission.confirmedBy?.email || 'Accountant Desk'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Actually Counted Cash:</span>{' '}
                          <span className="font-black text-slate-900">
                            {GHS(detailedSubmission.submission.actuallyCountedAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Verification Timestamp:</span>{' '}
                          <span className="font-bold text-slate-800">
                            {detailedSubmission.submission.confirmedAt
                              ? new Date(detailedSubmission.submission.confirmedAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </span>
                        </div>
                      </div>

                      {detailedSubmission.submission.discrepancyNotes && (
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-rose-700 font-bold block">Discrepancy Note:</span>
                          <p className="text-slate-700 text-xs mt-0.5">
                            {detailedSubmission.submission.discrepancyNotes}
                          </p>
                        </div>
                      )}

                      {detailedSubmission.submission.resolutionNotes && (
                        <div className="pt-2 border-t border-slate-200">
                          <span className="text-blue-700 font-bold block">Resolution Note:</span>
                          <p className="text-slate-700 text-xs mt-0.5">
                            {detailedSubmission.submission.resolutionNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Student-by-Student Ledger */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Student Breakdown ({detailedSubmission.reconciledLineItems.length} Students)
                    </span>
                    <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-64 overflow-y-auto bg-slate-50/30">
                      {detailedSubmission.reconciledLineItems.map((item) => (
                        <div key={item.studentId} className="p-3 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 block truncate">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{item.admissionNumber}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                item.feedingStatus === 'paid'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : item.feedingStatus === 'absent'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              Feed: {item.feedingStatus}
                            </span>
                            {item.usesBus && (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                  item.busStatus === 'paid'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : item.busStatus === 'absent'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}
                              >
                                Bus: {item.busStatus}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                onClick={handleCloseDetailModal}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SMS DISPATCH MODAL ──────────────────────────────────────────── */}
      {smsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 uppercase">Send Fee Reminder SMS</h3>
              <button
                onClick={() => setSmsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Dispatching SMS alerts to <strong>{smsTargetStudents.length}</strong> recipient(s).
            </p>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Custom Message (Optional)
              </label>
              <textarea
                rows="3"
                value={customSmsMessage}
                onChange={(e) => setCustomSmsMessage(e.target.value)}
                placeholder="Leave blank to send standard automated fee reminder notification..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {smsFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-bold ${
                  smsFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}
              >
                {smsFeedback.message}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSmsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDispatchSms}
                disabled={sendSmsMutation.isPending}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {sendSmsMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                Send SMS Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDailyFeeOverview;
