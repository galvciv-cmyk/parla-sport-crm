/* =============================================
   PARLA SPORT CRM — Service Worker v2.0
   Maneja: Push en background, Cache offline,
   y click en notificaciones del sistema.
   ============================================= */

const CACHE_NAME = 'parla-sport-v2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.png', '/logo.png'];

// ─── INSTALL ─────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Si algún asset falla, no bloquear la instalación
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

// ─── FETCH (Cache First para assets estáticos) ───
self.addEventListener('fetch', (event) => {
  // Solo cachear GET y evitar extensiones de terceros
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => caches.match('/index.html'));
    })
  );
});

// ─── PUSH (Notificaciones del servidor cuando la app está cerrada) ───
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Parla Sport', body: event.data ? event.data.text() : 'Nueva notificación' };
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
      // Si ya hay una ventana abierta de la app, enfocarla
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── MENSAJE desde la app principal ──────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
