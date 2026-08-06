import React from 'react';
import { Calendar as CalendarIcon, Clock, UserCheck, Shield } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatTo12Hour } from '../../utils/scheduling';

const AcademyCalendar = () => {
  const { sessions, coaches, players } = useData();
  const activeSessions = sessions.filter(s => s.estado !== 'cancelada');

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Encabezado */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={26} color="#10B981" /> Calendario General de la Academia
        </h2>
        <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '2px' }}>
          Vista global de todas las clases y sesiones programadas en Parla Sport CRM.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', color: '#F8FAFC' }}>
          Programación Completa ({activeSessions.length} Sesiones Activas)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {activeSessions.length === 0 ? (
            <p style={{ color: '#64748B', fontSize: '0.85rem' }}>No hay sesiones registradas actualmente.</p>
          ) : (
            activeSessions.map(session => {
              const coach = coaches.find(c => c.id === session.entrenadorId);
              const assignedPlayers = players.filter(p => session.jugadoresIds?.includes(p.id));

              return (
                <div
                  key={session.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
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
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F8FAFC' }}>
                        📅 {session.fecha} | ⏰ {formatTo12Hour(session.horaInicio)} - {formatTo12Hour(session.horaFin)}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.85rem', color: '#60A5FA', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <UserCheck size={16} /> Entrenador: {coach ? coach.nombre : 'Profesor'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>
                    <strong>Jugadores:</strong> {assignedPlayers.map(p => `${p.nombre} (${p.posicion})`).join(' • ')}
                  </div>
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
