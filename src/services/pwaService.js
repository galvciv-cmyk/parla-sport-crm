// PWA Service Worker & Push Notification Utilities
import { showToast } from '../components/common/ToastNotification';

let deferredInstallPrompt = null;

export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      // Registrar el service worker principal de Parla Sport
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[PWA] ✅ Service Worker registrado:', registration.scope);

      // Escuchar mensajes del SW (ej: click en notificación cuando app estaba cerrada)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'NOTIFICATION_CLICK') {
          console.log('[PWA] Notificación clickeada desde background:', event.data.url);
        }
      });

      // Detectar actualización disponible
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] Nueva versión disponible');
          }
        });
      });
    } catch (error) {
      console.warn('[PWA] Fallo al registrar Service Worker:', error);
    }
  });

  // Capturar evento antes de instalar PWA
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  });
};

export const promptPwaInstall = async () => {
  if (!deferredInstallPrompt) {
    showToast(
      'Aplicación ya instalada',
      'La PWA ya está instalada o tu navegador la gestiona directamente.',
      'info',
      4000
    );
    return false;
  }

  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  console.log(`[PWA] Respuesta de instalación: ${outcome}`);
  deferredInstallPrompt = null;
  return outcome === 'accepted';
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('[PWA] Este navegador no soporta notificaciones push.');
    return 'not-supported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission; // 'granted' | 'denied' | 'default'
  } catch (e) {
    console.warn('[PWA] Error al solicitar permiso:', e);
    return 'error';
  }
};

const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1); // A5

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    // Silencioso — el sonido es opcional
  }
};

/**
 * Dispara una notificación.
 * Si la app está en PRIMER PLANO → muestra un Toast in-app.
 * Si la app está en BACKGROUND → muestra una notificación nativa del OS via Service Worker.
 */
export const triggerLocalPushNotification = (title, body, type = 'notification') => {
  // SIEMPRE mostrar toast in-app (la app siempre puede estar activa)
  showToast(title, body, type, 6000);
  playNotificationSound();

  // Intentar también notificación del SO (útil si el Service Worker la captura en background)
  if (!('Notification' in window)) return;

  const showSystemNotif = () => {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/favicon.png',
            badge: '/favicon.png',
            vibrate: [200, 100, 200],
            tag: 'parla-' + Date.now(),
            requireInteraction: false,
            silent: false
          });
        }).catch(() => {
          // Fallback silencioso
        });
      }
    } catch {
      // Silencioso
    }
  };

  if (Notification.permission === 'granted') {
    showSystemNotif();
  }
  // Si no hay permisos, el toast in-app ya fue mostrado — no pedir permisos aquí
};
