/**
 * HANARA SMS — Service Worker (sw.js)
 *
 * Network-First strategy for both static assets and API requests:
 *  - Online: Fetch latest from server/Vite. On success, save copy to cache.
 *  - Offline / 5xx Server Error: Fall back to cached responses or synthetic 200 OK.
 *  - Never return synthetic 503 responses that crash the UI.
 */

const CACHE_NAME = 'hanara-sms-v3';
const API_CACHE_NAME = 'hanara-api-v3';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
];

// ─── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ─── Fetch Intercept ────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Don't intercept Vite HMR or dev server internals
  if (
    url.pathname.includes('/@vite/') ||
    url.pathname.includes('/@fs/') ||
    url.pathname.includes('/node_modules/')
  ) {
    return;
  }

  // API calls — Network-First with API cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Assets & Navigation — Network-First with Cache fallback
  event.respondWith(networkFirstAssets(request));
});

// ─── Strategy 1: Network-First for API Requests ───────────────────────────
async function networkFirstApi(request) {
  try {
    const response = await fetch(request);

    // If server responds with 2xx OK, update API cache
    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }

    // If server responds with 5xx / 503, try serving cached API response
    if (response.status >= 500) {
      const cached = await caches.match(request);
      if (cached) {
        console.info('[SW] Server 5xx. Serving cached API response for:', request.url);
        return cached;
      }
      // No cached API response — return synthetic 200 OK empty payload so UI doesn't crash
      return new Response(
        JSON.stringify({
          success: true,
          data: request.url.includes('summary') || request.url.includes('stats') ? {} : [],
          meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
          _swFallback: true,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return response;
  } catch {
    // Network offline — check cache first
    const cached = await caches.match(request);
    if (cached) {
      console.info('[SW] Offline — Serving cached API response for:', request.url);
      return cached;
    }

    // No cache — return synthetic 200 OK empty payload (never 503)
    return new Response(
      JSON.stringify({
        success: true,
        data: request.url.includes('summary') || request.url.includes('stats') ? {} : [],
        meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
        _swFallback: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ─── Strategy 2: Network-First for App Assets / Pages ─────────────────────
async function networkFirstAssets(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline — serve from static cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback to index.html shell
    return caches.match('/index.html');
  }
}

// ─── Messages from app ─────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHES') {
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => {
        event.source?.postMessage({ type: 'CACHES_CLEARED' });
      });
  }
});
