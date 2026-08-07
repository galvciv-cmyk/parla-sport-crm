import OneSignal from 'react-onesignal';

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || '1a53322b-aa05-442d-8b71-72c7bbaee998';
const REST_API_KEY = import.meta.env.VITE_ONESIGNAL_REST_API_KEY || '';

export const initOneSignal = async () => {
  try {
    await OneSignal.init({
      appId: APP_ID,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: true,
      },
    });
    console.log('[OneSignal] Inicializado correctamente');
  } catch (error) {
    console.error('[OneSignal] Error al inicializar:', error);
  }
};

export const loginToOneSignal = async (uid) => {
  try {
    if (uid) {
      await OneSignal.login(uid);
      console.log(`[OneSignal] Usuario logueado con ID: ${uid}`);
    }
  } catch (error) {
    console.error('[OneSignal] Error en login:', error);
  }
};

export const logoutFromOneSignal = async () => {
  try {
    await OneSignal.logout();
    console.log('[OneSignal] Sesión cerrada');
  } catch (error) {
    console.warn('[OneSignal] Error en logout:', error);
  }
};

export const sendOneSignalPush = async (title, message, externalUserId) => {
  if (!REST_API_KEY) {
    console.warn('[OneSignal] ⚠️ No se puede enviar Push remoto: Falta VITE_ONESIGNAL_REST_API_KEY en .env');
    return;
  }

  const payload = {
    app_id: APP_ID,
    include_aliases: {
      external_id: [externalUserId]
    },
    target_channel: 'push',
    headings: { en: title, es: title },
    contents: { en: message, es: message }
  };

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
    console.log('[OneSignal] Push enviado:', data);
  } catch (error) {
    console.error('[OneSignal] Error al enviar Push HTTP:', error);
  }
};
