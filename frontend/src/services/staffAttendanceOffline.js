/**
 * staffAttendanceOffline.js
 *
 * Offline-first service for staff attendance.
 * - Caches today's status and admin daily overview in IndexedDB.
 * - When offline, enqueues check-in/check-out to syncQueue for later replay.
 */
import { putOne, getOne, getAll, putAll } from './db';
import { enqueueSync } from './db';

const STORE = 'staffAttendance';

// ─── Local status key helpers ─────────────────────────────────────────────────

function todayKey(staffId) {
  const d = new Date();
  const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${staffId}_${ds}`;
}

function adminDayKey(dateStr) {
  return `admin_daily_${dateStr}`;
}

// ─── Staff Self-Service ───────────────────────────────────────────────────────

/**
 * Read today's attendance record for this staff from IndexedDB.
 */
export async function getMyTodayStatusLocal(staffId) {
  const key = todayKey(staffId);
  return getOne(STORE, key);
}

/**
 * Save a local optimistic check-in record and enqueue sync mutation.
 * Called when offline (or as optimistic update before server confirms).
 */
export async function saveCheckInLocal({ staffId, status, checkInTime, lat, lng }) {
  const key = todayKey(staffId);
  const record = {
    _id: key,
    staffId,
    status,
    checkInTime,
    checkOutTime: null,
    lat,
    lng,
    markedByRole: 'self',
    pending: true, // will be set to false after server confirms
    updatedAt: new Date().toISOString(),
  };
  await putOne(STORE, record);

  // Enqueue the API mutation for replay when online
  await enqueueSync('POST', '/staff-attendance/check-in', { lat, lng });

  return record;
}

/**
 * Save a local optimistic check-out record and enqueue sync mutation.
 */
export async function saveCheckOutLocal({ staffId, checkOutTime }) {
  const key = todayKey(staffId);
  const existing = (await getOne(STORE, key)) || {};
  const record = {
    ...existing,
    _id: key,
    staffId,
    checkOutTime,
    pending: true,
    updatedAt: new Date().toISOString(),
  };
  await putOne(STORE, record);

  await enqueueSync('POST', '/staff-attendance/check-out', {});

  return record;
}

/**
 * Mark a cached record as synced (no longer pending).
 */
export async function markSynced(staffId) {
  const key = todayKey(staffId);
  const existing = await getOne(STORE, key);
  if (existing) {
    await putOne(STORE, { ...existing, pending: false });
  }
}

// ─── Admin Daily Cache ────────────────────────────────────────────────────────

/**
 * Cache the admin daily overview for a given date string (YYYY-MM-DD).
 */
export async function cacheAdminDailyData(dateStr, data) {
  await putOne(STORE, {
    _id: adminDayKey(dateStr),
    dateStr,
    data,
    cachedAt: new Date().toISOString(),
  });
}

/**
 * Read cached admin daily overview for a given date string.
 */
export async function getAdminDailyCache(dateStr) {
  return getOne(STORE, adminDayKey(dateStr));
}
