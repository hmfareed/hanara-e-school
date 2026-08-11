import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useOffline } from '../../context/OfflineContext';
import {
  getMyTodayStatusLocal,
  saveCheckInLocal,
  saveCheckOutLocal,
} from '../../services/staffAttendanceOffline';
import {
  Fingerprint,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wifi,
  WifiOff,
  LogIn,
  LogOut,
  Calendar,
  MapPin,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  History,
  RotateCcw,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(timeStr) {
  if (!timeStr) return '—';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${ampm}`;
}

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  late: { label: 'Late', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  absent: { label: 'Absent', color: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  on_leave: { label: 'On Leave', color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  half_day: { label: 'Half Day', color: 'violet', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  not_marked: { label: 'Not Marked', color: 'slate', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
};

// ─── GPS Helper ───────────────────────────────────────────────────────────────

/**
 * Get device location with high accuracy.
 * Uses watchPosition so it waits for a true GPS fix (not IP/cell fallback).
 * Resolves when accuracy ≤ GOOD_ACCURACY_M or rejects after TIMEOUT_MS.
 */
const CHECKIN_ACCURACY_M = 100; // accept fix once ≤100m for check-in
const CHECKIN_TIMEOUT_MS = 20000;

function getDeviceLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('GPS not available on this device'));
    }

    let watchId = null;

    const deadline = setTimeout(() => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      reject(new Error(
        'Could not get a precise GPS location within 20 seconds. ' +
        'Please ensure GPS/Location is enabled on your device and try again outdoors.'
      ));
    }, CHECKIN_TIMEOUT_MS);

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy;
        if (acc <= CHECKIN_ACCURACY_M) {
          clearTimeout(deadline);
          navigator.geolocation.clearWatch(watchId);
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(acc) });
        }
        // else keep waiting for a better fix
      },
      (err) => {
        clearTimeout(deadline);
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        reject(new Error(err.message || 'Could not read GPS location'));
      },
      { enableHighAccuracy: true, timeout: CHECKIN_TIMEOUT_MS, maximumAge: 0 }
    );
  });
}

// ─── Live Clock Component ─────────────────────────────────────────────────────

const LiveClock = () => {
  const [time, setTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span>{time}</span>;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const StaffCheckInPage = () => {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useOffline();
  const queryClient = useQueryClient();

  const [message, setMessage] = useState({ text: '', type: '' });
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle | requesting | ok | error
  const [gpsError, setGpsError] = useState('');
  const [localStatus, setLocalStatus] = useState(null); // offline fallback

  const showMessage = (text, type = 'success', duration = 5000) => {
    setMessage({ text, type });
    if (duration) setTimeout(() => setMessage({ text: '', type: '' }), duration);
  };

  // ── Load today's status ───────────────────────────────────────────────────
  const { data: statusData, isLoading, refetch } = useQuery({
    queryKey: ['staffMyStatus'],
    queryFn: async () => {
      const res = await api.get('/staff-attendance/my-status');
      return res.data?.data;
    },
    retry: 0,
    onError: async () => {
      // Offline fallback: read from IndexedDB
      const staffId = user?.refStaff?._id || user?.refStaff;
      if (staffId) {
        const cached = await getMyTodayStatusLocal(String(staffId));
        setLocalStatus(cached);
      }
    },
  });

  // Load geofence settings
  const { data: geofence } = useQuery({
    queryKey: ['staffGeofenceSettings'],
    queryFn: async () => {
      const res = await api.get('/staff-attendance/geofence-settings');
      return res.data?.data;
    },
    retry: 0,
    enabled: isOnline,
  });

  // Offline: also try loading local status on mount
  useEffect(() => {
    if (!isOnline) {
      const staffId = user?.refStaff?._id || user?.refStaff;
      if (staffId) {
        getMyTodayStatusLocal(String(staffId)).then((cached) => {
          if (cached) setLocalStatus(cached);
        });
      }
    }
  }, [isOnline, user]);

  const todayRecord = statusData?.today || (isOnline ? null : localStatus);
  const history = statusData?.history || [];

  // ── Check-In Mutation ─────────────────────────────────────────────────────
  const checkInMutation = useMutation({
    mutationFn: async () => {
      setGpsStatus('requesting');
      setGpsError('');
      let lat = null, lng = null;

      // Always try GPS if enabled
      if (geofence?.enabled !== false) {
        try {
          const pos = await getDeviceLocation();
          lat = pos.lat;
          lng = pos.lng;
          setGpsStatus('ok');
        } catch (err) {
          setGpsStatus('error');
          setGpsError(err.message);
          if (geofence?.enabled) {
            throw new Error('Could not get your GPS location. Please enable location access on your device.');
          }
        }
      } else {
        setGpsStatus('idle');
      }

      if (!isOnline) {
        // Offline: save locally and enqueue sync
        const staffId = user?.refStaff?._id || user?.refStaff;
        const now = getCurrentTime();
        const record = await saveCheckInLocal({ staffId: String(staffId), status: 'present', checkInTime: now, lat, lng });
        setLocalStatus(record);
        return { offline: true, record };
      }

      const res = await api.post('/staff-attendance/check-in', { lat, lng });
      return res.data;
    },
    onSuccess: (data) => {
      if (data.offline) {
        showMessage('Checked in locally. Will sync when you are back online.', 'warning');
      } else {
        showMessage(data.message || 'Checked in successfully!', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['staffMyStatus'] });
    },
    onError: (err) => {
      setGpsStatus('idle');
      showMessage(err.response?.data?.message || err.message || 'Check-in failed.', 'error');
    },
  });

  // ── Check-Out Mutation ────────────────────────────────────────────────────
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!isOnline) {
        const staffId = user?.refStaff?._id || user?.refStaff;
        const now = getCurrentTime();
        const record = await saveCheckOutLocal({ staffId: String(staffId), checkOutTime: now });
        setLocalStatus(record);
        return { offline: true, record };
      }
      const res = await api.post('/staff-attendance/check-out');
      return res.data;
    },
    onSuccess: (data) => {
      if (data.offline) {
        showMessage('Checked out locally. Will sync when you are back online.', 'warning');
      } else {
        showMessage(data.message || 'Checked out successfully!', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['staffMyStatus'] });
    },
    onError: (err) => {
      showMessage(err.response?.data?.message || err.message || 'Check-out failed.', 'error');
    },
  });

  const hasCheckedIn = !!todayRecord?.checkInTime;
  const hasCheckedOut = !!todayRecord?.checkOutTime;
  const isBusy = checkInMutation.isPending || checkOutMutation.isPending;

  const statusCfg = STATUS_CONFIG[todayRecord?.status || 'not_marked'];

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">

      {/* ── Header ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <Fingerprint className="w-6 h-6 text-[#78282E]" />
              My Attendance
            </h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {todayLabel()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-2xl font-black text-slate-800 tabular-nums">
              <LiveClock />
            </div>
            <div className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'Offline Mode'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Feedback Message ── */}
      {message.text && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : message.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200'
          : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
           : message.type === 'warning' ? <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
           : <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />}
          {message.text}
        </div>
      )}

      {/* ── Pending Sync Banner ── */}
      {pendingCount > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-amber-800">
          <RotateCcw className="w-4 h-4 text-amber-600 animate-spin" />
          {pendingCount} attendance record{pendingCount > 1 ? 's' : ''} pending sync to server
        </div>
      )}

      {/* ── Today's Status Card ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">Today's Status</h2>

        {isLoading ? (
          <div className="h-32 animate-pulse bg-slate-100 rounded-2xl" />
        ) : (
          <>
            {/* Status Badge */}
            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${statusCfg.bg} ${statusCfg.border}`}>
              <div className={`w-3 h-3 rounded-full ${statusCfg.dot} animate-pulse`} />
              <div>
                <p className={`text-base font-black ${statusCfg.text}`}>{statusCfg.label}</p>
                {todayRecord?.checkInTime && (
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <LogIn className="w-3 h-3" />
                    Checked in at <span className="font-bold text-slate-700 ml-0.5">{formatTime(todayRecord.checkInTime)}</span>
                    {todayRecord?.checkOutTime && (
                      <> &nbsp;·&nbsp; <LogOut className="w-3 h-3" />
                        Checked out at <span className="font-bold text-slate-700 ml-0.5">{formatTime(todayRecord.checkOutTime)}</span>
                      </>
                    )}
                  </p>
                )}
              </div>
              {todayRecord?.geofenceVerified && (
                <div className="ml-auto flex items-center gap-1 text-emerald-600 text-[11px] font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  GPS Verified
                </div>
              )}
              {todayRecord && !todayRecord.geofenceVerified && todayRecord.markedByRole === 'admin' && (
                <div className="ml-auto flex items-center gap-1 text-indigo-600 text-[11px] font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  Admin Marked
                </div>
              )}
              {localStatus?.pending && (
                <div className="ml-auto flex items-center gap-1 text-amber-600 text-[11px] font-bold">
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  Pending Sync
                </div>
              )}
            </div>

            {/* GPS Status indicator while checking in */}
            {gpsStatus === 'requesting' && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3.5 py-3 space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700">
                  <MapPin className="w-4 h-4 animate-bounce flex-shrink-0" />
                  Acquiring GPS signal — waiting for a precise fix…
                </div>
                <p className="text-[11px] text-indigo-500 pl-6">
                  This can take up to 20 seconds. If indoors, move near a window or step outside for best results.
                </p>
              </div>
            )}
            {gpsStatus === 'error' && gpsError && (
              <div className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5">
                <ShieldX className="w-4 h-4" />
                GPS Error: {gpsError}
              </div>
            )}

            {/* Geofence Info */}
            {geofence?.enabled && (
              <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                GPS check-in enabled — you must be within <span className="font-bold text-slate-700 mx-0.5">{geofence.radiusMetres}m</span> of school to check in
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!hasCheckedIn ? (
                <button
                  id="staff-check-in-btn"
                  onClick={() => checkInMutation.mutate()}
                  disabled={isBusy}
                  className="col-span-2 group relative overflow-hidden flex items-center justify-center gap-3 py-5 bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-white/5 group-hover:bg-white/0 transition rounded-2xl" />
                  <LogIn className="w-7 h-7" />
                  {checkInMutation.isPending ? 'Checking in…' : 'Check In Now'}
                </button>
              ) : !hasCheckedOut ? (
                <>
                  <div className="flex items-center justify-center gap-2 py-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    Checked in {formatTime(todayRecord.checkInTime)}
                  </div>
                  <button
                    id="staff-check-out-btn"
                    onClick={() => checkOutMutation.mutate()}
                    disabled={isBusy}
                    className="group relative overflow-hidden flex items-center justify-center gap-2 py-4 bg-gradient-to-br from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                  >
                    <LogOut className="w-5 h-5" />
                    {checkOutMutation.isPending ? 'Checking out…' : 'Check Out'}
                  </button>
                </>
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center gap-2 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-600 font-bold text-sm">
                  <CheckCircle2 className="w-8 h-8 text-slate-400" />
                  <span>Completed for today</span>
                  <span className="text-xs font-medium text-slate-400">
                    In: {formatTime(todayRecord.checkInTime)} &nbsp;·&nbsp; Out: {formatTime(todayRecord.checkOutTime)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── 7-Day History ── */}
      {history.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4" />
            Recent Attendance (Last 7 Days)
          </h2>
          <div className="space-y-2">
            {history.map((rec, i) => {
              const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.not_marked;
              return (
                <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} flex-shrink-0`} />
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {new Date(rec.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      {rec.checkInTime && (
                        <p className="text-[11px] text-slate-500">
                          In: {formatTime(rec.checkInTime)}
                          {rec.checkOutTime ? ` · Out: ${formatTime(rec.checkOutTime)}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg uppercase ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCheckInPage;
