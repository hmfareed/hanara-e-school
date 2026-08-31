import axios from 'axios';
import { putAll, getAll, putOne, deleteOne, clearStore, enqueueSync, getOne, replaceStore, clearAllCaches } from './db';

// ── Dynamic Base URL Resolution (supports localhost, LAN IPs & desktop mode) ─
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && !envUrl.startsWith('/')) {
    return envUrl;
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    // If running inside Vite dev server (e.g. port 5173), default to port 5000 backend
    if (origin.includes(':5173') || origin.includes(':5174') || origin.includes(':3000')) {
      return envUrl || 'http://localhost:5000/api';
    }
    return `${origin}/api`;
  }
  return 'http://localhost:5000/api';
};

// ── Raw Axios Instance for live network requests ─────────────────────────────
const rawApi = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  timeout: 20000, // 20 seconds timeout for remote MongoDB cloud connections & mobile latency
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track last known network connectivity
let lastKnownOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

export function notifyNetworkStatus(online) {
  if (lastKnownOnline !== online) {
    lastKnownOnline = online;
    window.dispatchEvent(new CustomEvent(online ? 'app-online' : 'app-offline'));
  }
}

// Request interceptor to attach JWT access token & activeMode
rawApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const activeMode = localStorage.getItem('activeMode') || 'admin';
    config.headers['X-Active-Mode'] = activeMode;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle silent token refresh and network failure notification
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

rawApi.interceptors.response.use(
  (response) => {
    notifyNetworkStatus(true);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Detect true network disconnect (only when browser reports offline or host completely unreachable)
    const isNetworkError =
      (typeof navigator !== 'undefined' && !navigator.onLine) ||
      (error.code === 'ERR_NETWORK' && !error.response);

    if (isNetworkError) {
      notifyNetworkStatus(false);
    }

    // Catch 401 errors except login and refresh endpoints themselves
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return rawApi(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(
          `${rawApi.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true, timeout: 15000 }
        );

        if (res.data?.success && res.data?.data?.accessToken) {
          const newToken = res.data.data.accessToken;
          localStorage.setItem('accessToken', newToken);
          rawApi.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          notifyNetworkStatus(true);
          return rawApi(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Only log out if refresh was explicitly rejected with 401 by a reachable server
        if (refreshError.response?.status === 401) {
          localStorage.removeItem('accessToken');
          window.dispatchEvent(new Event('auth-logout'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── IndexedDB Store Mapper ──────────────────────────────────────────────────
const URL_STORE_MAP = [
  { pattern: /\/dashboard/, store: 'dashboard' },
  { pattern: /\/analytics/, store: 'analytics' },
  { pattern: /\/students/, store: 'students' },
  { pattern: /\/staff/, store: 'staff' },
  { pattern: /\/classes/, store: 'classes' },
  { pattern: /\/attendance/, store: 'attendance' },
  { pattern: /\/grades/, store: 'grades' },
  { pattern: /\/fees\/structures|\/fee-structures/, store: 'feeStructures' },
  { pattern: /\/fees/, store: 'fees' },
  { pattern: /\/payroll/, store: 'payroll' },
  { pattern: /\/notices/, store: 'notices' },
  { pattern: /\/assignments|\/offline-assignments/, store: 'assignments' },
  { pattern: /\/lesson-plans/, store: 'lessonPlans' },
  { pattern: /\/behaviour/, store: 'behaviour' },
  { pattern: /\/academic-years/, store: 'academicYears' },
  { pattern: /\/settings/, store: 'settings' },
  { pattern: /\/parent/, store: 'parent' },
  { pattern: /\/bece-candidates|\/bece/, store: 'bece' },
  { pattern: /\/mock-exams/, store: 'mockExams' },
  { pattern: /\/transport/, store: 'transport' },
  { pattern: /\/store/, store: 'store' },
];

function resolveStore(url) {
  if (!url) return null;
  const entry = URL_STORE_MAP.find((m) => m.pattern.test(url));
  return entry ? entry.store : null;
}

function isOnlineOnlyMutation(url) {
  return /\/auth\/|\/fees\/payments\/momo|\/momo\/|\/admin\/backups|\/restore|\/mock-exams\/.*\/(lock|submit)/.test(url || '');
}

function createMutationId() {
  return crypto.randomUUID?.() || `mutation_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// ── Offline-Aware GET Handler ────────────────────────────────────────────────
async function offlineGet(url, config = {}) {
  const storeName = resolveStore(url);

  // If browser reports online, always attempt live network request first
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const response = await rawApi.get(url, config);
      notifyNetworkStatus(true);

      // Cache successful response data into IndexedDB asynchronously (non-blocking)
      if (storeName && response.data?.success) {
        const payload = response.data?.data;
        (async () => {
          try {
            if (Array.isArray(payload)) {
              const validItems = payload.filter((i) => i && i._id);
              // For full list collections or non-paginated lists, replace the store to clean up stale records
              if (
                ['classes', 'academicYears', 'feeStructures', 'settings'].includes(storeName) ||
                (!config.params?.page && !config.params?.search)
              ) {
                await replaceStore(storeName, validItems);
              } else if (validItems.length > 0) {
                await putAll(storeName, validItems);
              }
            } else if (payload && typeof payload === 'object') {
              const docToSave = payload._id ? payload : { _id: url.replace(/[^a-zA-Z0-9_]/g, '_'), ...payload };
              await putOne(storeName, docToSave);
            }
          } catch (cacheErr) {
            console.warn('[OfflineAPI] Non-blocking cache write warning:', cacheErr);
          }
        })();
      }

      return response;
    } catch (err) {
      const isServerDown =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        (err.code === 'ERR_NETWORK' && !err.response);

      if (isServerDown || !err.response || err.response.status >= 500) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          notifyNetworkStatus(false);
        }
        return await loadCachedOrFallback(storeName, url, config, err);
      }
      throw err;
    }
  }

  // Offline mode — load immediately from local IndexedDB (instant < 5ms response)
  return await loadCachedOrFallback(storeName, url, config);
}

// ── Helper to load cached data, filter in-memory, or return safe fallback ────
async function loadCachedOrFallback(storeName, url, config = {}, originalErr = null) {
  // Extract query params from URL string and config.params
  const urlObj = new URL(url, 'http://localhost');
  const params = { ...Object.fromEntries(urlObj.searchParams), ...(config.params || {}) };

  // 1. If requesting a single resource by ID (e.g. /students/12345 or /staff/12345)
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  const lastSegment = pathParts[pathParts.length - 1];
  const isSingleIdQuery = lastSegment && lastSegment.length > 8 && !['stats', 'summary', 'me', 'bootstrap', 'ping'].includes(lastSegment);

  if (storeName) {
    try {
      if (isSingleIdQuery) {
        const singleItem = await getOne(storeName, lastSegment);
        if (singleItem) {
          return {
            data: { success: true, data: singleItem, _fromCache: true },
            status: 200,
            statusText: 'OK (cached single)',
            headers: {},
            config,
          };
        }
      }

      let cached = await getAll(storeName);

      // Filter out corrupted/blank items from cache
      if (cached && Array.isArray(cached)) {
        if (storeName === 'classes') {
          cached = cached.filter((c) => c && c.name && String(c.name).trim().length > 0);
        } else if (storeName === 'students') {
          cached = cached.filter((s) => s && (s.firstName || s.lastName || s.admissionNumber));
        } else if (storeName === 'staff') {
          cached = cached.filter((s) => s && (s.firstName || s.lastName || s.email));
        }
      }

      // Synthesize BECE candidates from JHS 3 students if store is empty
      if (storeName === 'bece' && (!cached || cached.length === 0)) {
        try {
          const allStudents = await getAll('students');
          const jhsStudents = (allStudents || []).filter((s) => {
            const className = String(s.currentClass?.name || s.currentClass?.code || s.className || '').toLowerCase();
            return className.includes('jhs 3') || className.includes('jhs3') || className.includes('basic 9') || className.includes('bs9');
          });
          if (jhsStudents.length > 0) {
            cached = jhsStudents.map((s, idx) => ({
              _id: `bece_${s._id}`,
              student: s,
              academicYear: params.academicYear || '2026/2027',
              registrationStatus: 'registered',
              indexNumber: s.admissionNumber ? `100100${String(idx + 1).padStart(3, '0')}` : '',
              mockResults: [],
              notes: 'Pre-registered BECE candidate',
            }));
          }
        } catch (beceSynthErr) {
          console.warn('[OfflineAPI] BECE synthesis error:', beceSynthErr);
        }
      }

      if (cached && cached.length > 0) {
        // Filter in-memory if query parameters are present
        let filtered = [...cached];

        // Search query filter
        if (params.search && typeof params.search === 'string') {
          const q = params.search.trim().toLowerCase();
          filtered = filtered.filter((item) => {
            const studentObj = item.student || item;
            const fullName = `${studentObj.firstName || ''} ${studentObj.lastName || ''} ${studentObj.name || ''}`.toLowerCase();
            const identifier = `${studentObj.admissionNumber || ''} ${studentObj.staffId || ''} ${item.indexNumber || ''} ${studentObj.code || ''}`.toLowerCase();
            const phoneOrEmail = `${studentObj.phone || ''} ${studentObj.email || ''}`.toLowerCase();
            return fullName.includes(q) || identifier.includes(q) || phoneOrEmail.includes(q);
          });
        }

        // Status filter
        if (params.status && params.status !== 'all') {
          filtered = filtered.filter((item) => {
            if (!item.status && params.status === 'active') return true;
            return (
              item.status === params.status ||
              item.employmentStatus === params.status ||
              item.registrationStatus === params.status
            );
          });
        }

        // Academic Year filter
        if (params.academicYear) {
          filtered = filtered.filter((item) => {
            if (!item.academicYear) return true;
            return item.academicYear === params.academicYear;
          });
        }

        // Class filter
        if (params.class) {
          filtered = filtered.filter((item) => {
            const studentObj = item.student || item;
            const cId = studentObj.currentClass?._id || studentObj.currentClass || studentObj.class;
            return String(cId) === String(params.class);
          });
        }

        // Gender filter
        if (params.gender) {
          filtered = filtered.filter((item) => {
            const studentObj = item.student || item;
            return String(studentObj.gender || '').toLowerCase() === String(params.gender).toLowerCase();
          });
        }

        // Pagination
        const page = Number(params.page) || 1;
        const limit = Number(params.limit) || filtered.length;
        const total = filtered.length;
        const totalPages = Math.ceil(total / (limit || 1)) || 1;
        const startIndex = (page - 1) * limit;
        const paginatedData = limit < filtered.length ? filtered.slice(startIndex, startIndex + limit) : filtered;

        // If single object payload was cached (e.g. dashboard summary)
        let responseData = paginatedData;
        if (cached.length === 1 && cached[0]._id && String(cached[0]._id).startsWith('_')) {
          const { _id, ...rest } = cached[0];
          responseData = rest;
        }

        return {
          data: {
            success: true,
            data: responseData,
            meta: { page, limit, total, totalPages, pages: totalPages },
            _fromCache: true,
          },
          status: 200,
          statusText: 'OK (cached fallback)',
          headers: {},
          config,
        };
      }
    } catch (e) {
      console.warn('[OfflineAPI] Error reading IndexedDB cache:', e);
    }
  }


  // 2. Synthesize Dashboard / Stats if requested while offline
  if (url?.includes('summary') || url?.includes('stats') || url?.includes('overview')) {
    try {
      const [allStudents, allStaff, allClasses] = await Promise.all([
        getAll('students'),
        getAll('staff'),
        getAll('classes'),
      ]);

      const classList = (allClasses || []).map((c) => {
        const sCount = (allStudents || []).filter((s) => {
          const cId = s.currentClass?._id || s.currentClass || s.class;
          return String(cId) === String(c._id);
        }).length;
        return {
          _id: c._id,
          name: c.name,
          stage: c.stage || 'Basic Education',
          studentCount: sCount,
          attendanceRate: 100,
        };
      });

      const syntheticStats = {
        totalStudents: allStudents?.length || 0,
        totalStaff: allStaff?.length || 0,
        todayClassesCount: allClasses?.length || 0,
        attendance: {
          present: allStudents?.length || 0,
          absent: 0,
          late: 0,
          rate: 100,
          totalMarked: allStudents?.length || 0,
        },
        pendingAttendanceClasses: [],
        myClasses: classList,
        recentAdmissions: (allStudents || []).slice(0, 5).map((s) => ({
          _id: s._id,
          firstName: s.firstName,
          lastName: s.lastName,
          admissionNumber: s.admissionNumber,
          currentClass: s.currentClass ? { name: s.currentClass.name || 'Assigned' } : null,
          createdAt: new Date().toISOString(),
        })),
        recentAnnouncements: [],
        pendingMockEntries: 0,
        upcomingBirthdays: [],
        isOfflineSynthetic: true,
      };

      return {
        data: { success: true, data: syntheticStats, _fromCache: true },
        status: 200,
        statusText: 'OK (offline synthetic stats)',
        headers: {},
        config,
      };
    } catch (e) {
      // Fall through to empty fallback
    }
  }

  // If endpoint is an auth endpoint or unknown endpoint that shouldn't be faked
  if (!storeName && (url?.includes('/auth/') || url?.includes('/sync/'))) {
    if (originalErr) throw originalErr;
    const err = new Error('Offline — network endpoint unavailable');
    err.code = 'ERR_NETWORK';
    throw err;
  }

  // Safe fallback response when no cache exists yet (prevents 503 page crash)
  return {
    data: {
      success: true,
      data: url?.includes('summary') || url?.includes('stats') ? {} : [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
      _fromCache: true,
      _emptyFallback: true,
    },
    status: 200,
    statusText: 'OK (offline fallback)',
    headers: {},
    config,
  };
}

// ── Offline-Aware Mutation Handler (POST, PUT, PATCH, DELETE) ────────────────
async function offlineMutate(method, url, data = null, config = {}) {
  const methodUpper = method.toUpperCase();

  const requestConfig = { method, url, ...config };
  if (data !== null && data !== undefined) {
    requestConfig.data = data;
  }

  // Never queue authentication or token endpoints offline
  if (url && (url.includes('/auth/') || url.includes('/login') || url.includes('/refresh'))) {
    return rawApi(requestConfig);
  }

  if (isOnlineOnlyMutation(url) && (typeof navigator !== 'undefined' && !navigator.onLine)) {
    const error = new Error('This action requires an active internet connection and cannot be queued.');
    error.code = 'OFFLINE_ACTION_NOT_ALLOWED';
    throw error;
  }

  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const response = await rawApi(requestConfig);
      notifyNetworkStatus(true);

      // Update local IndexedDB cache on successful live mutation
      const storeName = resolveStore(url);
      if (storeName) {
        if (methodUpper === 'DELETE') {
          if (url.includes('/month/')) {
            await clearStore(storeName);
          } else {
            const parts = url.split('?')[0].split('/');
            const id = parts[parts.length - 1];
            if (id && id.length > 10) {
              await deleteOne(storeName, id);
            }
          }
        } else if (response.data?.data?._id) {
          await putOne(storeName, response.data.data);
        }
      }

      return response;
    } catch (err) {
      const isServerDown =
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNABORTED' ||
        !err.response ||
        err.response.status >= 500;

      if (isServerDown) {
        notifyNetworkStatus(false);
        console.warn(`[OfflineAPI] Server down on ${methodUpper} ${url}. Queueing mutation in IndexedDB syncQueue.`);
        const storeName = resolveStore(url);
        const clientMutationId = createMutationId();
        await enqueueSync(methodUpper, url, data, { clientMutationId, storeName });
        return {
          data: {
            success: true,
            data: data || {},
            _queued: true,
            message: 'Saved offline. Will sync when reconnected.',
          },
          status: 202,
          statusText: 'Queued (offline)',
          headers: {},
          config,
        };
      }
      throw err;
    }
  }

  // Offline mode — enqueue mutation into syncQueue
  notifyNetworkStatus(false);
  const storeName = resolveStore(url);
  const clientMutationId = createMutationId();
  await enqueueSync(methodUpper, url, data, { clientMutationId, storeName });

  // Optimistically save item to IndexedDB if store is resolved
  if (storeName && data) {
    const itemToSave = { ...data, _id: data._id || `temp_${Date.now()}` };
    await putOne(storeName, itemToSave);
  }

  return {
    data: {
      success: true,
      data: data || {},
      _queued: true,
      message: 'Saved offline. Will sync when reconnected.',
    },
    status: 202,
    statusText: 'Queued (offline)',
    headers: {},
    config,
  };
}

// ── Exported API Interface (Drop-in replacement for axios instance) ──────────
const api = function (config) {
  if (typeof config === 'string') {
    return offlineGet(config);
  }
  const method = (config.method || 'get').toLowerCase();
  if (method === 'get') {
    return offlineGet(config.url, config);
  }
  return offlineMutate(method, config.url, config.data, config);
};

api.get = (url, config) => offlineGet(url, config);
api.post = (url, data, config) => offlineMutate('post', url, data, config);
api.put = (url, data, config) => offlineMutate('put', url, data, config);
api.patch = (url, data, config) => offlineMutate('patch', url, data, config);
api.delete = (url, config) => offlineMutate('delete', url, null, config);
api.defaults = rawApi.defaults;
api.interceptors = rawApi.interceptors;

export default api;
export { rawApi };
