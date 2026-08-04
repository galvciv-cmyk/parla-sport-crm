// Mock data for initial loading in local storage / firestore seed

export const MASTER_ADMIN_EMAIL = 'admin@parlasport.com';

export const INITIAL_PLAYERS = [
  {
    id: 'jug-1',
    nombre: 'Mateo Fernández',
    edad: 12,
    posicion: 'Mediocampista',
    piernaHabil: 'Derecha',
    contactoTutor: '+58 414 1234567 (Papá)',
    foto: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=300',
    observacionesTecnicas: 'Excelente visión de juego y pase filtrado. Trabajar resistencia aeróbica y tiro de media distancia.',
    fechaRegistro: '2026-01-10'
  },
  {
    id: 'jug-2',
    nombre: 'Santiago Gómez',
    edad: 10,
    posicion: 'Delantero',
    piernaHabil: 'Izquierda',
    contactoTutor: '+58 412 9876543 (Mamá)',
    foto: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=300',
    observacionesTecnicas: 'Potente regate en 1vs1. Pierna izquierda muy educada. Necesita mejorar cabezazo ofensivo.',
    fechaRegistro: '2026-01-15'
  },
  {
    id: 'jug-3',
    nombre: 'Diego Ramírez',
    edad: 14,
    posicion: 'Defensa',
    piernaHabil: 'Derecha',
    contactoTutor: '+58 416 5554433 (Papá)',
    foto: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&q=80&w=300',
    observacionesTecnicas: 'Líder defensivo, muy fuerte en la marca cuerpo a cuerpo. Mejorar salida limpia con balón.',
    fechaRegistro: '2026-02-01'
  },
  {
    id: 'jug-4',
    nombre: 'Lucas Benítez',
    edad: 11,
    posicion: 'Portero',
    piernaHabil: 'Ambidiestro',
    contactoTutor: '+58 424 3332211 (Mamá)',
    foto: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&q=80&w=300',
    observacionesTecnicas: 'Reflejos felinos en la línea de gol. Trabajar achique en balones divididos y saque de puerta.',
    fechaRegistro: '2026-02-12'
  },
  {
    id: 'jug-5',
    nombre: 'Tomás Morales',
    edad: 13,
    posicion: 'Mediocampista',
    piernaHabil: 'Derecha',
    contactoTutor: '+58 412 1118899 (Tutor)',
    foto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=300',
    observacionesTecnicas: 'Gran capacidad de recuperación de balón y despliegue físico. Mejorar tempo del juego.',
    fechaRegistro: '2026-03-05'
  },
  {
    id: 'jug-6',
    nombre: 'Joaquín Silva',
    edad: 9,
    posicion: 'Delantero',
    piernaHabil: 'Derecha',
    contactoTutor: '+58 414 7776655 (Papá)',
    foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
    observacionesTecnicas: 'Mucha velocidad de desplazamiento y hambre de gol. Trabajar apoyo de espaldas al marco.',
    fechaRegistro: '2026-03-20'
  }
];

export const INITIAL_COACHES = [
  {
    id: 'coach-1',
    nombre: 'Prof. Carlos Silva',
    email: 'carlos.silva@parlasport.com',
    telefono: '+58 414 1112233',
    especialidad: 'Táctica & Fundamentos 1-1',
    foto: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300',
    bloquesDisponibilidad: [
      { dia: 'Lunes', horaInicio: '08:00', horaFin: '12:00' },
      { dia: 'Lunes', horaInicio: '14:00', horaFin: '18:00' },
      { dia: 'Miércoles', horaInicio: '08:00', horaFin: '12:00' },
      { dia: 'Viernes', horaInicio: '08:00', horaFin: '12:00' },
      { dia: 'Sábado', horaInicio: '09:00', horaFin: '13:00' }
    ]
  },
  {
    id: 'coach-2',
    nombre: 'Prof. Mateo Rossi',
    email: 'mateo.rossi@parlasport.com',
    telefono: '+58 412 4445566',
    especialidad: 'Preparación Física & Velocidad (1-2, 1-3)',
    foto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300',
    bloquesDisponibilidad: [
      { dia: 'Martes', horaInicio: '08:00', horaFin: '13:00' },
      { dia: 'Jueves', horaInicio: '08:00', horaFin: '13:00' },
      { dia: 'Viernes', horaInicio: '14:00', horaFin: '18:00' },
      { dia: 'Sábado', horaInicio: '08:00', horaFin: '14:00' }
    ]
  },
  {
    id: 'coach-3',
    nombre: 'Prof. Andrea Gómez',
    email: 'andrea.gomez@parlasport.com',
    telefono: '+58 416 8889900',
    especialidad: 'Técnica de Porteros & Definición',
    foto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300',
    bloquesDisponibilidad: [
      { dia: 'Lunes', horaInicio: '14:00', horaFin: '18:00' },
      { dia: 'Miércoles', horaInicio: '14:00', horaFin: '18:00' },
      { dia: 'Jueves', horaInicio: '14:00', horaFin: '18:00' },
      { dia: 'Sábado', horaInicio: '14:00', horaFin: '18:00' }
    ]
  }
];

// Estados basados en el Drive de la Academia:
// 'sin_confirmar' (Blanco), 'confirmada' (Amarillo), 'realizada' (Naranja), 'pagada' (Verde)
export const INITIAL_SESSIONS = [
  {
    id: 'sesion-1',
    fecha: '2026-08-10',
    horaInicio: '09:00',
    horaFin: '10:00',
    tipo: '1-1',
    entrenadorId: 'coach-1',
    jugadoresIds: ['jug-1'],
    estado: 'confirmada', // Amarillo
    notas: 'Entrenamiento de pase filtrado y perfilación.'
  },
  {
    id: 'sesion-2',
    fecha: '2026-08-10',
    horaInicio: '10:30',
    horaFin: '11:30',
    tipo: '1-2',
    entrenadorId: 'coach-1',
    jugadoresIds: ['jug-2', 'jug-6'],
    estado: 'pagada', // Verde
    notas: 'Duelo 1vs1 y definición rápida con ambas piernas.'
  },
  {
    id: 'sesion-3',
    fecha: '2026-08-11',
    horaInicio: '09:00',
    horaFin: '10:00',
    tipo: '1-3',
    entrenadorId: 'coach-2',
    jugadoresIds: ['jug-3', 'jug-5', 'jug-1'],
    estado: 'sin_confirmar', // Blanco
    notas: 'Trabajo físico táctico y transiciones rápidas.'
  },
  {
    id: 'sesion-4',
    fecha: '2026-08-12',
    horaInicio: '14:00',
    horaFin: '15:00',
    tipo: '1-1',
    entrenadorId: 'coach-3',
    jugadoresIds: ['jug-4'],
    estado: 'realizada', // Naranja
    notas: 'Entrenamiento específico de bloqueos y achique para portero.'
  }
];

export const STATUS_CONFIG = {
  sin_confirmar: {
    label: 'Sin Confirmar',
    colorName: 'Blanco',
    badgeClass: 'badge-white',
    colorHex: '#FFFFFF',
    bgLight: 'rgba(255, 255, 255, 0.06)'
  },
  confirmada: {
    label: 'Confirmada',
    colorName: 'Amarillo',
    badgeClass: 'badge-gold',
    colorHex: '#FBBF24',
    bgLight: 'rgba(245, 158, 11, 0.08)'
  },
  realizada: {
    label: 'Realizada',
    colorName: 'Naranja',
    badgeClass: 'badge-orange',
    colorHex: '#FB923C',
    bgLight: 'rgba(249, 115, 22, 0.08)'
  },
  pagada: {
    label: 'Pagada',
    colorName: 'Verde',
    badgeClass: 'badge-emerald',
    colorHex: '#34D399',
    bgLight: 'rgba(16, 185, 129, 0.08)'
  },
  cancelada: {
    label: 'Cancelada',
    colorName: 'Rojo',
    badgeClass: 'badge-danger',
    colorHex: '#F87171',
    bgLight: 'rgba(239, 68, 68, 0.06)'
  }
};
