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

// ─── PUSH (Recepción y Garantía de Notificaciones en Segundo Plano) ───
self.addEventListener('push', (event) => {
  console.log('[SW] 🔔 Push recibido en segundo plano:', event);

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
      console.log('[SW] 📦 Payload JSON parseado:', data);
    } catch (err) {
      console.warn('[SW] Error al parsear JSON push, usando texto plano:', err);
      data = { title: '⚽ Parla Sport CRM', body: event.data.text() };
    }
  }

  // Extraer título, cuerpo y URL de cualquier variante de payload (OneSignal REST / FCM / WebPush)
  const title = data.title ||
    data.headings?.es ||
    data.headings?.en ||
    data.custom?.a?.title ||
    data.custom?.a?.heading ||
    '⚽ Parla Sport CRM';

  const body = data.body ||
    data.contents?.es ||
    data.contents?.en ||
    data.custom?.a?.body ||
    data.custom?.a?.message ||
    data.alert ||
    'Tienes una nueva sesión o actualización.';

  const url = data.url ||
    data.web_url ||
    data.custom?.u ||
    data.custom?.a?.url ||
    '/';

  const notificationTag = data.custom?.i || ('parla-' + (data.tag || Date.now()));

  const options = {
    body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: notificationTag,
    data: { url }
  };

  console.log('[SW] 🚀 Despachando notificación del sistema al dispositivo:', title, options);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log('[SW] ✅ Notificación del sistema renderizada con éxito'))
      .catch((err) => console.error('[SW] ❌ Error en showNotification:', err))
  );
});

// ─── NOTIFICATIONCLICK (Manejo de toque en la notificación del sistema) ───
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 👆 Notificación clickeada:', event.notification?.data);
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