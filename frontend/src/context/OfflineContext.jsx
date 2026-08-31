/**
 * OfflineContext.jsx — Global Automated Offline/Online State Provider & Sync Manager Controller
 *
 * Real-time reachability detection:
 *  - Automatically monitors `navigator.onLine`
 *  - Actively probes backend health & internet reachability with fast 1.8s timeout
 *  - Automatically transitions to offline when internet drops (header turns red & blinks, sidebar updates)
 *  - Automatically triggers background sync flush when internet is restored
 *  - Silently pre-caches full school roster into IndexedDB for instant offline availability
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
import {
  prepareOfflineData,
  checkOfflineReadiness,
  getOfflineStorageStats,
} from '../services/offlineDataService';
import { getApiBaseUrl } from '../services/api';

const OfflineContext = createContext(null);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncProgress, setSyncProgress] = useState({ done: 0, total: 0 });
  const [isSyncManagerOpen, setIsSyncManagerOpen] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [hydrationProgress, setHydrationProgress] = useState({ percent: 0, message: '', stage: '' });
  const [offlineReadiness, setOfflineReadiness] = useState({ isReady: false, staffCount: 0, studentCount: 0, classCount: 0, lastHydration: null });
  const wasOffline = useRef(false);
  const autoHydrationDone = useRef(false);

  // Refresh pending count from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setPendingCount(count);
    } catch (e) {
      console.warn('[OfflineContext] Error reading pending count:', e);
    }
  }, []);

  // Refresh offline readiness metrics
  const refreshReadiness = useCallback(async () => {
    try {
      const readyObj = await checkOfflineReadiness();
      setOfflineReadiness(readyObj);
    } catch (e) {
      console.warn('[OfflineContext] Error reading readiness:', e);
    }
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

  // Active Dual Reachability Prober
  const probeConnectivity = useCallback(async () => {
    // 1. Browser hardware/network adapter check
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setIsOnline(false);
      wasOffline.current = true;
      return false;
    }

    // 2. Active network probe with 8.0s timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const pingUrl = `${getApiBaseUrl()}/sync/ping?_t=${Date.now()}`;

      const res = await fetch(pingUrl, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.isOnline !== false) {
          if (!isOnline) {
            setIsOnline(true);
            if (wasOffline.current) {
              wasOffline.current = false;
              flush();
            }
          }
          return true;
        }
      }

      // If browser itself is online, don't hastily mark offline on a single slow ping
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        return isOnline;
      }

      setIsOnline(false);
      wasOffline.current = true;
      return false;
    } catch (err) {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        return isOnline;
      }
      setIsOnline(false);
      wasOffline.current = true;
      return false;
    }
  }, [isOnline]);

  // Track online / offline transitions and custom app network events
  useEffect(() => {
    const handleOnline = () => {
      probeConnectivity();
    };

    const handleOffline = () => {
      setIsOnline(false);
      wasOffline.current = true;
    };

    const handleAppOffline = () => {
      setIsOnline(false);
      wasOffline.current = true;
    };

    const handleAppOnline = () => {
      setIsOnline(true);
      if (wasOffline.current) {
        wasOffline.current = false;
        flush();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('app-offline', handleAppOffline);
    window.addEventListener('app-online', handleAppOnline);

    refreshPendingCount();
    refreshReadiness();
    probeConnectivity();

    // Auto-bootstrap silent background hydration on first load if online & authenticated
    const token = localStorage.getItem('accessToken');
    if (token && !autoHydrationDone.current) {
      autoHydrationDone.current = true;
      setTimeout(async () => {
        try {
          await prepareOfflineData();
          await refreshReadiness();
        } catch (e) {
          // Non-blocking silent pre-cache
        }
      }, 1500);
    }

    // Regular active reachability heartbeat (every 8 seconds)
    const interval = setInterval(() => {
      probeConnectivity();
      refreshPendingCount();
      refreshReadiness();
    }, 8000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('app-offline', handleAppOffline);
      window.removeEventListener('app-online', handleAppOnline);
      clearInterval(interval);
    };
  }, [refreshPendingCount, refreshReadiness, probeConnectivity]);

  /** Manual "Sync Now" trigger */
  const syncNow = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    await flush();
    await refreshPendingCount();
    await refreshReadiness();
  }, [isSyncing, isOnline, refreshPendingCount, refreshReadiness]);

  /** Prepare / Pre-cache all school data for 100% offline usage */
  const prepareForOffline = useCallback(async () => {
    if (isHydrating) return { success: false, message: 'Hydration already in progress' };
    setIsHydrating(true);
    const result = await prepareOfflineData((p) => {
      setHydrationProgress(p);
    });
    setIsHydrating(false);
    await refreshReadiness();
    return result;
  }, [isHydrating, refreshReadiness]);

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

  const fetchStorageStats = useCallback(async () => {
    return await getOfflineStorageStats();
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
    isHydrating,
    hydrationProgress,
    offlineReadiness,
    prepareForOffline,
    refreshReadiness,
    fetchStorageStats,
    probeConnectivity,
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
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingCount: 0,
      isSyncing: false,
      lastSyncTime: null,
      syncProgress: { done: 0, total: 0 },
      syncNow: async () => {},
      refreshPendingCount: async () => {},
      isSyncManagerOpen: false,
      openSyncManager: () => {},
      closeSyncManager: () => {},
      fetchQueuedItems: async () => [],
      syncSingle: async () => {},
      discardSingle: async () => {},
      clearAll: async () => {},
      fetchLogs: async () => [],
      isHydrating: false,
      hydrationProgress: { percent: 0, message: '', stage: '' },
      offlineReadiness: { isReady: false, staffCount: 0, studentCount: 0, classCount: 0, lastHydration: null },
      prepareForOffline: async () => {},
      refreshReadiness: async () => {},
      fetchStorageStats: async () => ({ stats: {}, lastBootstrap: null }),
      probeConnectivity: async () => false,
    };
  }
  return context;
};
