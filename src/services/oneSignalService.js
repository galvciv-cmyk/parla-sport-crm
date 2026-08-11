import OneSignal from 'react-onesignal';
import { showToast } from '../components/common/ToastNotification';
import { logNotifEvent } from '../components/common/NotificationDebugPanel';

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '1a53322b-aa05-442d-8b71-72c7bbaee998';
const REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY || '';

// Dominios donde OneSignal funciona (configurados en el dashboard de OneSignal)
const ONESIGNAL_ALLOWED_ORIGINS = ['parlasport.netlify.app'];

// Detectar si estamos en un entorno donde OneSignal puede operar
const isOneSignalCompatibleOrigin = () => {
  const host = window.location.hostname;
  return ONESIGNAL_ALLOWED_ORIGINS.some(domain => host === domain || host.endsWith('.' + domain));
};

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Estado de inicialización (promesa compartida para evitar race conditions)
let _initPromise = null;
let _isInitialized = false;

export const isOneSignalReady = () => _isInitialized;

export const initOneSignal = async () => {
  if (_initPromise) return _initPromise;

  // ─── En localhost/dev: omitir OneSignal, usar solo browser Notification API ───
  if (!isOneSignalCompatibleOrigin()) {
    _initPromise = Promise.resolve();
    logNotifEvent('onesignal',
      `⚠️ OneSignal omitido en ${window.location.hostname}`,
      `OneSignal solo opera en: ${ONESIGNAL_ALLOWED_ORIGINS.join(', ')}. En local usamos Browser Notification API + Toasts in-app.`,
    );
    console.info(
      `[OneSignal] ℹ️ Omitido en localhost. Las notificaciones in-app y toasts funcionan normalmente. ` +
      `OneSignal estará activo en: ${ONESIGNAL_ALLOWED_ORIGINS.join(', ')}`
    );
    return _initPromise;
  }

  // ─── En producción: inicializar OneSignal normalmente ───
  _initPromise = (async () => {
    try {
      await OneSignal.init({
        appId: APP_ID,
        allowLocalhostAsSecureOrigin: false,
        serviceWorkerParam: { scope: '/' },
        notifyButton: { enable: false }, // Usamos nuestro propio modal in-app
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: 'push',
                autoPrompt: false, // No mostrar automáticamente
              }
            ]
          }
        }
      });

      _isInitialized = true;
      console.log('[OneSignal] ✅ Inicializado correctamente en producción');
      logNotifEvent('onesignal', '✅ OneSignal SDK inicializado (producción)', `Dominio: ${window.location.hostname}`);

      // Escuchar cambios de permiso
      OneSignal.Notifications.addEventListener('permissionChange', (hasPermission) => {
        console.log('[OneSignal] Permiso:', hasPermission ? 'Concedido' : 'Denegado');
        logNotifEvent('permission',
          `Permiso ${hasPermission ? '✅ Concedido' : '❌ Denegado'} via OneSignal`,
          `Notification.permission = "${hasPermission ? 'granted' : 'denied'}"`
        );
      });

      // Escuchar notificaciones recibidas en primer plano → Toast in-app
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
        event.preventDefault(); // Suprimir la notificación nativa del OS
        const notif = event.notification;
        logNotifEvent('onesignal',
          `📥 OneSignal foreground: ${notif.title || 'Sin título'}`,
          notif.body || '',
          { title: notif.title, body: notif.body, id: notif.notificationId }
        );
        showToast(
          notif.title || '⚽ Parla Sport',
          notif.body || '',
          'notification',
          6000
        );
      });

    } catch (error) {
      const msg = error?.message || String(error);
      // Silenciar el error de dominio no autorizado — es esperado fuera de producción
      if (msg.includes('Can only be used on')) {
        logNotifEvent('onesignal',
          `⚠️ OneSignal bloqueado por dominio`,
          `Solo funciona en: ${ONESIGNAL_ALLOWED_ORIGINS.join(', ')}. Toasts y Firestore siguen activos.`
        );
      } else {
        console.error('[OneSignal] ❌ Error al inicializar:', msg);
        logNotifEvent('error', `❌ OneSignal error`, msg);
      }
      _isInitialized = false;
    }
  })();

  return _initPromise;
};

export const loginToOneSignal = async (uid) => {
  if (!uid) return;
  // En desarrollo, omitir silenciosamente
  if (!isOneSignalCompatibleOrigin()) {
    logNotifEvent('onesignal', `🔗 OneSignal login omitido en localhost`, `UID: ${uid}`);
    return;
  }
  try {
    if (!_isInitialized) await initOneSignal();
    if (!_isInitialized) return; // SDK no disponible
    await OneSignal.login(String(uid));
    console.log(`[OneSignal] 🔗 Usuario vinculado: ${uid}`);
    logNotifEvent('onesignal', `🔗 Usuario vinculado: ${uid}`, 'Login OneSignal OK');
  } catch (error) {
    console.warn('[OneSignal] Error en login (no crítico):', error?.message || error);
    logNotifEvent('error', `Login OneSignal fallido`, error?.message || String(error));
  }
};

export const logoutFromOneSignal = async () => {
  if (!isOneSignalCompatibleOrigin() || !_isInitialized) return;
  try {
    await OneSignal.logout();
    console.log('[OneSignal] Sesión desvinculada');
  } catch (error) {
    console.warn('[OneSignal] Error en logout:', error?.message || error);
  }
};

export const requestOneSignalPermission = async () => {
  // En desarrollo, usar la API nativa del browser directamente
  if (!isOneSignalCompatibleOrigin()) {
    if (!('Notification' in window)) return false;
    const perm = await Notification.requestPermission();
    logNotifEvent('permission',
      `Permiso ${perm === 'granted' ? '✅ Concedido' : '❌ Denegado'} (Browser API)`,
      `Modo: desarrollo local`
    );
    return perm === 'granted';
  }
  try {
    if (!_isInitialized) await initOneSignal();
    if (!_isInitialized) return false;
    await OneSignal.Notifications.requestPermission();
    const granted = OneSignal.Notifications.permission;
    logNotifEvent('permission', `Permiso ${granted ? '✅ Concedido' : '❌ Denegado'} (OneSignal)`, '');
    return granted;
  } catch (err) {
    console.warn('[OneSignal] Error al solicitar permisos:', err);
    return false;
  }
};

export const sendOneSignalPush = async (title, message, externalUserId) => {
  if (!REST_API_KEY) {
    logNotifEvent('onesignal',
      `⚠️ Push remoto no disponible`,
      IS_DEV
        ? 'Estás en localhost — el push OneSignal solo funciona en producción (netlify.app)'
        : 'Falta VITE_ONESIGNAL_REST_API_KEY'
    );
    return { success: false, reason: 'no_api_key' };
  }

  if (!externalUserId) {
    console.warn('[OneSignal] ⚠️ externalUserId vacío — Push cancelado');
    return { success: false, reason: 'no_user_id' };
  }

  const payload = {
    app_id: APP_ID,
    include_aliases: {
      external_id: [String(externalUserId)]
    },
    target_channel: 'push',
    headings: { en: title, es: title },
    contents: { en: message, es: message },
    ios_badgeType: 'Increase',
    ios_badgeCount: 1
  };

  logNotifEvent('onesignal',
    `📤 Enviando Push → ${externalUserId}`,
    title,
    { externalUserId, title, message }
  );

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${REST_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[OneSignal] ❌ Error de API:', response.status, data);
      logNotifEvent('error',
        `❌ Push fallido (${response.status})`,
        data.errors ? JSON.stringify(data.errors) : 'Error desconocido',
        data
      );
      showToast(
        'Error al enviar push',
        `Código ${response.status}: ${data.errors ? JSON.stringify(data.errors) : 'Error desconocido'}`,
        'error',
        8000
      );
      return { success: false, error: data };
    }

    console.log('[OneSignal] ✅ Push enviado:', data);
    logNotifEvent('onesignal', `✅ Push enviado exitosamente`, `recipients: ${data.recipients || 0}`, data);
    return { success: true, data };
  } catch (error) {
    console.error('[OneSignal] ❌ Error de red:', error);
    logNotifEvent('error', `❌ Error de red al enviar push`, error?.message || String(error));
    showToast('Error de conexión', 'No se pudo enviar la notificación push remota.', 'error');
    return { success: false, error };
  }
};
