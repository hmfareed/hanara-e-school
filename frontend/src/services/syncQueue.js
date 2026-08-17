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
  updateQueuedItem,
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

function describeError(error) {
  return error.response?.data?.message || error.message || 'Unable to synchronize this change';
}

async function syncAttendanceScans(items, headers) {
  const events = items.map((item) => ({
    ...item.body,
    eventId: item.body?.eventId || item.clientMutationId,
  }));
  const response = await axios.post(
    `${BASE_URL}/staff-attendance/sync`,
    { events },
    { headers, withCredentials: true }
  );
  const errors = response.data?.data?.errors || [];
  const errorByEventId = new Map(errors.map((error) => [error.eventId, error]));

  for (const item of items) {
    const error = errorByEventId.get(item.body?.eventId || item.clientMutationId);
    if (error) {
      await updateQueuedItem(item.id, {
        state: 'failed',
        retries: (item.retries || 0) + 1,
        lastError: error.reason || error.error || 'Attendance event was rejected',
      });
    } else {
      await removeQueuedItem(item.id);
    }
  }

  return { synced: items.length - errors.length, failed: errors.length };
}

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

  const items = (await getAllQueuedItems()).filter(
    (item) => item.state !== 'failed' && item.state !== 'conflict'
  );
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

  const attendanceItems = items.filter((item) => item.url === '/staff-attendance/scan');
  const remainingItems = items.filter((item) => item.url !== '/staff-attendance/scan');

  if (attendanceItems.length > 0) {
    try {
      const result = await syncAttendanceScans(attendanceItems, headers);
      synced += result.synced;
      failed += result.failed;
    } catch (err) {
      for (const item of attendanceItems) {
        await updateQueuedItem(item.id, {
          state: 'pending',
          retries: (item.retries || 0) + 1,
          lastError: describeError(err),
        });
      }
      failed += attendanceItems.length;
    }
  }

  for (const item of remainingItems) {
    if (item.url && (item.url.includes('/auth/') || item.url.includes('/login'))) {
      await removeQueuedItem(item.id);
      continue;
    }
    try {
      await axios({
        method: item.method,
        url: `${BASE_URL}${item.url}`,
        data: item.body,
        headers: { ...headers, 'X-Idempotency-Key': item.clientMutationId },
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
        await updateQueuedItem(item.id, {
          state: err.response.status === 409 ? 'conflict' : 'failed',
          retries: (item.retries || 0) + 1,
          lastError: describeError(err),
        });
        failed++;
      } else {
        await updateQueuedItem(item.id, {
          state: 'pending',
          retries: (item.retries || 0) + 1,
          lastError: describeError(err),
        });
        failed++;
        break; // Stop flushing remainder when network is unreachable to prevent CPU hang
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
      headers: { ...headers, 'X-Idempotency-Key': item.clientMutationId },
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
      await updateQueuedItem(itemId, {
        state: err.response.status === 409 ? 'conflict' : 'failed',
        retries: (item.retries || 0) + 1,
        lastError: describeError(err),
      });
      const remaining = await getQueueCount();
      notifySyncListeners({
        status: 'idle',
        pendingCount: remaining,
        lastSyncTime: new Date().toISOString(),
      });
      return { success: false, message: describeError(err) };
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
