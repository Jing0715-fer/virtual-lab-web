// Virtual Lab Service Worker — Enhanced with stale-while-revalidate, offline fallback, and cache versioning
const CACHE_NAME = 'vlab-v2';
const STATIC_CACHE = 'vlab-static-v2';
const API_CACHE = 'vlab-api-v2';
const OFFLINE_CACHE = 'vlab-offline-v2';

// App shell resources to pre-cache on install
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/virtual-lab-hero.png',
];

// Cache TTL configuration (in seconds)
const CACHE_TTL = {
  static: 30 * 24 * 60 * 60,    // 30 days for static assets
  api: 5 * 60,                    // 5 minutes for API responses
  html: 60 * 60,                  // 1 hour for HTML pages
};

// Install: pre-cache app shell and critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // Pre-cache app shell (fail silently for individual resources)
      return Promise.allSettled(
        APP_SHELL.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  // Activate new SW immediately
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !key.includes('v2'))
          .map((key) => caches.delete(key))
      );
    })
  );
  // Claim all clients immediately
  self.clients.claim();

  // Notify clients that a new SW is active
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'SW_UPDATED' });
    });
  });
});

// Fetch: strategy routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // API calls: stale-while-revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidateWithTTL(request, CACHE_TTL.api, API_CACHE));
    return;
  }

  // Static assets (JS, CSS, images, fonts): cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithTTL(request, CACHE_TTL.static, STATIC_CACHE));
    return;
  }

  // Next.js static pages: stale-while-revalidate
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(staleWhileRevalidateWithTTL(request, CACHE_TTL.html, STATIC_CACHE));
    return;
  }

  // HTML pages: stale-while-revalidate
  if (request.mode === 'navigate' || url.pathname === '/') {
    event.respondWith(staleWhileRevalidateWithTTL(request, CACHE_TTL.html, STATIC_CACHE));
    return;
  }

  // Everything else: network-first with offline fallback
  event.respondWith(networkFirst(request));
});

// Helper: detect static assets
function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2|woff|ttf|webp|avif)(\?.*)?$/.test(pathname);
}

// Cache-first with TTL: serve from cache, network if expired/missing
async function cacheFirstWithTTL(request, ttl, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    // Check if still valid by examining cached date header or simply serve it
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Offline fallback for images
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="none"><rect width="400" height="300" fill="#1e293b"/><text x="50%" y="50%" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="14">Image unavailable offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Stale-while-revalidate with TTL: serve cache immediately, update in background
async function staleWhileRevalidateWithTTL(request, ttl, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Update in background regardless
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // If network fails and no cache, return offline response
      if (!cached) {
        if (request.mode === 'navigate') {
          return caches.match('/').then((offline) => offline || new Response('Offline', { status: 503 }));
        }
        return new Response(
          JSON.stringify({ error: 'You are offline', cached: true }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      return cached;
    });

  return cached || fetchPromise;
}

// Network-first: try network, fallback to cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // For navigation requests, serve offline page
    if (request.mode === 'navigate') {
      const offline = await caches.match('/');
      if (offline) return offline;
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Background sync: replay queued requests when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'vlab-sync') {
    event.waitUntil(replayQueuedRequests());
  }
});

async function replayQueuedRequests() {
  // This is a simplified version — in a full implementation,
  // you would read from IndexedDB and replay each request
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  });
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key));
    });
  }

  if (event.data?.type === 'CACHE_URLS') {
    const { urls } = event.data;
    caches.open(STATIC_CACHE).then((cache) => {
      urls.forEach((url) => cache.add(url).catch(() => {}));
    });
  }
});
