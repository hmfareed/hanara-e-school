import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useOffline } from '../../context/OfflineContext';
import { subscribeToEvent, unsubscribeFromEvent } from '../../services/socket';
import StaffQrModal from '../attendance/StaffQrModal';
import {
  Fingerprint,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  WifiOff,
  Save,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldCheck,
  History,
  BarChart3,
  RefreshCw,
  MapPin,
  AlertTriangle,
  Settings,
  QrCode,
  Laptop,
  Edit3,
  ExternalLink,
  ShieldAlert,
  Sliders,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function toDateInputValue(d = new Date()) {
  return d.toISOString().split('T')[0];
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
}

const STATUS_CONFIG = {
  present: { label: 'Present', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  late: { label: 'Late', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  absent: { label: 'Absent', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500' },
  on_leave: { label: 'On Leave', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  half_day: { label: 'Half Day', bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200', dot: 'bg-violet-500' },
  not_marked: { label: 'Not Marked', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
};

const SummaryCard = ({ label, value, sub, color }) => {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    rose: 'bg-rose-50 border-rose-100 text-rose-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    slate: 'bg-slate-50 border-slate-100 text-slate-600',
  };
  return (
    <div className={`p-4 rounded-2xl border text-center space-y-1 ${colors[color] || colors.slate}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
      {sub && <p className="text-[11px] font-medium opacity-70">{sub}</p>}
    </div>
  );
};

// ─── MAIN ADMIN STAFF ATTENDANCE PAGE ─────────────────────────────────────────

const StaffAttendancePage = () => {
  const { isOnline } = useOffline();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'history' | 'attempts' | 'overrides' | 'devices' | 'sessions' | 'events' | 'settings'
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all'); // 'all' | 'Zogbeli' | 'Vittin'
  const [message, setMessage] = useState({ text: '', type: '' });

  // Selected staff for QR Modal
  const [selectedStaffForQr, setSelectedStaffForQr] = useState(null);

  // Geofence Settings Form State
  const [geofenceForm, setGeofenceForm] = useState({
    enabled: true,
    radiusMetres: 150,
    maxGpsAccuracyMeters: 50,
    checkInStartTime: '05:40',
    lateAfterTime: '07:45',
    checkInEndTime: '10:00',
    checkOutStartTime: '12:00',
    checkOutEndTime: '20:00',
    requireGpsOnCheckout: true,
    zogbeli: { lat: '', lng: '', radiusMetres: 150, maxGpsAccuracyMeters: 50 },
    vittin: { lat: '', lng: '', radiusMetres: 150, maxGpsAccuracyMeters: 50 },
  });

  // GPS test result state
  const [gpsTestResult, setGpsTestResult] = useState(null); // null | { branch, distance, radius, pass, accuracy }
  const [gpsTestLoading, setGpsTestLoading] = useState(false);

  // Detail modal for a staff row
  const [detailRow, setDetailRow] = useState(null);

  // Override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    staffId: '',
    staffName: '',
    temporaryBranch: 'Vittin',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Manual Correction Modal State
  const [correctionTarget, setCorrectionTarget] = useState(null); // record/staff object
  const [correctionForm, setCorrectionForm] = useState({
    checkInTime: '',
    checkOutTime: '',
    status: 'present',
    reason: '',
  });

  // Device Creation Modal State
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [newDeviceForm, setNewDeviceForm] = useState({
    deviceName: '',
    locationName: 'Main Reception',
    deviceType: 'tablet',
    antiProxyLevel: 'high_security',
    allowedRadiusMetres: 150,
  });
  const [createdDeviceToken, setCreatedDeviceToken] = useState('');

  // Session Creation Form
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [newSessionForm, setNewSessionForm] = useState({
    name: 'Morning Attendance',
    startTime: '05:40',
    endTime: '10:00',
    lateThresholdTime: '07:45',
    sessionType: 'single_daily',
  });

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // ── Socket.io Real-Time Subscriptions ─────────────────────────────────────
  useEffect(() => {
    const handleLiveScan = (payload) => {
      queryClient.invalidateQueries(['staffAdminDaily', selectedDate, branchFilter]);
      queryClient.invalidateQueries(['staffAttendanceEvents']);
      const isCheckOut = payload.eventType === 'CHECK_OUT' || (payload.checkOutTime && !payload.checkInTime);
      const actionText = isCheckOut ? 'checked out' : `checked in (${payload.status || 'present'})`;
      showMsg(`Live Update: ${payload.staffName} ${actionText} at ${payload.branch || 'School'}`, 'success');
    };

    subscribeToEvent('staff_attendance_scanned', handleLiveScan);
    subscribeToEvent('staff_attendance_updated', handleLiveScan);

    return () => {
      unsubscribeFromEvent('staff_attendance_scanned', handleLiveScan);
      unsubscribeFromEvent('staff_attendance_updated', handleLiveScan);
    };
  }, [queryClient, selectedDate, branchFilter]);

  // ── Queries ───────────────────────────────────────────────────────────────

  // Today Overview
  const { data: dailyData, isLoading: dailyLoading, refetch: refetchDaily } = useQuery({
    queryKey: ['staffAdminDaily', selectedDate, branchFilter],
    queryFn: async () => {
      const res = await api.get(`/staff-attendance/admin/daily?date=${selectedDate}&branch=${branchFilter}`);
      return res.data?.data;
    },
    enabled: isOnline,
  });

  // Geofence Settings Query
  const { data: geofenceData, refetch: refetchGeofence } = useQuery({
    queryKey: ['staffGeofenceSettingsAdmin'],
    queryFn: async () => {
      const res = await api.get('/staff-attendance/geofence-settings');
      const val = res.data?.data;
      if (val) {
        setGeofenceForm({
          enabled: val.enabled !== false,
          radiusMetres: val.radiusMetres || 150,
          maxGpsAccuracyMeters: val.maxGpsAccuracyMeters || 50,
          checkInStartTime: val.checkInStartTime || '05:40',
          lateAfterTime: val.lateAfterTime || '07:45',
          checkInEndTime: val.checkInEndTime || '10:00',
          checkOutStartTime: val.checkOutStartTime || '12:00',
          checkOutEndTime: val.checkOutEndTime || '20:00',
          requireGpsOnCheckout: val.requireGpsOnCheckout ?? true,
          zogbeli: {
            lat: val.zogbeli?.lat ?? '',
            lng: val.zogbeli?.lng ?? '',
            radiusMetres: val.zogbeli?.radiusMetres || 150,
            maxGpsAccuracyMeters: val.zogbeli?.maxGpsAccuracyMeters || 50,
          },
          vittin: {
            lat: val.vittin?.lat ?? '',
            lng: val.vittin?.lng ?? '',
            radiusMetres: val.vittin?.radiusMetres || 150,
            maxGpsAccuracyMeters: val.vittin?.maxGpsAccuracyMeters || 50,
          },
        });
      }
      return val;
    },
    enabled: activeTab === 'settings',
  });

  // History Query
  const [historyFrom, setHistoryFrom] = useState(offsetDate(selectedDate, -30));
  const [historyTo, setHistoryTo] = useState(selectedDate);
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['staffAdminHistory', historyFrom, historyTo],
    queryFn: async () => {
      const res = await api.get(`/staff-attendance/admin/history?from=${historyFrom}&to=${historyTo}`);
      return res.data?.data;
    },
    enabled: activeTab === 'history',
  });

  // Devices Query
  const { data: devicesData, refetch: refetchDevices } = useQuery({
    queryKey: ['staffAttendanceDevices'],
    queryFn: async () => {
      const res = await api.get('/staff-attendance/devices');
      return res.data?.data;
    },
    enabled: activeTab === 'devices',
  });

  // Sessions Query
  const { data: sessionsData, refetch: refetchSessions } = useQuery({
    queryKey: ['staffAttendanceSessions'],
    queryFn: async () => {
      const res = await api.get('/staff-attendance/sessions');
      return res.data?.data;
    },
    enabled: activeTab === 'sessions',
  });

  // Rejected Attempts Query
  const { data: attemptsData, refetch: refetchAttempts } = useQuery({
    queryKey: ['staffAttendanceAttempts'],
    queryFn: async () => {
      const res = await api.get('/staff-attendance/admin/attempts?limit=200');
      return res.data?.data;
    },
    enabled: activeTab === 'attempts',
  });

  // Temporary Overrides Query
  const { data: overridesData, refetch: refetchOverrides } = useQuery({
    queryKey: ['staffAttendanceOverrides'],
    queryFn: async () => {
      const res = await api.get('/staff-attendance/admin/overrides?status=active');
      return res.data?.data;
    },
    enabled: activeTab === 'overrides',
  });

  // Events Audit Log Query
  const { data: eventsData, refetch: refetchEvents } = useQuery({
    queryKey: ['staffAttendanceEvents'],
    queryFn: async () => {
      const res = await api.get('/staff-attendance/events');
      return res.data?.data;
    },
    enabled: activeTab === 'events',
  });

  // ── Manual Correction Handler ─────────────────────────────────────────────

  const handleOpenCorrection = (row) => {
    setCorrectionTarget(row);
    setCorrectionForm({
      checkInTime: row.checkInTime || '08:00',
      checkOutTime: row.checkOutTime || '',
      status: row.status === 'not_marked' ? 'present' : row.status,
      reason: '',
    });
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!correctionForm.reason.trim()) {
      showMsg('Correction reason is mandatory for audit trail logging', 'error');
      return;
    }

    try {
      if (correctionTarget.recordId) {
        await api.post(`/staff-attendance/records/${correctionTarget.recordId}/correct`, correctionForm);
      } else {
        // Bulk single mark if no record ID existed
        await api.post('/staff-attendance/admin/bulk', {
          date: selectedDate,
          records: [{ staffId: correctionTarget.staffId, status: correctionForm.status, notes: correctionForm.reason }],
        });
      }
      showMsg(`Correction logged for ${correctionTarget.name}`);
      setCorrectionTarget(null);
      refetchDaily();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to save correction', 'error');
    }
  };

  // ── Device Creation Handler ───────────────────────────────────────────────

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/staff-attendance/devices', newDeviceForm);
      if (res.data?.success) {
        setCreatedDeviceToken(res.data.data.rawDeviceToken);
        refetchDevices();
        showMsg('New Kiosk Device registered! Copy the secret device token.');
      }
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create device', 'error');
    }
  };

  // ── Session Creation Handler ──────────────────────────────────────────────

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      await api.post('/staff-attendance/sessions', {
        ...newSessionForm,
        date: selectedDate,
      });
      setShowSessionModal(false);
      refetchSessions();
      showMsg('Attendance session configured');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create session', 'error');
    }
  };

  const captureBranchGps = (branchKey) => {
    if (!navigator.geolocation) {
      showMsg('Geolocation is not supported by your device browser', 'error');
      return;
    }
    const branchLabel = branchKey === 'zogbeli' ? 'Zogbeli' : 'Vittin';
    showMsg(`Acquiring GPS for ${branchLabel} Branch… (this may take up to 12s)`, 'success');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy || 0);
        // Functional updater guarantees we get fresh state, and we ONLY touch the specific branch key
        setGeofenceForm((prev) => {
          const updated = {
            ...prev,
            [branchKey]: {
              ...prev[branchKey],
              lat,
              lng,
            },
          };
          return updated;
        });
        showMsg(`✅ ${branchLabel} captured: (${lat}, ${lng}) ±${accuracy}m. Click "Save All Settings" to apply.`);
      },
      (err) => {
        showMsg(`GPS capture failed for ${branchLabel}: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };


  const handleTestLocation = (branchKey) => {
    if (!navigator.geolocation) {
      showMsg('Geolocation not supported', 'error');
      return;
    }
    setGpsTestLoading(true);
    setGpsTestResult(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 0);
        const bLat = geofenceForm[branchKey]?.lat;
        const bLng = geofenceForm[branchKey]?.lng;
        const radius = geofenceForm[branchKey]?.radiusMetres || 150;
        const maxAcc = geofenceForm[branchKey]?.maxGpsAccuracyMeters || 50;
        const branchName = branchKey === 'zogbeli' ? 'Zogbeli' : 'Vittin';

        if (!bLat || !bLng) {
          setGpsTestLoading(false);
          showMsg(`No GPS coordinates saved for ${branchName} Branch yet. Capture location first.`, 'error');
          return;
        }

        const toRad = (d) => (d * Math.PI) / 180;
        const R = 6371000;
        const dLat = toRad(bLat - lat);
        const dLng = toRad(bLng - lng);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
        const distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

        const inGeofence = distance <= radius;
        const accuracyOk = accuracy <= maxAcc;

        setGpsTestResult({ branch: branchName, distance, radius, pass: inGeofence && accuracyOk, accuracy, maxAcc, inGeofence, accuracyOk });
        setGpsTestLoading(false);
      },
      (err) => {
        setGpsTestLoading(false);
        showMsg(`Test failed: ${err.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const handleCreateOverride = async (e) => {
    e.preventDefault();
    if (!overrideForm.staffId || !overrideForm.startDate || !overrideForm.endDate) {
      showMsg('Staff, start date, and end date are required', 'error');
      return;
    }
    try {
      await api.post('/staff-attendance/admin/overrides', overrideForm);
      showMsg(`Temporary override created for ${overrideForm.staffName}`);
      setShowOverrideModal(false);
      setOverrideForm({ staffId: '', staffName: '', temporaryBranch: 'Vittin', startDate: '', endDate: '', reason: '' });
      refetchOverrides();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to create override', 'error');
    }
  };

  const handleCancelOverride = async (overrideId) => {
    if (!window.confirm('Cancel this temporary branch override?')) return;
    try {
      await api.patch(`/staff-attendance/admin/overrides/${overrideId}/cancel`);
      showMsg('Override cancelled');
      refetchOverrides();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to cancel override', 'error');
    }
  };

  // ── Geofence Settings handler
  const handleSaveGeofenceSettings = async (e) => {
    e.preventDefault();
    try {
      await api.patch('/staff-attendance/geofence-settings', geofenceForm);
      showMsg('Branch Geofence settings updated successfully!');
      refetchGeofence();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to save geofence settings', 'error');
    }
  };

  // Filtered staff overview
  const filteredOverview = (dailyData?.overview || []).filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.department && item.department.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === 'all' || item.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const summary = dailyData?.summary || { present: 0, absent: 0, late: 0, onLeave: 0, notMarked: 0, total: 0 };
  const branchBreakdown = dailyData?.branchBreakdown || { zogbeli: {}, vittin: {} };
  const attendanceRate = summary.total > 0
    ? Math.round(((summary.present + summary.late) / summary.total) * 100)
    : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px] uppercase tracking-wider">
              GES Compliance Ready
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider">
              Staff Attendance Module
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <Fingerprint className="w-7 h-7 text-emerald-600" /> Staff QR & Attendance Hub
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Real-time QR scanning, unattended kiosk mode, anti-proxy photo checks, and audit trails
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-3">
          <a
            href="/attendance/kiosk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-slate-950/20"
          >
            <Laptop className="w-4 h-4 text-emerald-400" />
            <span>Launch Kiosk Scanner</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
        </div>
      </div>

      {/* Message Alert Banner */}
      {message.text && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm border ${
            message.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4" />
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage({ text: '', type: '' })} className="font-bold opacity-60 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* ── Summary Cards ────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Present" value={summary.present} color="emerald" sub="On time staff" />
        <SummaryCard label="Late" value={summary.late} color="amber" sub="Arrived after threshold" />
        <SummaryCard label="Absent" value={summary.absent} color="rose" sub="Unexcused absence" />
        <SummaryCard label="On Leave" value={summary.onLeave} color="indigo" sub="Approved leave" />
        <SummaryCard
          label="Attendance Rate"
          value={attendanceRate != null ? `${attendanceRate}%` : '—'}
          color="slate"
          sub={`${summary.present + summary.late} / ${summary.total} marked`}
        />
      </div>

      {/* Branch Breakdown Strip */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl border-2 border-[#78282E]/20 bg-[#78282E]/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#78282E] uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Zogbeli Branch
            </span>
            <span className="text-[10px] font-bold text-slate-500">{branchBreakdown.zogbeli?.total ?? 0} staff</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Present', val: branchBreakdown.zogbeli?.present ?? 0, cls: 'text-emerald-700' },
              { label: 'Late', val: branchBreakdown.zogbeli?.late ?? 0, cls: 'text-amber-700' },
              { label: 'Absent', val: branchBreakdown.zogbeli?.absent ?? 0, cls: 'text-rose-700' },
              { label: 'Unmarked', val: branchBreakdown.zogbeli?.notMarked ?? 0, cls: 'text-slate-500' },
            ].map((s) => (<div key={s.label}><p className={`text-xl font-black ${s.cls}`}>{s.val}</p><p className="text-[10px] text-slate-500">{s.label}</p></div>))}
          </div>
        </div>
        <div className="p-4 rounded-2xl border-2 border-amber-900/20 bg-amber-900/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Vittin Branch
            </span>
            <span className="text-[10px] font-bold text-slate-500">{branchBreakdown.vittin?.total ?? 0} staff</span>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: 'Present', val: branchBreakdown.vittin?.present ?? 0, cls: 'text-emerald-700' },
              { label: 'Late', val: branchBreakdown.vittin?.late ?? 0, cls: 'text-amber-700' },
              { label: 'Absent', val: branchBreakdown.vittin?.absent ?? 0, cls: 'text-rose-700' },
              { label: 'Unmarked', val: branchBreakdown.vittin?.notMarked ?? 0, cls: 'text-slate-500' },
            ].map((s) => (<div key={s.label}><p className={`text-xl font-black ${s.cls}`}>{s.val}</p><p className="text-[10px] text-slate-500">{s.label}</p></div>))}
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs ──────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        {[
          { id: 'daily', label: "Today's Register", icon: Calendar },
          { id: 'history', label: 'Attendance History', icon: History },
          { id: 'attempts', label: 'Rejected Attempts', icon: AlertTriangle },
          { id: 'overrides', label: 'Branch Overrides', icon: Sliders },
          { id: 'devices', label: 'Kiosk Devices', icon: Laptop },
          { id: 'sessions', label: 'Sessions Setup', icon: Clock },
          { id: 'events', label: 'Audit Trail', icon: ShieldAlert },
          { id: 'settings', label: 'GPS Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: TODAY'S LIVE REGISTER ──────────────────────────────────── */}
      {activeTab === 'daily' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center flex-wrap gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => refetchDaily()}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                title="Refresh Register"
              >
                <RefreshCw className={`w-4 h-4 ${dailyLoading ? 'animate-spin' : ''}`} />
              </button>

              {/* Branch Filter Pills */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl space-x-1">
                {[
                  { id: 'all', label: 'All Branches' },
                  { id: 'Zogbeli', label: 'Zogbeli Branch' },
                  { id: 'Vittin', label: 'Vittin Branch' },
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBranchFilter(b.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      branchFilter === b.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search staff name or dept..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 bg-slate-50 w-64 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Staff</th>
                  <th className="p-3.5">Branch</th>
                  <th className="p-3.5">Department / Role</th>
                  <th className="p-3.5">Check-In</th>
                  <th className="p-3.5">Check-Out</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">GPS / Audit</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {filteredOverview.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-semibold">
                      No staff attendance records found for this date.
                    </td>
                  </tr>
                ) : (
                  filteredOverview.map((row) => {
                    const statusConf = STATUS_CONFIG[row.status] || STATUS_CONFIG.not_marked;
                    return (
                      <tr key={row.staffId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 flex items-center space-x-3">
                          <img
                            src={
                              row.photoUrl ||
                              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.name)}`
                            }
                            alt={row.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{row.name}</p>
                            <p className="text-[11px] font-mono text-emerald-600">{row.staffCode}</p>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${
                              row.branch === 'Vittin'
                                ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                : 'bg-[#78282E]/10 text-[#78282E] border border-[#78282E]/20'
                            }`}
                          >
                            {row.branch || 'Zogbeli'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-slate-800">{row.department || 'General'}</p>
                          <p className="text-[11px] text-slate-400 capitalize">{row.role}</p>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {formatTime(row.checkInTime)}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">
                          {formatTime(row.checkOutTime)}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black uppercase ${statusConf.bg} ${statusConf.text}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusConf.dot}`} />
                            {statusConf.label}
                          </span>
                        </td>
                        <td className="p-3.5 text-[11px]">
                          {row.geofenceVerified ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> GPS Verified
                              </span>
                              {row.distanceFromSchool != null && (
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {row.distanceFromSchool}m away
                                </span>
                              )}
                            </div>
                          ) : row.corrections && row.corrections.length > 0 ? (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
                              Corrected ({row.corrections.length})
                            </span>
                          ) : row.markedByRole === 'kiosk' ? (
                            <span className="text-emerald-700 font-semibold">QR Kiosk Scan</span>
                          ) : (
                            <span className="text-slate-400">Standard</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => setSelectedStaffForQr({ _id: row.staffId, firstName: row.name, staffId: row.staffCode })}
                            className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 rounded-lg font-bold transition-all"
                            title="Manage QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenCorrection(row)}
                            className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 rounded-lg font-bold transition-all"
                            title="Manual Correction"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: ATTENDANCE HISTORY ─────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="font-black text-slate-900 text-base">Attendance History Logs</h3>
            <div className="flex items-center space-x-3">
              <input
                type="date"
                value={historyFrom}
                onChange={(e) => setHistoryFrom(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={historyTo}
                onChange={(e) => setHistoryTo(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Staff</th>
                  <th className="p-3.5">Check-In</th>
                  <th className="p-3.5">Check-Out</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(historyData?.records || []).map((r) => (
                  <tr key={r._id}>
                    <td className="p-3.5 font-bold text-slate-900">
                      {new Date(r.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="p-3.5 font-bold">
                      {r.staff?.firstName} {r.staff?.lastName}
                    </td>
                    <td className="p-3.5">{formatTime(r.checkInTime)}</td>
                    <td className="p-3.5">{formatTime(r.checkOutTime)}</td>
                    <td className="p-3.5 uppercase font-bold text-xs">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: KIOSK DEVICES MANAGER ──────────────────────────────────── */}
      {activeTab === 'devices' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base">Authorized Kiosk Devices</h3>
              <p className="text-xs text-slate-500">Hardware scanners registered to capture staff attendance</p>
            </div>
            <button
              onClick={() => setShowDeviceModal(true)}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Kiosk Device</span>
            </button>
          </div>

          {/* Created Token Banner */}
          {createdDeviceToken && (
            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 border border-slate-800">
              <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                IMPORTANT: Save Device Token Now (Shown Once)
              </p>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <code className="text-xs font-mono text-emerald-400 break-all">{createdDeviceToken}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(createdDeviceToken)}
                  className="ml-3 text-xs text-slate-400 hover:text-white font-bold"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(devicesData || []).map((dev) => (
              <div key={dev._id} className="p-5 border border-slate-200 rounded-2xl space-y-3 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{dev.deviceName}</h4>
                      <p className="text-xs text-slate-500 font-medium">{dev.locationName} • {dev.deviceId}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      dev.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {dev.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200/80">
                  <div>
                    <span className="text-slate-400 font-medium">Anti-Proxy Level:</span>
                    <p className="font-bold text-slate-800 uppercase">{dev.antiProxyLevel || 'High Security'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Allowed Radius:</span>
                    <p className="font-bold text-slate-800">{dev.allowedRadiusMetres} metres</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: SESSIONS SETUP ─────────────────────────────────────────── */}
      {activeTab === 'sessions' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base">Attendance Sessions</h3>
              <p className="text-xs text-slate-500">Define morning and afternoon attendance windows and late cutoff times</p>
            </div>
            <button
              onClick={() => setShowSessionModal(true)}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Configure Session</span>
            </button>
          </div>

          <div className="space-y-3">
            {(sessionsData || []).map((sess) => (
              <div key={sess._id} className="p-4 border border-slate-200 rounded-2xl flex items-center justify-between bg-slate-50">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h4 className="font-black text-slate-900 text-sm">{sess.name}</h4>
                    <p className="text-xs text-slate-500">
                      Window: {formatTime(sess.startTime)} – {formatTime(sess.endTime)} | Late after: {formatTime(sess.lateThresholdTime)}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase">
                  {sess.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 5: AUDIT EVENTS LOG ───────────────────────────────────────── */}
      {activeTab === 'events' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <h3 className="font-black text-slate-900 text-base">Immutable Scan & Correction Audit Trail</h3>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Staff</th>
                  <th className="p-3.5">Event Type</th>
                  <th className="p-3.5">Result</th>
                  <th className="p-3.5">Scanner / Device</th>
                  <th className="p-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(eventsData || []).map((e) => (
                  <tr key={e._id}>
                    <td className="p-3.5 text-slate-500">
                      {new Date(e.timestamp).toLocaleString('en-GB')}
                    </td>
                    <td className="p-3.5 font-bold">
                      {e.staff ? `${e.staff.firstName} ${e.staff.lastName}` : 'Unrecognized'}
                    </td>
                    <td className="p-3.5 font-bold uppercase">{e.eventType}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          e.result === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : e.result === 'LATE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {e.result}
                      </span>
                    </td>
                    <td className="p-3.5">{e.deviceName || 'Kiosk'}</td>
                    <td className="p-3.5 text-slate-500">
                      {e.failureReason || (e.correctionDetails?.reason ? `Reason: ${e.correctionDetails.reason}` : 'Normal Scan')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: REJECTED ATTEMPTS ─────────────────────────────── */}
      {activeTab === 'attempts' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                Rejected Check-In Attempts
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Every failed attempt with GPS evidence and rejection reason</p>
            </div>
            <button onClick={() => refetchAttempts()} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Staff</th>
                  <th className="p-3.5">Time</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Rejection Reason</th>
                  <th className="p-3.5">GPS Evidence</th>
                  <th className="p-3.5">Branch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {(attemptsData?.attempts || []).length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">No rejected attempts found.</td></tr>
                ) : (
                  (attemptsData?.attempts || []).map((a) => (
                    <tr key={a._id} className="hover:bg-rose-50/40 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={a.staff?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(a.staff?.firstName || 'X')}`}
                            alt=""
                            className="w-8 h-8 rounded-xl object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{a.staff?.firstName} {a.staff?.lastName}</p>
                            <p className="text-[10px] text-slate-400">{a.staff?.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-500">{new Date(a.timestamp).toLocaleString('en-GB')}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          a.attemptType === 'CHECK_IN' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>{a.attemptType?.replace('_', ' ')}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800">
                          {(a.rejectionCode || 'UNKNOWN').replace(/_/g, ' ')}
                        </span>
                        {a.rejectionMessage && (
                          <p className="text-[10px] text-slate-500 mt-0.5 max-w-[200px]">{a.rejectionMessage}</p>
                        )}
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-600 space-y-0.5">
                        {a.latitude != null && <p>Lat: {a.latitude?.toFixed(5)}, Lng: {a.longitude?.toFixed(5)}</p>}
                        {a.accuracy != null && <p className="text-slate-400">±{a.accuracy}m accuracy</p>}
                        {a.distanceFromBranch != null && <p className="text-rose-600 font-bold">{a.distanceFromBranch}m from branch</p>}
                      </td>
                      <td className="p-3.5">
                        {a.assignedBranch && (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            a.assignedBranch === 'Vittin' ? 'bg-amber-100 text-amber-800' : 'bg-[#78282E]/10 text-[#78282E]'
                          }`}>{a.assignedBranch}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB: BRANCH OVERRIDES ──────────────────────────────── */}
      {activeTab === 'overrides' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-500" />
                Temporary Branch Assignments
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Move a teacher temporarily to a different campus for a specified date range</p>
            </div>
            <button
              onClick={() => setShowOverrideModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Override</span>
            </button>
          </div>

          <div className="space-y-3">
            {(overridesData?.overrides || []).length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No active temporary branch overrides.
              </div>
            ) : (
              (overridesData?.overrides || []).map((ov) => (
                <div key={ov._id} className="p-4 border border-indigo-200 bg-indigo-50/40 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={ov.staff?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(ov.staff?.firstName || 'S')}`}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover border border-indigo-200"
                    />
                    <div>
                      <p className="font-black text-slate-900 text-sm">{ov.staff?.firstName} {ov.staff?.lastName}</p>
                      <p className="text-xs text-slate-500">
                        <span className={`font-bold ${ov.permanentBranch === 'Vittin' ? 'text-amber-700' : 'text-[#78282E]'}`}>{ov.permanentBranch}</span>
                        {' '}&rarr;{' '}
                        <span className={`font-bold ${ov.temporaryBranch === 'Vittin' ? 'text-amber-700' : 'text-[#78282E]'}`}>{ov.temporaryBranch}</span>
                        {' '}·{' '}
                        {new Date(ov.startDate).toLocaleDateString('en-GB')} to {new Date(ov.endDate).toLocaleDateString('en-GB')}
                      </p>
                      {ov.reason && <p className="text-[11px] text-slate-400 italic">{ov.reason}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelOverride(ov._id)}
                    className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Cancel Override
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB 6: BRANCH GEOFENCE SETTINGS ──────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#78282E]" />
                Dual-Branch GPS Geofence Configuration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set campus GPS coordinates and 150m attendance boundaries for Zogbeli and Vittin branches.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700">Enable GPS Geofencing</label>
              <input
                type="checkbox"
                checked={geofenceForm.enabled}
                onChange={(e) => setGeofenceForm({ ...geofenceForm, enabled: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
            </div>
          </div>

          <form onSubmit={handleSaveGeofenceSettings} className="space-y-6">
            {/* Safe destructure — protects against server returning flat config */}
            {(() => {
              const zg = geofenceForm.zogbeli || { lat: '', lng: '', radiusMetres: 150, maxGpsAccuracyMeters: 50 };
              const vt = geofenceForm.vittin  || { lat: '', lng: '', radiusMetres: 150, maxGpsAccuracyMeters: 50 };
              const setZg = (patch) => setGeofenceForm((prev) => ({ ...prev, zogbeli: { ...(prev.zogbeli || {}), ...patch } }));
              const setVt = (patch) => setGeofenceForm((prev) => ({ ...prev, vittin:  { ...(prev.vittin  || {}), ...patch } }));
              return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Zogbeli Branch Box */}
              <div className="p-5 rounded-2xl border-2 border-red-950/20 bg-red-950/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#78282E]" />
                      Zogbeli Branch
                    </h4>
                    <p className="text-[11px] font-bold text-slate-500">
                      Classes: Nursery 1, Nursery 2, KG 1, KG 2, Primary 1 – Primary 4
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#78282E] text-white text-[10px] font-black">
                    ZOGBELI
                  </span>
                </div>

                {/* Zogbeli coordinates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Latitude</label>
                    <input type="number" step="any" placeholder="e.g. 9.407500" value={zg.lat}
                      onChange={(e) => setZg({ lat: parseFloat(e.target.value) || '' })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Longitude</label>
                    <input type="number" step="any" placeholder="e.g. -0.839200" value={zg.lng}
                      onChange={(e) => setZg({ lng: parseFloat(e.target.value) || '' })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Radius (Metres)</label>
                    <input type="number" value={zg.radiusMetres || 150}
                      onChange={(e) => setZg({ radiusMetres: parseInt(e.target.value, 10) || 150 })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Max GPS Accuracy (m)</label>
                    <input type="number" value={zg.maxGpsAccuracyMeters || 50}
                      onChange={(e) => setZg({ maxGpsAccuracyMeters: parseInt(e.target.value, 10) || 50 })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white" />
                    <p className="text-[10px] text-slate-400 mt-1">Reject if GPS worse than this</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => captureBranchGps('zogbeli')}
                    className="flex items-center justify-center gap-2 py-2.5 bg-white border border-[#78282E]/30 hover:bg-[#78282E]/5 text-[#78282E] rounded-xl text-xs font-bold transition-all">
                    <MapPin className="w-3.5 h-3.5" />
                    Set Zogbeli GPS
                  </button>
                  <button type="button" onClick={() => handleTestLocation('zogbeli')}
                    disabled={gpsTestLoading}
                    className="flex items-center justify-center gap-2 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {gpsTestLoading ? 'Testing…' : 'Test Zogbeli'}
                  </button>
                </div>
              </div>

              {/* Vittin Branch Box */}
              <div className="p-5 rounded-2xl border-2 border-amber-950/20 bg-amber-950/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-800" />
                      Vittin Branch
                    </h4>
                    <p className="text-[11px] font-bold text-slate-500">
                      Classes: Primary 5, Primary 6, JHS 1 – JHS 3
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-800 text-white text-[10px] font-black">
                    VITTIN
                  </span>
                </div>

                {/* Vittin coordinates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Latitude</label>
                    <input type="number" step="any" placeholder="e.g. 9.385000" value={vt.lat}
                      onChange={(e) => setVt({ lat: parseFloat(e.target.value) || '' })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Longitude</label>
                    <input type="number" step="any" placeholder="e.g. -0.812000" value={vt.lng}
                      onChange={(e) => setVt({ lng: parseFloat(e.target.value) || '' })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Radius (Metres)</label>
                    <input type="number" value={vt.radiusMetres || 150}
                      onChange={(e) => setVt({ radiusMetres: parseInt(e.target.value, 10) || 150 })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Max GPS Accuracy (m)</label>
                    <input type="number" value={vt.maxGpsAccuracyMeters || 50}
                      onChange={(e) => setVt({ maxGpsAccuracyMeters: parseInt(e.target.value, 10) || 50 })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white" />
                    <p className="text-[10px] text-slate-400 mt-1">Reject if GPS worse than this</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => captureBranchGps('vittin')}
                    className="flex items-center justify-center gap-2 py-2.5 bg-white border border-amber-800/30 hover:bg-amber-800/5 text-amber-800 rounded-xl text-xs font-bold transition-all">
                    <MapPin className="w-3.5 h-3.5" />
                    Set Vittin GPS
                  </button>
                  <button type="button" onClick={() => handleTestLocation('vittin')}
                    disabled={gpsTestLoading}
                    className="flex items-center justify-center gap-2 py-2.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {gpsTestLoading ? 'Testing…' : 'Test Vittin'}
                  </button>
                </div>
              </div>
            </div>
            );
            })()}

            {/* GPS Test Result Panel */}
            {gpsTestResult && (
              <div className={`p-4 rounded-2xl border ${gpsTestResult.pass ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                <div className="flex items-start gap-3">
                  {gpsTestResult.pass
                    ? <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />}
                  <div>
                    <p className={`text-xs font-extrabold ${gpsTestResult.pass ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {gpsTestResult.pass ? `✅ Inside ${gpsTestResult.branch} geofence` : `❌ Outside ${gpsTestResult.branch} geofence`}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      You are <strong>{gpsTestResult.distance}m</strong> from {gpsTestResult.branch} centre (max {gpsTestResult.radius}m).
                      GPS accuracy: <strong>±{gpsTestResult.accuracy}m</strong> (max allowed: ±{gpsTestResult.maxAcc}m).
                    </p>
                    {!gpsTestResult.inGeofence && <p className="text-[10px] text-rose-600 mt-1 font-bold">Location outside geofence radius.</p>}
                    {!gpsTestResult.accuracyOk && <p className="text-[10px] text-rose-600 mt-0.5 font-bold">GPS signal too weak for this campus.</p>}
                  </div>
                  <button onClick={() => setGpsTestResult(null)} className="ml-auto text-slate-400 hover:text-slate-700">×</button>
                </div>
              </div>
            )}

            {/* ── Time Policy Section ────────────────────────────── */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Attendance Time Policy
              </h4>
              <p className="text-[11px] text-slate-500">Control when teachers can check in and out each day. All times are in 24-hour format.</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Check-In Opens</label>
                  <input type="time" value={geofenceForm.checkInStartTime || '05:40'}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, checkInStartTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white" />
                  <p className="text-[10px] text-slate-400 mt-1">Default: 05:40</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Late After</label>
                  <input type="time" value={geofenceForm.lateAfterTime || '07:45'}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, lateAfterTime: e.target.value })}
                    className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-amber-50" />
                  <p className="text-[10px] text-slate-400 mt-1">Default: 07:45</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Check-In Closes</label>
                  <input type="time" value={geofenceForm.checkInEndTime || '10:00'}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, checkInEndTime: e.target.value })}
                    className="w-full border border-rose-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-rose-50" />
                  <p className="text-[10px] text-slate-400 mt-1">Default: 10:00</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Check-Out Opens</label>
                  <input type="time" value={geofenceForm.checkOutStartTime || '12:00'}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, checkOutStartTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Check-Out Closes</label>
                  <input type="time" value={geofenceForm.checkOutEndTime || '20:00'}
                    onChange={(e) => setGeofenceForm({ ...geofenceForm, checkOutEndTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-white" />
                </div>
                <div className="flex flex-col justify-center gap-2">
                  <label className="text-[11px] font-bold uppercase text-slate-500">Require GPS at Checkout</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={geofenceForm.requireGpsOnCheckout ?? true}
                      onChange={(e) => setGeofenceForm({ ...geofenceForm, requireGpsOnCheckout: e.target.checked })}
                      className="w-4 h-4 text-emerald-600 rounded" />
                    <span className="text-xs font-bold text-slate-700">
                      {geofenceForm.requireGpsOnCheckout ? 'Yes — GPS required at checkout' : 'No — checkout without GPS allowed'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
              <button
                type="submit"
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20"
              >
                <Save className="w-4 h-4" />
                <span>Save All Settings</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── BRANCH OVERRIDE CREATION MODAL ───────────────────────────────── */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-500" />
                  Create Temporary Branch Assignment
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Override a teacher's home campus for a specific date range
                </p>
              </div>
              <button onClick={() => setShowOverrideModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-lg">&times;</button>
            </div>

            <form onSubmit={handleCreateOverride} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Staff ID</label>
                  <input
                    type="text"
                    required
                    placeholder="Staff ID or staffCode (e.g. STF-0023)"
                    value={overrideForm.staffId}
                    onChange={(e) => setOverrideForm({ ...overrideForm, staffId: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Staff Name (for reference)</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={overrideForm.staffName}
                    onChange={(e) => setOverrideForm({ ...overrideForm, staffName: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Temporary Branch</label>
                  <select
                    value={overrideForm.temporaryBranch}
                    onChange={(e) => setOverrideForm({ ...overrideForm, temporaryBranch: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  >
                    <option value="Zogbeli">Zogbeli</option>
                    <option value="Vittin">Vittin</option>
                  </select>
                </div>
                <div />
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={overrideForm.startDate}
                    onChange={(e) => setOverrideForm({ ...overrideForm, startDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={overrideForm.endDate}
                    onChange={(e) => setOverrideForm({ ...overrideForm, endDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Reason</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Covering class at Vittin for absent teacher"
                    value={overrideForm.reason}
                    onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all">
                  Create Override
                </button>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MANUAL CORRECTION MODAL ───────────────────────────────────────── */}
      {correctionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-5 border border-slate-200">
            <h3 className="font-black text-slate-900 text-base">Manual Correction Log</h3>
            <p className="text-xs text-slate-500">
              Modifying record for <strong className="text-slate-800">{correctionTarget.name}</strong>. Corrections are logged immutably.
            </p>

            <form onSubmit={handleSaveCorrection} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Check-In Time</label>
                  <input
                    type="text"
                    placeholder="HH:mm (e.g. 08:00)"
                    value={correctionForm.checkInTime}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, checkInTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Check-Out Time</label>
                  <input
                    type="text"
                    placeholder="HH:mm (e.g. 16:30)"
                    value={correctionForm.checkOutTime}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, checkOutTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Status</label>
                <select
                  value={correctionForm.status}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, status: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 capitalize"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="on_leave">On Leave</option>
                  <option value="half_day">Half Day</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Mandatory Correction Reason Rationale
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Scanner power outage at reception"
                  value={correctionForm.reason}
                  onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs"
                >
                  Save & Log Correction
                </button>
                <button
                  type="button"
                  onClick={() => setCorrectionTarget(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DEVICE CREATION MODAL ─────────────────────────────────────────── */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="font-black text-slate-900 text-base">Register Kiosk Device</h3>

            <form onSubmit={handleCreateDevice} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Device Name</label>
                <input
                  type="text"
                  required
                  placeholder="Main Reception Tablet"
                  value={newDeviceForm.deviceName}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, deviceName: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Location Name</label>
                <input
                  type="text"
                  placeholder="Administration Block"
                  value={newDeviceForm.locationName}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, locationName: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Anti-Proxy Security</label>
                  <select
                    value={newDeviceForm.antiProxyLevel}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, antiProxyLevel: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 capitalize font-bold"
                  >
                    <option value="standard">Standard (QR Only)</option>
                    <option value="secure">Secure (+ GPS Radius)</option>
                    <option value="high_security">High Security (+ Photo Verification)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">GPS Radius (m)</label>
                  <input
                    type="number"
                    value={newDeviceForm.allowedRadiusMetres}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, allowedRadiusMetres: parseInt(e.target.value, 10) })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs">
                  Generate Device Secret
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeviceModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SESSION CREATION MODAL ───────────────────────────────────────── */}
      {showSessionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-200">
            <h3 className="font-black text-slate-900 text-base">Configure Session Window</h3>

            <form onSubmit={handleCreateSession} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Session Name</label>
                <input
                  type="text"
                  required
                  placeholder="Morning Attendance"
                  value={newSessionForm.name}
                  onChange={(e) => setNewSessionForm({ ...newSessionForm, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Opens</label>
                  <input
                    type="text"
                    value={newSessionForm.startTime}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, startTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Late After</label>
                  <input
                    type="text"
                    value={newSessionForm.lateThresholdTime}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, lateThresholdTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Closes</label>
                  <input
                    type="text"
                    value={newSessionForm.endTime}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, endTime: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-3">
                <button type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-xs">
                  Save Session Config
                </button>
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff QR Modal */}
      {selectedStaffForQr && (
        <StaffQrModal
          staff={selectedStaffForQr}
          isOpen={!!selectedStaffForQr}
          onClose={() => setSelectedStaffForQr(null)}
        />
      )}
    </div>
  );
};

export default StaffAttendancePage;
