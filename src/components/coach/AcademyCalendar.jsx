import React, { useState, useMemo } from 'react';
import { Shield, Clock, UserCheck, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatTo12Hour } from '../../utils/scheduling';
import { STATUS_CONFIG } from '../../utils/mockData';

// ─── Utilidades de Días y Semanas (Lunes a Domingo) ───
const getMondayOfCurrentWeek = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const formatDateYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DAY_NAMES_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const AcademyCalendar = () => {
  const { sessions, coaches, players } = useData();

  // Offset de semana: 0 = semana actual, -1 = semana anterior, 1 = semana siguiente
  const [weekOffset, setWeekOffset] = useState(0);

  // Calcular los 7 días de la semana (Lunes a Domingo)
  const weekDays = useMemo(() => {
    const monday = getMondayOfCurrentWeek();
    monday.setDate(monday.getDate() + weekOffset * 7);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = formatDateYMD(d);
      const dayName = DAY_NAMES_ES[i];
      const displayDate = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      days.push({ date: d, dateStr, dayName, displayDate });
    }
    return days;
  }, [weekOffset]);

  // Día seleccionado por defecto: el día de hoy (si está dentro de la semana) o el Lunes
  const todayStr = formatDateYMD(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(() => {
    return todayStr;
  });

  // Asegurar que si cambiamos de semana, el día seleccionado pertenezca a esa semana
  const activeSelectedDateStr = useMemo(() => {
    const exists = weekDays.some(d => d.dateStr === selectedDateStr);
    if (exists) return selectedDateStr;
    return weekDays[0].dateStr;
  }, [weekDays, selectedDateStr]);

  const selectedDayObj = weekDays.find(d => d.dateStr === activeSelectedDateStr) || weekDays[0];

  // Sesiones activas (no canceladas) para el día seleccionado
  const daySessions = useMemo(() => {
    return sessions
      .filter(s => s.estado !== 'cancelada' && s.fecha === activeSelectedDateStr)
      .sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''));
  }, [sessions, activeSelectedDateStr]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Encabezado */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={26} color="#10B981" /> Calendario General de la Academia
        </h2>
        <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '2px' }}>
          Consulta la programación y horarios de los demás profesores de Parla Sport día por día.
        </p>
      </div>

      {/* ─── Control de Semana (Corte semanal los Domingos) ─── */}
      <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
            onClick={() => setWeekOffset(prev => prev - 1)}
            title="Semana Anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>
            📅 Semana: {weekDays[0].displayDate} al {weekDays[6].displayDate} {weekDays[6].date.getFullYear()}
          </span>

          <button
            className="btn-secondary"
            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
            onClick={() => setWeekOffset(prev => prev + 1)}
            title="Semana Siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {weekOffset !== 0 && (
          <button
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
            onClick={() => {
              setWeekOffset(0);
              setSelectedDateStr(todayStr);
            }}
          >
            Volver a Semana Actual
          </button>
        )}
      </div>

      {/* ─── Selector de Días de la Semana (Lunes a Domingo) ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(110px, 100%), 1fr))',
        gap: '8px'
      }}>
        {weekDays.map(d => {
          const isSelected = d.dateStr === activeSelectedDateStr;
          const isToday = d.dateStr === todayStr;
          const sessionsCount = sessions.filter(s => s.estado !== 'cancelada' && s.fecha === d.dateStr).length;

          return (
            <button
              key={d.dateStr}
              type="button"
              onClick={() => setSelectedDateStr(d.dateStr)}
              style={{
                padding: '10px 8px',
                borderRadius: '12px',
                border: isSelected ? '2px solid #FBBF24' : '1px solid rgba(255, 255, 255, 0.1)',
                background: isSelected
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(15, 28, 63, 0.95))'
                  : 'rgba(15, 23, 42, 0.7)',
                color: isSelected ? '#FBBF24' : '#CBD5E1',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                boxShadow: isSelected ? '0 0 15px rgba(245, 158, 11, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800 }}>
                {d.dayName}
              </div>
              <div style={{ fontSize: '0.72rem', color: isSelected ? '#F8FAFC' : '#94A3B8' }}>
                {d.displayDate} {isToday && '(Hoy)'}
              </div>
              <span className={`badge ${isSelected ? 'badge-gold' : 'badge-blue'}`} style={{ fontSize: '0.65rem', padding: '2px 6px', marginTop: '2px' }}>
                {sessionsCount} {sessionsCount === 1 ? 'clase' : 'clases'}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Listado de Sesiones del Día Seleccionado ─── */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={20} color="#10B981" /> Sesiones del {selectedDayObj.dayName} ({selectedDayObj.displayDate})
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
            {daySessions.length} {daySessions.length === 1 ? 'entrenamiento programado' : 'entrenamientos programados'}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {daySessions.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#94A3B8', fontSize: '0.9rem' }}>
              <Sparkles size={28} color="#64748B" style={{ margin: '0 auto 8px' }} />
              No hay sesiones programadas para este {selectedDayObj.dayName.toLowerCase()}.
            </div>
          ) : (
            daySessions.map(session => {
              const coach = coaches.find(c => c.id === session.entrenadorId);
              const assignedPlayers = players.filter(p => session.jugadoresIds?.includes(p.id));
              const statusCfg = STATUS_CONFIG[session.estado] || STATUS_CONFIG.sin_confirmar;

              return (
                <div
                  key={session.id}
                  style={{
                    background: statusCfg.bgLight,
                    border: `1px solid ${statusCfg.colorHex}40`,
                    borderLeft: `5px solid ${statusCfg.colorHex}`,
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge badge-emerald">{session.tipo}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F8FAFC' }}>
                        ⏰ {formatTo12Hour(session.horaInicio)} a {formatTo12Hour(session.horaFin)}
                      </span>
                      <span className={`badge ${statusCfg.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                        {statusCfg.label}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.85rem', color: '#60A5FA', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <UserCheck size={16} /> Profesor: {coach ? coach.nombre : session.entrenadorNombre || 'Profesor'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>
                    <strong>Jugadores ({assignedPlayers.length}):</strong> {assignedPlayers.map(p => `${p.nombre} (${p.posicion})`).join(' • ')}
                  </div>

                  {session.notas && (
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontStyle: 'italic' }}>
                      "{session.notas}"
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
};

export default AcademyCalendar;
