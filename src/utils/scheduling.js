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
 * Convierte una hora 'HH:MM' (24 hrs) a formato 12 horas con AM/PM (ej: '09:00' -> '9:00 AM', '14:30' -> '2:30 PM')
 */
export const formatTo12Hour = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${m} ${period}`;
};

/**
 * Dada una hora 'HH:MM', devuelve la hora correspondiente a 1 hora después en formato 'HH:MM'
 */
export const addOneHour = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return '10:00';
  const parts = timeStr.split(':');
  if (parts.length < 2) return '10:00';
  let h = parseInt(parts[0], 10);
  let m = parts[1];
  if (isNaN(h)) return '10:00';
  h = (h + 1) % 24;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${m}`;
};

/**
 * Genera lista de opciones de hora con su equivalente en 12h AM/PM
 */
export const generateTimeOptions = (intervalMinutes = 15) => {
  const options = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      const pad = (n) => String(n).padStart(2, '0');
      const time24 = `${pad(h)}:${pad(m)}`;
      const label12 = formatTo12Hour(time24);
      options.push({ value: time24, label: label12 });
    }
  }
  return options;
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
  if (!coach) return false;

  // Si el entrenador aún no ha configurado bloques de disponibilidad específicos, está disponible por defecto
  if (!coach.bloquesDisponibilidad || coach.bloquesDisponibilidad.length === 0) {
    return true;
  }

  const dayName = getSpanishDayName(dateStr);
  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);

  return coach.bloquesDisponibilidad.some(block => {
    if (!block.dia || block.dia.toLowerCase() !== dayName.toLowerCase()) return false;
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
 * Comprueba si un jugador YA TIENE una sesión agendada en ese día
 * REGLA ESTRICTA: Los jugadores solo realizan MÁXIMO 1 sesión por día.
 */
export const hasPlayerDailySession = (sessions, playerId, dateStr, excludeSessionId = null) => {
  if (!playerId || !dateStr) return { hasSession: false, existingSession: null };

  const existingSession = sessions.find(s => {
    if (s.id === excludeSessionId) return false;
    if (s.estado === 'cancelada') return false;
    if (s.fecha !== dateStr) return false;
    return Array.isArray(s.jugadoresIds) && s.jugadoresIds.includes(playerId);
  });

  return {
    hasSession: !!existingSession,
    existingSession: existingSession || null
  };
};

/**
 * Comprueba si alguno de los jugadores seleccionados ya tiene una sesión en ese día
 */
export const hasPlayerSessionConflict = (sessions, playerIds, dateStr, startTime = null, endTime = null, excludeSessionId = null) => {
  if (!playerIds || playerIds.length === 0) return { conflict: false, conflictingPlayerId: null, existingSession: null };

  for (const pId of playerIds) {
    const check = hasPlayerDailySession(sessions, pId, dateStr, excludeSessionId);
    if (check.hasSession) {
      return {
        conflict: true,
        conflictingPlayerId: pId,
        existingSession: check.existingSession
      };
    }
  }

  return { conflict: false, conflictingPlayerId: null, existingSession: null };
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

const DAY_ABBR = {
  'Lunes': 'L',
  'Martes': 'M',
  'Miércoles': 'MI',
  'Miercoles': 'MI',
  'Jueves': 'J',
  'Viernes': 'V',
  'Sábado': 'S',
  'Sabado': 'S',
  'Domingo': 'D'
};

const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

/**
 * Agrupa bloques de disponibilidad que comparten el mismo rango horario
 * y devuelve el formato compacto: "HoraInicio - HoraFin — Días abreviados" (ej: "8:00 AM - 12:00 PM — L, M, MI, J, V")
 */
export const groupAvailabilityBlocks = (bloques = []) => {
  if (!Array.isArray(bloques) || bloques.length === 0) return [];

  const map = new Map();

  bloques.forEach((b) => {
    if (!b || !b.horaInicio || !b.horaFin) return;
    const key = `${b.horaInicio}_${b.horaFin}`;
    if (!map.has(key)) {
      map.set(key, {
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
        dias: []
      });
    }
    const item = map.get(key);
    if (b.dia && !item.dias.includes(b.dia)) {
      item.dias.push(b.dia);
    }
  });

  return Array.from(map.values()).map(group => {
    group.dias.sort((a, b) => {
      const idxA = DAY_ORDER.indexOf(a);
      const idxB = DAY_ORDER.indexOf(b);
      return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
    });

    const abbrDays = group.dias.map(d => DAY_ABBR[d] || d).join(', ');
    const timeFormatted = `${formatTo12Hour(group.horaInicio)} - ${formatTo12Hour(group.horaFin)}`;

    return {
      ...group,
      abbrDays,
      timeFormatted,
      label: `${timeFormatted} — ${abbrDays}`
    };
  });
};

