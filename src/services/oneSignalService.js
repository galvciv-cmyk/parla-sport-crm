import OneSignal from 'react-onesignal';
import { showToast } from '../components/common/ToastNotification';
import { logNotifEvent } from '../utils/debugLogger';
import { formatTo12Hour } from '../utils/scheduling';

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
    apns_alert: {
      title: title,
      body: message
    },
    android_sound: 'notification',
    android_visibility: 1, // 1 = Public en pantalla de bloqueo
    chrome_web_icon: `${originUrl}/favicon.png`,
    chrome_web_badge: `${originUrl}/favicon.png`,
    firefox_icon: `${originUrl}/favicon.png`,
    web_url: targetUrl,
    url: targetUrl
  };

  // Targeting robusto: si es admin, usar segmento de suscripciones activas
  if (recipientRole === 'admin') {
    payload.included_segments = ['Active Subscriptions'];
  } else if (targetIds.length > 0) {
    payload.include_aliases = {
      external_id: targetIds
    };
  } else if (recipientRole) {
    payload.included_segments = ['Active Subscriptions'];
  }

  const targetLabel = recipientRole === 'admin' ? 'Segmento Admin (Active Subscriptions)' : (targetIds.length > 0 ? targetIds.join(', ') : `Rol: ${recipientRole}`);

  logNotifEvent('onesignal',
    `📤 Enviando Push remoto → ${targetLabel}`,
    title,
    { targetIds, recipientRole, title, message }
  );

  const authHeader = getOneSignalAuthHeader();

  // Intentar endpoints v1 y v2
  const endpoints = [
    'https://onesignal.com/api/v1/notifications',
    'https://api.onesignal.com/notifications'
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const requestPayload = { ...payload };
      if (endpoint.includes('/v1/')) {
        delete requestPayload.include_aliases;
        if (targetIds.length > 0 && recipientRole !== 'admin') {
          requestPayload.include_external_user_ids = targetIds;
          requestPayload.channel_for_external_user_ids = 'push';
        }
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

      if (!response.ok || (data.errors && data.errors.length > 0)) {
        console.warn(`[OneSignal] ⚠️ Aviso en ${endpoint} (${response.status}):`, data);
        lastError = data;
        continue;
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

/**
 * Genera una plantilla HTML profesional para correos de asignación / recordatorio de sesión
 */
export const buildSessionEmailHtml = ({
  coachName = 'Entrenador',
  session,
  players = [],
  isReassignment = false,
  previousCoachName = ''
}) => {
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://crm-parla-sport.netlify.app';
  const formattedStart = session?.horaInicio ? formatTo12Hour(session.horaInicio) : 'Por definir';
  const formattedEnd = session?.horaFin ? formatTo12Hour(session.horaFin) : '';
  const horarioStr = formattedEnd ? `${formattedStart} - ${formattedEnd}` : formattedStart;
  const tipoSesion = session?.tipo || session?.categoria || '1-1';
  const notasStr = session?.notas || session?.observaciones || 'Sin observaciones previas';
  const headerColor = isReassignment ? '#F59E0B' : '#10B981';
  const headerTitle = isReassignment ? '⚠️ Sesión Reasignada' : '⚽ Nueva Sesión de Entrenamiento';

  // Normalizar array de jugadores
  const playersList = Array.isArray(players) ? players.map(p => {
    if (typeof p === 'string') return { id: '', nombre: p, posicion: 'Jugador', edad: '' };
    return {
      id: p.id || '',
      nombre: p.nombre || 'Alumno',
      posicion: p.posicion || 'Jugador',
      edad: p.edad ? `${p.edad} años` : ''
    };
  }) : [];

  // Construcción dinámica de la sección de Fichas de Jugadores
  let playersHtml = '';
  if (playersList.length === 1) {
    const singlePlayer = playersList[0];
    const playerDetailUrl = `${originUrl}/#player-${singlePlayer.id || ''}`;
    playersHtml = `
      <div style="background-color: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 18px; margin: 20px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #10B981; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
          👤 Ficha del Alumno Asignado
        </div>
        <div style="font-size: 16px; font-weight: 700; color: #F8FAFC; margin-bottom: 4px;">
          ${singlePlayer.nombre}
        </div>
        <div style="font-size: 13px; color: #94A3B8; margin-bottom: 14px;">
          Posición: <strong style="color: #60A5FA;">${singlePlayer.posicion}</strong> ${singlePlayer.edad ? `• Edad: <strong style="color: #FBBF24;">${singlePlayer.edad}</strong>` : ''}
        </div>
        <a href="${playerDetailUrl}" target="_blank" style="display: inline-block; background-color: #0EA5E9; color: #FFFFFF; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; box-shadow: 0 2px 6px rgba(14, 165, 233, 0.3);">
          👤 Ver Ficha Técnica de ${singlePlayer.nombre}
        </a>
      </div>
    `;
  } else if (playersList.length > 1) {
    const playerCards = playersList.map((p, idx) => {
      const playerUrl = `${originUrl}/#player-${p.id || ''}`;
      return `
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <td style="padding: 12px 8px;">
            <div style="font-weight: 700; color: #F8FAFC; font-size: 14px;">${idx + 1}. ${p.nombre}</div>
            <div style="font-size: 12px; color: #94A3B8;">${p.posicion} ${p.edad ? `• ${p.edad}` : ''}</div>
          </td>
          <td style="padding: 12px 8px; text-align: right;">
            <a href="${playerUrl}" target="_blank" style="display: inline-block; background-color: rgba(14, 165, 233, 0.18); border: 1px solid #0EA5E9; color: #38BDF8; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 12px;">
              👤 Ver Ficha
            </a>
          </td>
        </tr>
      `;
    }).join('');

    playersHtml = `
      <div style="background-color: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 12px; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
          👥 Alumnos Asignados (${playersList.length}) - Fichas Técnicas
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
          ${playerCards}
        </table>
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headerTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060D1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060D1E; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #0F172A; border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.25); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Encabezado: Rectángulo Azul Marino con Logo de Parla Sport -->
          <tr>
            <td style="background: linear-gradient(135deg, #070F1E 0%, #0A1931 50%, #060D1E 100%); padding: 30px 20px; border-bottom: 3px solid ${headerColor}; text-align: center;">
              
              <!-- Logo Oficial Centrado -->
              <table align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto 14px auto;">
                <tr>
                  <td align="center">
                    <img src="${originUrl}/logo.png" alt="Parla Sport" width="170" style="display: block; height: auto; max-height: 70px; object-fit: contain;" />
                  </td>
                </tr>
              </table>

              <div style="font-size: 19px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.3px;">
                ${headerTitle}
              </div>
            </td>
          </tr>

          <!-- Cuerpo Principal -->
          <tr>
            <td style="padding: 28px 24px;">
              <p style="font-size: 16px; color: #F8FAFC; margin-top: 0;">
                Hola <strong>${coachName}</strong>,
              </p>
              <p style="font-size: 14px; color: #94A3B8; line-height: 1.6;">
                ${isReassignment
                  ? `Se te ha reasignado una sesión programada originalmente para <strong>${previousCoachName || 'otro profesor'}</strong>.`
                  : `Se ha registrado una nueva sesión en tu calendario de entrenamientos en Parla Sport:`}
              </p>

              <!-- Tarjeta de Detalles de la Sesión -->
              <table width="100%" style="background-color: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; margin: 18px 0; padding: 16px;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 14px; color: #94A3B8;">
                    📅 <strong>Fecha:</strong> <span style="color: #F8FAFC; font-weight: 600;">${session?.fecha || 'Por definir'}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 14px; color: #94A3B8;">
                    ⏰ <strong>Horario:</strong> <span style="color: #10B981; font-weight: 700;">${horarioStr}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 14px; color: #94A3B8;">
                    🏆 <strong>Modalidad:</strong> <span style="color: #FBBF24; font-weight: 600;">${tipoSesion}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #94A3B8;">
                    📋 <strong>Notas / Observaciones:</strong> <span style="color: #E2E8F0;">${notasStr}</span>
                  </td>
                </tr>
              </table>

              <!-- Sección de Fichas de Jugadores -->
              ${playersHtml}

              <!-- Botón de Llamada a la Acción Principal -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 26px 0 10px 0;">
                <tr>
                  <td align="center">
                    <a href="${originUrl}/#coach-calendar" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                      ⚽ Ver Mi Calendario en Parla Sport
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Recordatorio Llamativo -->
              <div style="background-color: rgba(245, 158, 11, 0.12); border: 1.5px solid #F59E0B; border-radius: 10px; padding: 14px 18px; margin-top: 24px; text-align: center;">
                <p style="font-size: 13px; font-weight: 700; color: #FBBF24; line-height: 1.5; margin: 0;">
                  ⚠️ IMPORTANTE: Al finalizar la sesión debes registrar las notas y observaciones técnicas de cada alumno en la plataforma.
                </p>
              </div>

            </td>
          </tr>

          <!-- Pie de Página -->
          <tr>
            <td style="background-color: #060D1E; padding: 18px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11px; color: #64748B;">
              Parla Sport • Sistema de Gestión y Notificaciones para Entrenadores.<br>
              Este es un mensaje automatizado generado por la Dirección Técnica.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * Enviar Email vía OneSignal REST API al canal de correo del profesor
 */
export const sendOneSignalEmail = async ({
  toEmail,
  subject,
  htmlBody,
  fromName = 'Parla Sport'
}) => {
  if (!REST_API_KEY) {
    logNotifEvent('onesignal',
      '⚠️ Email OneSignal omitido',
      'Falta configurar VITE_ONESIGNAL_REST_API_KEY'
    );
    return { success: false, reason: 'no_api_key' };
  }

  const cleanEmail = (toEmail || '').toLowerCase().trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    console.warn('[OneSignal Email] ⚠️ Correo de destinatario no válido:', toEmail);
    return { success: false, reason: 'invalid_email' };
  }

  const payload = {
    app_id: APP_ID,
    email_subject: subject,
    email_body: htmlBody,
    email_from_name: fromName,
    include_email_tokens: [cleanEmail]
  };

  logNotifEvent('onesignal',
    `📧 Enviando Email OneSignal → ${cleanEmail}`,
    subject,
    { toEmail: cleanEmail, subject }
  );

  const authHeader = getOneSignalAuthHeader();
  const endpoints = [
    'https://api.onesignal.com/notifications',
    'https://onesignal.com/api/v1/notifications'
  ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn(`[OneSignal Email] ⚠️ Error en ${endpoint} (${response.status}):`, data);
        lastError = data;
        continue;
      }

      console.log('[OneSignal Email] ✅ Correo entregado con éxito a OneSignal:', data);
      logNotifEvent('onesignal',
        `✅ Correo OneSignal enviado a ${cleanEmail}`,
        subject,
        data
      );
      return { success: true, data };
    } catch (error) {
      console.error(`[OneSignal Email] Error de red en ${endpoint}:`, error);
      lastError = error;
    }
  }

  logNotifEvent('error',
    `❌ Falló envío de email OneSignal a ${cleanEmail}`,
    lastError?.errors ? JSON.stringify(lastError.errors) : (lastError?.message || 'Error desconocido'),
    lastError
  );
  return { success: false, error: lastError };
};

/**
 * Envío de correo directo vía Netlify Functions + Nodemailer (Gmail SMTP)
 */
export const sendNetlifyEmail = async ({
  toEmail,
  coachName = 'Entrenador',
  session,
  players = [],
  isReassignment = false,
  previousCoachName = '',
  customSubject = null,
  customHtml = null
}) => {
  const cleanEmail = (toEmail || session?.entrenadorEmail || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Email inválido o vacío' };
  }

  logNotifEvent('onesignal',
    `📧 Enviando Email (Gmail SMTP / Netlify) → ${cleanEmail}`,
    customSubject || `${session?.fecha || 'Nueva Sesión'}`
  );

  try {
    const response = await fetch('/.netlify/functions/send-session-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: cleanEmail,
        coachName,
        session,
        players,
        isReassignment,
        previousCoachName,
        customSubject,
        customHtml
      })
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.success) {
      console.log('[Netlify Email] ✅ Correo entregado vía Gmail Nodemailer:', data);
      logNotifEvent('onesignal',
        `✅ Email entregado a ${cleanEmail} (Gmail SMTP)`,
        `ID: ${data.messageId || 'OK'}`,
        data
      );
      return { success: true, data };
    }

    throw new Error(data.error || `HTTP ${response.status}`);
  } catch (error) {
    console.warn('[Netlify Email] ⚠️ Falló envío directo por Netlify Functions:', error.message);
    logNotifEvent('error',
      `⚠️ Netlify Functions (${error.message})`,
      'Se intentará respaldo por OneSignal Email si aplica'
    );
    return { success: false, error: error.message };
  }
};

/**
 * Disparador unificado de notificaciones multicanal (Push + Email) para asignaciones de sesión
 */
export const sendSessionAssignmentNotification = async ({
  session,
  coach,
  players = [],
  isReassignment = false,
  previousCoachName = ''
}) => {
  if (!session) return;

  const coachName = coach?.nombre || session.entrenadorNombre || 'Entrenador';
  const coachEmail = (coach?.email || session.entrenadorEmail || '').trim().toLowerCase();
  const coachId = String(coach?.id || session.entrenadorId || '');
  const playerNames = (players || []).map(p => p.nombre || 'Jugador').filter(Boolean);

  const titleCoach = isReassignment
    ? `⚠️ Reasignación: Sesión ${session.tipo || '1-1'}`
    : `⚽ Nueva Sesión Asignada (${session.tipo || '1-1'})`;

  const messageCoach = isReassignment
    ? `Se te ha reasignado la sesión del ${session.fecha} (${formatTo12Hour(session.horaInicio)} - ${formatTo12Hour(session.horaFin)}) por ausencia de ${previousCoachName || 'profesor'}. Jugadores: ${playerNames.join(', ')}.`
    : `Nueva sesión programada para el ${session.fecha} (${formatTo12Hour(session.horaInicio)} - ${formatTo12Hour(session.horaFin)}). Jugadores: ${playerNames.join(', ')}.`;

  const results = {};

  // 1. Disparar Push remoto vía OneSignal
  if (coachId || coachEmail) {
    sendOneSignalPush({
      title: titleCoach,
      message: messageCoach,
      externalUserId: coachId,
      recipientEmail: coachEmail,
      url: '/#coach-calendar'
    }).then(res => {
      results.push = res;
    }).catch(err => {
      console.warn('[OneSignal] Push falló:', err);
    });
  }

  // 2. Disparar Email vía Netlify Function (Gmail Nodemailer) + Fallback OneSignal
  if (coachEmail && coachEmail.includes('@')) {
    sendNetlifyEmail({
      toEmail: coachEmail,
      coachName,
      session,
      players,
      isReassignment,
      previousCoachName
    }).then(res => {
      results.email = res;
      if (!res.success) {
        // Fallback a OneSignal Email si Netlify localmente no corre o devuelve error
        const emailHtml = buildSessionEmailHtml({
          coachName,
          session,
          players,
          isReassignment,
          previousCoachName
        });
        return sendOneSignalEmail({
          toEmail: coachEmail,
          subject: `${isReassignment ? '⚠️ Reasignación' : '⚽ Nueva Sesión'}: ${session.fecha} (${formatTo12Hour(session.horaInicio)}) - Parla Sport`,
          htmlBody: emailHtml,
          fromName: 'Parla Sport'
        });
      }
    }).catch(err => {
      console.warn('[Email Dispatcher] Error:', err);
    });
  }

  return results;
};

