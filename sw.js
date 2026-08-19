/**
 * TravelOne Service Worker - Cache-First Offline Engine - Costa Rica Edition 🇨🇷
 */

const CACHE_NAME = 'travelone-cr-v4';

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
