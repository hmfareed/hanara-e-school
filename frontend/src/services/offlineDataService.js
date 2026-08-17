/**
 * offlineDataService.js — Pre-caching and Data Hydration Service
 *
 * Implements the "First Time Setup" and "Prepare for Offline" bootstrap engine:
 * 1. Downloads the consolidated school dataset via /api/sync/bootstrap.
 * 2. Hydrates IndexedDB object stores (staff with QR hashes, students, classes,
 *    academic years, fee structures, mock series, system settings).
 * 3. Provides offline readiness diagnostic checks and local storage metrics.
 */

import { rawApi } from './api';
import { putAll, putOne, setLastSync, getLastSync, getAll, getDB } from './db';

/**
 * Perform a full offline preparation hydration.
 *
 * @param {Function} [onProgress] - Callback (progressObj: { stage, percent, count, message })
 * @returns {Promise<{ success: boolean, counts: object, timestamp: string }>}
 */
export async function prepareOfflineData(onProgress = () => {}) {
  try {
    onProgress({
      stage: 'connecting',
      percent: 10,
      message: 'Connecting to server bootstrap endpoint...',
    });

    const res = await rawApi.get('/sync/bootstrap');
    if (!res.data?.success || !res.data?.data) {
      throw new Error(res.data?.message || 'Bootstrap payload unavailable');
    }

    const { data, counts, timestamp } = res.data;

    onProgress({
      stage: 'hydrating_staff',
      percent: 25,
      message: `Caching ${counts.staff || 0} staff members & QR credentials...`,
    });
    if (data.staff && data.staff.length > 0) {
      await putAll('staff', data.staff);
      await setLastSync('staff', timestamp);
    }

    onProgress({
      stage: 'hydrating_students',
      percent: 50,
      message: `Caching ${counts.students || 0} student profiles & guardians...`,
    });
    if (data.students && data.students.length > 0) {
      await putAll('students', data.students);
      await setLastSync('students', timestamp);
    }

    onProgress({
      stage: 'hydrating_classes',
      percent: 70,
      message: `Caching ${counts.classes || 0} classes & grade structures...`,
    });
    if (data.classes && data.classes.length > 0) {
      await putAll('classes', data.classes);
      await setLastSync('classes', timestamp);
    }

    onProgress({
      stage: 'hydrating_modules',
      percent: 85,
      message: 'Caching mock exam series, fee structures & system settings...',
    });

    if (data.academicYears && data.academicYears.length > 0) {
      await putAll('academicYears', data.academicYears);
      await setLastSync('academicYears', timestamp);
    }

    if (data.feeStructures && data.feeStructures.length > 0) {
      await putAll('feeStructures', data.feeStructures);
      await setLastSync('feeStructures', timestamp);
    }

    if (data.mockExams && data.mockExams.length > 0) {
      await putAll('mockExams', data.mockExams);
      await setLastSync('mockExams', timestamp);
    }

    if (data.beceCandidates && data.beceCandidates.length > 0) {
      await putAll('bece', data.beceCandidates);
      await setLastSync('bece', timestamp);
    }

    // Pre-cache photos into Service Worker Image Cache for offline portrait rendering
    (async () => {
      try {
        if ('caches' in window) {
          const imgCache = await caches.open('hanara-images-v5');
          const urlsToCache = [];
          if (data.staff) {
            data.staff.forEach((s) => {
              if (s.photoUrl && s.photoUrl.startsWith('http')) urlsToCache.push(s.photoUrl);
            });
          }
          if (data.students) {
            data.students.forEach((s) => {
              if (s.photoUrl && s.photoUrl.startsWith('http')) urlsToCache.push(s.photoUrl);
            });
          }
          // Fetch and cache photos asynchronously in background
          for (const imgUrl of urlsToCache.slice(0, 100)) {
            try {
              const imgRes = await fetch(imgUrl, { mode: 'no-cors' });
              if (imgRes) await imgCache.put(imgUrl, imgRes);
            } catch (imgErr) {
              // Ignore individual image download failure
            }
          }
        }
      } catch (cacheErr) {
        console.warn('[OfflineDataService] Image pre-caching warning:', cacheErr);
      }
    })();

    // Save global bootstrap timestamp in meta store
    await setLastSync('bootstrap_all', timestamp);

    onProgress({
      stage: 'complete',
      percent: 100,
      message: 'All school records synchronized for 100% offline use!',
    });

    return {
      success: true,
      counts,
      timestamp,
    };
  } catch (err) {
    console.error('[OfflineDataService] Preparation failed:', err);
    onProgress({
      stage: 'error',
      percent: 0,
      message: err.message || 'Failed to prepare offline data',
    });
    return {
      success: false,
      error: err.message || 'Offline data download failed',
    };
  }
}

/**
 * Check whether local IndexedDB is populated and ready for offline operations.
 */
export async function checkOfflineReadiness() {
  try {
    const db = await getDB();
    const staffCount = await db.count('staff');
    const studentCount = await db.count('students');
    const classCount = await db.count('classes');
    const lastHydration = await getLastSync('bootstrap_all');

    const isReady = staffCount > 0 && studentCount > 0 && classCount > 0;

    return {
      isReady,
      staffCount,
      studentCount,
      classCount,
      lastHydration: lastHydration || null,
      status: isReady ? 'ready' : 'needs_hydration',
    };
  } catch (err) {
    return {
      isReady: false,
      staffCount: 0,
      studentCount: 0,
      classCount: 0,
      lastHydration: null,
      status: 'error',
    };
  }
}

/**
 * Collect detailed offline storage metrics across all local stores.
 */
export async function getOfflineStorageStats() {
  try {
    const db = await getDB();
    const storeNames = [
      'staff',
      'students',
      'classes',
      'attendanceEvents',
      'mockExams',
      'feeStructures',
      'dailyFeeRegisters',
      'syncQueue',
    ];

    const stats = {};
    for (const name of storeNames) {
      if (db.objectStoreNames.contains(name)) {
        stats[name] = await db.count(name);
      } else {
        stats[name] = 0;
      }
    }

    const lastBootstrap = await getLastSync('bootstrap_all');

    return {
      stats,
      lastBootstrap,
    };
  } catch (e) {
    return { stats: {}, lastBootstrap: null };
  }
}
