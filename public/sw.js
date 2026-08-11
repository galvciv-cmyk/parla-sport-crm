/* =============================================
   PARLA SPORT CRM — Service Worker v2.1
   Maneja: Cache offline, PWA install y soporte
   de notificaciones de respaldo.
   ============================================= */

const CACHE_NAME = 'parla-sport-v2.1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.png', '/logo.png'];

// ─── INSTALL ─────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignorar si algún asset estático falla
      });
    })
  );
  self.skipWaiting();
});

// ─── ACTIVATE ────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── FETCH (Cache First con Network Fallback) ───
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => caches.match('/index.html'));
    })
  );
});

// ─── PUSH (Respaldo si no es manejado por OneSignal) ───
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Parla Sport', body: event.data.text() };
  }

  // Si ya fue procesado por OneSignal (contiene custom de OneSignal), no duplicar
  if (data.custom && data.custom.i) {
    return;
  }

  const title = data.title || data.headings?.es || data.headings?.en || '⚽ Parla Sport CRM';
  const body = data.body || data.contents?.es || data.contents?.en || 'Tienes una nueva notificación.';
  const url = data.url || '/';

  const options = {
    body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: 'parla-sport-' + Date.now(),
    data: { url },
    actions: [
      { action: 'open', title: '📋 Ver' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── NOTIFICATIONCLICK ───────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── MENSAJES ───────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
