/**
 * TravelOne Service Worker - Cache-First Offline Engine
 */

const CACHE_NAME = 'travelone-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/components.css',
  './js/app.js',
  './js/db.js',
  './js/seed.js',
  './js/utils.js',
  './js/components/nav.js',
  './js/components/modal.js',
  './js/components/quickTools.js',
  './js/views/home.js',
  './js/views/dashboard.js',
  './js/views/itinerary.js',
  './js/views/reservations.js',
  './js/views/expenses.js',
  './js/views/budget.js',
  './js/views/places.js',
  './js/views/shopping.js',
  './js/views/checklist.js',
  './js/views/documents.js',
  './js/views/contacts.js',
  './js/views/journal.js',
  './js/views/summary.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

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

self.addEventListener('fetch', (event) => {
  // Offline-first strategy
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
        // Fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
