import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useOffline } from '../../context/OfflineContext';
import { cacheAdminDailyData, getAdminDailyCache } from '../../services/staffAttendanceOffline';
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
  Download,
  RefreshCw,
  MapPin,
  AlertTriangle,
  Settings,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Navigation,
  Loader2,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(t) {
  if (!t) return '—';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function toDateInputValue(d) {
  return d.toISOString().split('T')[0];
}

function offsetDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
}

const STATUS_OPTIONS = ['present', 'absent', 'late', 'on_leave', 'half_day'];

const STATUS_CONFIG = {
  present: { label: 'Present', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  late: { label: 'Late', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  absent: { label: 'Absent', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500' },
  on_leave: { label: 'On Leave', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  half_day: { label: 'Half Day', bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200', dot: 'bg-violet-500' },
  not_marked: { label: 'Not Marked', bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
};

// ─── Summary Card ─────────────────────────────────────────────────────────────

const SummaryCard = ({ label, value, sub, color }) => {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    rose: 'bg-rose-50 border-rose-100 text-rose-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    slate: 'bg-slate-50 border-slate-100 text-slate-600',
  };
  return (
    <div className={`p-4 rounded-2xl border text-center space-y-1 ${colors[color]}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
      {sub && <p className="text-[11px] font-medium opacity-70">{sub}</p>}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const StaffAttendancePage = () => {
  const { isOnline } = useOffline();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'history'
  const [showGpsSettings, setShowGpsSettings] = useState(false);
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editMap, setEditMap] = useState({}); // staffId -> status overrides
  const [message, setMessage] = useState({ text: '', type: '' });
  const [cachedData, setCachedData] = useState(null);
  const [cachedAt, setCachedAt] = useState(null);
  const [gpsLocating, setGpsLocating] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(null); // metres
  const gpsWatchRef = React.useRef(null);

  // GPS Geofence form state
  const [geofenceForm, setGeofenceForm] = useState({
    enabled: false,
    lat: '',
    lng: '',
    radiusMetres: 150,
    lateThresholdMinutes: 15,
  });
  const [geofenceMsg, setGeofenceMsg] = useState({ text: '', type: '' });

  // Stop any running GPS watch on unmount
  useEffect(() => {
    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, []);

  // History filters
  const [historyFrom, setHistoryFrom] = useState(offsetDate(selectedDate, -7));
  const [historyTo, setHistoryTo] = useState(selectedDate);
  const [historyStaffId, setHistoryStaffId] = useState('');
  const [historyStatus, setHistoryStatus] = useState('');

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // ── GPS Geofence Settings Query & Mutation ───────────────────────────────
  const { data: geofenceData, isLoading: geofenceLoading } = useQuery({
    queryKey: ['staffGeofenceSettings'],
    queryFn: async () => {
      const res = await api.get('/staff-attendance/geofence-settings');
      return res.data?.data;
    },
    onSuccess: (data) => {
      if (data) {
        setGeofenceForm({
          enabled: data.enabled || false,
          lat: data.lat ?? '',
          lng: data.lng ?? '',
          radiusMetres: data.radiusMetres || 150,
          lateThresholdMinutes: data.lateThresholdMinutes || 15,
        });
      }
    },
  });

  // Sync form when data loads
  useEffect(() => {
    if (geofenceData) {
      setGeofenceForm({
        enabled: geofenceData.enabled || false,
        lat: geofenceData.lat ?? '',
        lng: geofenceData.lng ?? '',
        radiusMetres: geofenceData.radiusMetres || 150,
        lateThresholdMinutes: geofenceData.lateThresholdMinutes || 15,
      });
    }
  }, [geofenceData]);

  const geofenceMutation = useMutation({
    mutationFn: () => api.patch('/staff-attendance/geofence-settings', {
      enabled: geofenceForm.enabled,
      lat: geofenceForm.lat !== '' ? Number(geofenceForm.lat) : null,
      lng: geofenceForm.lng !== '' ? Number(geofenceForm.lng) : null,
      radiusMetres: Number(geofenceForm.radiusMetres),
      lateThresholdMinutes: Number(geofenceForm.lateThresholdMinutes),
    }),
    onSuccess: () => {
      setGeofenceMsg({ text: 'GPS settings saved! Geofencing is now active.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['staffGeofenceSettings'] });
      setTimeout(() => setGeofenceMsg({ text: '', type: '' }), 4000);
    },
    onError: (err) => setGeofenceMsg({ text: err.response?.data?.message || 'Failed to save GPS settings.', type: 'error' }),
  });

  // Auto-detect school location — uses watchPosition so it waits for true GPS accuracy
  const GOOD_ACCURACY_M = 50;  // accept fix once accuracy ≤ 50 metres
  const MAX_WAIT_MS     = 30000; // give up after 30 seconds

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeofenceMsg({ text: 'GPS is not available on this device. Please enter coordinates manually.', type: 'error' });
      return;
    }
    // Stop any existing watch
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
    }

    setGpsLocating(true);
    setGpsAccuracy(null);
    setGeofenceMsg({ text: '', type: '' });

    const deadline = setTimeout(() => {
      // Timed out — stop watching
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
      setGpsLocating(false);
      setGpsAccuracy(null);
      setGeofenceMsg({
        text: 'Could not get a precise GPS fix within 30 seconds. Make sure GPS is enabled on your device and you are outdoors, then try again.',
        type: 'error',
      });
    }, MAX_WAIT_MS);

    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = Math.round(pos.coords.accuracy);
        setGpsAccuracy(acc);

        if (acc <= GOOD_ACCURACY_M) {
          // We have a good fix — stop watching
          clearTimeout(deadline);
          navigator.geolocation.clearWatch(gpsWatchRef.current);
          gpsWatchRef.current = null;
          setGpsLocating(false);

          setGeofenceForm((prev) => ({
            ...prev,
            lat: pos.coords.latitude.toFixed(7),
            lng: pos.coords.longitude.toFixed(7),
          }));
          setGeofenceMsg({
            text: `✅ Precise GPS fix: ±${acc}m accuracy. Coordinates set. Verify on Google Maps, then save.`,
            type: 'success',
          });
          setTimeout(() => setGeofenceMsg({ text: '', type: '' }), 8000);
        }
        // else: accuracy still too coarse — keep watching and show live feedback
      },
      (err) => {
        clearTimeout(deadline);
        if (gpsWatchRef.current !== null) {
          navigator.geolocation.clearWatch(gpsWatchRef.current);
          gpsWatchRef.current = null;
        }
        setGpsLocating(false);
        setGpsAccuracy(null);
        setGeofenceMsg({
          text: `GPS error: ${err.message}. Make sure location permission is granted in your browser settings.`,
          type: 'error',
        });
      },
      {
        enableHighAccuracy: true, // forces device GPS chip, not IP/cell fallback
        timeout: MAX_WAIT_MS,
        maximumAge: 0,            // never use a cached position
      }
    );
  };

  // ── Daily Overview Query ─────────────────────────────────────────────────
  const { data: dailyData, isLoading, refetch: refetchDaily } = useQuery({
    queryKey: ['staffAttendanceDaily', selectedDate],
    queryFn: async () => {
      const res = await api.get(`/staff-attendance/admin/daily?date=${selectedDate}`);
      const result = res.data?.data;
      // Cache for offline
      await cacheAdminDailyData(selectedDate, result);
      return result;
    },
    enabled: isOnline && activeTab === 'daily',
    retry: 0,
    onError: async () => {
      const cached = await getAdminDailyCache(selectedDate);
      if (cached) {
        setCachedData(cached.data);
        setCachedAt(cached.cachedAt);
      }
    },
  });

  // Load offline cache on mount or when going offline
  useEffect(() => {
    if (!isOnline && activeTab === 'daily') {
      getAdminDailyCache(selectedDate).then((cached) => {
        if (cached) {
          setCachedData(cached.data);
          setCachedAt(cached.cachedAt);
        } else {
          setCachedData(null);
        }
      });
    }
  }, [isOnline, selectedDate, activeTab]);

  const overview = (isOnline ? dailyData?.overview : cachedData?.overview) || [];
  const summary = (isOnline ? dailyData?.summary : cachedData?.summary) || {};
  const lateAlerts = (isOnline ? dailyData?.lateAlerts : cachedData?.lateAlerts) || [];

  // ── History Query ────────────────────────────────────────────────────────
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['staffAttendanceHistory', historyFrom, historyTo, historyStaffId, historyStatus],
    queryFn: async () => {
      const params = { from: historyFrom, to: historyTo };
      if (historyStaffId) params.staffId = historyStaffId;
      if (historyStatus) params.status = historyStatus;
      const res = await api.get('/staff-attendance/admin/history', { params });
      return res.data?.data;
    },
    enabled: isOnline && activeTab === 'history',
  });

  // ── Bulk Save Mutation ───────────────────────────────────────────────────
  const bulkMutation = useMutation({
    mutationFn: async () => {
      const records = Object.entries(editMap).map(([staffId, status]) => ({ staffId, status }));
      if (records.length === 0) throw new Error('No changes to save');
      return api.post('/staff-attendance/admin/bulk', { date: selectedDate, records });
    },
    onSuccess: () => {
      showMsg(`Attendance saved for ${Object.keys(editMap).length} staff member${Object.keys(editMap).length > 1 ? 's' : ''}.`, 'success');
      setEditMap({});
      queryClient.invalidateQueries({ queryKey: ['staffAttendanceDaily'] });
    },
    onError: (err) => showMsg(err.response?.data?.message || err.message || 'Save failed', 'error'),
  });

  // ── Mark All Handler ─────────────────────────────────────────────────────
  const handleMarkAll = (status) => {
    const newMap = {};
    filteredOverview.forEach((s) => { newMap[s.staffId] = status; });
    setEditMap((prev) => ({ ...prev, ...newMap }));
  };

  // ── Filter ───────────────────────────────────────────────────────────────
  const filteredOverview = overview.filter((s) => {
    const nameMatch = s.name.toLowerCase().includes(search.toLowerCase());
    const roleMatch = roleFilter === 'all' || s.role === roleFilter;
    return nameMatch && roleMatch;
  });

  const allRoles = [...new Set(overview.map((s) => s.role))].filter(Boolean);

  // ── Export CSV ───────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ['Name', 'Role', 'Status', 'Check In', 'Check Out', 'GPS Verified'],
      ...filteredOverview.map((s) => [
        s.name, s.role,
        editMap[s.staffId] || s.status,
        formatTime(s.checkInTime),
        formatTime(s.checkOutTime),
        s.geofenceVerified ? 'Yes' : 'No',
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `staff-attendance-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pendingChanges = Object.keys(editMap).length;

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Fingerprint className="w-6 h-6 text-[#78282E]" />
            Staff Attendance Register
          </h1>
          <p className="text-xs text-slate-500 mt-1">Track and manage attendance for all teaching and non-teaching staff</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl self-start sm:self-center">
          {[{ key: 'daily', label: 'Daily Register', icon: Calendar }, { key: 'history', label: 'History', icon: History }].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${activeTab === key ? 'bg-[#78282E] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── GPS Geofence Configuration Panel ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <button
          id="gps-settings-toggle"
          onClick={() => setShowGpsSettings((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition group"
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${geofenceData?.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              <MapPin className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-slate-900">GPS Geofence Settings</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {geofenceData?.enabled
                  ? `Active — staff must be within ${geofenceData.radiusMetres}m of school to check in`
                  : 'Disabled — click to configure school location for fraud prevention'}
              </p>
            </div>
            {geofenceData?.enabled && (
              <span className="ml-2 px-2.5 py-1 text-[10px] font-black bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wider border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Active
              </span>
            )}
          </div>
          {showGpsSettings
            ? <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />
            : <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition" />}
        </button>

        {showGpsSettings && (
          <div className="border-t border-slate-100 px-6 pb-6 pt-5 space-y-5">

            {/* Feedback */}
            {geofenceMsg.text && (
              <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2 ${
                geofenceMsg.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}>
                {geofenceMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />}
                {geofenceMsg.text}
              </div>
            )}

            {/* Enable / Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <p className="text-sm font-black text-slate-900">Enable GPS Geofencing</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  When enabled, staff must be physically present at school to check in.
                  Admin can still override manually.
                </p>
              </div>
              <button
                id="geofence-toggle-btn"
                onClick={() => setGeofenceForm((p) => ({ ...p, enabled: !p.enabled }))}
                className="ml-4 flex-shrink-0"
              >
                {geofenceForm.enabled
                  ? <ToggleRight className="w-10 h-10 text-emerald-600" />
                  : <ToggleLeft className="w-10 h-10 text-slate-400" />}
              </button>
            </div>

            {/* Coordinates */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">School GPS Coordinates</p>
                <button
                  id="detect-location-btn"
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={gpsLocating}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-xl transition disabled:opacity-60"
                >
                  {gpsLocating
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Navigation className="w-3.5 h-3.5" />}
                  {gpsLocating ? 'Searching for GPS signal…' : 'Use My Current Location'}
                </button>
              </div>

              {/* Live GPS accuracy meter while searching */}
              {gpsLocating && (
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-800">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Acquiring GPS signal — please wait…
                    </span>
                    {gpsAccuracy !== null && (
                      <span className={`font-black px-2 py-0.5 rounded-md ${
                        gpsAccuracy <= 50 ? 'bg-emerald-200 text-emerald-900'
                        : gpsAccuracy <= 200 ? 'bg-amber-200 text-amber-900'
                        : 'bg-rose-200 text-rose-900'
                      }`}>
                        ±{gpsAccuracy}m
                      </span>
                    )}
                  </div>
                  {/* Accuracy progress bar */}
                  {gpsAccuracy !== null && (
                    <div className="w-full h-2.5 bg-indigo-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          gpsAccuracy <= 50 ? 'bg-emerald-500'
                          : gpsAccuracy <= 200 ? 'bg-amber-400'
                          : 'bg-rose-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.round((1000 - Math.min(gpsAccuracy, 1000)) / 1000 * 100))}%` }}
                      />
                    </div>
                  )}
                  <p className="text-[11px] text-indigo-600">
                    {gpsAccuracy === null
                      ? 'Waiting for first signal… Go near a window or step outside for best results.'
                      : gpsAccuracy <= 50
                      ? '✅ Excellent — locking in coordinates now.'
                      : gpsAccuracy <= 200
                      ? '⚠️ Fair accuracy — holding on for a better GPS fix…'
                      : '❌ Very coarse (likely IP/cell tower) — move outdoors and wait for the bar to go green.'}
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                Click the button <strong>while at school</strong>, step outdoors or near a window, and wait for the accuracy bar to turn <span className="text-emerald-600 font-bold">green (≤50m)</span>. This takes 10–30 seconds on real GPS.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Latitude <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="geofence-lat"
                    type="number"
                    step="0.0000001"
                    placeholder="e.g. 9.4075 (Tamale)"
                    value={geofenceForm.lat}
                    onChange={(e) => setGeofenceForm((p) => ({ ...p, lat: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#78282E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Longitude <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="geofence-lng"
                    type="number"
                    step="0.0000001"
                    placeholder="e.g. -0.8393 (Tamale)"
                    value={geofenceForm.lng}
                    onChange={(e) => setGeofenceForm((p) => ({ ...p, lng: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#78282E]"
                  />
                </div>
              </div>

              {geofenceForm.lat && geofenceForm.lng && (
                <a
                  href={`https://www.google.com/maps?q=${geofenceForm.lat},${geofenceForm.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Verify on Google Maps ↗
                </a>
              )}
            </div>

            {/* Radius & Late Threshold */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Allowed Radius (metres)
                </label>
                <input
                  id="geofence-radius"
                  type="number"
                  min={50}
                  max={1000}
                  step={10}
                  value={geofenceForm.radiusMetres}
                  onChange={(e) => setGeofenceForm((p) => ({ ...p, radiusMetres: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]"
                />
                <p className="text-[10px] text-slate-400 mt-1">Recommended: 100–200m. Smaller = stricter.</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Late Threshold (minutes after 7:30 AM)
                </label>
                <input
                  id="geofence-late-threshold"
                  type="number"
                  min={0}
                  max={120}
                  step={5}
                  value={geofenceForm.lateThresholdMinutes}
                  onChange={(e) => setGeofenceForm((p) => ({ ...p, lateThresholdMinutes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  e.g. 15 = marked Late if they check in after 7:45 AM.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button
                id="save-geofence-btn"
                onClick={() => geofenceMutation.mutate()}
                disabled={geofenceMutation.isPending || !isOnline}
                className="px-6 py-2.5 bg-[#78282E] hover:bg-[#6B2228] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50"
              >
                {geofenceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {geofenceMutation.isPending ? 'Saving…' : 'Save GPS Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Feedback ── */}
      {message.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      {/* ── Offline Banner ── */}
      {!isOnline && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-amber-800">
          <WifiOff className="w-4 h-4 text-amber-600" />
          Offline — showing cached data {cachedAt && `(as of ${new Date(cachedAt).toLocaleTimeString()})`}. Changes cannot be saved until you reconnect.
        </div>
      )}

      {/* ── Late Alerts Banner ── */}
      {activeTab === 'daily' && lateAlerts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-800">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-black text-sm">Late Arrival Alerts Today</p>
            <p className="mt-0.5 font-medium">{lateAlerts.length} staff member{lateAlerts.length > 1 ? 's' : ''} checked in late and the system has flagged it.</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DAILY REGISTER TAB                                                    */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'daily' && (
        <div className="space-y-5">

          {/* Controls */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-wrap gap-4 items-end">
            {/* Date Nav */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</label>
              <div className="flex items-center gap-1">
                <button onClick={() => setSelectedDate(d => offsetDate(d, -1))} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  max={toDateInputValue(new Date())}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]"
                />
                <button
                  onClick={() => { if (selectedDate < toDateInputValue(new Date())) setSelectedDate(d => offsetDate(d, 1)); }}
                  disabled={selectedDate >= toDateInputValue(new Date())}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Search Staff</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Name or role…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Filter Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]"
              >
                <option value="all">All Roles</option>
                {allRoles.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <button onClick={() => handleMarkAll('present')} className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition">All Present</button>
              <button onClick={() => handleMarkAll('absent')} className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition">All Absent</button>
              <button onClick={handleExport} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button onClick={() => refetchDaily()} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition" title="Refresh">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {!isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <SummaryCard label="Total Staff" value={summary.total || 0} color="slate" />
              <SummaryCard label="Present" value={summary.present || 0} color="emerald" />
              <SummaryCard label="Late" value={summary.late || 0} color="amber" />
              <SummaryCard label="Absent" value={summary.absent || 0} color="rose" />
              <SummaryCard label="On Leave" value={summary.onLeave || 0} color="indigo" />
              <SummaryCard label="Not Marked" value={summary.notMarked || 0} color="slate" sub="Need attention" />
            </div>
          )}

          {/* Attendance Table */}
          {isLoading && !cachedData ? (
            <div className="h-64 bg-white rounded-3xl border border-slate-200 animate-pulse" />
          ) : filteredOverview.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-2">
              <Users className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="font-bold text-sm">No staff found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#78282E]" />
                  Daily Staff Register — {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                {pendingChanges > 0 && (
                  <button
                    onClick={() => bulkMutation.mutate()}
                    disabled={bulkMutation.isPending || !isOnline}
                    className="px-5 py-2.5 bg-[#78282E] hover:bg-[#6B2228] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {bulkMutation.isPending ? 'Saving…' : `Save ${pendingChanges} Change${pendingChanges > 1 ? 's' : ''}`}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-3.5 rounded-l-xl">Staff Member</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Check In</th>
                      <th className="p-3.5">Check Out</th>
                      <th className="p-3.5 text-center">GPS</th>
                      <th className="p-3.5 rounded-r-xl">Status / Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredOverview.map((staff) => {
                      const effectiveStatus = editMap[staff.staffId] || staff.status;
                      const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.not_marked;
                      const isEdited = !!editMap[staff.staffId];

                      return (
                        <tr
                          key={staff.staffId}
                          className={`hover:bg-slate-50/80 transition ${isEdited ? 'bg-amber-50/60' : ''}`}
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              {staff.photoUrl ? (
                                <img src={staff.photoUrl} alt={staff.name} className="w-9 h-9 rounded-xl object-cover" />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-[#78282E]/10 text-[#78282E] font-black flex items-center justify-center text-sm flex-shrink-0">
                                  {staff.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-bold text-slate-900">{staff.name}</p>
                                {staff.markedByRole === 'self' && (
                                  <p className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                    <Fingerprint className="w-2.5 h-2.5" /> Self Check-in
                                  </p>
                                )}
                                {staff.markedByRole === 'admin' && (
                                  <p className="text-[10px] text-indigo-500 font-bold">Admin Override</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="capitalize font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              {staff.role}
                            </span>
                          </td>
                          <td className="p-3.5 font-bold text-slate-700 tabular-nums">
                            {formatTime(staff.checkInTime)}
                          </td>
                          <td className="p-3.5 font-bold text-slate-700 tabular-nums">
                            {formatTime(staff.checkOutTime)}
                          </td>
                          <td className="p-3.5 text-center">
                            {staff.geofenceVerified ? (
                              <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto" title="GPS verified at school" />
                            ) : staff.checkInTime ? (
                              <MapPin className="w-4 h-4 text-amber-500 mx-auto" title="Admin override / No GPS" />
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <select
                              value={effectiveStatus}
                              onChange={(e) => setEditMap((prev) => ({ ...prev, [staff.staffId]: e.target.value }))}
                              disabled={!isOnline}
                              className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#78282E] transition ${cfg.bg} ${cfg.text} ${cfg.border} ${isEdited ? 'ring-2 ring-amber-400' : ''}`}
                            >
                              <option value="not_marked" disabled>Not Marked</option>
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_CONFIG[s].label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pendingChanges > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <p className="text-xs text-amber-700 font-bold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                    {pendingChanges} unsaved change{pendingChanges > 1 ? 's' : ''} — click Save to apply
                  </p>
                  <button
                    onClick={() => bulkMutation.mutate()}
                    disabled={bulkMutation.isPending || !isOnline}
                    className="px-5 py-2.5 bg-[#78282E] hover:bg-[#6B2228] text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {bulkMutation.isPending ? 'Saving…' : `Save Changes`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HISTORY TAB                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-5">
          {/* History Filters */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">From</label>
              <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">To</label>
              <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <select value={historyStatus} onChange={(e) => setHistoryStatus(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]">
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Filter Staff</label>
              <select value={historyStaffId} onChange={(e) => setHistoryStaffId(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]">
                <option value="">All Staff</option>
                {overview.map((s) => <option key={s.staffId} value={s.staffId}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* History Summary */}
          {!historyLoading && historyData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <SummaryCard label="Total Records" value={historyData.summary.total || 0} color="slate" />
              <SummaryCard label="Present" value={historyData.summary.present || 0} color="emerald" />
              <SummaryCard label="Late" value={historyData.summary.late || 0} color="amber" />
              <SummaryCard label="Absent" value={historyData.summary.absent || 0} color="rose" />
              <SummaryCard label="On Leave" value={historyData.summary.on_leave || 0} color="indigo" />
            </div>
          )}

          {/* History Table */}
          {historyLoading ? (
            <div className="h-64 bg-white rounded-3xl border border-slate-200 animate-pulse" />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                      <th className="p-3.5 rounded-l-xl">Date</th>
                      <th className="p-3.5">Staff Member</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Check In</th>
                      <th className="p-3.5">Check Out</th>
                      <th className="p-3.5 rounded-r-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(historyData?.records || []).map((rec) => {
                      const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.not_marked;
                      return (
                        <tr key={rec._id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3.5 font-bold text-slate-700">
                            {new Date(rec.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              {rec.staff?.photoUrl ? (
                                <img src={rec.staff.photoUrl} alt="" className="w-7 h-7 rounded-lg object-cover" />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-[#78282E]/10 text-[#78282E] font-black flex items-center justify-center text-xs">
                                  {rec.staff?.firstName?.charAt(0)}
                                </div>
                              )}
                              <span className="font-bold text-slate-900">
                                {rec.staff?.title ? `${rec.staff.title} ` : ''}{rec.staff?.firstName} {rec.staff?.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="p-3.5 capitalize font-medium text-slate-600">{rec.staff?.role}</td>
                          <td className="p-3.5 font-bold tabular-nums text-slate-700">{formatTime(rec.checkInTime)}</td>
                          <td className="p-3.5 font-bold tabular-nums text-slate-700">{formatTime(rec.checkOutTime)}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 text-[11px] font-black rounded-lg uppercase border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                              {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {(historyData?.records || []).length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                          No records found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StaffAttendancePage;
