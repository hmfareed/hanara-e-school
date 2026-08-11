/**
 * db.js — HANARA SMS Local IndexedDB
 *
 * Provides a persistent local database using the `idb` library.
 * Every major data entity has its own object store.
 * A special `syncQueue` store holds pending mutations (offline writes).
 * A `meta` store holds last-sync timestamps per entity.
 */
import { openDB } from 'idb';

const DB_NAME = 'hanara-sms-db';
const DB_VERSION = 3;

let _db = null;

/**
 * Opens (or returns cached) the IndexedDB database.
 */
export async function getDB() {
  if (_db) return _db;

  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // ── Data stores ──────────────────────────────────────────────
      const stores = [
        'students',
        'staff',
        'classes',
        'attendance',
        'grades',
        'fees',
        'feeStructures',
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
          db.createObjectStore(name, { keyPath: '_id' });
        }
      });

      // ── Sync queue (pending offline mutations) ───────────────────
      if (!db.objectStoreNames.contains('syncQueue')) {
        const sq = db.createObjectStore('syncQueue', {
          keyPath: 'id',
          autoIncrement: true,
        });
        sq.createIndex('by_timestamp', 'timestamp');
      }

      // ── Meta (last sync timestamps) ──────────────────────────────
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

// ─── Sync Queue ────────────────────────────────────────────────────────────

/** Enqueue a pending mutation */
export async function enqueueSync(method, url, body = null) {
  const db = await getDB();
  return db.add('syncQueue', {
    method,
    url,
    body,
    timestamp: new Date().toISOString(),
    retries: 0,
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
