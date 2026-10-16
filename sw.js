// PET service worker
// - Only touches Cache Storage. It cannot and does not touch localStorage,
//   so saved expenses, categories, names and settings are never affected.
// - On update it only deletes OLD "pet-app-*" caches, never other origins' caches.

const CACHE_PREFIX = 'pet-app-';
const CACHE_NAME = CACHE_PREFIX + 'v3';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './pages/home/home.html',
  './pages/home/css/home.css',
  './pages/home/js/home.js',
  './pages/history/history.html',
  './pages/history/history.css',
  './pages/history/history.js',
  './pages/preferences/preferences.html',
  './pages/preferences/preferences.css',
  './pages/preferences/preferences.js',
  './shared/css/global.css',
  './shared/css/themes.css',
  './shared/js/app_settings.js',
  './shared/js/navbar.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon.ico',
  './icons/favicon-32x32.png',
  './icons/favicon-16x16.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // add one by one: a single missing file must never abort the whole install
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Network-first, falling back to the cache when offline
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match('./pages/home/home.html');
          return Response.error();
        })
      )
  );
});