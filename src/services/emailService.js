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

  return {
    success: true,
    method: 'Simulated Client Dispatch',
    details: { coachEmail, subject, messageText }
  };
};

/**
 * Envia la notificacion / recordatorio semanal dominical a un entrenador para actualizar su horario
 */
export const sendWeeklyAvailabilityReminderEmail = async ({ coachName, coachEmail }) => {
  const subject = `🗓️ Recordatorio Semanal: Actualiza tus Días y Horarios Disponibles - Parla Sport`;
  const messageText = `Hola ${coachName},\n\n` +
    `Recuerda revisar y ajustar tus bloques de disponibilidad de días y horas para la próxima semana en el sistema CRM Parla Sport.\n` +
    `Mantener tu horario al día permite a la academia programar tus entrenamientos 1-1, 1-2 y 1-3 sin choques.`;

  console.log(`[EmailService] 🗓️ Envió de recordatorio semanal de disponibilidad a: ${coachEmail}`);

  if (import.meta.env.VITE_EMAILJS_PUBLIC_KEY) {
    try {
      const templateParams = {
        to_name: coachName,
        to_email: coachEmail,
        subject: subject,
        message: messageText
      };
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
      return { success: true, method: 'EmailJS' };
    } catch (error) {
      console.warn('[EmailService] fallo enviando recordatorio semanal vía EmailJS.', error);
    }
  }

  return {
    success: true,
    method: 'Simulated Client Dispatch',
    details: { coachEmail, subject, messageText }
  };
};
