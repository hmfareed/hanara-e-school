/**
 * SyncManagerModal.jsx — Visual Offline Sync Manager & Conflict Inspector
 *
 * Provides a 3-tab interactive management dashboard for offline operations:
 *  1. Queued Mutations — inspect, sync, or discard individual pending offline writes
 *  2. Conflict Inspector — side-by-side resolution when local offline data conflicts with cloud
 *  3. Audit History — timeline of past sync execution runs
 */
import React, { useState, useEffect } from 'react';
import { useOffline } from '../context/OfflineContext';
import {
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  Database,
  ChevronDown,
  ChevronRight,
  Code2,
  Wifi,
  WifiOff,
  CloudUpload,
  History,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

const MethodBadge = ({ method }) => {
  const m = (method || 'GET').toUpperCase();
  const styles = {
    GET: 'bg-blue-50 text-blue-700 border-blue-200',
    POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PUT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    PATCH: 'bg-amber-50 text-amber-700 border-amber-200',
    DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return (
    <span
      className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
        styles[m] || 'bg-slate-100 text-slate-700 border-slate-200'
      }`}
    >
      {m}
    </span>
  );
};

const formatActionName = (method, url) => {
  if (url.includes('/attendance')) return 'Recorded Attendance';
  if (url.includes('/grades')) return 'Updated Student Grades';
  if (url.includes('/students')) return method === 'POST' ? 'Admitted New Student' : 'Updated Student Record';
  if (url.includes('/fees')) return 'Processed Fee Payment / Register';
  if (url.includes('/staff')) return 'Updated Staff Profile';
  if (url.includes('/classes')) return 'Updated Class Settings';
  if (url.includes('/assignments')) return 'Updated Assignment';
  if (url.includes('/lesson-plans')) return 'Saved Lesson Plan';
  if (url.includes('/notices')) return 'Published Notice';
  return `${method} ${url}`;
};

export default function SyncManagerModal() {
  const {
    isOnline,
    forceOffline,
    toggleForceOffline,
    pendingCount,
    isSyncing,
    isSyncManagerOpen,
    closeSyncManager,
    fetchQueuedItems,
    syncSingle,
    discardSingle,
    clearAll,
    syncNow,
    fetchLogs,
    isHydrating,
    hydrationProgress,
    offlineReadiness,
    prepareForOffline,
    fetchStorageStats,
  } = useOffline();

  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'conflicts' | 'history' | 'storage'
  const [queuedItems, setQueuedItems] = useState([]);
  const [expandedItems, setExpandedItems] = useState({});
  const [logs, setLogs] = useState([]);
  const [storageStats, setStorageStats] = useState({ stats: {}, lastBootstrap: null });
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(null);

  // Sample conflict state for visual inspector demonstration
  const [sampleConflicts] = useState([
    {
      id: 'conflict-1',
      entity: 'Student Record — Kwame Mensah',
      field: 'Class & House Assignment',
      localValue: { class: 'Class 5B', house: 'Gold House', timestamp: 'Offline 2 hours ago' },
      serverValue: { class: 'Class 5A', house: 'Blue House', timestamp: 'Server updated 30 mins ago' },
    },
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const items = await fetchQueuedItems();
      setQueuedItems(items || []);
      const historyLogs = await fetchLogs();
      setLogs(historyLogs || []);
      const statsObj = await fetchStorageStats();
      setStorageStats(statsObj || { stats: {}, lastBootstrap: null });
    } catch (err) {
      console.error('Failed to load sync manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSyncManagerOpen) {
      loadData();
    }
  }, [isSyncManagerOpen, pendingCount]);

  if (!isSyncManagerOpen) return null;

  const toggleExpand = (id) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSyncItem = async (id) => {
    setActionInProgress(id);
    await syncSingle(id);
    await loadData();
    setActionInProgress(null);
  };

  const handleDiscardItem = async (id) => {
    setActionInProgress(id);
    await discardSingle(id);
    await loadData();
    setActionInProgress(null);
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to discard all pending offline mutations? This cannot be undone.')) {
      setLoading(true);
      await clearAll();
      await loadData();
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    await syncNow();
    await loadData();
  };

  const handlePrepareOffline = async () => {
    await prepareForOffline();
    await loadData();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#4A1C20] text-white px-6 py-5 flex items-center justify-between border-b border-[#310F12]">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-[#361114] border border-[#7D2A30]/50 rounded-2xl flex items-center justify-center">
              <Database size={20} className="text-[#D9B4B8]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">Offline Sync Manager</h3>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                  isOnline ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {isOnline ? 'Online Connected' : 'Offline Mode'}
                </span>
              </div>
              <p className="text-xs text-[#D9B4B8]/80 mt-0.5">
                Inspect pending changes, prepare offline database, and manage sync history
              </p>
            </div>
          </div>
          <button
            onClick={closeSyncManager}
            className="p-2 rounded-xl text-[#D9B4B8] hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5 font-semibold">
              {isOnline ? (
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <Wifi size={14} /> Cloud Connected
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-700">
                  <WifiOff size={14} /> Working Offline
                </span>
              )}
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center space-x-1">
              <Clock size={13} className="text-slate-400" />
              <span>Pending Queue:</span>
              <strong className="text-slate-900 font-extrabold">{pendingCount}</strong>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {queuedItems.length > 0 && (
              <>
                <button
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold transition text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={13} /> Discard All
                </button>

                <button
                  onClick={handleSyncAll}
                  disabled={!isOnline || isSyncing}
                  className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold transition text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync All Now'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab('queue')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition cursor-pointer shrink-0 ${
              activeTab === 'queue'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CloudUpload size={15} />
            <span>Queued Mutations ({queuedItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('storage')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition cursor-pointer shrink-0 ${
              activeTab === 'storage'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database size={15} />
            <span>Offline Storage & Prep</span>
          </button>

          <button
            onClick={() => setActiveTab('conflicts')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition cursor-pointer shrink-0 ${
              activeTab === 'conflicts'
                ? 'border-amber-600 text-amber-800 bg-amber-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert size={15} />
            <span>Conflict Inspector (0)</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition cursor-pointer shrink-0 ${
              activeTab === 'history'
                ? 'border-emerald-700 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History size={15} />
            <span>Sync Audit Logs</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {/* ── TAB 1: QUEUED MUTATIONS ── */}
          {activeTab === 'queue' && (
            <div>
              {queuedItems.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-600" />
                  <h4 className="font-bold text-slate-800 text-base">Queue is Empty</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    All offline edits have been successfully synchronized to the cloud database.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {queuedItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition"
                    >
                      <div className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center space-x-3 min-w-0">
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
                          >
                            {expandedItems[item.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <MethodBadge method={item.method} />
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-slate-800 truncate">
                              {formatActionName(item.method, item.url)}
                            </h4>
                            <p className="text-xs text-slate-400 font-mono truncate">{item.url}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 flex-shrink-0">
                          <span className="text-[11px] text-slate-400 hidden sm:inline">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          <button
                            onClick={() => handleDiscardItem(item.id)}
                            disabled={actionInProgress === item.id}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Discard this item"
                          >
                            <Trash2 size={16} />
                          </button>

                          <button
                            onClick={() => handleSyncItem(item.id)}
                            disabled={!isOnline || actionInProgress === item.id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold text-xs transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                          >
                            {actionInProgress === item.id ? (
                              <RefreshCw size={13} className="animate-spin" />
                            ) : (
                              <CloudUpload size={13} />
                            )}
                            <span>Sync</span>
                          </button>
                        </div>
                      </div>

                      {/* Expandable Payload Viewer */}
                      {expandedItems[item.id] && (
                        <div className="border-t border-slate-100 bg-slate-900 text-slate-200 p-4 font-mono text-xs overflow-x-auto">
                          <div className="flex items-center justify-between mb-2 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                            <span className="flex items-center gap-1">
                              <Code2 size={12} /> Payload Body
                            </span>
                            <span>ID: #{item.id}</span>
                          </div>
                          <pre className="text-emerald-400 leading-relaxed">
                            {JSON.stringify(item.body || {}, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: OFFLINE STORAGE & PREP ── */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              {/* Readiness Banner */}
              <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                offlineReadiness.isReady
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    offlineReadiness.isReady ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {offlineReadiness.isReady ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">
                      {offlineReadiness.isReady ? 'Device Ready for 100% Offline Use' : 'Offline Preparation Recommended'}
                    </h4>
                    <p className="text-xs opacity-80 mt-0.5 max-w-md">
                      {offlineReadiness.isReady
                        ? `Local IndexedDB contains ${offlineReadiness.staffCount} staff, ${offlineReadiness.studentCount} students, and all classes.`
                        : 'Download relevant school rosters so this tablet or device works seamlessly even if internet drops.'}
                    </p>
                    {storageStats.lastBootstrap && (
                      <span className="text-[10px] opacity-70 block mt-1">
                        Last Full Preparation: {new Date(storageStats.lastBootstrap).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handlePrepareOffline}
                  disabled={!isOnline || isHydrating}
                  className="px-5 py-2.5 bg-[#4A1C20] hover:bg-[#361114] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <RefreshCw size={14} className={isHydrating ? 'animate-spin' : ''} />
                  <span>{isHydrating ? 'Downloading Data...' : 'Prepare for Offline Now'}</span>
                </button>
              </div>

              {/* Live Hydration Progress Bar */}
              {isHydrating && (
                <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-2">
                      <RefreshCw size={13} className="animate-spin text-emerald-600" />
                      {hydrationProgress.message || 'Preparing local offline database...'}
                    </span>
                    <span className="text-emerald-700">{hydrationProgress.percent}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${hydrationProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Local Storage Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Roster</span>
                  <p className="text-xl font-extrabold text-slate-900 mt-1">{storageStats.stats?.staff || 0}</p>
                  <span className="text-[10px] text-emerald-700 font-semibold">Indexed with QR credentials</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Students</span>
                  <p className="text-xl font-extrabold text-slate-900 mt-1">{storageStats.stats?.students || 0}</p>
                  <span className="text-[10px] text-slate-500 font-semibold">Offline directory profiles</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Classes & Years</span>
                  <p className="text-xl font-extrabold text-slate-900 mt-1">{storageStats.stats?.classes || 0}</p>
                  <span className="text-[10px] text-slate-500 font-semibold">Class list & subjects</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scan Events Log</span>
                  <p className="text-xl font-extrabold text-slate-900 mt-1">{storageStats.stats?.attendanceEvents || 0}</p>
                  <span className="text-[10px] text-emerald-700 font-semibold">Append-only audit store</span>
                </div>
              </div>

              {/* Architecture Rule Callout */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs space-y-1">
                <p className="font-bold text-emerald-400">⚡ Tamale Offline-First Architecture</p>
                <p className="text-slate-300 leading-relaxed">
                  All gate scans, mock exam scores, and fee entries write directly to IndexedDB on this device.
                  When school internet fluctuates or drops, operations continue at 100% speed. Reconnection automatically flushes mutations back to MongoDB.
                </p>
              </div>
            </div>
          )}

          {/* ── TAB 3: CONFLICT INSPECTOR ── */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3 text-amber-900">
                <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h5 className="font-bold">No Active Conflicts</h5>
                  <p className="text-amber-700 mt-0.5">
                    When an offline edit conflicts with a more recent server record, it will appear here for side-by-side resolution.
                  </p>
                </div>
              </div>

              {/* Sample Resolution Card Demonstration */}
              {sampleConflicts.map((c) => (
                <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 opacity-80">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{c.entity}</h4>
                      <p className="text-xs text-slate-400">Conflicting Field: {c.field}</p>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      Sample Inspection
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Local Version */}
                    <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px]">
                          📱 Local Offline Version
                        </span>
                        <span className="text-[10px] text-emerald-700">{c.localValue.timestamp}</span>
                      </div>
                      <pre className="text-emerald-950 font-mono text-[11px] bg-white p-2 rounded border border-emerald-100">
                        {JSON.stringify(c.localValue, null, 2)}
                      </pre>
                      <button className="w-full py-2 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 transition text-xs cursor-pointer">
                        Keep Local Version
                      </button>
                    </div>

                    {/* Server Version */}
                    <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 uppercase tracking-wider text-[10px]">
                          ☁️ Cloud Server Version
                        </span>
                        <span className="text-[10px] text-blue-700">{c.serverValue.timestamp}</span>
                      </div>
                      <pre className="text-blue-950 font-mono text-[11px] bg-white p-2 rounded border border-blue-100">
                        {JSON.stringify(c.serverValue, null, 2)}
                      </pre>
                      <button className="w-full py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition text-xs cursor-pointer">
                        Accept Cloud Version
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TAB 3: AUDIT HISTORY LOGS ── */}
          {activeTab === 'history' && (
            <div>
              {logs.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
                  <History size={40} className="mx-auto text-slate-400" />
                  <h4 className="font-bold text-slate-800 text-base">No Sync Audit Logs Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Sync operation execution history will appear here once you perform your first offline sync.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100">
                  {logs.map((log, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                            log.status === 'success'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          <CheckCircle2 size={16} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800">
                              Synced {log.synced} of {log.total} mutations
                            </span>
                            <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {log.status}
                            </span>
                          </div>
                          <p className="text-slate-400 mt-0.5">
                            Duration: {log.durationSeconds}s • Failed: {log.failed}
                          </p>
                        </div>
                      </div>
                      <span className="text-slate-400 font-medium">
                        {new Date(log.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
