import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  DollarSign, Bus, Award, AlertCircle, Calendar, Filter, Loader2, 
  ArrowRight, Check, ShieldAlert, RefreshCw, ChevronRight, HelpCircle,
  BarChart2, Settings, ListCollapse, BookOpen, Clock, FileText, Send,
  UserX, Users, ExternalLink, UserCheck, MessageSquare, X
} from 'lucide-react';
import { subscribeToEvent, unsubscribeFromEvent, getSocket } from '../../services/socket';

const DailyCollectionsTab = () => {
  const { user } = useAuth();
  const isAdmin = ['superadmin', 'admin', 'system_admin'].includes(user?.role);
  
  const [activeSubTab, setActiveTab] = useState('queue'); // 'queue', 'defaulters', 'reports', 'settings'
  
  // Queue Filters
  const [queueDate, setQueueDate] = useState(new Date().toISOString().split('T')[0]);
  const [queueClass, setQueueDateClass] = useState('');
  const [queueStatus, setQueueStatus] = useState('');

  // Defaulters / Unpaid Students Filters
  const [defaulterDate, setDefaulterDate] = useState(new Date().toISOString().split('T')[0]);
  const [defaulterClass, setDefaulterClass] = useState('');

  // SMS Modal State
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsTargetStudents, setSmsTargetStudents] = useState([]);
  const [customSmsMessage, setCustomSmsMessage] = useState('');
  const [smsFeedback, setSmsFeedback] = useState(null);

  // ─── Query Unpaid Defaulters List ─────────────────────────────────────────
  const { data: defaultersList = [], isLoading: defaultersLoading, refetch: refetchDefaulters } = useQuery({
    queryKey: ['dailyDefaultersList', defaulterDate, defaulterClass],
    queryFn: async () => {
      const params = {};
      if (defaulterDate) params.date = defaulterDate;
      if (defaulterClass) params.classId = defaulterClass;
      const res = await api.get('/fees/daily-register/unpaid', { params });
      return res.data?.data || [];
    },
    enabled: activeSubTab === 'defaulters',
  });

  // ─── SMS Defaulters Mutation ──────────────────────────────────────────────
  const sendSmsMutation = useMutation({
    mutationFn: async (payload) => {
      return await api.post('/fees/daily-register/unpaid/send-sms', payload);
    },
    onSuccess: (res) => {
      const data = res.data?.data || {};
      setSmsFeedback({
        type: 'success',
        message: `✓ ${data.sentCount || 0} SMS Alerts Sent Successfully (${data.failedCount || 0} failed / no phone).`,
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

  const handleOpenSingleSms = (student) => {
    setSmsTargetStudents([student]);
    setCustomSmsMessage('');
    setSmsFeedback(null);
    setSmsModalOpen(true);
  };

  const handleOpenBulkSms = () => {
    if (defaultersList.length === 0) return;
    setSmsTargetStudents(defaultersList);
    setCustomSmsMessage('');
    setSmsFeedback(null);
    setSmsModalOpen(true);
  };

  const handleDispatchSms = () => {
    if (smsTargetStudents.length === 0) return;
    const studentIds = smsTargetStudents.map((s) => s.studentId);
    sendSmsMutation.mutate({
      studentIds,
      customMessage: customSmsMessage.trim() || undefined,
      date: defaulterDate,
    });
  };

  // Submissions State (initialized from REST, updated by Socket.io)
  const [submissions, setSubmissions] = useState([]);

  // Selected submission in detail panel
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [detailedSubmission, setDetailedSubmission] = useState(null);
  const [detailedLoading, setDetailedLoading] = useState(false);

  // Cash Counting state
  const [countedAmount, setCountedAmount] = useState('');
  const [discrepancyNotes, setDiscrepancyNotes] = useState('');

  // ─── 1. Query Classes List ──────────────────────────────────────────────────
  const { data: classes } = useQuery({
    queryKey: ['classesListCollectionsTab'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // ─── 2. Query Submissions Queue (REST) ──────────────────────────────────────
  const { data: restSubmissions, isLoading: queueLoading, refetch: refetchQueue } = useQuery({
    queryKey: ['dailySubmissionsList', queueDate, queueClass, queueStatus],
    queryFn: async () => {
      const params = {};
      if (queueDate) params.date = queueDate;
      if (queueClass) params.classId = queueClass;
      if (queueStatus) params.status = queueStatus;

      const res = await api.get('/fees/daily-register/submissions', { params });
      return res.data?.data || [];
    },
  });

  // Update submissions in state from query data
  useEffect(() => {
    if (restSubmissions) {
      setSubmissions(restSubmissions);
    }
  }, [restSubmissions]);

  // ─── 3. Socket.io Real-time Event Subscriptions ──────────────────────────────
  useEffect(() => {
    // 3a. New submission received
    const handleNewSubmission = (submission) => {
      // Alert with subtle sound or visual banner if needed
      setSubmissions((prev) => {
        // Prevent duplicate appending
        if (prev.some((s) => s._id === submission._id)) return prev;
        return [submission, ...prev];
      });
    };

    // 3b. Status changed (confirmed, discrepancy)
    const handleStatusChanged = (payload) => {
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub._id === payload.submissionId
            ? { 
                ...sub, 
                status: payload.status, 
                actuallyCountedAmount: payload.actuallyCountedAmount,
                discrepancyNotes: payload.discrepancyNotes 
              }
            : sub
        )
      );

      // Refresh detailed view if currently opened
      if (selectedSubId === payload.submissionId) {
        fetchDetailedSubmission(payload.submissionId);
      }
    };

    // 3c. Correction appended
    const handleNewCorrection = (payload) => {
      // Refresh detailed view if currently opened
      if (selectedSubId === payload.submissionId) {
        fetchDetailedSubmission(payload.submissionId);
      }
      
      // Update totals in queue
      setSubmissions((prev) =>
        prev.map((sub) =>
          sub._id === payload.submissionId
            ? { ...sub, totals: payload.reconciledTotals || sub.totals }
            : sub
        )
      );
    };

    // Connect and subscribe
    subscribeToEvent('newSubmission', handleNewSubmission);
    subscribeToEvent('submissionStatusChanged', handleStatusChanged);
    subscribeToEvent('newCorrection', handleNewCorrection);

    // Automatic reconnect synchronization resync
    const socket = getSocket();
    const handleReconnect = () => {
      console.log('Socket reconnected! Re-syncing queue data...');
      refetchQueue();
      if (selectedSubId) {
        fetchDetailedSubmission(selectedSubId);
      }
    };
    socket?.on('reconnect', handleReconnect);

    return () => {
      unsubscribeFromEvent('newSubmission', handleNewSubmission);
      unsubscribeFromEvent('submissionStatusChanged', handleStatusChanged);
      unsubscribeFromEvent('newCorrection', handleNewCorrection);
      socket?.off('reconnect', handleReconnect);
    };
  }, [selectedSubId, refetchQueue]);

  // ─── 4. Fetch Selected Submission Details ──────────────────────────────────
  const fetchDetailedSubmission = async (subId) => {
    setDetailedLoading(true);
    try {
      const res = await api.get(`/fees/daily-register/submissions/${subId}`);
      if (res.data?.success) {
        setDetailedSubmission(res.data);
        // Pre-fill counting amount with system expected totals for ease of confirmation
        setCountedAmount(res.data.reconciledTotals.grandTotal.toString());
        setDiscrepancyNotes('');
      }
    } catch (err) {
      console.error('Failed to load submission details', err);
    } finally {
      setDetailedLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSubId) {
      fetchDetailedSubmission(selectedSubId);
    } else {
      setDetailedSubmission(null);
    }
  }, [selectedSubId]);

  // ─── 5. Accountant Cash Reconciliation Actions ──────────────────────────────
  const reconciliationMutation = useMutation({
    mutationFn: async ({ subId, payload }) => {
      return await api.post(`/fees/daily-register/submissions/${subId}/confirm`, payload);
    },
    onSuccess: () => {
      refetchQueue();
      if (selectedSubId) fetchDetailedSubmission(selectedSubId);
      alert('✓ Submission reconciled and processed successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to complete reconciliation.');
    },
  });

  const handleReconcile = (actionType) => {
    if (!selectedSubId || !detailedSubmission) return;

    const parsedCounted = parseFloat(countedAmount);
    if (isNaN(parsedCounted) || parsedCounted < 0) {
      alert('Please enter a valid cash amount counted.');
      return;
    }

    if (actionType === 'flag' && (!discrepancyNotes || discrepancyNotes.trim().length === 0)) {
      alert('You must provide detailed discrepancy explanation notes when flagging a mismatch.');
      return;
    }

    const payload = {
      actuallyCountedAmount: parsedCounted,
      action: actionType,
      discrepancyNotes: discrepancyNotes.trim(),
    };

    reconciliationMutation.mutate({ subId: selectedSubId, payload });
  };

  // ─── 6. Resolve Discrepancy Action ──────────────────────────────────────────
  const resolveMutation = useMutation({
    mutationFn: async ({ subId, payload }) => {
      return await api.post(`/fees/daily-register/submissions/${subId}/resolve`, payload);
    },
    onSuccess: () => {
      refetchQueue();
      if (selectedSubId) fetchDetailedSubmission(selectedSubId);
      alert('✓ Discrepancy resolved successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Resolution failed.');
    },
  });

  const handleResolveDiscrepancy = () => {
    if (!selectedSubId) return;
    const note = prompt('Please describe how this discrepancy was resolved (e.g., "Teacher walked in extra 10 GHS cash that was forgotten in drawer"):');
    if (!note || note.trim().length < 5) {
      alert('Resolution notes are required (at least 5 characters).');
      return;
    }

    const parsedCounted = parseFloat(countedAmount);
    const payload = {
      actuallyCountedAmount: isNaN(parsedCounted) ? detailedSubmission.reconciledTotals.grandTotal : parsedCounted,
      resolutionNotes: note.trim(),
    };

    resolveMutation.mutate({ subId: selectedSubId, payload });
  };

  // ─── 7. Reports Sub-tab Hook ────────────────────────────────────────────────
  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 14)).toISOString().split('T')[0] // Last 14 days
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['dailyCollectionsReports', reportStartDate, reportEndDate],
    queryFn: async () => {
      const res = await api.get('/fees/daily-register/reports', {
        params: { startDate: reportStartDate, endDate: reportEndDate },
      });
      return res.data?.data;
    },
    enabled: activeSubTab === 'reports',
  });

  // ─── 8. Admin Settings / Daily Rates Sub-tab Hook ───────────────────────────
  const [settingsFeeding, setSettingsFeeding] = useState('');
  const [settingsBus, setSettingsBus] = useState('');
  const [settingsClass, setSettingsClass] = useState('');
  const [settingsLevel, setSettingsLevel] = useState('');
  const [settingsStartDate, setSettingsStartDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: ratesHistory, isLoading: ratesLoading, refetch: refetchRates } = useQuery({
    queryKey: ['dailyFeeRatesHistory'],
    queryFn: async () => {
      const res = await api.get('/fees/daily-register/structures');
      return res.data?.data || [];
    },
    enabled: activeSubTab === 'settings',
  });

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
      alert('✓ New daily fee structure rate registered and activated successfully.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to save daily fee rates.');
    },
  });

  const handleCreateRate = () => {
    const feed = parseFloat(settingsFeeding);
    const bus = parseFloat(settingsBus);

    if (isNaN(feed) || feed < 0 || isNaN(bus) || bus < 0) {
      alert('Please provide valid positive numbers for feeding fee and transport fare.');
      return;
    }

    const payload = {
      feedingFeeAmount: feed,
      busFareAmount: bus,
      class: settingsClass || null,
      level: settingsLevel || null,
      effectiveStartDate: new Date(settingsStartDate).toISOString(),
    };

    rateMutation.mutate(payload);
  };

  // Status utility styles
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'discrepancy_flagged':
        return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
      case 'resolved':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-800">Daily Collections Monitoring &amp; Audit</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor class-by-class feeding &amp; bus collections, audit cash reconciliation, and view unpaid students.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/fees/daily-register"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <UserCheck size={14} /> Open Daily Class Register
          </Link>
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'queue'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <Clock size={16} /> Submissions &amp; Class Collections
        </button>
        <button
          onClick={() => setActiveTab('defaulters')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'defaulters'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <AlertCircle size={16} /> Unpaid Students (Defaulters)
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'reports'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <BarChart2 size={16} /> Collection Reports
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'settings'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <Settings size={16} /> Daily Fee Settings
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* SUB-TAB 1: SUBMISSIONS QUEUE                                           */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'queue' && (
        <div className="space-y-6">
          {/* Controls Queue filters */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Date</label>
              <input
                type="date"
                value={queueDate}
                onChange={(e) => setQueueDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Class</label>
              <select
                value={queueClass}
                onChange={(e) => setQueueDateClass(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
              >
                <option value="">All Classes</option>
                {classes?.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Status</label>
              <select
                value={queueStatus}
                onChange={(e) => setQueueStatus(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending Confirmation</option>
                <option value="confirmed">Confirmed</option>
                <option value="discrepancy_flagged">Discrepancies</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
            
            <button
              onClick={() => { setQueueDate(''); setQueueDateClass(''); setQueueStatus(''); }}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 py-2.5 px-3 transition-colors"
            >
              Clear Filters
            </button>
          </div>

          {/* Submissions Layout split grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left Hand: Queue List */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Pending &amp; Confirmed Collections</span>
                <span className="text-[10px] bg-slate-100 font-bold border rounded-lg px-2 py-0.5 text-slate-500">Live Updating</span>
              </div>

              {queueLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="animate-spin text-emerald-600 h-6 w-6" />
                  <span className="text-xs font-semibold text-slate-400">Loading daily collection sheets...</span>
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-16 text-slate-400 italic text-sm">
                  No submissions match the current filter parameters.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {submissions.map((sub) => {
                    const isSelected = selectedSubId === sub._id;
                    return (
                      <div
                        key={sub._id}
                        onClick={() => setSelectedSubId(sub._id)}
                        className={`p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/40 transition-colors ${
                          isSelected ? 'bg-slate-50/60 border-l-4 border-l-emerald-600 pl-3' : ''
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-sm">{sub.class?.name || 'Unknown Class'}</span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {new Date(sub.date).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <span>Submitting Teacher:</span>
                            <span className="font-semibold text-slate-600 truncate">{sub.submittingTeacher?.email}</span>
                          </div>
                        </div>

                        {/* Status Badge & Amounts */}
                        <div className="flex items-center gap-4 shrink-0 text-right">
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block font-sans">
                              {(sub.totals?.grandTotal || 0).toFixed(2)} GHS
                            </span>
                            <span className="text-[9px] text-slate-400 block font-bold">Expected Total</span>
                          </div>
                          <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide border ${getStatusColor(sub.status)}`}>
                            {sub.status === 'discrepancy_flagged' ? 'FLAGGED' : sub.status === 'confirmed' ? 'CONFIRMED' : sub.status === 'resolved' ? 'RESOLVED' : 'PENDING'}
                          </div>
                          <ChevronRight size={16} className="text-slate-300" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Hand: Detailed Reconciliation & Counting View */}
            <div className="space-y-4">
              {detailedLoading ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-2 shadow-sm">
                  <Loader2 className="animate-spin text-emerald-600" />
                  <span className="text-xs font-bold text-slate-400">Loading collection details...</span>
                </div>
              ) : detailedSubmission ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 animate-fade-in">
                  
                  {/* Detailed Header */}
                  <div className="pb-3 border-b border-slate-100 flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Reconciliation Desk</h3>
                      <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                        {detailedSubmission.submission.class?.name} Collection Form
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedSubId(null)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      Close
                    </button>
                  </div>

                  {/* Submission Expected Summary Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[8px] text-slate-400 font-bold uppercase block">Feeding</span>
                      <span className="text-xs font-black text-slate-800">{detailedSubmission.reconciledTotals.feedingTotal.toFixed(2)} GHS</span>
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                      <span className="text-[8px] text-slate-400 font-bold uppercase block">Bus Fare</span>
                      <span className="text-xs font-black text-slate-800">{detailedSubmission.reconciledTotals.busFareTotal.toFixed(2)} GHS</span>
                    </div>
                    <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <span className="text-[8px] text-emerald-500 font-bold uppercase block">Expected Cash</span>
                      <span className="text-xs font-black text-emerald-900">{detailedSubmission.reconciledTotals.grandTotal.toFixed(2)} GHS</span>
                    </div>
                  </div>

                  {/* Student Line Items List */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Student Statuses Ledger</span>
                    <div className="border border-slate-150 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto bg-slate-50/20">
                      {detailedSubmission.reconciledLineItems.map((item) => (
                        <div key={item.studentId} className="p-2 flex items-center justify-between text-xs gap-3">
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 block truncate">{item.name}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{item.admissionNumber}</span>
                          </div>
                          <div className="flex gap-1">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${
                              item.feedingStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              Feed: {item.feedingStatus}
                            </span>
                            {item.usesBus && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide border ${
                                item.busStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                Bus: {item.busStatus}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accountant Cash Counting reconciliation form */}
                  {detailedSubmission.submission.status === 'pending' && (
                    <div className="space-y-4 pt-3 border-t border-slate-100">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          Counted Physical Cash (In Hand)
                        </label>
                        <div className="relative rounded-xl shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <span className="text-slate-400 font-extrabold text-sm">GHS</span>
                          </div>
                          <input
                            type="number"
                            step="0.5"
                            value={countedAmount}
                            onChange={(e) => setCountedAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-12 pr-4 py-2 text-sm font-black text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                        
                        {/* Live Comparison Meter */}
                        {countedAmount && (
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-400">Difference:</span>
                            {Math.abs(parseFloat(countedAmount) - detailedSubmission.reconciledTotals.grandTotal) < 0.01 ? (
                              <span className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                Perfect Match (Ready to Confirm)
                              </span>
                            ) : (
                              <span className="text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded border border-rose-100 animate-pulse">
                                Mismatch: {(parseFloat(countedAmount) - detailedSubmission.reconciledTotals.grandTotal).toFixed(2)} GHS
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* If mismatch, notes are mandatory */}
                      {countedAmount && Math.abs(parseFloat(countedAmount) - detailedSubmission.reconciledTotals.grandTotal) >= 0.01 && (
                        <div className="space-y-1.5 animate-fade-in">
                          <label className="block text-[10px] font-black uppercase text-rose-700 tracking-wider">
                            Discrepancy Explanation Notes
                          </label>
                          <textarea
                            rows="2.5"
                            value={discrepancyNotes}
                            onChange={(e) => setDiscrepancyNotes(e.target.value)}
                            placeholder="e.g. Teacher had 5 GHS missing. Will reconcile tomorrow morning."
                            className="w-full px-3 py-2 text-xs border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-rose-50/10 text-rose-900"
                          />
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="flex gap-2">
                        {Math.abs((parseFloat(countedAmount) || 0) - detailedSubmission.reconciledTotals.grandTotal) < 0.01 ? (
                          <button
                            type="button"
                            onClick={() => handleReconcile('confirm')}
                            disabled={reconciliationMutation.isPending}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-850 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {reconciliationMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                            Confirm &amp; Settle Cash
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleReconcile('flag')}
                            disabled={reconciliationMutation.isPending}
                            className="w-full py-2.5 bg-rose-600 hover:bg-rose-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                          >
                            {reconciliationMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                            Flag Cash Discrepancy
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Confirmed Details */}
                  {detailedSubmission.submission.status === 'confirmed' && (
                    <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-2">
                        <Check size={14} /> Reconciled &amp; Confirmed Settle
                      </div>
                      <div className="text-slate-500 font-semibold flex justify-between">
                        <span>Confirmed By:</span>
                        <span className="text-slate-800 font-bold">{detailedSubmission.submission.confirmedBy?.email}</span>
                      </div>
                      <div className="text-slate-500 font-semibold flex justify-between">
                        <span>Actually Counted:</span>
                        <span className="text-slate-800 font-bold">{detailedSubmission.submission.actuallyCountedAmount?.toFixed(2)} GHS</span>
                      </div>
                      <div className="text-slate-500 font-semibold flex justify-between">
                        <span>Settled At:</span>
                        <span className="text-slate-800 font-bold">
                          {new Date(detailedSubmission.submission.confirmedAt || detailedSubmission.submission.updatedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Flagged Details with Resolution Option */}
                  {detailedSubmission.submission.status === 'discrepancy_flagged' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl text-xs space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-rose-800">
                          <ShieldAlert size={14} /> Discrepancy Flag Active
                        </div>
                        <div className="text-slate-500 font-semibold flex justify-between">
                          <span>Reported counted cash:</span>
                          <span className="text-slate-800 font-bold">{detailedSubmission.submission.actuallyCountedAmount?.toFixed(2)} GHS</span>
                        </div>
                        <p className="text-[11px] text-rose-900 bg-white/60 p-2 border rounded-lg italic">
                          Notes: "{detailedSubmission.submission.discrepancyNotes}"
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleResolveDiscrepancy}
                        disabled={resolveMutation.isPending}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {resolveMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                        Resolve Discrepancy Settle
                      </button>
                    </div>
                  )}

                  {/* Resolved Details */}
                  {detailedSubmission.submission.status === 'resolved' && (
                    <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl text-xs space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-blue-800">
                        <Check size={14} /> Discrepancy Resolved
                      </div>
                      <p className="text-[11px] text-blue-900 bg-white/60 p-2 border rounded-lg italic font-semibold">
                        {detailedSubmission.submission.discrepancyNotes}
                      </p>
                      <div className="text-slate-500 font-semibold flex justify-between">
                        <span>Settled Counted:</span>
                        <span className="text-slate-800 font-bold">{detailedSubmission.submission.actuallyCountedAmount?.toFixed(2)} GHS</span>
                      </div>
                    </div>
                  )}

                  {/* Detailed Corrections Trail */}
                  {detailedSubmission.corrections && detailedSubmission.corrections.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Corrections History Ledger</span>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {detailedSubmission.corrections.map((corr, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-50 border border-slate-150 rounded-xl space-y-1.5 text-[11px]">
                            <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                              <span>{corr.correctedBy?.email}</span>
                              <span>{new Date(corr.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <span className="font-bold text-slate-800 block">
                              {corr.student?.firstName} {corr.student?.lastName} modified:
                            </span>
                            <div className="flex justify-between bg-white p-1 rounded border border-slate-100 text-[10px]">
                              <span>Feed: {corr.feedingStatus.toUpperCase()} ({corr.feedingAmount} GHS)</span>
                              <span>Bus: {corr.busStatus.toUpperCase()} ({corr.busAmount} GHS)</span>
                            </div>
                            <p className="italic text-slate-500">Reason: "{corr.reason}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400 italic text-xs shadow-inner">
                  Select a submission from the queue to start cash reconciliation and count verification.
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* SUB-TAB 2: UNPAID STUDENTS (DEFAULTERS)                                */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'defaulters' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Filters */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-end justify-between">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Date</label>
                <input
                  type="date"
                  value={defaulterDate}
                  onChange={(e) => setDefaulterDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Class</label>
                <select
                  value={defaulterClass}
                  onChange={(e) => setDefaulterClass(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[140px]"
                >
                  <option value="">All Classes</option>
                  {classes?.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => { setDefaulterDate(new Date().toISOString().split('T')[0]); setDefaulterClass(''); }}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 py-2.5 px-3 transition-colors"
              >
                Reset Date to Today
              </button>
            </div>
            <button
              onClick={() => refetchDefaulters()}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={12} /> Refresh List
            </button>
          </div>

          {/* Defaulters KPI Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Unpaid Students Count</span>
              <div className="text-3xl font-black text-rose-600 mt-1">{defaultersList.length}</div>
              <span className="text-[10px] text-slate-400 font-semibold block mt-1">Students present with unpaid fees</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Outstanding Feeding Unpaid</span>
              <div className="text-3xl font-black text-amber-600 mt-1">
                {defaultersList.reduce((acc, d) => acc + (d.feedingStatus === 'unpaid' ? d.feedingAmount : 0), 0).toFixed(2)} <span className="text-xs text-slate-400">GHS</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block mt-1">Uncollected feeding cash</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs border-l-4 border-l-rose-500">
              <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Outstanding Bus Fee Unpaid</span>
              <div className="text-3xl font-black text-rose-600 mt-1">
                {defaultersList.reduce((acc, d) => acc + (d.busStatus === 'unpaid' ? d.busAmount : 0), 0).toFixed(2)} <span className="text-xs text-slate-400">GHS</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold block mt-1">Uncollected transport fare</span>
            </div>
          </div>

          {/* Defaulters List Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                <UserX size={16} className="text-rose-600" /> Defaulter Roster for {new Date(defaulterDate).toLocaleDateString('en-GH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">
                  {defaultersList.length} Student{defaultersList.length === 1 ? '' : 's'} Listed
                </span>
                {defaultersList.length > 0 && (
                  <button
                    onClick={handleOpenBulkSms}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare size={13} /> Send SMS Alerts to All ({defaultersList.length})
                  </button>
                )}
              </div>
            </div>

            {defaultersLoading ? (
              <div className="p-16 text-center flex flex-col items-center justify-center space-y-2">
                <Loader2 className="animate-spin text-emerald-600 h-6 w-6" />
                <span className="text-xs font-semibold text-slate-400">Scanning attendance &amp; fee registers...</span>
              </div>
            ) : defaultersList.length === 0 ? (
              <div className="p-16 text-center text-slate-400 space-y-2">
                <Check size={32} className="mx-auto text-emerald-500 bg-emerald-50 p-1.5 rounded-full" />
                <p className="font-extrabold text-slate-700 text-sm">No Unpaid Students Recorded!</p>
                <p className="text-xs text-slate-400">All present students for this date have paid their daily feeding and bus fees.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-200">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Feeding Status</th>
                      <th className="py-3 px-4">Bus Fee Status</th>
                      <th className="py-3 px-4 text-right">Outstanding Amount</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {defaultersList.map((d, index) => {
                      const totalOwed = (d.feedingStatus === 'unpaid' ? d.feedingAmount : 0) + (d.busStatus === 'unpaid' ? d.busAmount : 0);
                      return (
                        <tr key={d.studentId || index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                {d.photoUrl ? (
                                  <img src={d.photoUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-xs font-bold text-slate-400">{d.firstName[0]}</span>
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{d.firstName} {d.lastName}</span>
                                <span className="text-[10px] font-semibold text-slate-400 font-mono">Adm: {d.admissionNumber}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-700">{d.className}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              d.feedingStatus === 'unpaid'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : d.feedingStatus === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {d.feedingStatus === 'unpaid' ? `Unpaid (${d.feedingAmount.toFixed(2)} GHS)` : d.feedingStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              !d.usesBus
                                ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                : d.busStatus === 'unpaid'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : d.busStatus === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {!d.usesBus ? 'No Bus' : d.busStatus === 'unpaid' ? `Unpaid (${d.busAmount.toFixed(2)} GHS)` : d.busStatus}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                            {totalOwed.toFixed(2)} GHS
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenSingleSms(d)}
                                title="Send SMS Reminder to Parent"
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                              >
                                <MessageSquare size={11} /> Send SMS
                              </button>
                              <Link
                                to={`/students/${d.studentId}`}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-lg transition-colors"
                              >
                                <ExternalLink size={11} />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* SUB-TAB 3: ANALYTICS REPORTS                                            */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6 animate-fade-in">
          {/* Controls Range filters */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">Start Date</label>
              <input
                type="date"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 tracking-wider">End Date</label>
              <input
                type="date"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none"
              />
            </div>
            
            <button
              onClick={() => refetchReports()}
              className="py-2.5 px-4 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-slate-855 transition-colors"
            >
              Regenerate Analysis
            </button>
          </div>

          {reportsLoading ? (
            <div className="p-16 text-center flex flex-col items-center justify-center space-y-2">
              <Loader2 className="animate-spin text-emerald-600" />
              <span className="text-sm font-semibold text-slate-400">Loading daily collection analytics...</span>
            </div>
          ) : reportsData ? (
            <div className="space-y-6">
              
              {/* Reports Dashboard overview cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Visual card 1: total settled range */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">Range Collections Settled</span>
                  <div className="flex items-baseline gap-1.5 text-slate-900 pb-2 border-b border-slate-100">
                    <span className="text-3xl font-black">{reportsData.totals?.grandTotal?.toFixed(2)}</span>
                    <span className="text-xs font-bold text-slate-400">GHS</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold">
                    Confirms physical cash securely deposited for date range.
                  </div>
                </div>

                {/* Visual card 2: feeding settled */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">Feeding settled cash</span>
                  <div className="flex items-baseline gap-1.5 text-slate-900 pb-2 border-b border-slate-100">
                    <span className="text-3xl font-black text-emerald-700">{reportsData.totals?.feedingTotal?.toFixed(2)}</span>
                    <span className="text-xs font-bold text-slate-400">GHS</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold">
                    Reconciled feeding funds.
                  </div>
                </div>

                {/* Visual card 3: bus fare settled */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">Bus Fare settled cash</span>
                  <div className="flex items-baseline gap-1.5 text-slate-900 pb-2 border-b border-slate-100">
                    <span className="text-3xl font-black text-emerald-700">{reportsData.totals?.busFareTotal?.toFixed(2)}</span>
                    <span className="text-xs font-bold text-slate-400">GHS</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold">
                    Reconciled transport funds.
                  </div>
                </div>

                {/* Visual card 4: running term progress */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 border-l-4 border-l-emerald-600">
                  <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider block">Running Term-to-Date Collections</span>
                  <div className="flex items-baseline gap-1.5 text-slate-900 pb-1">
                    <span className="text-3xl font-black text-slate-900">{(reportsData.termToDate?.grandTotal || 0).toFixed(2)}</span>
                    <span className="text-xs font-bold text-slate-400">GHS</span>
                  </div>
                  <p className="text-[10px] font-semibold text-emerald-700">
                    Accumulated across {reportsData.termToDate?.count || 0} registers.
                  </p>
                </div>

              </div>

              {/* Graphical breakdowns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Day-by-Day collections summary list */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Daily collections trail summary</h3>
                  <div className="border border-slate-150 rounded-xl overflow-hidden">
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {reportsData.dailySummary && reportsData.dailySummary.length > 0 ? (
                        reportsData.dailySummary.map((day) => (
                          <div key={day.date} className="p-3 hover:bg-slate-50/20 flex items-center justify-between text-xs">
                            <span className="font-extrabold text-slate-800">
                              {new Date(day.date).toLocaleDateString('en-GH', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <div className="flex items-center gap-4 text-right">
                              <span className="text-slate-400 font-semibold">Feed: {day.feeding.toFixed(2)} GHS | Bus: {day.bus.toFixed(2)} GHS</span>
                              <span className="font-black text-emerald-800">{day.total.toFixed(2)} GHS</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="p-8 text-center text-slate-400 italic">No collections recorded in date range.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Class-by-Class aggregate summary table */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Class performance aggregate leaderboard</h3>
                  <div className="border border-slate-150 rounded-xl overflow-hidden">
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {reportsData.classSummaries && reportsData.classSummaries.length > 0 ? (
                        reportsData.classSummaries.map((cls) => (
                          <div key={cls.className} className="p-3 hover:bg-slate-50/20 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-extrabold text-slate-900 text-sm block">{cls.className}</span>
                              <span className="text-[10px] text-slate-400 font-bold">Registers Confirmed: {cls.submissionsCount}</span>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <span className="text-slate-400 font-semibold">Feed: {cls.feeding.toFixed(2)} | Bus: {cls.bus.toFixed(2)}</span>
                              <span className="font-black text-emerald-800">{cls.total.toFixed(2)} GHS</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="p-8 text-center text-slate-400 italic">No class submissions reconciled.</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <p className="p-4 text-slate-400 italic text-sm text-center">Click regenerate to populate reports.</p>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* SUB-TAB 3: ADMINISTRATIVE CONFIGURATION                                 */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Create fee rates structure form (Admin restricted write) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-tight">Configure daily fee structures</h3>
              <p className="text-xs text-slate-400 font-semibold">
                Set dynamic rates for daily feeding fee and transport bus fare. You can target specific classes, grade levels, or establish global school defaults.
              </p>

              {/* Feed Amount input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Daily Feeding Rate Amount</label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold text-xs">GHS</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 4.00"
                    value={settingsFeeding}
                    onChange={(e) => setSettingsFeeding(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full pl-12 pr-4 py-2 text-sm font-bold text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Bus Amount input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Daily Bus Fare Rate Amount</label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold text-xs">GHS</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 5.00"
                    value={settingsBus}
                    onChange={(e) => setSettingsBus(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full pl-12 pr-4 py-2 text-sm font-bold text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Scope selectors */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Scope Target</label>
                <select
                  value={settingsClass}
                  onChange={(e) => { setSettingsClass(e.target.value); setSettingsLevel(''); }}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white disabled:bg-slate-50 font-bold text-slate-700"
                >
                  <option value="">Global School Default (No specific class)</option>
                  {classes?.map((c) => (
                    <option key={c._id} value={c._id}>Class Specific: {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Effective Start Date input */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Effective Activation Start Date</label>
                <input
                  type="date"
                  value={settingsStartDate}
                  onChange={(e) => setSettingsStartDate(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none disabled:bg-slate-50 font-bold text-slate-700"
                />
              </div>

              {isAdmin ? (
                <button
                  type="button"
                  onClick={handleCreateRate}
                  disabled={rateMutation.isPending}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-850 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {rateMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                  Register &amp; Activate Rates
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold flex items-center gap-1.5">
                  <ShieldAlert size={14} className="shrink-0" />
                  <span>Access Denied: Only administrators can adjust dynamic fee structures.</span>
                </div>
              )}
            </div>

            {/* Rates Listing History */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Historical configuration registry</span>
                <button
                  onClick={() => refetchRates()}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors"
                  title="Refresh listing"
                >
                  <RefreshCw size={12} />
                </button>
              </div>

              {ratesLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
                  <Loader2 className="animate-spin text-emerald-600 h-6 w-6" />
                  <span className="text-xs font-semibold text-slate-400">Loading configurations...</span>
                </div>
              ) : ratesHistory.length === 0 ? (
                <div className="p-16 text-center text-slate-400 italic text-xs font-semibold">
                  No fee rate configurations found in registry.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                        <th className="py-3 px-4 font-bold">Scope</th>
                        <th className="py-3 px-4 font-bold">Feeding Fee</th>
                        <th className="py-3 px-4 font-bold">Bus Fare</th>
                        <th className="py-3 px-4 font-bold">Effective Date</th>
                        <th className="py-3 px-4 font-bold">Configured By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ratesHistory.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/20">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {item.class?.name ? (
                              <span className="inline-flex px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] border border-blue-100 font-extrabold">
                                Class: {item.class.name}
                              </span>
                            ) : item.level?.name ? (
                              <span className="inline-flex px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 text-[10px] border border-purple-100 font-extrabold">
                                Grade: {item.level.name}
                              </span>
                            ) : (
                              <span className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] border border-slate-200 font-black">
                                School Default
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-extrabold text-slate-900 font-sans">{item.feedingFeeAmount.toFixed(2)} GHS</td>
                          <td className="py-3 px-4 font-extrabold text-slate-900 font-sans">{item.busFareAmount.toFixed(2)} GHS</td>
                          <td className="py-3 px-4 font-semibold text-slate-500">
                            {new Date(item.effectiveStartDate).toLocaleDateString('en-GH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-semibold">{item.lastUpdatedBy?.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
          
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* SMS ALERT DISPATCH MODAL                                                */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {smsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-up border border-slate-100 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-800">
                <MessageSquare className="text-rose-600" size={20} />
                <h3 className="font-extrabold text-base">Send SMS Fee Reminder</h3>
              </div>
              <button
                onClick={() => setSmsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {smsFeedback && (
              <div className={`p-3.5 rounded-xl text-xs font-bold ${
                smsFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {smsFeedback.message}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider block">Recipients</span>
                <p className="font-bold text-slate-800">
                  {smsTargetStudents.length === 1
                    ? `1 Student: ${smsTargetStudents[0].firstName} ${smsTargetStudents[0].lastName} (${smsTargetStudents[0].className})`
                    : `${smsTargetStudents.length} Unpaid Defaulter Students (Bulk Alert)`}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">
                  Custom SMS Message (Optional)
                </label>
                <textarea
                  rows={4}
                  value={customSmsMessage}
                  onChange={(e) => setCustomSmsMessage(e.target.value)}
                  placeholder={`Default message: Dear {guardianName}, please note that your child {studentName} has an unpaid daily fee balance for ${new Date(defaulterDate).toLocaleDateString('en-GB')}. Kindly ensure payment is made. Thank you - HANARA SCHOOLS`}
                  className="w-full border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Placeholders <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-bold">{`{studentName}`}</code> and <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-bold">{`{guardianName}`}</code> will be automatically replaced per recipient.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSmsModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDispatchSms}
                disabled={sendSmsMutation.isPending}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {sendSmsMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Dispatching SMS...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Send {smsTargetStudents.length} SMS Alert{smsTargetStudents.length === 1 ? '' : 's'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DailyCollectionsTab;
