// Service Worker para Parla Sport CRM - PWA & Push Notifications
const CACHE_NAME = 'parla-sport-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network first strategy for dynamic application content
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Listener para notificaciones Push en PWA
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Parla Sport CRM', body: 'Nueva actualización de sesión.' };
  
  const options = {
    body: data.body || 'Tienes una nueva notificación en Parla Sport.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      { action: 'explore', title: 'Ver Calendario' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Parla Sport CRM', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'explore') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});
