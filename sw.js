const CACHE_NAME = 'solarpulse-cache-v2';
const urlsToCache = [
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Installazione Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Attivazione e pulizia vecchie cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercettazione delle richieste di rete (Cache-first con fallback di rete)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Se c'è in cache lo restituisce, altrimenti fa la fetch di rete
        return response || fetch(event.request).catch(() => {
          // Fallback opzionale se manca la rete e la risorsa non è in cache
        });
      })
  );
});
