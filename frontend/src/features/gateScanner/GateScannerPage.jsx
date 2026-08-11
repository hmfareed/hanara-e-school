import React, { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
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
  Keyboard,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

// Web Audio API Synthesizer for instant feedback sounds (no external audio assets required)
function playSound(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'checkout') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1); // A4
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15); // E3
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
  const [tokenInput, setTokenInput] = useState('');
  const [lastScanResult, setLastScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const inputRef = useRef(null);

  // Auto-focus input for hardware barcode/QR readers
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [lastScanResult]);

  const scanMutation = useMutation({
    mutationFn: async (qrToken) => {
      const res = await api.post('/gate-scanner/scan', { qrToken });
      return res.data;
    },
    onSuccess: (data) => {
      setLastScanResult(data);
      setScanHistory((prev) => [data, ...prev.slice(0, 19)]);
      if (soundEnabled) {
        if (data.action === 'check_out') playSound('checkout');
        else playSound('success');
      }
      setTokenInput('');
    },
    onError: (err) => {
      const errorObj = {
        success: false,
        message: err.response?.data?.message || err.message || 'Scan failed',
        timestamp: new Date().toLocaleTimeString(),
      };
      setLastScanResult(errorObj);
      if (soundEnabled) playSound('error');
      setTokenInput('');
    },
  });

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    scanMutation.mutate(tokenInput.trim());
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      
      {/* ── Header ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-[#78282E]" />
            Gate Entry & QR Scanner Terminal
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scan official HANARA Student & Staff ID Cards for instant attendance logging
          </p>
        </div>

        <button
          onClick={() => setSoundEnabled((s) => !s)}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
            soundEnabled
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          {soundEnabled ? 'Audio Chime ON' : 'Muted'}
        </button>
      </div>

      {/* ── Main Scan Input Card ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xs text-center space-y-6">
        
        {/* Animated Scanner Graphic */}
        <div className="relative w-28 h-28 mx-auto bg-[#78282E]/5 rounded-3xl border-2 border-dashed border-[#78282E]/30 flex items-center justify-center group overflow-hidden">
          <QrCode className="w-14 h-14 text-[#78282E]" />
          <div className="absolute inset-x-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900">Scan ID Card Code</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Point your barcode scanner at the ID card QR code or paste the token string below. Hardware barcode readers operate automatically.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleManualSubmit} className="max-w-md mx-auto flex items-center gap-2">
          <div className="relative flex-1">
            <Keyboard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. HNR:staff:64a9f... or scan QR"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full pl-9 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#78282E]"
            />
          </div>
          <button
            type="submit"
            disabled={scanMutation.isPending || !tokenInput.trim()}
            className="px-6 py-3 bg-[#78282E] hover:bg-[#6B2228] text-white font-black text-xs rounded-2xl shadow-md transition disabled:opacity-50 flex-shrink-0"
          >
            {scanMutation.isPending ? 'Processing…' : 'Submit Scan'}
          </button>
        </form>
      </div>

      {/* ── Scan Result Popup Card ── */}
      {lastScanResult && (
        <div
          className={`p-6 rounded-3xl border shadow-lg transition-all duration-300 ${
            lastScanResult.success
              ? lastScanResult.action === 'check_out'
                ? 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700'
                : 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white border-emerald-700'
              : 'bg-gradient-to-r from-rose-950 via-rose-900 to-slate-900 text-white border-rose-800'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            
            {/* Person Info */}
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
              </div>
            </div>

            {/* Action Badge */}
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
                    {lastScanResult.action?.replace('_', ' ') || 'APPROVED'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Session Scan History Table ── */}
      {scanHistory.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4" />
            Recent Terminal Logs (This Session)
          </h2>

          <div className="divide-y divide-slate-100">
            {scanHistory.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs hover:bg-slate-50/60 px-2 rounded-xl transition">
                <div className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div>
                    <p className="font-bold text-slate-900">{item.name || 'Failed Scan'}</p>
                    <p className="text-[10px] text-slate-400">{item.message}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono font-bold text-slate-500 block">{item.timestamp}</span>
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
