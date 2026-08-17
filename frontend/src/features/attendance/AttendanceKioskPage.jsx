import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { openDB } from 'idb';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Wifi,
  WifiOff,
  RefreshCw,
  Camera,
  Settings,
  UserCheck,
  Building2,
  Calendar,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import api from '../../services/api';
import { processOfflineScan } from '../../services/staffAttendanceOffline';

// ─── IndexedDB Setup for Offline Scanning Queue ─────────────────────────────
const DB_NAME = 'HanaraKioskDB';
const STORE_NAME = 'offlineScans';

async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

async function queueOfflineScan(scanPayload) {
  const db = await initDB();
  await db.add(STORE_NAME, { ...scanPayload, createdAt: new Date().toISOString() });
}

async function getOfflineScans() {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

async function clearOfflineScans() {
  const db = await initDB();
  return db.clear(STORE_NAME);
}

// ─── Audio Chime Synthesis (Web Audio API) ──────────────────────────────────
function playChime(type = 'success') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'late') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.exponentialRampToValueAtTime(554.37, ctx.currentTime + 0.15); // C#5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // error/reject
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn('Audio chime playback omitted:', e);
  }
}

// ─── MAIN KIOSK COMPONENT ───────────────────────────────────────────────────

const AttendanceKioskPage = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [deviceToken, setDeviceToken] = useState(() => localStorage.getItem('hanara_kiosk_token') || '');
  const [showPairModal, setShowPairModal] = useState(!localStorage.getItem('hanara_kiosk_token'));
  const [inputToken, setInputToken] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // verification response payload
  const [scanError, setScanError] = useState(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const scannerRef = useRef(null);
  const html5QrcodeRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Live Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for offline queue count
    updateOfflineCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateOfflineCount = async () => {
    try {
      const items = await getOfflineScans();
      setPendingSyncCount(items.length);
    } catch (e) {
      console.warn('Failed to fetch offline scan queue count', e);
    }
  };

  // Sync Offline Queue
  const syncOfflineQueue = async () => {
    try {
      const items = await getOfflineScans();
      if (!items || items.length === 0) return;

      setIsSyncing(true);
      const res = await api.post('/staff-attendance/sync', { events: items });
      if (res.data?.success) {
        await clearOfflineScans();
        await updateOfflineCount();
      }
    } catch (e) {
      console.error('Offline queue sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Start Camera QR Reader
  const startCamera = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      return;
    }

    try {
      const html5QrCode = new Html5Qrcode('kiosk-qr-reader');
      html5QrcodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'user' }, // Front camera for kiosk tablet
        {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
        },
        onQrCodeScanned,
        () => {} // silent error callback for frame misses
      );
      setScanning(true);
    } catch (err) {
      console.error('Camera startup error:', err);
      // Fallback to environment camera if user camera fails
      try {
        const html5QrCode = new Html5Qrcode('kiosk-qr-reader');
        html5QrcodeRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 280 } },
          onQrCodeScanned,
          () => {}
        );
        setScanning(true);
      } catch (err2) {
        setScanError('Unable to access camera. Please check camera permissions.');
      }
    }
  };

  // Stop Camera
  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (e) {
        console.warn('Camera stop warning:', e);
      }
      html5QrcodeRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Handle scanned QR payload
  const onQrCodeScanned = async (decodedText) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // Get device GPS location if available
      let lat = null;
      let lng = null;
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((res) =>
            navigator.geolocation.getCurrentPosition(res, () => res(null), { timeout: 3000 })
          );
          if (pos) {
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          }
        } catch (e) {}
      }

      const headers = {};
      if (deviceToken) {
        headers['x-kiosk-device-token'] = deviceToken;
      }

      if (!navigator.onLine) {
        // Process offline with local cryptographic verification and display true staff details
        const offlineResult = await processOfflineScan({
          credential: decodedText,
          latitude: lat,
          longitude: lng,
        });

        setScanResult(offlineResult);

        if (soundEnabled) {
          if (offlineResult.eventType === 'REJECTED' || !offlineResult.success) {
            playChime('rejected');
          } else if (offlineResult.data?.record?.status === 'late') {
            playChime('late');
          } else {
            playChime('success');
          }
        }
      } else {
        try {
          const response = await api.post(
            '/staff-attendance/scan',
            { credential: decodedText, latitude: lat, longitude: lng },
            { headers }
          );

          const data = response.data;
          setScanResult(data);

          if (soundEnabled) {
            if (data.eventType === 'REJECTED' || !data.success) {
              playChime('rejected');
            } else if (data.data?.record?.status === 'late') {
              playChime('late');
            } else {
              playChime('success');
            }
          }
        } catch (serverErr) {
          const isOfflineOr5xx = !serverErr.response || serverErr.response.status >= 500;
          if (isOfflineOr5xx) {
            const offlineResult = await processOfflineScan({
              credential: decodedText,
              latitude: lat,
              longitude: lng,
            });
            setScanResult(offlineResult);
            if (soundEnabled) playChime(offlineResult.success ? 'success' : 'rejected');
          } else {
            throw serverErr;
          }
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Invalid QR code or scanner error';
      if (soundEnabled) playChime('rejected');
      setScanResult({
        success: false,
        eventType: 'REJECTED',
        message: errMsg,
      });
    } finally {
      // Pause 4 seconds before allowing next scan
      setTimeout(() => {
        setScanResult(null);
        isProcessingRef.current = false;
      }, 4500);
    }
  };

  const handleSavePairing = (e) => {
    e.preventDefault();
    if (inputToken.trim()) {
      localStorage.setItem('hanara_kiosk_token', inputToken.trim());
      setDeviceToken(inputToken.trim());
      setShowPairModal(false);
    }
  };

  const handleClearPairing = () => {
    localStorage.removeItem('hanara_kiosk_token');
    setDeviceToken('');
    setShowPairModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <header className="px-6 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <QrCode className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
              HANARA SMS <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">Attendance Kiosk</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium">Tamale Model School Campus</p>
          </div>
        </div>

        {/* Live Date / Time & Network Status */}
        <div className="flex items-center space-x-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-slate-200">
              {currentTime.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-xl font-black text-emerald-400 font-mono tracking-wider">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            {isOnline ? (
              <span className="flex items-center text-xs font-semibold text-emerald-400">
                <Wifi className="w-4 h-4 mr-1.5 text-emerald-400 animate-pulse" /> Online
              </span>
            ) : (
              <span className="flex items-center text-xs font-semibold text-amber-400">
                <WifiOff className="w-4 h-4 mr-1.5 text-amber-400" /> Offline
              </span>
            )}
          </div>

          {pendingSyncCount > 0 && (
            <button
              onClick={syncOfflineQueue}
              disabled={isSyncing || !isOnline}
              className="flex items-center space-x-2 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-amber-500/30 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Pending ({pendingSyncCount})</span>
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-all"
            title={soundEnabled ? 'Mute Audio Chimes' : 'Enable Audio Chimes'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </button>

          <button
            onClick={() => setShowPairModal(true)}
            className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-all"
            title="Kiosk Device Settings"
          >
            <Settings className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </header>

      {/* ── Scanner Section ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="w-full max-w-xl flex flex-col items-center">
          {/* Status Instruction */}
          <div className="mb-6 text-center space-y-1">
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" /> Please Scan Your Staff ID
            </h2>
            <p className="text-sm text-slate-400 font-medium">Hold your Staff QR credential up to the scanner camera</p>
          </div>

          {/* Camera View Box */}
          <div className="relative w-full aspect-square max-w-md bg-slate-900 rounded-3xl border-2 border-slate-800 overflow-hidden shadow-2xl shadow-emerald-950/20 flex flex-col items-center justify-center">
            <div id="kiosk-qr-reader" className="w-full h-full object-cover"></div>

            {/* Scanning Laser Animation overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-8">
              <div className="w-full flex justify-between">
                <div className="w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                <div className="w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              </div>
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-pulse" />
              <div className="w-full flex justify-between">
                <div className="w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                <div className="w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Verification Result Modal / Overlay ─────────────────────────── */}
        {scanResult && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
              {/* Top status bar glow */}
              <div
                className={`absolute top-0 left-0 right-0 h-3 ${
                  scanResult.eventType === 'REJECTED' || !scanResult.success
                    ? 'bg-rose-500'
                    : scanResult.data?.record?.status === 'late'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />

              {/* Status Header Badge */}
              <div className="pt-2 flex flex-col items-center space-y-2">
                {scanResult.eventType === 'REJECTED' || !scanResult.success ? (
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30 shadow-lg">
                    <XCircle className="w-10 h-10" />
                  </div>
                ) : scanResult.eventType === 'CHECK_OUT' ? (
                  <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shadow-lg">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                )}

                <h3 className="text-2xl font-black text-white tracking-tight uppercase">
                  {scanResult.eventType === 'REJECTED' || !scanResult.success
                    ? 'ACCESS DENIED'
                    : scanResult.eventType === 'CHECK_OUT'
                    ? 'CHECK-OUT SUCCESSFUL'
                    : scanResult.data?.record?.status === 'late'
                    ? 'LATE CHECK-IN'
                    : 'CHECK-IN SUCCESSFUL'}
                </h3>
                <p className="text-sm font-medium text-slate-300">{scanResult.message}</p>
              </div>

              {/* Staff Anti-Proxy Visual Photo Verification */}
              {scanResult.data?.staff && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col items-center space-y-3">
                  <div className="relative">
                    <img
                      src={
                        scanResult.data.staff.photoUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                          scanResult.data.staff.name || 'Staff'
                        )}`
                      }
                      alt={scanResult.data.staff.name}
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-700 shadow-md"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-950 p-1.5 rounded-xl font-black text-[10px] uppercase flex items-center shadow-lg">
                      <UserCheck className="w-3.5 h-3.5 mr-1" /> Verified
                    </div>
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-white">{scanResult.data.staff.name}</h4>
                    <p className="text-xs font-bold text-emerald-400 tracking-wider">
                      {scanResult.data.staff.staffId || 'STAFF CREDENTIAL'}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      {scanResult.data.staff.department || scanResult.data.staff.role || 'Staff Member'}
                    </p>
                  </div>
                </div>
              )}

              {/* Timestamps details */}
              {scanResult.data?.record && (
                <div className="grid grid-cols-2 gap-3 text-left">
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Check-In</p>
                    <p className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      {scanResult.data.record.checkInTime || '—'}
                    </p>
                  </div>

                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Check-Out</p>
                    <p className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {scanResult.data.record.checkOutTime || '—'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ── Kiosk Device Pairing Modal ────────────────────────────────────── */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Kiosk Device Pairing</h3>
                  <p className="text-xs text-slate-400">Configure device scanner authorization</p>
                </div>
              </div>
              <button
                onClick={() => setShowPairModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSavePairing} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
                  Kiosk Device Secret Token
                </label>
                <input
                  type="password"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Paste HAN_KIOSK_... token here"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-500 mt-2">
                  Generated in Admin Dashboard under Staff Attendance -&gt; Devices panel. If blank, scanner operates using current logged-in web user session.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
                >
                  Save Device Pairing
                </button>
                {deviceToken && (
                  <button
                    type="button"
                    onClick={handleClearPairing}
                    className="px-4 py-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-sm font-bold border border-rose-500/30 transition-all"
                  >
                    Unpair
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceKioskPage;
