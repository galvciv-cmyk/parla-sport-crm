// Anti-Conflict Scheduling Engine for Parla Sport CRM

const DAYS_MAP = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Obtiene el nombre del día de la semana en español dado un string 'YYYY-MM-DD'
 */
export const getSpanishDayName = (dateStr) => {
  if (!dateStr) return '';
  const dateObj = new Date(dateStr + 'T00:00:00');
  return DAYS_MAP[dateObj.getDay()];
};

/**
 * Convierte un string de hora 'HH:MM' a minutos totales desde las 00:00
 */
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Revisa si un horario (startTime - endTime) solapa con otro bloque de tiempo
 */
export const isTimeOverlapping = (startA, endA, startB, endB) => {
  const mAStart = timeToMinutes(startA);
  const mAEnd = timeToMinutes(endA);
  const mBStart = timeToMinutes(startB);
  const mBEnd = timeToMinutes(endB);

  return mAStart < mBEnd && mAEnd > mBStart;
};

/**
 * Comprueba si un entrenador tiene disponibilidad registrada para un día y bloque de horas específico
 */
export const isCoachAvailableBySchedule = (coach, dateStr, startTime, endTime) => {
  if (!coach || !coach.bloquesDisponibilidad || coach.bloquesDisponibilidad.length === 0) {
    return false;
  }

  const dayName = getSpanishDayName(dateStr);
  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);

  return coach.bloquesDisponibilidad.some(block => {
    if (block.dia !== dayName) return false;
    const blockStart = timeToMinutes(block.horaInicio);
    const blockEnd = timeToMinutes(block.horaFin);

    // La sesión requerida debe estar COMPLETAMENTE contenida dentro del bloque de disponibilidad
    return reqStart >= blockStart && reqEnd <= blockEnd;
  });
};

/**
 * Comprueba si el entrenador YA TIENE una sesión agendada que choque a esa hora
 */
export const hasCoachSessionConflict = (sessions, coachId, dateStr, startTime, endTime, excludeSessionId = null) => {
  return sessions.some(s => {
    if (s.id === excludeSessionId) return false;
    if (s.estado === 'cancelada') return false;
    if (s.entrenadorId !== coachId) return false;
    if (s.fecha !== dateStr) return false;

    return isTimeOverlapping(startTime, endTime, s.horaInicio, s.horaFin);
  });
};

/**
 * Comprueba si alguno de los jugadores seleccionados YA TIENE otra sesión agendada que choque
 */
export const hasPlayerSessionConflict = (sessions, playerIds, dateStr, startTime, endTime, excludeSessionId = null) => {
  if (!playerIds || playerIds.length === 0) return { conflict: false, conflictingPlayerId: null };

  for (const pId of playerIds) {
    const conflictFound = sessions.some(s => {
      if (s.id === excludeSessionId) return false;
      if (s.estado === 'cancelada') return false;
      if (s.fecha !== dateStr) return false;

      const playerInSession = s.jugadoresIds && s.jugadoresIds.includes(pId);
      if (!playerInSession) return false;

      return isTimeOverlapping(startTime, endTime, s.horaInicio, s.horaFin);
    });

    if (conflictFound) {
      return { conflict: true, conflictingPlayerId: pId };
    }
  }

  return { conflict: false, conflictingPlayerId: null };
};

/**
 * Obtiene la lista de entrenadores ÚNICAMENTE DISPONIBLES y SIN CHOQUE DE HORARIOS
 */
export const getAvailableCoaches = (coaches, sessions, dateStr, startTime, endTime, excludeSessionId = null) => {
  if (!dateStr || !startTime || !endTime) return coaches;

  return coaches.filter(coach => {
    // 1. Debe estar disponible según sus bloques semanales
    const availableByBlock = isCoachAvailableBySchedule(coach, dateStr, startTime, endTime);
    if (!availableByBlock) return false;

    // 2. NO debe tener otra sesión a esa misma hora
    const hasConflict = hasCoachSessionConflict(sessions, coach.id, dateStr, startTime, endTime, excludeSessionId);
    return !hasConflict;
  });
};
