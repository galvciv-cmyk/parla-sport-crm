/* =============================================
   PARLA SPORT CRM — Service Worker v3.0
   Network-First para navegación HTML (evita pantallas blancas tras deploys)
   Cache-First para assets versionados estáticos
   ============================================= */

const CACHE_NAME = 'parla-sport-v3.0';

// ─── INSTALL ─────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ─── ACTIVATE (Limpiar absolutamente todos los caches viejos) ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antiguo:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ──────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // No interceptar peticiones de Firebase, OneSignal u otros orígenes
  if (!url.origin.includes(self.location.origin)) return;

  // 1. Navegación principal (HTML / Document): SIEMPRE Network First
  // Esto garantiza que tras un nuevo deploy, el usuario SIEMPRE descargue el nuevo index.html con los nuevos hashes de JS
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // 2. Chunks estáticos compilados (/assets/*): Cache con Network Fallback
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        }).catch((err) => {
          // Si el chunk falló por deploy nuevo, devolver error para que React.lazy haga reload
          throw err;
        });
      })
    );
    return;
  }

  // 3. Otros recursos
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
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
    data: { url }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── NOTIFICATIONCLICK ───────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

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
