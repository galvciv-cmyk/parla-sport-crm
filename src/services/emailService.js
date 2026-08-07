// Client-side Email Integration via EmailJS
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_7zgx9nt';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_7refn8b';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

/**
 * Notifica a un profesor mediante EmailJS con los parámetros del Template
 * @param {string} email - Correo del profesor (email_profesor)
 * @param {string} nombre - Nombre del profesor (nombre_profesor)
 * @param {string} fecha - Fecha y horario de la sesión (fecha_sesion)
 * @param {string} categoria - Categoría o tipo de sesión (categoria_equipo)
 */
export function notificarProfesor(email, nombre, fecha, categoria) {
  // 1. Preparamos los parámetros exactos definidos en el Template
  const templateParams = {
    email_profesor: email,       // Destinatario
    nombre_profesor: nombre,     // Saludo en el mensaje
    fecha_sesion: fecha,         // Detalle de la fecha
    categoria_equipo: categoria  // Detalle de la categoría
  };

  // 2. Ejecutamos el envío con tus IDs reales
  return emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    templateParams,
    EMAILJS_PUBLIC_KEY || undefined
  )
  .then(function(response) {
    console.log('[EmailJS] ✅ Notificación enviada al profe con éxito:', response.status, response.text);
    return { success: true, status: response.status, text: response.text };
  }, function(error) {
    console.error('[EmailJS] ❌ Error al enviar la notificación:', error);
    return { success: false, error };
  });
}

/**
 * Envia un correo electrónico al entrenador asignado o reasignado
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
  if (!coachEmail) return { success: false, reason: 'No coach email provided' };

  const reassignText = isReassignment ? ` (Reasignado por ausencia de ${previousCoachName || 'otro profesor'})` : '';
  const fechaDetalle = `${date} de ${startTime} a ${endTime}`;
  const categoriaDetalle = `${sessionType || '1-1'}${reassignText} - Jugadores: ${playerNames ? playerNames.join(', ') : 'Asignados'}`;

  console.log(`[EmailService] 📧 Enviando notificación EmailJS a: ${coachEmail} (${coachName})`);

  return notificarProfesor(
    coachEmail,
    coachName || 'Profesor',
    fechaDetalle,
    categoriaDetalle
  );
};

/**
 * Envia un recordatorio de disponibilidad al profesor
 */
export const sendWeeklyAvailabilityReminderEmail = async ({ coachName, coachEmail }) => {
  if (!coachEmail) return { success: false };

  const fechaDetalle = 'Recordatorio de Disponibilidad Semanal';
  const categoriaDetalle = 'Actualización de Horarios Parla Sport';

  return notificarProfesor(
    coachEmail,
    coachName || 'Profesor',
    fechaDetalle,
    categoriaDetalle
  );
};

export default {
  notificarProfesor,
  sendSessionAssignmentEmail,
  sendWeeklyAvailabilityReminderEmail
};
