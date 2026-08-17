/**
 * db.js — HANARA SMS Local IndexedDB
 *
 * Provides a persistent local database using the `idb` library.
 * Every major data entity has its own object store.
 * A special `attendanceEvents` store holds the append-only local event log.
 * A `syncQueue` store holds pending mutations (offline writes).
 * A `meta` store holds last-sync timestamps per entity.
 */
import { openDB } from 'idb';

const DB_NAME = 'hanara-sms-db';
const DB_VERSION = 5;

let _db = null;

/**
 * Opens (or returns cached) the IndexedDB database.
 */
export async function getDB() {
  if (_db) return _db;

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      // ── Data stores ──────────────────────────────────────────────
      const stores = [
        'students',
        'staff',
        'classes',
        'attendance',
        'grades',
        'fees',
        'feeStructures',
        'dailyFeeRegisters',
        'payroll',
        'notices',
        'assignments',
        'lessonPlans',
        'behaviour',
        'academicYears',
        'settings',
        'users',        // for offline auth
        'dashboard',    // for dashboard summary cache
        'analytics',    // for executive analytics cache
        'parent',       // for parent portal cache
        'bece',         // for BECE candidates cache
        'mockExams',    // for mock exams cache
        'transport',    // for transport cache
        'store',        // for school store cache
        'staffAttendance', // for staff self-check-in cache
      ];

      stores.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: '_id' });
          if (name === 'staff') {
            store.createIndex('by_staffId', 'staffId');
            store.createIndex('by_credentialHash', 'credentialHash');
          } else if (name === 'students') {
            store.createIndex('by_admissionNumber', 'admissionNumber');
          }
        }
      });

      // Add indexes to existing stores if upgrading
      if (oldVersion < 4) {
        if (db.objectStoreNames.contains('staff')) {
          const staffStore = db.objectStoreNames.contains('staff');
          // idb handles store indices dynamically in upgrade handler
        }
      }

      // ── Append-only Attendance Events Log ────────────────────────
      if (!db.objectStoreNames.contains('attendanceEvents')) {
        const eventsStore = db.createObjectStore('attendanceEvents', {
          keyPath: 'id',
          autoIncrement: true,
        });
        eventsStore.createIndex('by_timestamp', 'timestamp');
        eventsStore.createIndex('by_staff', 'staffId');
        eventsStore.createIndex('by_eventId', 'eventId');
      }

      // ── Sync queue (pending offline mutations) ───────────────────
      if (!db.objectStoreNames.contains('syncQueue')) {
        const sq = db.createObjectStore('syncQueue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        sq.createIndex('by_timestamp', 'timestamp');
        sq.createIndex('by_state', 'state');
        sq.createIndex('by_clientMutationId', 'clientMutationId', { unique: true });
      } else if (oldVersion < 5) {
        const sq = transaction.objectStore('syncQueue');
        if (!sq.indexNames.contains('by_state')) sq.createIndex('by_state', 'state');
        if (!sq.indexNames.contains('by_clientMutationId')) {
          sq.createIndex('by_clientMutationId', 'clientMutationId', { unique: true });
        }
      }

      // ── Meta (last sync timestamps & session) ────────────────────
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta');
      }
    },
  });

  return _db;
}

// ─── Generic CRUD Helpers ──────────────────────────────────────────────────

/** Replace all records in a store with the given array */
export async function putAll(storeName, items) {
  if (!items || items.length === 0) return;
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  await Promise.all(items.map((item) => tx.store.put(item)));
  await tx.done;
}

/** Get all records from a store */
export async function getAll(storeName) {
  const db = await getDB();
  return db.getAll(storeName);
}

/** Get one record by _id */
export async function getOne(storeName, id) {
  const db = await getDB();
  return db.get(storeName, id);
}

/** Put (upsert) one record */
export async function putOne(storeName, record) {
  const db = await getDB();
  return db.put(storeName, record);
}

/** Delete one record by _id */
export async function deleteOne(storeName, id) {
  const db = await getDB();
  return db.delete(storeName, id);
}

/** Clear all records from a store */
export async function clearStore(storeName) {
  const db = await getDB();
  return db.clear(storeName);
}

// ─── Meta / Sync Timestamps ────────────────────────────────────────────────

export async function getLastSync(storeName) {
  const db = await getDB();
  return db.get('meta', `lastSync_${storeName}`);
}

export async function setLastSync(storeName, isoTimestamp) {
  const db = await getDB();
  return db.put('meta', isoTimestamp, `lastSync_${storeName}`);
}

// ─── Session Cache (offline auth) ─────────────────────────────────────────

export async function saveUserSession(user) {
  const db = await getDB();
  return db.put('meta', user, 'currentUser');
}

export async function loadUserSession() {
  const db = await getDB();
  return db.get('meta', 'currentUser');
}

export async function clearUserSession() {
  const db = await getDB();
  return db.delete('meta', 'currentUser');
}

// ─── Immutable Attendance Events Store ─────────────────────────────────────

/** Append an immutable attendance event */
export async function appendAttendanceEvent(event) {
  const db = await getDB();
  return db.add('attendanceEvents', {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  });
}

/** Get all attendance events for today */
export async function getAttendanceEventsToday(staffId = null) {
  const db = await getDB();
  const all = await db.getAll('attendanceEvents');
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = all.filter((e) => e.timestamp && e.timestamp.startsWith(todayStr));
  if (staffId) {
    return todayEvents.filter((e) => e.staffId === staffId || e.staff?._id === staffId);
  }
  return todayEvents;
}

// ─── Specialized Local Lookups ─────────────────────────────────────────────

/** Lookup staff by scanned QR token hash */
export async function getStaffByCredentialHash(hash) {
  const db = await getDB();
  const allStaff = await db.getAll('staff');
  return allStaff.find((s) => s.credentialHash === hash);
}

/** Offline Search Staff by Name or Staff ID */
export async function searchStaffLocal(query) {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const db = await getDB();
  const allStaff = await db.getAll('staff');
  return allStaff.filter(
    (s) =>
      `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase().includes(q) ||
      (s.staffId && s.staffId.toLowerCase().includes(q)) ||
      (s.department && s.department.toLowerCase().includes(q))
  );
}

/** Offline Search Students by Name or Admission Number */
export async function searchStudentsLocal(query) {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const db = await getDB();
  const allStudents = await db.getAll('students');
  return allStudents.filter(
    (s) =>
      `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase().includes(q) ||
      (s.admissionNumber && s.admissionNumber.toLowerCase().includes(q))
  );
}

// ─── Sync Queue ────────────────────────────────────────────────────────────

/** Enqueue a pending mutation */
export async function enqueueSync(method, url, body = null, options = {}) {
  const db = await getDB();
  const clientMutationId =
    options.clientMutationId ||
    crypto.randomUUID?.() ||
    `mutation_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const existing = await db.getFromIndex('syncQueue', 'by_clientMutationId', clientMutationId);
  if (existing) return existing.id;

  return db.add('syncQueue', {
    method,
    url,
    body,
    clientMutationId,
    storeName: options.storeName || null,
    localRecordId: options.localRecordId || null,
    timestamp: new Date().toISOString(),
    retries: 0,
    state: 'pending',
    lastError: null,
  });
}

/** Get all pending queued items (ordered oldest first) */
export async function getAllQueuedItems() {
  const db = await getDB();
  const all = await db.getAllFromIndex('syncQueue', 'by_timestamp');
  return all;
}

/** Remove a queued item by its auto-increment id */
export async function removeQueuedItem(id) {
  const db = await getDB();
  return db.delete('syncQueue', id);
}

/** Update queue diagnostics without losing a failed offline change. */
export async function updateQueuedItem(id, changes) {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  if (!item) return null;
  const updated = { ...item, ...changes, updatedAt: new Date().toISOString() };
  await db.put('syncQueue', updated);
  return updated;
}

/** Count pending items */
export async function getQueueCount() {
  const db = await getDB();
  return db.count('syncQueue');
}

/** Clear entire sync queue */
export async function clearSyncQueue() {
  const db = await getDB();
  return db.clear('syncQueue');
}
