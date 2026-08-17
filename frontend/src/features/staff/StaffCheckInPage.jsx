import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Building2,
  Navigation,
  Signal,
  Timer,
  XCircle,
  TrendingUp,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  late: { label: 'Late', color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  absent: { label: 'Absent', color: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  on_leave: { label: 'On Leave', color: 'indigo', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  half_day: { label: 'Half Day', color: 'violet', bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  not_marked: { label: 'Not Marked', color: 'slate', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
};

// ─── GPS Quality Classifier ───────────────────────────────────────────────────

function classifyGpsQuality(accuracy, maxAccuracy = 50) {
  if (accuracy == null) return null;
  if (accuracy <= 15) return { level: 'excellent', label: 'Excellent', color: 'emerald' };
  if (accuracy <= maxAccuracy) return { level: 'acceptable', label: 'Acceptable', color: 'blue' };
  return { level: 'poor', label: 'Poor Signal', color: 'amber' };
}

// ─── GPS Helper ───────────────────────────────────────────────────────────────

/**
 * High-Accuracy GPS Acquisition with live progress callbacks.
 * Samples continuously for up to 15s, resolves as soon as accuracy ≤ 30m.
 * Returns { lat, lng, accuracy }.
 */
function getAccurateDeviceLocation(onProgress) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('GPS/Geolocation is not supported on this device or browser.'));
    }

    if (
      typeof window !== 'undefined' &&
      window.isSecureContext === false &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      return reject(new Error('GPS Geolocation requires a secure HTTPS connection. Please access the portal via HTTPS.'));
    }

    let bestFix = null;
    let watchId = null;
    let timerId = null;
    let resolved = false;

    const cleanup = () => {
      resolved = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timerId !== null) clearTimeout(timerId);
    };

    timerId = setTimeout(() => {
      cleanup();
      if (bestFix) {
        resolve(bestFix);
      } else {
        reject(new Error(
          'Could not acquire GPS fix within 15 seconds. Please ensure device Location/GPS is turned ON and move to an open area.'
        ));
      }
    }, 15000);

    const handlePos = (pos) => {
      if (resolved) return;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy || 100);

      if (onProgress) onProgress({ lat, lng, accuracy });

      if (!bestFix || accuracy < bestFix.accuracy) {
        bestFix = { lat, lng, accuracy };
      }

      // Excellent fix — resolve immediately
      if (accuracy <= 30) {
        cleanup();
        resolve(bestFix);
      }
    };

    const handleErr = (err) => {
      if (bestFix) {
        cleanup();
        return resolve(bestFix);
      }
      if (err.code === 1) {
        cleanup();
        return reject(new Error(
          'Location permission was denied. Please click the lock 🔒 icon next to the URL bar to allow location access, then try again.'
        ));
      }
      if (err.code === 2) {
        cleanup();
        return reject(new Error(
          'Device location is unavailable. Please ensure your device GPS / Location service is switched ON.'
        ));
      }
    };

    navigator.geolocation.getCurrentPosition(handlePos, handleErr, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });

    watchId = navigator.geolocation.watchPosition(handlePos, handleErr, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  });
}

// ─── Live Clock ───────────────────────────────────────────────────────────────

const LiveClock = () => {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{time}</span>;
};

// ─── Live Working Timer ───────────────────────────────────────────────────────

const WorkingTimer = ({ checkInTime }) => {
  const calcMins = useCallback(() => {
    if (!checkInTime) return 0;
    const [h, m] = checkInTime.split(':').map(Number);
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const inMins = h * 60 + m;
    return Math.max(0, nowMins - inMins);
  }, [checkInTime]);

  const [mins, setMins] = useState(calcMins);
  useEffect(() => {
    const id = setInterval(() => setMins(calcMins()), 60000);
    return () => clearInterval(id);
  }, [calcMins]);

  return <span>{formatDuration(mins)}</span>;
};

// ─── GPS Quality Badge ────────────────────────────────────────────────────────

const GpsQualityBadge = ({ accuracy, maxAccuracy }) => {
  const q = classifyGpsQuality(accuracy, maxAccuracy);
  if (!q) return null;
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors[q.color]}`}>
      <Signal className="w-3 h-3" />
      {q.label} (±{accuracy}m)
    </span>
  );
};

// ─── GPS Acquiring Panel ──────────────────────────────────────────────────────

const GpsAcquiringPanel = ({ progressText, accuracy, branchName, maxAccuracy }) => {
  const q = classifyGpsQuality(accuracy, maxAccuracy);
  const barWidth = accuracy == null ? 30 : Math.max(5, Math.min(100, 100 - (accuracy / maxAccuracy) * 80));
  const barColor = !q ? 'bg-indigo-400' : q.level === 'excellent' ? 'bg-emerald-500' : q.level === 'acceptable' ? 'bg-blue-500' : 'bg-amber-500';

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-bold text-indigo-800">
          <MapPin className="w-4 h-4 text-indigo-600 animate-bounce flex-shrink-0" />
          {progressText || `Acquiring GPS fix for ${branchName}…`}
        </span>
        {accuracy != null && (
          <span className="text-[10px] font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            ±{accuracy}m
          </span>
        )}
      </div>

      {/* GPS accuracy bar */}
      <div className="space-y-1">
        <div className="h-1.5 bg-indigo-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        <p className="text-[11px] text-indigo-600">
          Verifying your device is within the permitted radius of <strong>{branchName}</strong>.
        </p>
      </div>
    </div>
  );
};

// ─── GPS Error Panel ──────────────────────────────────────────────────────────

const GpsErrorPanel = ({ error, rejectionCode, onRetry }) => {
  const isAccuracy = rejectionCode === 'GPS_ACCURACY_TOO_LOW';
  const isOutside = rejectionCode === 'OUTSIDE_GEOFENCE';
  const isPermission = error?.includes('permission') || error?.includes('denied');

  return (
    <div className={`rounded-2xl border p-4 space-y-2 ${isOutside ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-start gap-2">
        <ShieldX className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isOutside ? 'text-rose-600' : 'text-amber-600'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-extrabold ${isOutside ? 'text-rose-900' : 'text-amber-900'}`}>
            {isOutside ? 'Outside Attendance Area' : isAccuracy ? 'GPS Signal Too Weak' : isPermission ? 'Location Permission Required' : 'GPS Location Check Failed'}
          </p>
          <p className={`text-[11px] font-normal mt-0.5 ${isOutside ? 'text-rose-700' : 'text-amber-700'}`}>
            {error}
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className={`w-full py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors ${
            isOutside
              ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200'
              : 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Try Again
        </button>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const StaffCheckInPage = () => {
  const { user } = useAuth();
  const { isOnline, pendingCount } = useOffline();
  const queryClient = useQueryClient();

  const [message, setMessage] = useState({ text: '', type: '' });
  const [gpsPhase, setGpsPhase] = useState('idle'); // idle | requesting | ok | error
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsProgressText, setGpsProgressText] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [gpsRejectionCode, setGpsRejectionCode] = useState('');
  const [localStatus, setLocalStatus] = useState(null); // offline fallback
  const [actionMode, setActionMode] = useState(''); // 'checkIn' | 'checkOut'

  const showMessage = (text, type = 'success', duration = 8000) => {
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
      const staffId = user?.refStaff?._id || user?.refStaff;
      if (staffId) {
        const cached = await getMyTodayStatusLocal(String(staffId));
        setLocalStatus(cached);
      }
    },
  });

  // Offline: load local status on mount
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
  const assignedBranch = statusData?.assignedBranch || 'Zogbeli';
  const geofenceInfo = statusData?.geofence;
  const branchConfig = geofenceInfo?.branch;
  const maxAccuracy = branchConfig?.maxGpsAccuracyMeters || 50;

  const hasCheckedIn = !!todayRecord?.checkInTime;
  const hasCheckedOut = !!todayRecord?.checkOutTime;
  const isBusy = gpsPhase === 'requesting';

  const statusCfg = STATUS_CONFIG[todayRecord?.status || 'not_marked'];

  // ── GPS Acquisition ────────────────────────────────────────────────────────
  const acquireGps = useCallback(async (mode) => {
    setGpsPhase('requesting');
    setGpsAccuracy(null);
    setGpsProgressText('Connecting to GPS satellites…');
    setGpsError('');
    setGpsRejectionCode('');
    setActionMode(mode);

    if (geofenceInfo?.enabled === false) {
      return { lat: null, lng: null, accuracy: null };
    }

    const pos = await getAccurateDeviceLocation((prog) => {
      setGpsAccuracy(prog.accuracy);
      setGpsProgressText(`Acquiring GPS fix (Accuracy: ±${prog.accuracy}m)…`);
    });

    setGpsAccuracy(pos.accuracy);
    setGpsProgressText(`GPS locked (±${pos.accuracy}m). Verifying location…`);
    setGpsPhase('ok');
    return pos;
  }, [geofenceInfo]);

  // ── Check-In Mutation ─────────────────────────────────────────────────────
  const checkInMutation = useMutation({
    mutationFn: async () => {
      let lat = null, lng = null, accuracy = null;

      try {
        const pos = await acquireGps('checkIn');
        lat = pos.lat;
        lng = pos.lng;
        accuracy = pos.accuracy;
      } catch (err) {
        setGpsPhase('error');
        setGpsError(err.message);
        throw err;
      }

      if (!isOnline) {
        const staffId = user?.refStaff?._id || user?.refStaff;
        const now = getCurrentTime();
        const record = await saveCheckInLocal({
          staffId: String(staffId),
          status: 'present',
          checkInTime: now,
          lat,
          lng,
          branch: assignedBranch,
        });
        setLocalStatus(record);
        return { offline: true, record };
      }

      const res = await api.post('/staff-attendance/check-in', { lat, lng, accuracy });
      return res.data;
    },
    onSuccess: (data) => {
      setGpsPhase('idle');
      if (data.offline) {
        showMessage('Checked in locally. Will sync when you are back online.', 'warning');
      } else {
        showMessage(data.message || 'Checked in successfully!', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['staffMyStatus'] });
    },
    onError: (err) => {
      setGpsPhase('error');
      const apiMsg = err.response?.data?.message;
      const code = err.response?.data?.rejectionCode || '';
      setGpsRejectionCode(code);
      if (apiMsg) setGpsError(apiMsg);
      showMessage(apiMsg || err.message || 'Check-in failed.', 'error', 0); // 0 = don't auto-dismiss
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

      // GPS required at checkout too
      let lat = null, lng = null, accuracy = null;
      if (geofenceInfo?.requireGpsOnCheckout !== false && geofenceInfo?.enabled !== false) {
        try {
          const pos = await acquireGps('checkOut');
          lat = pos.lat;
          lng = pos.lng;
          accuracy = pos.accuracy;
        } catch (err) {
          setGpsPhase('error');
          setGpsError(err.message);
          throw err;
        }
      }

      const res = await api.post('/staff-attendance/check-out', { lat, lng, accuracy });
      return res.data;
    },
    onSuccess: (data) => {
      setGpsPhase('idle');
      if (data.offline) {
        showMessage('Checked out locally. Will sync when you are back online.', 'warning');
      } else {
        showMessage(data.message || 'Checked out successfully!', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['staffMyStatus'] });
    },
    onError: (err) => {
      setGpsPhase('error');
      const apiMsg = err.response?.data?.message;
      const code = err.response?.data?.rejectionCode || '';
      setGpsRejectionCode(code);
      if (apiMsg) setGpsError(apiMsg);
      showMessage(apiMsg || err.message || 'Check-out failed.', 'error', 0);
    },
  });

  const handleRetry = () => {
    setGpsPhase('idle');
    setGpsError('');
    setGpsRejectionCode('');
    setMessage({ text: '', type: '' });
  };

  // ── Derived UI ────────────────────────────────────────────────────────────
  const branchName = `${assignedBranch} Branch`;
  const branchColor = assignedBranch === 'Vittin' ? '[#b45309]' : '[#78282E]';

  const showGpsRequiredForCheckout =
    !hasCheckedOut && hasCheckedIn && geofenceInfo?.requireGpsOnCheckout !== false && geofenceInfo?.enabled !== false;

  return (
    <div className="space-y-5 pb-16 max-w-2xl mx-auto">

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
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-start gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : message.type === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200'
          : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
           : message.type === 'warning' ? <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600" />
           : <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage({ text: '', type: '' })} className="flex-shrink-0 opacity-60 hover:opacity-100">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Pending Sync Banner ── */}
      {pendingCount > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-xs font-bold text-amber-800">
          <RotateCcw className="w-4 h-4 text-amber-600 animate-spin" />
          {pendingCount} attendance record{pendingCount > 1 ? 's' : ''} pending sync to server
        </div>
      )}

      {/* ── Assigned Branch (read-only) ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#78282E]" />
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Assigned Branch</h2>
          </div>
          {branchConfig?.radiusMetres && (
            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              GPS Radius: {branchConfig.radiusMetres}m
            </span>
          )}
        </div>

        <div className={`flex items-center gap-3 p-4 rounded-2xl border ${
          assignedBranch === 'Vittin'
            ? 'bg-amber-50 border-amber-200'
            : assignedBranch === 'Both'
            ? 'bg-slate-50 border-slate-200'
            : 'bg-red-950/5 border-[#78282E]/30'
        }`}>
          <MapPin className={`w-5 h-5 flex-shrink-0 ${assignedBranch === 'Vittin' ? 'text-amber-700' : assignedBranch === 'Both' ? 'text-slate-500' : 'text-[#78282E]'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900">
              {assignedBranch === 'Both' ? 'Any Branch (Auto-Detected)' : branchName}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {assignedBranch === 'Zogbeli' && 'Nursery 1 – Primary 4 Classes'}
              {assignedBranch === 'Vittin' && 'Primary 5 – JHS 3 Classes'}
              {assignedBranch === 'Both' && 'Your nearest campus will be detected automatically'}
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-white border border-slate-200 px-2.5 py-1 rounded-full whitespace-nowrap">
            System Assigned
          </span>
        </div>

        {/* Time Policy info */}
        {geofenceInfo && (
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
            {geofenceInfo.checkInStartTime && (
              <span className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" /> Opens {formatTime(geofenceInfo.checkInStartTime)}
              </span>
            )}
            {geofenceInfo.lateAfterTime && (
              <span className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full text-amber-700">
                <AlertTriangle className="w-3 h-3" /> Late after {formatTime(geofenceInfo.lateAfterTime)}
              </span>
            )}
            {geofenceInfo.checkInEndTime && (
              <span className="flex items-center gap-1 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full text-rose-700">
                <XCircle className="w-3 h-3" /> Closes {formatTime(geofenceInfo.checkInEndTime)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Today's Status & Actions ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5">
        <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
          <span>Today's Status</span>
          {todayRecord?.branch && (
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full normal-case">
              {todayRecord.branch} Branch
            </span>
          )}
        </h2>

        {isLoading ? (
          <div className="h-32 animate-pulse bg-slate-100 rounded-2xl" />
        ) : (
          <>
            {/* Status Badge */}
            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${statusCfg.bg} ${statusCfg.border}`}>
              <div className={`w-3 h-3 rounded-full ${statusCfg.dot} ${!hasCheckedIn ? 'animate-pulse' : ''}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-base font-black ${statusCfg.text}`}>{statusCfg.label}</p>
                <div className="space-y-0.5 mt-0.5">
                  {todayRecord?.checkInTime && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
                      <LogIn className="w-3 h-3" />
                      In: <span className="font-bold text-slate-700">{formatTime(todayRecord.checkInTime)}</span>
                      {todayRecord?.checkInAccuracy != null && (
                        <GpsQualityBadge accuracy={todayRecord.checkInAccuracy} maxAccuracy={maxAccuracy} />
                      )}
                      {todayRecord?.distanceFromSchool != null && (
                        <span className="text-[10px] text-slate-400">{todayRecord.distanceFromSchool}m from campus</span>
                      )}
                    </p>
                  )}
                  {todayRecord?.checkOutTime && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
                      <LogOut className="w-3 h-3" />
                      Out: <span className="font-bold text-slate-700">{formatTime(todayRecord.checkOutTime)}</span>
                      {todayRecord?.checkOutAccuracy != null && (
                        <GpsQualityBadge accuracy={todayRecord.checkOutAccuracy} maxAccuracy={maxAccuracy} />
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 ml-auto">
                {todayRecord?.geofenceVerified && (
                  <span className="flex items-center gap-1 text-emerald-600 text-[11px] font-bold">
                    <ShieldCheck className="w-4 h-4" /> GPS Verified
                  </span>
                )}
                {todayRecord && !todayRecord.geofenceVerified && todayRecord.markedByRole === 'admin' && (
                  <span className="flex items-center gap-1 text-indigo-600 text-[11px] font-bold">
                    <ShieldCheck className="w-4 h-4" /> Admin Marked
                  </span>
                )}
                {localStatus?.pending && (
                  <span className="flex items-center gap-1 text-amber-600 text-[11px] font-bold">
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" /> Pending Sync
                  </span>
                )}
              </div>
            </div>

            {/* Working time counter */}
            {hasCheckedIn && !hasCheckedOut && (
              <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <Timer className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">Working Time Today</p>
                  <p className="text-sm font-black text-emerald-900">
                    <WorkingTimer checkInTime={todayRecord.checkInTime} />
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-[10px] text-emerald-600">Checked in</p>
                  <p className="text-xs font-bold text-emerald-800">{formatTime(todayRecord.checkInTime)}</p>
                </div>
              </div>
            )}

            {/* Completed summary */}
            {hasCheckedIn && hasCheckedOut && (
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                <TrendingUp className="w-5 h-5 text-slate-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-700">Total Working Time</p>
                  <p className="text-sm font-black text-slate-900">{formatDuration(todayRecord.totalMinutes)}</p>
                </div>
                <div className="ml-auto text-right text-[11px] text-slate-500">
                  <p>{formatTime(todayRecord.checkInTime)} → {formatTime(todayRecord.checkOutTime)}</p>
                </div>
              </div>
            )}

            {/* GPS acquiring panel */}
            {gpsPhase === 'requesting' && (
              <GpsAcquiringPanel
                progressText={gpsProgressText}
                accuracy={gpsAccuracy}
                branchName={assignedBranch === 'Both' ? 'your nearest branch' : branchName}
                maxAccuracy={maxAccuracy}
              />
            )}

            {/* GPS error panel */}
            {gpsPhase === 'error' && gpsError && (
              <GpsErrorPanel
                error={gpsError}
                rejectionCode={gpsRejectionCode}
                onRetry={handleRetry}
              />
            )}

            {/* Geofence info note */}
            {geofenceInfo?.enabled && !hasCheckedIn && gpsPhase === 'idle' && (
              <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                GPS location scan required — must be within <strong className="text-slate-700 mx-0.5">
                  {branchConfig?.radiusMetres || 150}m
                </strong> of {assignedBranch === 'Both' ? 'your assigned campus' : branchName}
              </div>
            )}

            {showGpsRequiredForCheckout && gpsPhase === 'idle' && (
              <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3.5 py-2.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                GPS required for checkout — must be within <strong className="text-slate-700 mx-0.5">
                  {branchConfig?.radiusMetres || 150}m
                </strong> of {branchName}
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
                  {isBusy && actionMode === 'checkIn'
                    ? `Scanning GPS for ${assignedBranch === 'Both' ? 'your branch' : branchName}…`
                    : `Check In — ${assignedBranch === 'Both' ? 'Nearest Branch' : branchName}`}
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
                    {isBusy && actionMode === 'checkOut' ? 'Scanning GPS…' : 'Check Out'}
                  </button>
                </>
              ) : (
                <div className="col-span-2 flex flex-col items-center justify-center gap-2 py-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-600 font-bold text-sm">
                  <CheckCircle2 className="w-8 h-8 text-slate-400" />
                  <span>Attendance completed for today</span>
                  <span className="text-xs font-medium text-slate-400">
                    In: {formatTime(todayRecord.checkInTime)} &nbsp;·&nbsp; Out: {formatTime(todayRecord.checkOutTime)} &nbsp;·&nbsp; {formatDuration(todayRecord.totalMinutes)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── 30-Day History ── */}
      {history.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4" />
            Attendance History (Last 30 Days)
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
                          {rec.totalMinutes > 0 ? ` · ${formatDuration(rec.totalMinutes)}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {rec.geofenceVerified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" title="GPS Verified" />
                    )}
                    <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg uppercase ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                      {cfg.label}
                    </span>
                  </div>
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
