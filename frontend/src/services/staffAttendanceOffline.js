/**
 * staffAttendanceOffline.js — 100% Offline-First Staff Attendance Service
 *
 * Implements:
 *  - Client-side SHA-256 QR credential verification using local IndexedDB staff cache.
 *  - Append-only event queueing into `attendanceEvents` store.
 *  - Mutation syncQueue enqueuing with client-generated event UUIDs.
 *  - Manual staff search fallback for offline check-in/out.
 */
import {
  putOne,
  getOne,
  getAll,
  putAll,
  appendAttendanceEvent,
  getAttendanceEventsToday,
  searchStaffLocal,
  enqueueSync,
} from './db';

export { searchStaffLocal };

const STORE = 'staffAttendance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Compute SHA-256 hex string in the browser using Web Crypto API */
export async function computeTokenHashBrowser(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return '';
  const tokenClean = rawToken.trim();
  const msgUint8 = new TextEncoder().encode(tokenClean);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function todayKey(staffId) {
  const d = new Date();
  const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${staffId}_${ds}`;
}

function nowTimeString(d = new Date()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Offline QR Verification ──────────────────────────────────────────────────

/**
 * Verifies a scanned QR code completely offline using local IndexedDB staff roster.
 *
 * @param {string} rawToken - Scanned QR code or URL string
 * @returns {Promise<{ valid: boolean, staff?: object, reason?: string }>}
 */
export async function verifyStaffQrOffline(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, reason: 'Invalid or empty QR payload' };
  }

  let tokenToVerify = rawToken.trim();
  if (tokenToVerify.includes('/verify-card/')) {
    tokenToVerify = tokenToVerify.split('/verify-card/')[1]?.split('?')[0] || tokenToVerify;
  }

  const staffList = await getAll('staff');
  if (!staffList || staffList.length === 0) {
    return {
      valid: false,
      reason: 'Local staff database is empty. Please connect online once to download school records.',
    };
  }

  // 1. Compute SHA-256 hash of scanned token
  const scannedHash = await computeTokenHashBrowser(tokenToVerify);

  // 2. Lookup in local staff cache by credentialHash or staffId or token prefix
  let matchedStaff = staffList.find((s) => s.credentialHash && s.credentialHash === scannedHash);

  // Fallback match: check if token matches staffId directly or token prefix
  if (!matchedStaff) {
    matchedStaff = staffList.find(
      (s) =>
        (s.staffId && s.staffId.toLowerCase() === tokenToVerify.toLowerCase()) ||
        (s.tokenPrefix && tokenToVerify.startsWith(s.tokenPrefix.replace('...', '')))
    );
  }

  if (!matchedStaff) {
    return { valid: false, reason: 'QR credential not found in local staff database' };
  }

  if (matchedStaff.employmentStatus && matchedStaff.employmentStatus !== 'active') {
    return { valid: false, reason: `Staff employment status is ${matchedStaff.employmentStatus}` };
  }

  return {
    valid: true,
    staff: matchedStaff,
  };
}

/**
 * Process and record a staff attendance scan event offline.
 * Appends to `attendanceEvents` and enqueues to `syncQueue`.
 */
export async function processOfflineScan({ credential, latitude = null, longitude = null }) {
  const verifyResult = await verifyStaffQrOffline(credential);

  if (!verifyResult.valid) {
    const errorEvent = {
      eventId: generateEventId(),
      staffId: null,
      eventType: 'REJECTED',
      result: 'REJECTED',
      failureReason: verifyResult.reason,
      timestamp: new Date().toISOString(),
    };
    await appendAttendanceEvent(errorEvent);
    return {
      success: false,
      eventType: 'REJECTED',
      message: verifyResult.reason,
      _offline: true,
    };
  }

  const staff = verifyResult.staff;
  const staffKey = todayKey(staff._id);
  const now = new Date();
  const timeStr = nowTimeString(now);

  // Read existing today's record
  const existingRecord = (await getOne(STORE, staffKey)) || {};
  let eventType = 'CHECK_IN';
  let isLate = false;
  const lateThresholdHour = 8; // 08:00 AM

  if (!existingRecord.checkInTime) {
    eventType = 'CHECK_IN';
    isLate = now.getHours() > lateThresholdHour || (now.getHours() === lateThresholdHour && now.getMinutes() > 0);
  } else if (!existingRecord.checkOutTime) {
    eventType = 'CHECK_OUT';
  } else {
    // Already checked in and checked out today
    return {
      success: true,
      alreadyCompleted: true,
      eventType: 'ALREADY_COMPLETED',
      message: `${staff.firstName} ${staff.lastName} has already completed check-in and check-out today.`,
      data: {
        staff: {
          id: staff._id,
          name: `${staff.title ? staff.title + ' ' : ''}${staff.firstName} ${staff.lastName}`,
          staffId: staff.staffId,
          photoUrl: staff.photoUrl,
          department: staff.department,
          role: staff.role,
        },
        record: existingRecord,
      },
      _offline: true,
    };
  }

  const updatedRecord = {
    ...existingRecord,
    _id: staffKey,
    staffId: staff._id,
    status: isLate ? 'late' : 'present',
    checkInTime: existingRecord.checkInTime || timeStr,
    checkOutTime: eventType === 'CHECK_OUT' ? timeStr : existingRecord.checkOutTime || null,
    markedByRole: 'gate_scanner',
    pending: true,
    updatedAt: now.toISOString(),
  };

  await putOne(STORE, updatedRecord);

  const eventId = generateEventId();
  const scanEvent = {
    eventId,
    staffId: staff._id,
    staffName: `${staff.firstName} ${staff.lastName}`,
    eventType,
    timestamp: now.toISOString(),
    latitude,
    longitude,
    result: isLate ? 'LATE' : 'SUCCESS',
    method: 'qr_scanner',
    offline: true,
  };

  await appendAttendanceEvent(scanEvent);

  // Enqueue sync mutation with eventId for server deduplication
  await enqueueSync('POST', '/staff-attendance/scan', {
    credential,
    latitude,
    longitude,
    eventId,
    timestamp: now.toISOString(),
  });

  const staffDisplayName = `${staff.title ? staff.title + ' ' : ''}${staff.firstName} ${staff.lastName}`;
  const message =
    eventType === 'CHECK_IN'
      ? isLate
        ? `[OFFLINE] Welcome ${staff.firstName}! Check-in recorded locally (Late).`
        : `[OFFLINE] Good morning, ${staff.firstName}! Check-in recorded locally.`
      : `[OFFLINE] Goodbye ${staff.firstName}! Check-out recorded locally.`;

  return {
    success: true,
    eventType,
    message,
    data: {
      staff: {
        id: staff._id,
        name: staffDisplayName,
        staffId: staff.staffId,
        photoUrl: staff.photoUrl,
        department: staff.department,
        role: staff.role,
      },
      record: updatedRecord,
      eventId,
    },
    _offline: true,
  };
}

/**
 * Record manual attendance offline (e.g. When a staff QR badge is damaged).
 */
export async function recordManualAttendanceOffline(staffId, action = 'check_in') {
  const staff = (await getAll('staff')).find((s) => s._id === staffId || s.staffId === staffId);
  if (!staff) {
    return { success: false, message: 'Staff member not found locally' };
  }

  const staffKey = todayKey(staff._id);
  const now = new Date();
  const timeStr = nowTimeString(now);
  const existingRecord = (await getOne(STORE, staffKey)) || {};

  const eventType = action === 'check_out' ? 'CHECK_OUT' : 'CHECK_IN';

  const updatedRecord = {
    ...existingRecord,
    _id: staffKey,
    staffId: staff._id,
    status: 'present',
    checkInTime: existingRecord.checkInTime || timeStr,
    checkOutTime: eventType === 'CHECK_OUT' ? timeStr : existingRecord.checkOutTime || null,
    markedByRole: 'manual',
    pending: true,
    updatedAt: now.toISOString(),
  };

  await putOne(STORE, updatedRecord);

  const eventId = generateEventId();
  await appendAttendanceEvent({
    eventId,
    staffId: staff._id,
    staffName: `${staff.firstName} ${staff.lastName}`,
    eventType,
    timestamp: now.toISOString(),
    result: 'SUCCESS',
    method: 'manual_search',
    offline: true,
  });

  await enqueueSync('POST', '/staff-attendance/scan', {
    manualStaffId: staff._id,
    eventId,
    timestamp: now.toISOString(),
    manual: true,
  });

  return {
    success: true,
    eventType,
    message: `[OFFLINE] Attendance logged for ${staff.firstName} ${staff.lastName}`,
    data: {
      staff: {
        id: staff._id,
        name: `${staff.title ? staff.title + ' ' : ''}${staff.firstName} ${staff.lastName}`,
        staffId: staff.staffId,
        photoUrl: staff.photoUrl,
        department: staff.department,
        role: staff.role,
      },
      record: updatedRecord,
      eventId,
    },
    _offline: true,
  };
}

// ─── Staff Self-Service ───────────────────────────────────────────────────────

export async function getMyTodayStatusLocal(staffId) {
  const key = todayKey(staffId);
  return getOne(STORE, key);
}

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
    pending: true,
    updatedAt: new Date().toISOString(),
  };
  await putOne(STORE, record);

  const eventId = generateEventId();
  await appendAttendanceEvent({
    eventId,
    staffId,
    eventType: 'CHECK_IN',
    timestamp: new Date().toISOString(),
    latitude: lat,
    longitude: lng,
    result: 'SUCCESS',
    method: 'self_check_in',
    offline: true,
  });

  await enqueueSync('POST', '/staff-attendance/check-in', { lat, lng, eventId });
  return record;
}

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

  const eventId = generateEventId();
  await appendAttendanceEvent({
    eventId,
    staffId,
    eventType: 'CHECK_OUT',
    timestamp: new Date().toISOString(),
    result: 'SUCCESS',
    method: 'self_check_out',
    offline: true,
  });

  await enqueueSync('POST', '/staff-attendance/check-out', { eventId });
  return record;
}

export async function markSynced(staffId) {
  const key = todayKey(staffId);
  const existing = await getOne(STORE, key);
  if (existing) {
    await putOne(STORE, { ...existing, pending: false });
  }
}

export async function cacheAdminDailyData(dateStr, data) {
  await putOne(STORE, {
    _id: `admin_daily_${dateStr}`,
    dateStr,
    data,
    cachedAt: new Date().toISOString(),
  });
}

export async function getAdminDailyCache(dateStr) {
  return getOne(STORE, `admin_daily_${dateStr}`);
}
