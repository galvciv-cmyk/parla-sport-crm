import OneSignal from 'react-onesignal';
import { showToast } from '../components/common/ToastNotification';
import { logNotifEvent } from '../utils/debugLogger';

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '1a53322b-aa05-442d-8b71-72c7bbaee998';
const REST_API_KEY = (import.meta.env.VITE_ONESIGNAL_REST_API_KEY || '').trim();

const isOneSignalCompatibleOrigin = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  // Soporte para producción, Netlify, subdominios y desarrollo
  return host === 'parlasport.netlify.app' ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.web.app') ||
    host.endsWith('.firebaseapp.com') ||
    host.includes('parlasport') ||
    host === 'localhost' ||
    host === '127.0.0.1';
};

const IS_DEV = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

let _initPromise = null;
let _isInitialized = false;

export const isOneSignalReady = () => _isInitialized;

/**
 * Inicializa el SDK de OneSignal v16 de forma segura
 */
export const initOneSignal = async () => {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      if (!isOneSignalCompatibleOrigin()) {
        logNotifEvent('onesignal',
          `⚠️ OneSignal omitido en ${window.location.hostname}`,
          'Dominio no compatible. Se usarán Toasts in-app y Browser Notification API.'
        );
        return;
      }

      await OneSignal.init({
        appId: APP_ID,
        allowLocalhostAsSecureOrigin: IS_DEV,
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
      console.log('[OneSignal] ✅ Inicializado correctamente');
      logNotifEvent('onesignal', '✅ OneSignal SDK inicializado', `Dominio: ${window.location.hostname}`);

      // Sincronizar y forzar optIn de suscripción si el permiso ya fue concedido previamente
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          await OneSignal.User.PushSubscription.optIn();
          console.log('[OneSignal] 📱 PushSubscription optIn activo');
        } catch (e) {
          console.warn('[OneSignal] Error optIn inicial:', e);
        }
      }

      // Escuchar cambios de permiso y suscribir de inmediato
      OneSignal.Notifications.addEventListener('permissionChange', async (hasPermission) => {
        console.log('[OneSignal] Permiso cambiado:', hasPermission ? 'Concedido' : 'Denegado');
        logNotifEvent('permission',
          `Permiso ${hasPermission ? '✅ Concedido' : '❌ Denegado'} via OneSignal`,
          `Notification.permission = "${hasPermission ? 'granted' : 'denied'}"`
        );
        if (hasPermission) {
          try {
            await OneSignal.User.PushSubscription.optIn();
            logNotifEvent('onesignal', '📱 PushSubscription vinculada con éxito');
          } catch (e) {
            console.warn('[OneSignal] Error en optIn tras permiso:', e);
          }
        }
      });

      // Escuchar evento foreground (cuando la app está abierta en pantalla)
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
          '⚠️ OneSignal bloqueado por dominio',
          'Dominio no registrado en OneSignal dashboard. Toasts y Firestore siguen activos.'
        );
      } else {
        console.error('[OneSignal] ❌ Error al inicializar:', msg);
        logNotifEvent('error', '❌ OneSignal error', msg);
      }
      _isInitialized = false;
    }
  })();

  return _initPromise;
};

/**
 * Vincula el ID del usuario en OneSignal con sus tags y aliases (coach_id, email, role)
 */
export const loginToOneSignal = async (primaryId, metadata = {}) => {
  if (!primaryId) return;
  try {
    if (!_isInitialized) await initOneSignal();
    if (!_isInitialized) return;

    await OneSignal.login(String(primaryId));
    console.log(`[OneSignal] 🔗 Usuario vinculado: ${primaryId}`);
    logNotifEvent('onesignal', `🔗 Usuario vinculado: ${primaryId}`, 'Login OneSignal OK');

    // Registrar aliases y tags para targeting remoto
    if (metadata.coachId && String(metadata.coachId) !== String(primaryId)) {
      await OneSignal.User.addAlias('coach_id', String(metadata.coachId)).catch(() => {});
      await OneSignal.User.addTag('coach_id', String(metadata.coachId)).catch(() => {});
    }
    if (metadata.email) {
      await OneSignal.User.addAlias('email', String(metadata.email).toLowerCase().trim()).catch(() => {});
      await OneSignal.User.addTag('email', String(metadata.email).toLowerCase().trim()).catch(() => {});
    }
    if (metadata.role) {
      await OneSignal.User.addTag('role', String(metadata.role)).catch(() => {});
    }
    if (metadata.uid && String(metadata.uid) !== String(primaryId)) {
      await OneSignal.User.addAlias('firebase_uid', String(metadata.uid)).catch(() => {});
      await OneSignal.User.addTag('firebase_uid', String(metadata.uid)).catch(() => {});
    }

    // Asegurar optIn en OneSignal para este usuario
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      await OneSignal.User.PushSubscription.optIn().catch(() => {});
    }
  } catch (error) {
    console.warn('[OneSignal] Error en login (no crítico):', error?.message || error);
    logNotifEvent('error', 'Login OneSignal fallido', error?.message || String(error));
  }
};

/**
 * Desvincula sesión al hacer logout
 */
export const logoutFromOneSignal = async () => {
  if (!_isInitialized) return;
  try {
    await OneSignal.logout();
    console.log('[OneSignal] Sesión desvinculada');
  } catch (error) {
    console.warn('[OneSignal] Error en logout:', error?.message || error);
  }
};

/**
 * Solicita permisos de notificación Push vinculando OneSignal
 */
export const requestOneSignalPermission = async () => {
  try {
    if (!_isInitialized) await initOneSignal();

    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (_isInitialized) {
        try {
          await OneSignal.Notifications.requestPermission();
          if (perm === 'granted') {
            await OneSignal.User.PushSubscription.optIn().catch(() => {});
            logNotifEvent('onesignal', '📱 PushSubscription optIn activado tras permiso');
          }
        } catch (sdkErr) {
          console.warn('[OneSignal] Error en requestPermission SDK:', sdkErr);
        }
      }
      logNotifEvent('permission', `Permiso ${perm === 'granted' ? '✅ Concedido' : '❌ Denegado'}`, '');
      return perm === 'granted';
    }
    return false;
  } catch (err) {
    console.warn('[OneSignal] Error al solicitar permisos:', err);
    return false;
  }
};

/**
 * Formatea el encabezado de autorización para la API REST de OneSignal
 * Compatible con claves v2 (os_v2_app_...) y v1 tradicionales
 */
const getOneSignalAuthHeader = () => {
  if (!REST_API_KEY) return '';
  if (REST_API_KEY.startsWith('Key ') || REST_API_KEY.startsWith('Basic ')) {
    return REST_API_KEY;
  }
  // Claves API v2 con prefijo os_v2_app_ requieren el encabezado "Key <api_key>"
  return `Key ${REST_API_KEY}`;
};

/**
 * Enviar Push remoto vía OneSignal REST API con entrega garantizada en segundo plano (App cerrada)
 */
export const sendOneSignalPush = async ({
  title,
  message,
  externalUserId = '',
  recipientEmail = '',
  recipientRole = '',
  url = '/'
}) => {
  if (!REST_API_KEY) {
    logNotifEvent('onesignal',
      '⚠️ Push remoto no configurado',
      'Falta configurar VITE_ONESIGNAL_REST_API_KEY'
    );
    return { success: false, reason: 'no_api_key' };
  }

  const targetIds = [];
  if (externalUserId) {
    const rawId = String(externalUserId).trim();
    if (rawId && !targetIds.includes(rawId)) targetIds.push(rawId);
    if (rawId.startsWith('coach-')) {
      const stripped = rawId.replace('coach-', '');
      if (stripped && !targetIds.includes(stripped)) targetIds.push(stripped);
    } else {
      const withPrefix = `coach-${rawId}`;
      if (!targetIds.includes(withPrefix)) targetIds.push(withPrefix);
    }
  }
  if (recipientEmail) {
    const cleanEmail = String(recipientEmail).toLowerCase().trim();
    if (cleanEmail && !targetIds.includes(cleanEmail)) {
      targetIds.push(cleanEmail);
    }
  }

  // Si no hay targetIds específicos ni rol de destino, cancelar
  if (targetIds.length === 0 && !recipientRole) {
    console.warn('[OneSignal] ⚠️ Sin destinatarios — Push cancelado');
    return { success: false, reason: 'no_recipient' };
  }

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://parlasport.netlify.app';
  const targetUrl = url.startsWith('http') ? url : `${originUrl}${url}`;

  // Payload base para OneSignal REST API v2
  const payload = {
    app_id: APP_ID,
    target_channel: 'push',
    headings: { en: title, es: title },
    contents: { en: message, es: message },
    priority: 10, // Máxima prioridad: despierta la pantalla en segundo plano y muestra banner de sistema
    ttl: 259200, // 3 días de persistencia si el dispositivo está apagado o en reposo profundo
    ios_badgeType: 'Increase',
    ios_badgeCount: 1,
    ios_sound: 'default',
    android_sound: 'notification',
    chrome_web_icon: `${originUrl}/favicon.png`,
    chrome_web_badge: `${originUrl}/favicon.png`,
    firefox_icon: `${originUrl}/favicon.png`,
    web_url: targetUrl,
    url: targetUrl
  };

  // Targeting: Usar SOLO UN método para evitar error 400 de OneSignal
  if (targetIds.length > 0) {
    payload.include_aliases = {
      external_id: targetIds
    };
  } else if (recipientRole) {
    payload.filters = [
      { field: 'tag', key: 'role', relation: '=', value: String(recipientRole) }
    ];
  }

  const targetLabel = targetIds.length > 0 ? targetIds.join(', ') : `Rol: ${recipientRole}`;

  logNotifEvent('onesignal',
    `📤 Enviando Push remoto → ${targetLabel}`,
    title,
    { targetIds, recipientRole, title, message }
  );

  const authHeader = getOneSignalAuthHeader();

  // Intentar envío vía endpoint estándar https://api.onesignal.com/notifications
  const endpoints = [
    'https://api.onesignal.com/notifications',
    'https://onesignal.com/api/v1/notifications'
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      // Ajuste para endpoint v1 si incluye external_user_ids
      const requestPayload = { ...payload };
      if (endpoint.includes('/v1/') && targetIds.length > 0) {
        requestPayload.include_external_user_ids = targetIds;
        requestPayload.channel_for_external_user_ids = 'push';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(requestPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn(`[OneSignal] ⚠️ Error en ${endpoint} (${response.status}):`, data);
        lastError = data;
        continue; // Intentar siguiente endpoint si falló
      }

      console.log('[OneSignal] ✅ Push entregado con éxito:', data);
      logNotifEvent('onesignal',
        '✅ Push remoto entregado (Segundo Plano OK)',
        `Destinatarios alcanzados: ${data.recipients || 0}`,
        data
      );
      return { success: true, data };
    } catch (error) {
      console.error(`[OneSignal] Error de red en ${endpoint}:`, error);
      lastError = error;
    }
  }

  logNotifEvent('error',
    '❌ Falló el envío de push remoto',
    lastError?.errors ? JSON.stringify(lastError.errors) : (lastError?.message || 'Error desconocido'),
    lastError
  );
  return { success: false, error: lastError };
};
