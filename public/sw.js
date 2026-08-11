/* =============================================
   PARLA SPORT CRM — Service Worker v2.2 (Ultra-Fast PWA)
   Maneja: Cache Stale-While-Revalidate, carga instantánea
   y soporte Push en segundo plano.
   ============================================= */

const CACHE_NAME = 'parla-sport-v2.2';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.png', '/logo.png'];

// ─── INSTALL ─────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignorar si algún asset estático inicial falla
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

// ─── FETCH (Stale-While-Revalidate para Máxima Velocidad en Conexiones Lentas) ───
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // No interceptar llamadas de Firebase / OneSignal / APIs externas
  if (!url.origin.includes(self.location.origin)) return;

  // Estrategia Stale-While-Revalidate para chunks compilados de JS y CSS
  if (url.pathname.includes('/assets/') || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        // Si ya está en caché, servirlo en <20ms mientras se actualiza en background
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Navegación SPA: Network First con fallback a caché de /index.html
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cached) => cached || caches.match('/index.html'));
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
