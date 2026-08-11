/**
 * OfflineContext.jsx — Global Offline/Online State Provider & Sync Manager Controller
 */
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  flush,
  getQueueCount,
  getAllQueuedItems,
  syncSingleItem,
  discardItem,
  clearQueue,
  getSyncLogs,
  onSyncStateChange,
} from '../services/syncQueue';

const OfflineContext = createContext(null);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0 });
  const [isSyncManagerOpen, setIsSyncManagerOpen] = useState(false);
  const wasOffline = useRef(false);

  // Refresh pending count from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    const count = await getQueueCount();
    setPendingCount(count);
  }, []);

  // Listen to sync state changes emitted by syncQueue.js
  useEffect(() => {
    const unsubscribe = onSyncStateChange((state) => {
      if (state.status === 'syncing') {
        setIsSyncing(true);
        setSyncProgress({ done: state.done || 0, total: state.total || 0 });
      } else if (state.status === 'idle') {
        setIsSyncing(false);
        setSyncProgress({ done: 0, total: 0 });
        setPendingCount(state.pendingCount ?? 0);
        if (state.lastSyncTime) setLastSyncTime(state.lastSyncTime);
      }
    });
    return unsubscribe;
  }, []);

  // Track online / offline transitions
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline.current) {
        wasOffline.current = false;
        flush();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOffline.current = true;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshPendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshPendingCount]);

  useEffect(() => {
    const interval = setInterval(refreshPendingCount, 10_000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  /** Manual "Sync Now" trigger */
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    await flush();
    await refreshPendingCount();
  }, [isOnline, isSyncing, refreshPendingCount]);

  /** Sync Manager Modal Controllers */
  const openSyncManager = useCallback(() => setIsSyncManagerOpen(true), []);
  const closeSyncManager = useCallback(() => setIsSyncManagerOpen(false), []);

  const fetchQueuedItems = useCallback(async () => {
    return await getAllQueuedItems();
  }, []);

  const syncSingle = useCallback(async (id) => {
    const result = await syncSingleItem(id);
    await refreshPendingCount();
    return result;
  }, [refreshPendingCount]);

  const discardSingle = useCallback(async (id) => {
    await discardItem(id);
    await refreshPendingCount();
  }, [refreshPendingCount]);

  const clearAll = useCallback(async () => {
    await clearQueue();
    await refreshPendingCount();
  }, [refreshPendingCount]);

  const fetchLogs = useCallback(async () => {
    return await getSyncLogs();
  }, []);

  const value = {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    syncProgress,
    syncNow,
    refreshPendingCount,
    isSyncManagerOpen,
    openSyncManager,
    closeSyncManager,
    fetchQueuedItems,
    syncSingle,
    discardSingle,
    clearAll,
    fetchLogs,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
