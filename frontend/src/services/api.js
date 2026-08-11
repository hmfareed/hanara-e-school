import axios from 'axios';
import { putAll, getAll, putOne, deleteOne, enqueueSync } from './db';

// ── Raw Axios Instance for live network requests ─────────────────────────────
const rawApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT access token
rawApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle silent token refresh
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

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
          { withCredentials: true }
        );

        if (res.data?.success && res.data?.data?.accessToken) {
          const newToken = res.data.data.accessToken;
          localStorage.setItem('accessToken', newToken);
          rawApi.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return rawApi(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        window.dispatchEvent(new Event('auth-logout'));
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
  { pattern: /\/bece/, store: 'bece' },
  { pattern: /\/mock-exams/, store: 'mockExams' },
  { pattern: /\/transport/, store: 'transport' },
  { pattern: /\/store/, store: 'store' },
];

function resolveStore(url) {
  if (!url) return null;
  const entry = URL_STORE_MAP.find((m) => m.pattern.test(url));
  return entry ? entry.store : null;
}

// ── Offline-Aware GET Handler ────────────────────────────────────────────────
async function offlineGet(url, config = {}) {
  const storeName = resolveStore(url);

  if (navigator.onLine) {
    try {
      const response = await rawApi.get(url, config);

      // Cache successful response data into IndexedDB
      if (storeName && response.data?.success) {
        const payload = response.data?.data;
        if (Array.isArray(payload)) {
          const validItems = payload.filter((i) => i && i._id);
          if (validItems.length > 0) {
            await putAll(storeName, validItems);
          }
        } else if (payload && typeof payload === 'object') {
          const docToSave = payload._id ? payload : { _id: url.replace(/[^a-zA-Z0-9_]/g, '_'), ...payload };
          await putOne(storeName, docToSave);
        }
      }

      return response;
    } catch (err) {
      // If server is down (5xx / 503 / Mongo DNS error) or network error occurs
      const isServerDown = !err.response || err.response.status >= 500;
      if (isServerDown) {
        return await loadCachedOrFallback(storeName, url, config, err);
      }
      throw err;
    }
  }

  // Offline mode — load from IndexedDB or safe fallback
  return await loadCachedOrFallback(storeName, url, config);
}

// ── Helper to load cached data or return safe fallback for GET requests ───
async function loadCachedOrFallback(storeName, url, config, originalErr = null) {
  if (storeName) {
    try {
      const cached = await getAll(storeName);
      if (cached && cached.length > 0) {
        // If single object payload was cached
        let responseData = cached;
        if (cached.length === 1 && cached[0]._id && cached[0]._id.startsWith('_')) {
          const { _id, ...rest } = cached[0];
          responseData = rest;
        }

        console.info(`[OfflineAPI] Serving cached ${storeName} for ${url}`);
        return {
          data: {
            success: true,
            data: responseData,
            meta: { page: 1, limit: Array.isArray(responseData) ? responseData.length : 1, total: Array.isArray(responseData) ? responseData.length : 1, totalPages: 1 },
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

  // Safe fallback response when no cache exists yet (prevents 503 page crash)
  console.info(`[OfflineAPI] No cache found for ${url}. Returning safe empty fallback.`);
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

  if (navigator.onLine) {
    try {
      const response = await rawApi({ method, url, data, ...config });

      // Update local IndexedDB cache on successful live mutation
      const storeName = resolveStore(url);
      if (storeName && response.data?.data) {
        if (methodUpper === 'DELETE') {
          const parts = url.split('/');
          const id = parts[parts.length - 1];
          if (id && id.length > 10) {
            await deleteOne(storeName, id);
          }
        } else if (response.data.data._id) {
          await putOne(storeName, response.data.data);
        }
      }

      return response;
    } catch (err) {
      const isServerDown = !err.response || err.response.status >= 500;
      if (isServerDown) {
        console.warn(`[OfflineAPI] Server down on ${methodUpper} ${url}. Queueing mutation in IndexedDB syncQueue.`);
        await enqueueSync(methodUpper, url, data);
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
  await enqueueSync(methodUpper, url, data);
  console.info(`[OfflineAPI] Offline — Queued ${methodUpper} ${url}`);

  // Optimistically save item to IndexedDB if store is resolved
  const storeName = resolveStore(url);
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
api.delete = (url, config) => offlineMutate('delete', url, config);
api.defaults = rawApi.defaults;
api.interceptors = rawApi.interceptors;

export default api;
export { rawApi };
