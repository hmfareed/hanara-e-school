/**
 * syncQueue.js — Offline Mutation Sync Manager
 *
 * When the user performs a write (POST/PUT/PATCH/DELETE) while offline,
 * the mutation is saved to IndexedDB's syncQueue store.
 * When connectivity returns, `flush()` replays all queued mutations
 * against the live API in chronological order.
 */
import axios from 'axios';
import {
  getDB,
  getAllQueuedItems,
  removeQueuedItem,
  getQueueCount,
  clearSyncQueue,
} from './db';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/** Broadcasts sync state changes to all interested React contexts */
const syncListeners = new Set();
export function onSyncStateChange(cb) {
  syncListeners.add(cb);
  return () => syncListeners.delete(cb);
}
function notifySyncListeners(state) {
  syncListeners.forEach((cb) => cb(state));
}

let isFlushing = false;

/**
 * Replay all pending queued mutations against the backend.
 * Called automatically when the browser comes online.
 * Also exposed for the manual "Sync Now" button.
 *
 * @returns {{ synced: number, failed: number }}
 */
export async function flush() {
  if (isFlushing) return { synced: 0, failed: 0 };
  isFlushing = true;

  const items = await getAllQueuedItems();
  if (items.length === 0) {
    isFlushing = false;
    return { synced: 0, failed: 0 };
  }

  notifySyncListeners({ status: 'syncing', total: items.length, done: 0 });

  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let synced = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const item of items) {
    try {
      await axios({
        method: item.method,
        url: `${BASE_URL}${item.url}`,
        data: item.body,
        headers,
        withCredentials: true,
      });

      await removeQueuedItem(item.id);
      synced++;
      notifySyncListeners({
        status: 'syncing',
        total: items.length,
        done: synced,
      });
    } catch (err) {
      // 4xx errors are client mistakes — remove to prevent infinite loop
      if (err.response && err.response.status >= 400 && err.response.status < 500) {
        console.warn(
          `[SyncQueue] Discarding ${item.method} ${item.url} — server rejected with ${err.response.status}`
        );
        await removeQueuedItem(item.id);
      } else {
        console.error(`[SyncQueue] Failed to sync ${item.method} ${item.url}`, err);
        failed++;
      }
    }
  }

  isFlushing = false;
  const remaining = await getQueueCount();
  const duration = Math.round((Date.now() - startTime) / 1000);

  // Record audit log
  await recordSyncLog({
    timestamp: new Date().toISOString(),
    total: items.length,
    synced,
    failed,
    durationSeconds: duration,
    status: failed === 0 ? 'success' : synced > 0 ? 'partial' : 'failed',
  });

  notifySyncListeners({
    status: 'idle',
    pendingCount: remaining,
    lastSyncTime: new Date().toISOString(),
  });

  return { synced, failed };
}

/** Replay a single queued mutation by item ID */
export async function syncSingleItem(itemId) {
  const items = await getAllQueuedItems();
  const item = items.find((i) => i.id === itemId);
  if (!item) return { success: false, message: 'Item not found' };

  const token = localStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    await axios({
      method: item.method,
      url: `${BASE_URL}${item.url}`,
      data: item.body,
      headers,
      withCredentials: true,
    });
    await removeQueuedItem(itemId);
    const remaining = await getQueueCount();
    notifySyncListeners({
      status: 'idle',
      pendingCount: remaining,
      lastSyncTime: new Date().toISOString(),
    });
    return { success: true };
  } catch (err) {
    if (err.response && err.response.status >= 400 && err.response.status < 500) {
      await removeQueuedItem(itemId);
      const remaining = await getQueueCount();
      notifySyncListeners({
        status: 'idle',
        pendingCount: remaining,
        lastSyncTime: new Date().toISOString(),
      });
      return { success: false, message: `Server rejected (${err.response.status}): Discarded item` };
    }
    return { success: false, message: err.message || 'Network error' };
  }
}

/** Discard a single queued mutation */
export async function discardItem(itemId) {
  await removeQueuedItem(itemId);
  const remaining = await getQueueCount();
  notifySyncListeners({
    status: 'idle',
    pendingCount: remaining,
  });
  return true;
}

/** Clear all pending queued mutations */
export async function clearQueue() {
  await clearSyncQueue();
  notifySyncListeners({
    status: 'idle',
    pendingCount: 0,
  });
  return true;
}

/** Record a sync log entry in IndexedDB meta store */
export async function recordSyncLog(logEntry) {
  try {
    const db = await getDB();
    const existing = (await db.get('meta', 'sync_history_logs')) || [];
    const updated = [logEntry, ...existing].slice(0, 50); // Keep max 50 recent logs
    await db.put('meta', updated, 'sync_history_logs');
  } catch (err) {
    console.warn('[SyncQueue] Failed to save sync log:', err);
  }
}

/** Fetch historical sync logs */
export async function getSyncLogs() {
  try {
    const db = await getDB();
    return (await db.get('meta', 'sync_history_logs')) || [];
  } catch (err) {
    return [];
  }
}

export { getQueueCount, getAllQueuedItems };
