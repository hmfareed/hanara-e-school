import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../services/api';
import {
  QrCode,
  ShieldCheck,
  ShieldAlert,
  LogIn,
  LogOut,
  UserCheck,
  History,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  Keyboard,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  Minimize2,
  Users,
  Award,
  RefreshCw,
  PhoneCall,
  Play,
  Upload,
  FileImage,
  ExternalLink
} from 'lucide-react';

// Web Audio API Synthesizer for instant feedback sounds
function playSound(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'checkout') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {
    // Ignore audio context errors
  }
}

const GateScannerPage = () => {
  const queryClient = useQueryClient();
  const [tokenInput, setTokenInput] = useState('');
  const [lastScanResult, setLastScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanMode, setScanMode] = useState('upload'); // 'upload' | 'hardware' | 'camera'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [uploadingFile, setUploadingFile] = useState(false);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Fetch today's terminal stats
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['gateScannerStats'],
    queryFn: async () => {
      const res = await api.get('/gate-scanner/stats');
      return res.data?.data || { staffPresent: 0, studentsLogged: 0, totalScansToday: 0 };
    },
    refetchInterval: 15_000,
  });

  // Fetch sample test tokens
  const { data: sampleTokensData } = useQuery({
    queryKey: ['gateScannerSampleTokens'],
    queryFn: async () => {
      const res = await api.get('/gate-scanner/sample-tokens');
      return res.data?.data || [];
    },
  });

  // Auto-focus manual input in hardware mode
  useEffect(() => {
    if (scanMode === 'hardware' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [scanMode, lastScanResult]);

  // Handle Scan Mutation
  const scanMutation = useMutation({
    mutationFn: async (qrToken) => {
      // Handle both full verification URLs and raw tokens
      let tokenToSubmit = qrToken;
      if (qrToken.includes('/verify-card/')) {
        tokenToSubmit = qrToken.split('/verify-card/')[1]?.split('?')[0] || qrToken;
      }
      const res = await api.post('/gate-scanner/scan', { qrToken: tokenToSubmit });
      return res.data;
    },
    onSuccess: (data) => {
      setLastScanResult(data);
      setScanHistory((prev) => [data, ...prev.slice(0, 24)]);
      if (soundEnabled) {
        if (data.action === 'check_out') playSound('checkout');
        else playSound('success');
      }
      setTokenInput('');
      refetchStats();
    },
    onError: (err) => {
      const errorObj = {
        success: false,
        message: err.response?.data?.message || err.message || 'Invalid or unverified QR Code',
        timestamp: new Date().toLocaleTimeString(),
      };
      setLastScanResult(errorObj);
      if (soundEnabled) playSound('error');
      setTokenInput('');
    },
  });

  // Upload and decode QR Code from image file
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const html5QrCode = new Html5Qrcode('qr-file-temp-container');
      const decodedResult = await html5QrCode.scanFile(file, true);
      scanMutation.mutate(decodedResult);
    } catch (err) {
      console.error('File QR Scan Error:', err);
      const errorObj = {
        success: false,
        message: 'No scannable QR Code detected in image. Please ensure the QR Code is clear and well-lit.',
        timestamp: new Date().toLocaleTimeString(),
      };
      setLastScanResult(errorObj);
      if (soundEnabled) playSound('error');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Start Live Webcam Scanner
  const startCameraScanner = async () => {
    setCameraError('');
    try {
      await stopCameraScanner();

      const html5QrCode = new Html5Qrcode('qr-reader-container');
      html5QrCodeRef.current = html5QrCode;

      const config = { fps: 15, qrbox: { width: 250, height: 250 } };
      await html5QrCode.start(
        { facingMode: facingMode },
        config,
        (decodedText) => {
          scanMutation.mutate(decodedText);
        },
        () => {}
      );
      setCameraActive(true);
    } catch (err) {
      setCameraActive(false);
      setCameraError('Unable to access webcam device. Please check permissions or upload an image file.');
    }
  };

  // Stop Camera Scanner & completely release camera hardware tracks
  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        // ignore stop errors if already stopped
      } finally {
        html5QrCodeRef.current = null;
      }
    }

    // Stop all active MediaStream tracks on the DOM video element to release the camera hardware
    try {
      const container = document.getElementById('qr-reader-container');
      if (container) {
        const videos = container.getElementsByTagName('video');
        for (let i = 0; i < videos.length; i++) {
          const stream = videos[i].srcObject;
          if (stream && stream.getTracks) {
            stream.getTracks().forEach((track) => track.stop());
          }
          videos[i].srcObject = null;
        }
      }
    } catch (err) {
      console.error('Error stopping video tracks:', err);
    }

    setCameraActive(false);
  };

  useEffect(() => {
    if (scanMode === 'camera') {
      startCameraScanner();
    } else {
      stopCameraScanner();
    }

    return () => {
      stopCameraScanner();
    };
  }, [scanMode, facingMode]);

  // Fullscreen controller
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullScreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullScreen(false)).catch(() => {});
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    scanMutation.mutate(tokenInput.trim());
  };

  const handleSampleSelect = (token) => {
    if (!token) return;
    scanMutation.mutate(token);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Hidden temporary div for file scanning */}
      <div id="qr-file-temp-container" className="hidden" />

      {/* ─── Header & Actions ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 shadow-xl text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <Sparkles size={12} /> HANARA Gate Terminal
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <QrCode className="w-7 h-7 text-emerald-400" />
            Gate QR Code Scanner & Verification
          </h1>
          <p className="text-xs text-emerald-200/80">
            Upload QR Code image files, enter token strings, or test instant sample scans.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-white/10 p-1 rounded-xl border border-white/10 backdrop-blur-md">
            <button
              onClick={() => setScanMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scanMode === 'upload' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-white/80 hover:text-white'
              }`}
            >
              <Upload size={14} />
              <span>Upload Image</span>
            </button>
            <button
              onClick={() => setScanMode('hardware')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scanMode === 'hardware' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-white/80 hover:text-white'
              }`}
            >
              <Keyboard size={14} />
              <span>Manual / Token</span>
            </button>
            <button
              onClick={() => setScanMode('camera')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scanMode === 'camera' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-white/80 hover:text-white'
              }`}
            >
              <Camera size={14} />
              <span>Webcam</span>
            </button>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled((s) => !s)}
            className={`p-2.5 rounded-xl border text-xs font-bold transition backdrop-blur-md cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/10 text-white/60 border-white/10'
            }`}
            title={soundEnabled ? 'Audio Chime ON' : 'Audio Muted'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Kiosk Fullscreen Toggle */}
          <button
            onClick={toggleFullScreen}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold text-xs transition backdrop-blur-md cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* ─── Metric Quick Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scans Today</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <QrCode size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{statsData?.totalScansToday || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Terminal gate events</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Staff Checked In</span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <UserCheck size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{statsData?.staffPresent || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Staff present</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students Logged</span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{statsData?.studentsLogged || 0}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Student attendance entries</p>
        </div>
      </div>

      {/* ─── Scanner Workspace & Controls ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Mode Viewport (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
          {scanMode === 'upload' ? (
            /* Upload Image QR Scanner Mode */
            <div className="space-y-6 text-center py-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 p-10 rounded-3xl transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 group"
              >
                <div className="h-16 w-16 rounded-2xl bg-white border border-emerald-200 shadow-sm flex items-center justify-center text-emerald-800 group-hover:scale-110 transition-transform">
                  {uploadingFile ? <RefreshCw className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload & Scan QR Code Image</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Select a QR code photo taken with your mobile phone camera or upload a QR image file to decode instantly.
                  </p>
                </div>
                <button
                  type="button"
                  className="py-2.5 px-5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Choose QR Image File
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : scanMode === 'hardware' ? (
            /* Manual / Barcode Gun Mode */
            <div className="space-y-6 text-center py-6">
              <div className="relative w-24 h-24 mx-auto bg-emerald-50 rounded-3xl border-2 border-dashed border-emerald-300 flex items-center justify-center">
                <QrCode className="w-12 h-12 text-emerald-800" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">Manual Token or Barcode Reader Input</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Type or scan a signed QR token string (e.g., <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800">HNR:student:...</code>).
                </p>
              </div>

              <form onSubmit={handleManualSubmit} className="max-w-md mx-auto flex items-center gap-2">
                <div className="relative flex-1">
                  <Keyboard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Enter QR token or scan string..."
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={scanMutation.isPending || !tokenInput.trim()}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 flex-shrink-0 cursor-pointer"
                >
                  {scanMutation.isPending ? 'Processing...' : 'Submit Token'}
                </button>
              </form>
            </div>
          ) : (
            /* Webcam Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Camera size={16} className="text-emerald-700" /> Webcam Stream
                </span>
                <button
                  onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
                  className="py-1 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Flip Camera ({facingMode === 'environment' ? 'Back' : 'Front'})
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-dashed border-emerald-500/40 aspect-video flex items-center justify-center">
                <div id="qr-reader-container" className="w-full h-full object-cover" />
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-2 text-white">
                    <AlertCircle size={40} className="text-rose-400" />
                    <p className="text-xs text-rose-200 max-w-xs">{cameraError}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Side Panel: Sample Test Simulator */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sparkles size={18} className="text-amber-500" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">Quick Test Simulator</h3>
                <p className="text-[11px] text-slate-400">Click any card to simulate an instant QR scan</p>
              </div>
            </div>

            <div className="mt-4 space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-none">
              {sampleTokensData?.length > 0 ? (
                sampleTokensData.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleSampleSelect(sample.token)}
                    disabled={scanMutation.isPending}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                          sample.entityType === 'student' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {sample.entityType}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{sample.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{sample.sub}</span>
                    </div>

                    <div className="h-7 w-7 rounded-lg bg-slate-100 group-hover:bg-emerald-800 text-slate-400 group-hover:text-white flex items-center justify-center transition">
                      <Play size={12} className="ml-0.5" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No sample records available. Register students or staff to generate test tokens.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Scan Engine Active</span>
            <span className="font-semibold text-emerald-700">Online</span>
          </div>
        </div>
      </div>

      {/* ─── Scan Result Popup Card ────────────────────────────────────────── */}
      {lastScanResult && (
        <div
          className={`p-6 rounded-3xl border shadow-xl transition-all duration-300 animate-scale-up ${
            lastScanResult.success
              ? lastScanResult.action === 'check_out'
                ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-slate-700'
                : 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white border-emerald-700'
              : 'bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 text-white border-rose-800'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {lastScanResult.photoUrl ? (
                <img
                  src={lastScanResult.photoUrl}
                  alt={lastScanResult.name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30 shrink-0 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center font-black text-2xl text-white shrink-0">
                  {lastScanResult.name ? lastScanResult.name.charAt(0) : '!'}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-300">
                    {lastScanResult.entityType || 'SECURITY ALERT'}
                  </span>
                  <span className="text-[10px] font-mono opacity-60">{lastScanResult.timestamp}</span>
                </div>
                <h3 className="text-xl font-black text-white">{lastScanResult.name || 'Scan Error'}</h3>
                <p className="text-xs text-white/80 mt-0.5">{lastScanResult.message}</p>
                {lastScanResult.emergencyContact && (
                  <p className="text-[11px] text-emerald-300 flex items-center gap-1 mt-1 font-mono">
                    <PhoneCall size={12} /> Emergency Contact: {lastScanResult.emergencyContact}
                  </p>
                )}
              </div>
            </div>

            {lastScanResult.success && (
              <div className="ml-auto flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/20">
                {lastScanResult.action === 'check_in' ? (
                  <LogIn className="w-5 h-5 text-emerald-400" />
                ) : lastScanResult.action === 'check_out' ? (
                  <LogOut className="w-5 h-5 text-amber-400" />
                ) : (
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                )}
                <div>
                  <span className="block text-[9px] uppercase font-black opacity-60">Status</span>
                  <span className="text-xs font-black uppercase tracking-wider">
                    {lastScanResult.status?.replace('_', ' ') || lastScanResult.action?.replace('_', ' ') || 'APPROVED'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Terminal Scan History Session Logs ──────────────────────────── */}
      {scanHistory.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4" />
              Terminal Scan History Logs (Current Session)
            </h2>
            <span className="text-xs text-slate-400 font-semibold">{scanHistory.length} events logged</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto scrollbar-none">
            {scanHistory.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 px-2 rounded-xl transition">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div>
                    <p className="font-bold text-slate-900">{item.name || 'Failed QR Scan'}</p>
                    <p className="text-[10px] text-slate-500">{item.message}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-slate-600 block">{item.timestamp}</span>
                  <span className="text-[9px] font-black uppercase text-slate-400">
                    {item.entityType || 'System'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GateScannerPage;
