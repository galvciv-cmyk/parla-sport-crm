// Client-side Email Integration (EmailJS / Resend API)
import emailjs from '@emailjs/browser';

// Default configuration place-holders for EmailJS / Resend
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_parlasport';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_session_notice';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'demo_public_key';

/**
 * Envia un correo electronico al entrenador asignado o reasignado
 */
export const sendSessionAssignmentEmail = async ({
  coachName,
  coachEmail,
  sessionType,
  date,
  startTime,
  endTime,
  playerNames,
  isReassignment = false,
  previousCoachName = ''
}) => {
  const subject = isReassignment
    ? `⚠️ Reasignación de Sesión (${sessionType}) - Parla Sport`
    : `⚽ Nueva Sesión Asignada (${sessionType}) - Parla Sport`;

  const messageText = isReassignment
    ? `Hola ${coachName}, se te ha reasignado una sesión por ausencia de ${previousCoachName || 'otro entrenador'}.\n` +
      `Fecha: ${date} de ${startTime} a ${endTime}.\n` +
      `Jugadores: ${playerNames.join(', ')}.\n` +
      `Ingresa al sistema para ver sus Fichas Técnicas.`
    : `Hola ${coachName}, tienes una nueva sesión programada.\n` +
      `Fecha: ${date} de ${startTime} a ${endTime}.\n` +
      `Jugadores: ${playerNames.join(', ')}.`;

  console.log(`[EmailService] 📧 Intento de envío a: ${coachEmail} | Asunto: ${subject}`);

  // Intento de envío real vía EmailJS si las llaves existen
  if (import.meta.env.VITE_EMAILJS_PUBLIC_KEY) {
    try {
      const templateParams = {
        to_name: coachName,
        to_email: coachEmail,
        subject: subject,
        session_type: sessionType,
        session_date: date,
        session_time: `${startTime} - ${endTime}`,
        player_list: playerNames.join(', '),
        message: messageText
      };
      
      const response = await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );
      return { success: true, method: 'EmailJS', status: response.status };
    } catch (error) {
      console.warn('[EmailService] fallo en EmailJS, ejecutando simulación visual.', error);
    }
  }

  // Fallback simulado pero totalmente visible para pruebas directas en desarrollo
  return {
    success: true,
    method: 'Simulated Client Dispatch',
    details: { coachEmail, subject, messageText }
  };
};
