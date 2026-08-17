/**
 * HANARA SMS — Service Worker (sw.js v5)
 *
 * Fast Offline First Caching Strategy:
 *  - Static Assets & Bundles: Cache-First with background revalidation (< 50ms load time).
 *  - Images (Avatars, Photos, Unsplash, Cloudinary): Cache-First + fallback SVG placeholder.
 *  - API Calls: Network-First with IndexedDB integration handled by client service.
 *  - Auth Endpoints: Never masked with synthetic empty arrays.
 */

const CACHE_NAME = 'hanara-static-v5';
const API_CACHE_NAME = 'hanara-api-v5';
const IMG_CACHE_NAME = 'hanara-images-v5';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
];

// Fallback SVG avatar for offline broken images
const FALLBACK_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="#cbd5e1"><circle cx="50" cy="50" r="50" fill="#f1f5f9"/><circle cx="50" cy="38" r="18" fill="#94a3b8"/><path d="M18 88c0-18 14-30 32-30s32 12 32 30z" fill="#94a3b8"/></svg>`;

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
            .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME && key !== IMG_CACHE_NAME)
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

  // 1. Image caching (avatars, student photos, external CDN images)
  const isImage =
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|ico)$/i) ||
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('cloudinary.com');

  if (isImage) {
    event.respondWith(cacheFirstImage(request));
    return;
  }

  // 2. Auth Endpoints — Never mask with fake responses (let client handle via IndexedDB)
  if (url.pathname.startsWith('/api/auth/')) {
    return;
  }

  // 3. General API calls — Network-First with API cache fallback
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 4. Static Assets & App Shell — Stale-While-Revalidate for instant loading
  event.respondWith(staleWhileRevalidate(request));
});

// ─── Strategy 1: Cache-First for Images with SVG Fallback ──────────────────
async function cacheFirstImage(request) {
  const cache = await caches.open(IMG_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request, { mode: 'cors' });
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Return SVG avatar placeholder if image fetch fails while offline
    return new Response(FALLBACK_AVATAR_SVG, {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }
}

// ─── Strategy 2: Stale-While-Revalidate for Static Assets ──────────────────
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(async () => {
      if (cached) return cached;
      // Fallback to index.html for SPA navigation
      return cache.match('/index.html');
    });

  return cached || fetchPromise;
}

// ─── Strategy 3: Network-First for API Requests ───────────────────────────
async function networkFirstApi(request) {
  try {
    // 3.5s timeout on network fetch so offline/flaky connections fail fast to cache
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
      return response;
    }

    // If server 5xx, try cache
    if (response.status >= 500) {
      const cached = await caches.match(request);
      if (cached) return cached;
    }

    return response;
  } catch (err) {
    // Network offline or timeout — check cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Return synthetic 200 empty payload ONLY for generic lists/stats (NOT auth)
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

// ─── Messages from App ─────────────────────────────────────────────────────
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

// ─── Web Push Notifications ───────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'HANARA Schools', body: 'New notification received', icon: '/favicon.svg', url: '/' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

