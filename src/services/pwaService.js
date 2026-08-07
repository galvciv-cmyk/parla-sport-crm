// PWA Service Worker & Push Notification Utilities

let deferredInstallPrompt = null;

export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registrado exitosamente:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] Fallo al registrar Service Worker:', error);
        });
    });
  }

  // Capturar evento antes de instalar PWA
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });
};

export const promptPwaInstall = async () => {
  if (!deferredInstallPrompt) {
    alert('La PWA ya está instalada o tu navegador la gestiona directamente.');
    return false;
  }

  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  console.log(`[PWA] Respuesta del usuario a la instalación: ${outcome}`);
  deferredInstallPrompt = null;
  return outcome === 'accepted';
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('[PWA] Este navegador no soporta notificaciones push.');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('[PWA] Error al solicitar permiso de notificación:', e);
      return false;
    }
  }

  return false;
};

export const triggerLocalPushNotification = (title, body) => {
  if (!('Notification' in window)) return;

  const dispatchNotification = () => {
    try {
      // Intentar primero con Service Worker para soporte PWA/Móvil
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            vibrate: [100, 50, 100],
            tag: 'parla-sport-notice'
          });
        }).catch(() => {
          new Notification(title, { body, icon: '/favicon.svg' });
        });
      } else {
        // Notificación estándar web/escritorio
        new Notification(title, { body, icon: '/favicon.svg' });
      }
    } catch (err) {
      console.warn('[PWA] Fallo al mostrar notificación push:', err);
    }
  };

  if (Notification.permission === 'granted') {
    dispatchNotification();
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        dispatchNotification();
      }
    });
  }
};
