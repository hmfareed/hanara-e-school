/**
 * OfflineBanner.jsx
 *
 * Global status bar rendered inside the Layout header.
 * Shows:
 *  🟡 Amber banner  — "You're offline. N change(s) pending." + "Inspect Queue" button
 *  🔵 Blue banner   — "Syncing X of Y changes..."  (during flush)
 *  🟣 Indigo banner — "N offline changes ready to sync" + "Sync Now" + "Manage Queue"
 *  🟢 Green toast   — "All changes synced!" (fades after 3.5s)
 *
 * ConnectivityDot in header is clickable to open SyncManagerModal directly.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useOffline } from '../context/OfflineContext';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  CloudUpload,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
} from 'lucide-react';

export default function OfflineBanner() {
  const {
    isOnline,
    pendingCount,
    isSyncing,
    syncProgress,
    syncNow,
    openSyncManager,
  } = useOffline();

  const [showSyncedToast, setShowSyncedToast] = useState(false);
  const prevSyncingRef = useRef(false);

  useEffect(() => {
    if (prevSyncingRef.current && !isSyncing && isOnline && pendingCount === 0) {
      setShowSyncedToast(true);
      const t = setTimeout(() => setShowSyncedToast(false), 3500);
      return () => clearTimeout(t);
    }
    prevSyncingRef.current = isSyncing;
  }, [isSyncing, isOnline, pendingCount]);

  // ── "All synced" green toast ──────────────────────────────────────────────
  if (showSyncedToast) {
    return (
      <div className="fixed bottom-6 right-6 z-[200] animate-slide-up">
        <div className="flex items-center gap-3 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold">
          <CheckCircle2 size={18} />
          <span>All changes synced successfully!</span>
        </div>
      </div>
    );
  }

  // ── Syncing blue banner ───────────────────────────────────────────────────
  if (isSyncing) {
    const pct =
      syncProgress.total > 0
        ? Math.round((syncProgress.done / syncProgress.total) * 100)
        : 0;
    return (
      <div className="fixed top-0 left-0 right-0 z-[200]">
        <div className="bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="animate-spin" />
            <span>
              Syncing changes to cloud…{' '}
              {syncProgress.total > 0 && (
                <span className="opacity-80">
                  ({syncProgress.done}/{syncProgress.total})
                </span>
              )}
            </span>
            <div className="ml-2 h-1.5 w-32 bg-blue-400/40 rounded-full overflow-hidden hidden sm:block">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <button
            onClick={openSyncManager}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
          >
            <SlidersHorizontal size={12} />
            Inspect Queue
          </button>
        </div>
      </div>
    );
  }

  // ── Offline amber banner (with pending count & Inspect Queue button) ──────
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200]">
        <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WifiOff size={14} />
            <span>
              You're offline
              {pendingCount > 0 ? (
                <span className="ml-1 opacity-90">
                  — {pendingCount} change{pendingCount !== 1 ? 's' : ''} will sync when reconnected
                </span>
              ) : (
                <span className="ml-1 opacity-90">— Working in offline mode</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openSyncManager}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
            >
              <SlidersHorizontal size={12} />
              {pendingCount > 0 ? `Inspect Queue (${pendingCount})` : 'Sync Manager'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Online + pending changes (reconnected but not yet synced) ─────────────
  if (isOnline && pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[200]">
        <div className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CloudUpload size={14} />
            <span>
              {pendingCount} offline change{pendingCount !== 1 ? 's' : ''} ready to sync
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openSyncManager}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
            >
              <SlidersHorizontal size={12} />
              Inspect Queue
            </button>

            <button
              onClick={syncNow}
              className="flex items-center gap-1.5 bg-white text-indigo-900 hover:bg-indigo-50 px-3 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer shadow-2xs"
            >
              <RefreshCw size={12} />
              Sync Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * Small connectivity dot shown in the header nav area.
 * Clickable to open SyncManagerModal.
 */
export function ConnectivityDot() {
  const { isOnline, pendingCount, openSyncManager } = useOffline();

  return (
    <div
      onClick={openSyncManager}
      title={
        isOnline
          ? pendingCount > 0
            ? `Online — ${pendingCount} pending sync. Click to inspect queue.`
            : 'Online — Click to open Sync Manager'
          : `Offline — ${pendingCount} pending items. Click to inspect queue.`
      }
      className="relative flex items-center justify-center w-8 h-8 rounded-xl hover:bg-slate-100 transition cursor-pointer border border-transparent hover:border-slate-200"
    >
      {isOnline ? (
        <>
          <Wifi size={16} className="text-emerald-600" />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black text-white shadow-2xs">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </>
      ) : (
        <>
          <WifiOff size={16} className="text-amber-500 animate-pulse" />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-amber-600 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black text-white shadow-2xs">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </>
      )}
    </div>
  );
}
