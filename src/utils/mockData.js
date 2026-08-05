// Initial data configuration - Empty defaults for clean production start (desde cero)

export const MASTER_ADMIN_EMAIL = 'admin@parlasport.com';

export const INITIAL_PLAYERS = [];

export const INITIAL_COACHES = [];

// Estados basados en el Drive de la Academia:
// 'sin_confirmar' (Blanco), 'confirmada' (Amarillo), 'realizada' (Naranja), 'pagada' (Verde), 'cancelada' (Rojo)
export const INITIAL_SESSIONS = [];

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
    badgeClass: 'badge-red',
    colorHex: '#F87171',
    bgLight: 'rgba(239, 68, 68, 0.08)'
  }
};
