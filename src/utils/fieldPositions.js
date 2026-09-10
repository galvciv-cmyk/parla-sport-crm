export const FIELD_POSITIONS = [
  // Delantera (Ataque - cerca del medio campo)
  { id: 'EI',  label: 'Extremo Izquierdo',        shortLabel: 'EI',  category: 'Delantero',    zone: 'attack',     x: 20, y: 16 },
  { id: 'DC',  label: 'Delantero Centro',         shortLabel: 'DC',  category: 'Delantero',    zone: 'attack',     x: 50, y: 12 },
  { id: 'ED',  label: 'Extremo Derecho',          shortLabel: 'ED',  category: 'Delantero',    zone: 'attack',     x: 80, y: 16 },

  // Mediocampo (Eje central: MCO, MC, MCD)
  { id: 'MCO', label: 'Mediapunta (Ofensivo)',    shortLabel: 'MCO', category: 'Mediocampista', zone: 'midfield',   x: 50, y: 32 },
  { id: 'MC',  label: 'Mediocentro (Organizador)',shortLabel: 'MC',  category: 'Mediocampista', zone: 'midfield',   x: 50, y: 48 },
  { id: 'MCD', label: 'Mediocentro Defensivo',    shortLabel: 'MCD', category: 'Mediocampista', zone: 'midfield',   x: 50, y: 64 },

  // Línea Defensiva (Línea de 4)
  { id: 'LI',   label: 'Lateral Izquierdo',         shortLabel: 'LI',  category: 'Defensa',      zone: 'defense',    x: 18, y: 78 },
  { id: 'DFCI', label: 'Defensa Central (Izquierdo)', shortLabel: 'DFC', category: 'Defensa',      zone: 'defense',    x: 38, y: 80 },
  { id: 'DFCD', label: 'Defensa Central (Derecho)',   shortLabel: 'DFC', category: 'Defensa',      zone: 'defense',    x: 62, y: 80 },
  { id: 'LD',   label: 'Lateral Derecho',           shortLabel: 'LD',  category: 'Defensa',      zone: 'defense',    x: 82, y: 78 },

  // Portería
  { id: 'POR', label: 'Portero (Arquero)',        shortLabel: 'POR', category: 'Portero',      zone: 'goalkeeper', x: 50, y: 92 }
];

export const getCategoryForPositions = (posCodes = []) => {
  if (!posCodes || posCodes.length === 0) return 'Mediocampista';
  const categories = posCodes.map(id => {
    if (id === 'DFC') return 'Defensa';
    const item = FIELD_POSITIONS.find(p => p.id === id);
    return item ? item.category : 'Mediocampista';
  });
  const uniqueCats = [...new Set(categories)];
  if (uniqueCats.length === 1) return uniqueCats[0];
  return uniqueCats.join(' / ');
};

export const getBadgeColorByZone = (zone) => {
  switch (zone) {
    case 'goalkeeper':
      return { bg: 'rgba(245, 158, 11, 0.2)', border: '#F59E0B', text: '#FBBF24', glow: 'rgba(245, 158, 11, 0.45)' };
    case 'defense':
      return { bg: 'rgba(59, 130, 246, 0.2)', border: '#3B82F6', text: '#60A5FA', glow: 'rgba(59, 130, 246, 0.45)' };
    case 'midfield':
      return { bg: 'rgba(139, 92, 246, 0.2)', border: '#8B5CF6', text: '#A78BFA', glow: 'rgba(139, 92, 246, 0.45)' };
    case 'attack':
      return { bg: 'rgba(16, 185, 129, 0.2)', border: '#10B981', text: '#34D399', glow: 'rgba(16, 185, 129, 0.45)' };
    default:
      return { bg: 'rgba(148, 163, 184, 0.2)', border: '#94A3B8', text: '#CBD5E1', glow: 'rgba(148, 163, 184, 0.3)' };
  }
};
