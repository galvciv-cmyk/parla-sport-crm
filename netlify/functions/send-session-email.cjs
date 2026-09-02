const nodemailer = require('nodemailer');
const LOGO_BASE64 = require('./logoBase64.cjs');

// Configuración del transporte con la cuenta oficial de Gmail y respaldo automático
const GMAIL_PRIMARY_USER = process.env.GMAIL_USER || 'parlasport.vzla@gmail.com';
const GMAIL_PRIMARY_PASS = process.env.GMAIL_APP_PASSWORD || Buffer.from('dWJxdiBidmpyIGt3cHggZXJsdQ==', 'base64').toString('ascii');

const GMAIL_BACKUP_USER = 'guatavolinares08@gmail.com';
const GMAIL_BACKUP_PASS = Buffer.from('d3dvaSB4dWF1IGJ2ZmcgZWd0bg==', 'base64').toString('ascii');

const primaryTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_PRIMARY_USER,
    pass: GMAIL_PRIMARY_PASS
  }
});

const backupTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_BACKUP_USER,
    pass: GMAIL_BACKUP_PASS
  }
});

const formatTo12Hour = (time24) => {
  if (!time24) return '';
  const parts = String(time24).split(':');
  if (parts.length < 2) return time24;
  let hour = parseInt(parts[0], 10);
  const min = parts[1];
  if (isNaN(hour)) return time24;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${min} ${ampm}`;
};

const buildEmailTemplate = ({
  coachName = 'Entrenador',
  session,
  players = [],
  isReassignment = false,
  previousCoachName = '',
  originUrl
}) => {
  const baseUrl = (originUrl || process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://parlasport.netlify.app').replace(/\/+$/, '');
  const tipoSesion = session?.tipo || session?.categoria || '1-1';
  const notasStr = session?.notas || session?.observaciones || 'Sin observaciones previas';
  const formattedStart = session?.horaInicio ? formatTo12Hour(session.horaInicio) : 'Por definir';
  const formattedEnd = session?.horaFin ? formatTo12Hour(session.horaFin) : '';
  const horarioStr = formattedEnd ? `${formattedStart} - ${formattedEnd}` : formattedStart;
  const headerBorderColor = isReassignment ? '#F59E0B' : '#10B981';
  
  // Título en amarillo con texto exacto requerido
  const headerTitle = isReassignment
    ? '⚠️ SESIÓN REASIGNADA'
    : '⚽ NUEVA SESIÓN DE ENTRENAMIENTO REGISTRADA';

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
    const playerDetailUrl = `${baseUrl}/#player-${singlePlayer.id || ''}`;
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
        <a href="${playerDetailUrl}" target="_blank" style="display: inline-block; background-color: #0EA5E9; color: #FFFFFF; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 13px; box-shadow: 0 2px 6px rgba(14, 165, 233, 0.3);">
          👤 Ver Ficha Técnica de ${singlePlayer.nombre}
        </a>
      </div>
    `;
  } else if (playersList.length > 1) {
    const playerCards = playersList.map((p, idx) => {
      const playerUrl = `${baseUrl}/#player-${p.id || ''}`;
      return `
        <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <td style="padding: 12px 8px;">
            <div style="font-weight: 700; color: #F8FAFC; font-size: 14px;">${idx + 1}. ${p.nombre}</div>
            <div style="font-size: 12px; color: #94A3B8;">${p.posicion} ${p.edad ? `• ${p.edad}` : ''}</div>
          </td>
          <td style="padding: 12px 8px; text-align: right;">
            <a href="${playerUrl}" target="_blank" style="display: inline-block; background-color: rgba(14, 165, 233, 0.18); border: 1px solid #0EA5E9; color: #38BDF8; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 12px;">
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
  <title>${headerTitle} - Parla Sport</title>
</head>
<body style="margin: 0; padding: 0; background-color: #060D1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060D1E; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #0F172A; border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.25); overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Encabezado: Rectángulo Azul Marino con Logo Incrustado (CID Attachment) -->
          <tr>
            <td style="background: linear-gradient(135deg, #070F1E 0%, #0A1931 50%, #060D1E 100%); padding: 32px 20px 26px 20px; border-bottom: 3px solid ${headerBorderColor}; text-align: center;">
              
              <!-- Logo Oficial Incrustado de Parla Sport -->
              <table align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
                <tr>
                  <td align="center">
                    <img src="cid:parlasportlogo" alt="Parla Sport" width="180" style="display: block; height: auto; max-height: 75px; object-fit: contain; margin: 0 auto;" />
                  </td>
                </tr>
              </table>

              <!-- Letras del Header en Amarillo Brillante -->
              <div style="font-size: 19px; font-weight: 800; color: #FBBF24; letter-spacing: 0.5px; text-transform: uppercase; text-shadow: 0 2px 4px rgba(0,0,0,0.4);">
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
                    <a href="${baseUrl}/#coach-calendar" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                      ⚽ Ver Mi Calendario en Parla Sport
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Recordatorio Llamativo en Amarillo / Dorado Brillante -->
              <div style="background-color: rgba(245, 158, 11, 0.15); border: 2px solid #F59E0B; border-radius: 10px; padding: 16px 20px; margin-top: 24px; text-align: center; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);">
                <p style="font-size: 14px; font-weight: 800; color: #FDE047; line-height: 1.5; margin: 0; text-shadow: 0 1px 3px rgba(0,0,0,0.7);">
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

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const {
      toEmail,
      recipientEmail,
      coachEmail,
      coachName = 'Entrenador',
      session,
      players = [],
      isReassignment = false,
      previousCoachName = '',
      customSubject,
      customHtml,
      originUrl
    } = payload;

    const destinationEmail = (toEmail || recipientEmail || coachEmail || session?.entrenadorEmail || '').trim().toLowerCase();

    if (!destinationEmail || !destinationEmail.includes('@')) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Dirección de correo de destino no válida o no proporcionada' })
      };
    }

    const formattedStart = session?.horaInicio ? formatTo12Hour(session.horaInicio) : 'Por definir';
    const formattedEnd = session?.horaFin ? formatTo12Hour(session.horaFin) : '';
    const horarioStr = formattedEnd ? `${formattedStart} - ${formattedEnd}` : formattedStart;

    const defaultSubject = isReassignment
      ? `⚠️ Reasignación de Sesión: ${session?.fecha || ''} (${horarioStr}) - Parla Sport`
      : `⚽ Nueva Sesión Asignada: ${session?.fecha || ''} (${horarioStr}) - Parla Sport`;

    const subject = customSubject || defaultSubject;

    const htmlContent = customHtml || buildEmailTemplate({
      coachName,
      session,
      players,
      isReassignment,
      previousCoachName,
      originUrl: originUrl || process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://parlasport.netlify.app'
    });

    const mailOptions = {
      from: `"Parla Sport" <${GMAIL_PRIMARY_USER}>`,
      replyTo: 'parlasport.vzla@gmail.com',
      to: destinationEmail,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: 'parla-sport-logo.png',
          content: LOGO_BASE64,
          encoding: 'base64',
          cid: 'parlasportlogo'
        }
      ]
    };

    let info;
    try {
      info = await primaryTransporter.sendMail(mailOptions);
      console.log('[Netlify Function] ✅ Enviado vía Parla Sport oficial:', info.messageId);
    } catch (primaryErr) {
      console.warn('[Netlify Function] ⚠️ Servidor Parla en espera de propagación Google, usando respaldo:', primaryErr.message);
      mailOptions.from = `"Parla Sport" <${GMAIL_BACKUP_USER}>`;
      info = await backupTransporter.sendMail(mailOptions);
      console.log('[Netlify Function] ✅ Enviado vía respaldo Parla Sport con replyTo oficial:', info.messageId);
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        messageId: info.messageId,
        recipient: destinationEmail
      })
    };
  } catch (error) {
    console.error('[Netlify Function] ❌ Error enviando correo:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Error desconocido al enviar correo'
      })
    };
  }
};
