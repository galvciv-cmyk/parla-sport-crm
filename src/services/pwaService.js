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

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    // Generar un sonido de "Ding" agradable para la notificación
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.warn('[PWA] Fallo al reproducir sonido:', e);
  }
};

export const triggerLocalPushNotification = (title, body) => {
  if (!('Notification' in window)) return;

  // Reproducir sonido nativo si la app está en primer plano
  playNotificationSound();

  const dispatchNotification = () => {
    try {
      // Intentar primero con Service Worker para soporte PWA/Móvil
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            vibrate: [200, 100, 200, 100, 200],
            silent: false,
            requireInteraction: true,
            tag: 'parla-sport-notice-' + Date.now()
          });
        }).catch(() => {
          new Notification(title, { body, icon: '/favicon.svg', silent: false });
        });
      } else {
        // Notificación estándar web/escritorio
        new Notification(title, { body, icon: '/favicon.svg', silent: false });
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
