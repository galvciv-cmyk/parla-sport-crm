import React from 'react';
import { Check } from 'lucide-react';
import { FIELD_POSITIONS, getBadgeColorByZone } from '../../utils/fieldPositions';

const FieldPositionSelector = ({
  selectedPositions = [],
  onChange,
  readOnly = false,
  compact = false
}) => {
  const currentSelections = Array.isArray(selectedPositions) ? selectedPositions : [];

  const handleToggle = (posId) => {
    if (readOnly || !onChange) return;
    const cleanCurrent = currentSelections.flatMap(id => id === 'DFC' ? ['DFCI', 'DFCD'] : id);
    const isAlready = cleanCurrent.includes(posId);
    let nextList;
    if (isAlready) {
      nextList = cleanCurrent.filter(id => id !== posId);
    } else {
      nextList = [...cleanCurrent, posId];
    }
    onChange(nextList);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {/* Cancha Táctica de Fútbol (Mitad de Campo) */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: compact ? '320px' : '440px',
        margin: '0 auto',
        height: compact ? '260px' : '320px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 90%, #064e3b 0%, #032d23 60%, #021a14 100%)',
        border: '2px solid rgba(16, 185, 129, 0.35)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5), inset 0 0 40px rgba(0, 0, 0, 0.6)',
        userSelect: 'none'
      }}>
        {/* Franjas sutiles de césped cortado */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 40px, transparent 40px, transparent 80px)',
          pointerEvents: 'none'
        }} />

        {/* ─── Líneas Reglamentarias de la Cancha ─── */}
        {/* Borde exterior */}
        <div style={{
          position: 'absolute',
          inset: '10px',
          border: '1.5px solid rgba(255, 255, 255, 0.25)',
          borderBottom: '2px solid rgba(255, 255, 255, 0.4)',
          borderRadius: '4px',
          pointerEvents: 'none'
        }} />

        {/* Línea de Medio Campo (Arriba) */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          right: '10px',
          height: '2px',
          background: 'rgba(255, 255, 255, 0.4)',
          pointerEvents: 'none'
        }} />

        {/* Semicírculo Central (Arriba) */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80px',
          height: '40px',
          border: '1.5px solid rgba(255, 255, 255, 0.25)',
          borderTop: 'none',
          borderBottomLeftRadius: '40px',
          borderBottomRightRadius: '40px',
          pointerEvents: 'none'
        }} />

        {/* Área Grande (Abajo) */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60%',
          height: '70px',
          border: '1.5px solid rgba(255, 255, 255, 0.25)',
          borderBottom: 'none',
          pointerEvents: 'none'
        }} />

        {/* Área Chica (Abajo) */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '32%',
          height: '32px',
          border: '1.5px solid rgba(255, 255, 255, 0.25)',
          borderBottom: 'none',
          pointerEvents: 'none'
        }} />

        {/* Punto de Penal */}
        <div style={{
          position: 'absolute',
          bottom: '52px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.4)',
          pointerEvents: 'none'
        }} />

        {/* Media Luna del Área Penal */}
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '54px',
          height: '24px',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          borderBottom: 'none',
          borderTopLeftRadius: '30px',
          borderTopRightRadius: '30px',
          pointerEvents: 'none'
        }} />

        {/* Meta / Arco */}
        <div style={{
          position: 'absolute',
          bottom: '5px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '24%',
          height: '6px',
          border: '1.5px solid rgba(255, 255, 255, 0.6)',
          borderRadius: '2px 2px 0 0',
          background: 'rgba(255, 255, 255, 0.1)',
          pointerEvents: 'none'
        }} />

        {/* ─── Botones Circulares de Posiciones Tácticas ─── */}
        {FIELD_POSITIONS.map((pos) => {
          const isSelected = currentSelections.includes(pos.id) || (currentSelections.includes('DFC') && (pos.id === 'DFCI' || pos.id === 'DFCD'));
          const color = getBadgeColorByZone(pos.zone);
          const btnSize = compact ? 30 : 36;

          return (
            <button
              key={pos.id}
              type="button"
              disabled={readOnly}
              onClick={() => handleToggle(pos.id)}
              title={`${pos.label} (${pos.category})`}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.12)' : 'scale(1)'}`,
                width: `${btnSize}px`,
                height: `${btnSize}px`,
                borderRadius: '50%',
                border: isSelected ? `2px solid ${color.border}` : '1.5px solid rgba(255, 255, 255, 0.25)',
                background: isSelected ? color.bg : 'rgba(15, 23, 42, 0.85)',
                boxShadow: isSelected
                  ? `0 0 14px ${color.glow}, inset 0 0 6px ${color.glow}`
                  : '0 2px 6px rgba(0,0,0,0.5)',
                color: isSelected ? color.text : '#E2E8F0',
                fontWeight: 800,
                fontSize: compact ? '0.62rem' : '0.72rem',
                cursor: readOnly ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: isSelected ? 10 : 2,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: 0
              }}
              onMouseOver={(e) => {
                if (!readOnly && !isSelected) {
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                  e.currentTarget.style.background = 'rgba(30, 41, 59, 0.95)';
                }
              }}
              onMouseOut={(e) => {
                if (!readOnly && !isSelected) {
                  e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.background = 'rgba(15, 23, 42, 0.85)';
                }
              }}
            >
              {pos.shortLabel}

              {/* Indicador de check pequeño cuando está seleccionado */}
              {isSelected && !compact && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '13px',
                  height: '13px',
                  borderRadius: '50%',
                  background: color.border,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0F172A'
                }}>
                  <Check size={9} strokeWidth={3.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Resumen de Posiciones Seleccionadas ─── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        minHeight: '28px'
      }}>
        {currentSelections.length === 0 ? (
          <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic' }}>
            {readOnly ? 'Sin posiciones asignadas en cancha' : 'Haz clic en los círculos de la cancha para asignar una o más posiciones'}
          </span>
        ) : (
          currentSelections.map(posId => {
            const p = FIELD_POSITIONS.find(item => item.id === posId) || (posId === 'DFC' ? { id: 'DFC', shortLabel: 'DFC', label: 'Defensa Central', zone: 'defense' } : null);
            if (!p) return null;
            const color = getBadgeColorByZone(p.zone);

            return (
              <span
                key={posId}
                onClick={() => !readOnly && handleToggle(posId)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: color.bg,
                  border: `1px solid ${color.border}`,
                  color: color.text,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: readOnly ? 'default' : 'pointer'
                }}
                title={readOnly ? p.label : 'Clic para remover'}
              >
                <strong>{p.shortLabel}</strong> • {p.label}
                {!readOnly && (
                  <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '2px' }}>×</span>
                )}
              </span>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FieldPositionSelector;
