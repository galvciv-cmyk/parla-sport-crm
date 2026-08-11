import OneSignal from 'react-onesignal';
import { showToast } from '../components/common/ToastNotification';
import { logNotifEvent } from '../components/common/NotificationDebugPanel';

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '1a53322b-aa05-442d-8b71-72c7bbaee998';
const REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY || '';

const ONESIGNAL_ALLOWED_ORIGINS = ['parlasport.netlify.app'];

const isOneSignalCompatibleOrigin = () => {
  const host = window.location.hostname;
  return ONESIGNAL_ALLOWED_ORIGINS.some(domain => host === domain || host.endsWith('.' + domain));
};

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let _initPromise = null;
let _isInitialized = false;

export const isOneSignalReady = () => _isInitialized;

export const initOneSignal = async () => {
  if (_initPromise) return _initPromise;

  if (!isOneSignalCompatibleOrigin()) {
    _initPromise = Promise.resolve();
    logNotifEvent('onesignal',
      `⚠️ OneSignal omitido en ${window.location.hostname}`,
      `OneSignal activo en: ${ONESIGNAL_ALLOWED_ORIGINS.join(', ')}. En local usamos Toasts y Browser Notification API.`,
    );
    return _initPromise;
  }

  _initPromise = (async () => {
    try {
      await OneSignal.init({
        appId: APP_ID,
        allowLocalhostAsSecureOrigin: false,
        serviceWorkerPath: 'OneSignalSDKWorker.js',
        serviceWorkerParam: { scope: '/' },
        notifyButton: { enable: false },
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: 'push',
                autoPrompt: false,
              }
            ]
          }
        }
      });

      _isInitialized = true;
      console.log('[OneSignal] ✅ Inicializado correctamente en producción');
      logNotifEvent('onesignal', '✅ OneSignal SDK inicializado (producción)', `Dominio: ${window.location.hostname}`);

      OneSignal.Notifications.addEventListener('permissionChange', async (hasPermission) => {
        console.log('[OneSignal] Permiso:', hasPermission ? 'Concedido' : 'Denegado');
        logNotifEvent('permission',
          `Permiso ${hasPermission ? '✅ Concedido' : '❌ Denegado'} via OneSignal`,
          `Notification.permission = "${hasPermission ? 'granted' : 'denied'}"`
        );
        if (hasPermission) {
          try {
            await OneSignal.User.PushSubscription.optIn();
            logNotifEvent('onesignal', '📱 PushSubscription vinculada con éxito');
          } catch (e) {
            console.warn('[OneSignal] Error en optIn:', e);
          }
        }
      });

      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
        event.preventDefault();
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

export const loginToOneSignal = async (primaryId, metadata = {}) => {
  if (!primaryId) return;
  if (!isOneSignalCompatibleOrigin()) {
    logNotifEvent('onesignal', `🔗 OneSignal login omitido en localhost`, `ID: ${primaryId}`);
    return;
  }
  try {
    if (!_isInitialized) await initOneSignal();
    if (!_isInitialized) return;

    await OneSignal.login(String(primaryId));
    console.log(`[OneSignal] 🔗 Usuario vinculado: ${primaryId}`);
    logNotifEvent('onesignal', `🔗 Usuario vinculado: ${primaryId}`, 'Login OneSignal OK');

    // Registrar aliases y tags para garantizar entrega multidispositivo
    if (metadata.coachId && String(metadata.coachId) !== String(primaryId)) {
      await OneSignal.User.addAlias('coach_id', String(metadata.coachId)).catch(() => {});
    }
    if (metadata.email) {
      await OneSignal.User.addAlias('email', String(metadata.email).toLowerCase()).catch(() => {});
      await OneSignal.User.addTag('email', String(metadata.email).toLowerCase()).catch(() => {});
    }
    if (metadata.role) {
      await OneSignal.User.addTag('role', String(metadata.role)).catch(() => {});
    }

    // Asegurar que la suscripción Push esté activa para este usuario
    if (Notification.permission === 'granted') {
      await OneSignal.User.PushSubscription.optIn().catch(() => {});
    }
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
    if (granted) {
      await OneSignal.User.PushSubscription.optIn().catch(() => {});
    }
    logNotifEvent('permission', `Permiso ${granted ? '✅ Concedido' : '❌ Denegado'} (OneSignal)`, '');
    return granted;
  } catch (err) {
    console.warn('[OneSignal] Error al solicitar permisos:', err);
    return false;
  }
};

/**
 * Enviar Push remoto vía OneSignal REST API
 * Soporta destinatario por ID de entrenador, Firebase UID o correo electrónico
 */
export const sendOneSignalPush = async ({
  title,
  message,
  externalUserId = '',
  recipientEmail = '',
  url = '/'
}) => {
  if (!REST_API_KEY) {
    logNotifEvent('onesignal',
      `⚠️ Push remoto no disponible`,
      IS_DEV
        ? 'Estás en localhost — el push OneSignal se dispara en producción'
        : 'Falta VITE_ONESIGNAL_REST_API_KEY'
    );
    return { success: false, reason: 'no_api_key' };
  }

  const targetExternalIds = [];
  if (externalUserId) targetExternalIds.push(String(externalUserId));

  if (targetExternalIds.length === 0 && !recipientEmail) {
    console.warn('[OneSignal] ⚠️ Sin destinatarios — Push cancelado');
    return { success: false, reason: 'no_recipient' };
  }

  const payload = {
    app_id: APP_ID,
    target_channel: 'push',
    headings: { en: title, es: title },
    contents: { en: message, es: message },
    priority: 10, // Alta prioridad (despierta dispositivos en background)
    ttl: 259200, // 3 días de vigencia si el dispositivo está apagado
    ios_badgeType: 'Increase',
    ios_badgeCount: 1,
    web_url: 'https://parlasport.netlify.app' + url,
    url: 'https://parlasport.netlify.app' + url
  };

  // Agregar aliases y external_ids para máxima compatibilidad
  if (targetExternalIds.length > 0) {
    payload.include_aliases = {
      external_id: targetExternalIds
    };
    payload.include_external_user_ids = targetExternalIds;
  }

  // Si hay email, agregarlo como filtro alternativo
  if (recipientEmail) {
    payload.filters = [
      { field: 'tag', key: 'email', relation: '=', value: String(recipientEmail).toLowerCase() }
    ];
  }

  logNotifEvent('onesignal',
    `📤 Enviando Push → ${targetExternalIds.join(', ') || recipientEmail}`,
    title,
    { targetExternalIds, recipientEmail, title, message }
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
      return { success: false, error: data };
    }

    console.log('[OneSignal] ✅ Push enviado:', data);
    logNotifEvent('onesignal',
      `✅ Push entregado`,
      `Destinatarios alcanzados: ${data.recipients || 0}`,
      data
    );
    return { success: true, data };
  } catch (error) {
    console.error('[OneSignal] ❌ Error de red:', error);
    logNotifEvent('error', `❌ Error de red al enviar push`, error?.message || String(error));
    return { success: false, error };
  }
};
