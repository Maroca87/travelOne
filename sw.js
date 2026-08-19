/**
 * TravelOne Service Worker - Cache-First Offline PWA Engine
 * Provides persistent offline caching, background asset updates, and seamless navigation fallback.
 * 
 * @module sw
 */

const CACHE_NAME = 'travelone-v10';

/**
 * Essential static assets and application modules cached for full offline operation.
 * @type {string[]}
 */
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './app-logo.svg',
  './app-logo.png',
  './apple-touch-icon.png',
  './apple-touch-icon-180x180.png',
  './icon-192.png',
  './icon-512.png',
  './favicon.png',
  './css/main.css',
  './css/components.css',
  './js/icons.js',
  './js/app.js',
  './js/db.js',
  './js/seed.js',
  './js/utils.js',
  './js/components/nav.js',
  './js/components/modal.js',
  './js/components/quickTools.js',
  './js/views/auth.js',
  './js/views/home.js',
  './js/views/dashboard.js',
  './js/views/itinerary.js',
  './js/views/expenses.js',
  './js/views/checklist.js',
  './js/views/journal.js'
];

/**
 * Service Worker Installation Event
 * Opens cache and populates all core application assets.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

/**
 * Service Worker Activation Event
 * Purges outdated cache versions and claims active clients immediately.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Service Worker Fetch Event
 * Implements Cache-First strategy with automatic background network fallback and caching.
 */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

