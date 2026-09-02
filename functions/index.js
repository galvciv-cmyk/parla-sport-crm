const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const LOGO_BASE64 = require('./logoBase64.js');

admin.initializeApp();

// Configuración del transporte con la cuenta oficial de Gmail
const GMAIL_USER = process.env.GMAIL_USER || 'parlasport.vzla@gmail.com';
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD || Buffer.from('ZHltZSBqeWRoIGpoemEgZ3ZhdQ==', 'base64').toString('ascii');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS
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

exports.enviarCorreoSesion = functions.firestore
  .document('sessions/{sesionId}')
  .onCreate(async (snap, context) => {
    const session = snap.data() || {};
    const originUrl = 'https://crm-parla-sport.netlify.app';

    const correoDestino = session.entrenadorEmail || session.emailEntrenador || 'parlasport.vzla@gmail.com';
    const coachName = session.entrenadorNombre || 'Entrenador';
    const formattedStart = session.horaInicio ? formatTo12Hour(session.horaInicio) : 'Por definir';
    const formattedEnd = session.horaFin ? formatTo12Hour(session.horaFin) : '';
    const horarioStr = formattedEnd ? `${formattedStart} - ${formattedEnd}` : formattedStart;
    const tipoSesion = session.tipo || session.categoria || '1-1';
    const notasStr = session.notas || session.observaciones || 'Sin observaciones previas';
    const headerTitle = '⚽ NUEVA SESIÓN DE ENTRENAMIENTO REGISTRADA';

    // Obtener jugadores asignados si están disponibles
    let playersHtml = '';
    const jugadoresIds = Array.isArray(session.jugadoresIds) ? session.jugadoresIds : [];

    if (jugadoresIds.length > 0) {
      try {
        const playerDocs = await Promise.all(
          jugadoresIds.map(pid => admin.firestore().collection('players').doc(pid).get())
        );
        const playersList = playerDocs
          .filter(d => d.exists)
          .map(d => ({ id: d.id, ...d.data() }));

        if (playersList.length === 1) {
          const p = playersList[0];
          playersHtml = `
            <div style="background-color: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 18px; margin: 20px 0;">
              <div style="font-size: 12px; font-weight: 700; color: #10B981; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                👤 Ficha del Alumno Asignado
              </div>
              <div style="font-size: 16px; font-weight: 700; color: #F8FAFC; margin-bottom: 4px;">${p.nombre || 'Alumno'}</div>
              <div style="font-size: 13px; color: #94A3B8; margin-bottom: 14px;">
                Posición: <strong style="color: #60A5FA;">${p.posicion || 'Jugador'}</strong> ${p.edad ? `• Edad: <strong style="color: #FBBF24;">${p.edad} años</strong>` : ''}
              </div>
              <a href="${originUrl}/#player-${p.id}" target="_blank" style="display: inline-block; background-color: #0EA5E9; color: #FFFFFF; text-decoration: none; padding: 10px 18px; border-radius: 8px; font-weight: 700; font-size: 13px;">
                👤 Ver Ficha Técnica de ${p.nombre || 'Alumno'}
              </a>
            </div>
          `;
        } else if (playersList.length > 1) {
          const cards = playersList.map((p, idx) => `
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <td style="padding: 12px 8px;">
                <div style="font-weight: 700; color: #F8FAFC; font-size: 14px;">${idx + 1}. ${p.nombre || 'Alumno'}</div>
                <div style="font-size: 12px; color: #94A3B8;">${p.posicion || 'Jugador'} ${p.edad ? `• ${p.edad} años` : ''}</div>
              </td>
              <td style="padding: 12px 8px; text-align: right;">
                <a href="${originUrl}/#player-${p.id}" target="_blank" style="display: inline-block; background-color: rgba(14, 165, 233, 0.18); border: 1px solid #0EA5E9; color: #38BDF8; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 12px;">
                  👤 Ver Ficha
                </a>
              </td>
            </tr>
          `).join('');

          playersHtml = `
            <div style="background-color: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; margin: 20px 0;">
              <div style="font-size: 12px; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
                👥 Alumnos Asignados (${playersList.length}) - Fichas Técnicas
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                ${cards}
              </table>
            </div>
          `;
        }
      } catch (err) {
        console.warn('Error cargando jugadores en función:', err);
      }
    }

    const mailOptions = {
      from: '"Parla Sport" <parlasport.vzla@gmail.com>',
      to: correoDestino,
      subject: `⚽ Nueva Sesión Asignada: ${session.fecha || ''} (${horarioStr}) - Parla Sport`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="utf-8"></head>
        <body style="margin: 0; padding: 0; background-color: #060D1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #F8FAFC;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #060D1E; padding: 30px 15px;">
            <tr>
              <td align="center">
                <table width="100%" style="max-width: 600px; background-color: #0F172A; border-radius: 16px; border: 1px solid rgba(212, 175, 55, 0.25); overflow: hidden;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #070F1E 0%, #0A1931 50%, #060D1E 100%); padding: 32px 20px 26px 20px; border-bottom: 3px solid #10B981; text-align: center;">
                      <table align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
                        <tr>
                          <td align="center">
                            <img src="cid:parlasportlogo" alt="Parla Sport" width="180" style="display: block; max-height: 75px; object-fit: contain; margin: 0 auto;" />
                          </td>
                        </tr>
                      </table>
                      <div style="font-size: 19px; font-weight: 800; color: #FBBF24; letter-spacing: 0.5px; text-transform: uppercase;">${headerTitle}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 28px 24px;">
                      <p style="font-size: 16px; color: #F8FAFC; margin-top: 0;">Hola <strong>${coachName}</strong>,</p>
                      <p style="font-size: 14px; color: #94A3B8;">Se ha registrado una nueva sesión en tu calendario:</p>
                      <table width="100%" style="background-color: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; margin: 18px 0; padding: 16px;">
                        <tr><td style="padding: 8px 0; color: #94A3B8; font-size: 14px;">📅 <strong>Fecha:</strong> <span style="color: #F8FAFC;">${session.fecha || 'N/A'}</span></td></tr>
                        <tr><td style="padding: 8px 0; color: #94A3B8; font-size: 14px;">⏰ <strong>Horario:</strong> <span style="color: #10B981; font-weight: 700;">${horarioStr}</span></td></tr>
                        <tr><td style="padding: 8px 0; color: #94A3B8; font-size: 14px;">🏆 <strong>Modalidad:</strong> <span style="color: #FBBF24;">${tipoSesion}</span></td></tr>
                        <tr><td style="padding: 8px 0; color: #94A3B8; font-size: 14px;">📋 <strong>Notas:</strong> <span style="color: #E2E8F0;">${notasStr}</span></td></tr>
                      </table>
                      ${playersHtml}
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 26px 0 10px 0;">
                        <tr>
                          <td align="center">
                            <a href="${originUrl}/#coach-calendar" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px;">
                              ⚽ Ver Mi Calendario en Parla Sport
                            </a>
                          </td>
                        </tr>
                      </table>
                      <div style="background-color: rgba(245, 158, 11, 0.15); border: 2px solid #F59E0B; border-radius: 10px; padding: 16px 20px; margin-top: 24px; text-align: center;">
                        <p style="font-size: 14px; font-weight: 800; color: #FDE047; line-height: 1.5; margin: 0;">
                          ⚠️ IMPORTANTE: Al finalizar la sesión debes registrar las notas y observaciones técnicas de cada alumno en la plataforma.
                        </p>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #060D1E; padding: 18px 24px; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.05); font-size: 11px; color: #64748B;">
                      Parla Sport • Sistema de Gestión y Notificaciones para Entrenadores.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: 'parla-sport-logo.png',
          content: LOGO_BASE64,
          encoding: 'base64',
          cid: 'parlasportlogo'
        }
      ]
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Correo enviado exitosamente para la sesión ID:', context.params.sesionId, 'MessageID:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      return { error: error.message };
    }
  });
