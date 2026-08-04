import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Eye, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { STATUS_CONFIG } from '../../utils/mockData';
import SessionDetailModal from './SessionDetailModal';

const CoachCalendar = () => {
  const { activeCoachId } = useAuth();
  const { coaches, sessions, players } = useData();

  const activeCoach = coaches.find(c => c.id === activeCoachId) || coaches[0];
  const coachSessions = sessions.filter(s => s.entrenadorId === activeCoachId && s.estado !== 'cancelada');

  const [selectedSession, setSelectedSession] = useState(null);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Perfil del Entrenador Activo */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src={activeCoach.foto || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300'}
            alt={activeCoach.nombre}
            style={{ width: '64px', height: '64px', borderRadius: '18px', objectFit: 'cover', border: '3px solid #3B82F6' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F8FAFC' }}>
                {activeCoach.nombre}
              </h2>
              <span className="badge badge-blue">Mi Calendario</span>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '2px' }}>
              {activeCoach.especialidad} • {activeCoach.email}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '10px 16px', borderRadius: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60A5FA' }}>{coachSessions.length}</span>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Sesiones Asignadas</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarIcon size={20} color="#3B82F6" /> Calendario Individual de Entrenamientos
        </h3>
        <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontStyle: 'italic' }}>
          💡 Clic en cualquier sesión para ver Fichas Técnicas y actualizar estado.
        </span>
      </div>

      {/* Grid de Tarjetas de Sesión Interactivas con Código de Colores */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {coachSessions.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
            <Sparkles size={32} color="#64748B" style={{ margin: '0 auto 10px' }} />
            <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>
              No tienes sesiones agendadas actualmente para tu perfil.
            </p>
          </div>
        ) : (
          coachSessions.map(session => {
            const assignedPlayers = players.filter(p => session.jugadoresIds?.includes(p.id));
            const statusCfg = STATUS_CONFIG[session.estado] || STATUS_CONFIG.sin_confirmar;

            return (
              <div
                key={session.id}
                className="glass-card pulse-glow"
                onClick={() => setSelectedSession(session)}
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  cursor: 'pointer',
                  background: statusCfg.bgLight,
                  border: `1px solid ${statusCfg.colorHex}40`,
                  borderLeft: `5px solid ${statusCfg.colorHex}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge badge-emerald">{session.tipo} Personalizado</span>
                  <span className={`badge ${statusCfg.badgeClass}`}>
                    {statusCfg.label}
                  </span>
                </div>

                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} color={statusCfg.colorHex} /> {session.horaInicio} - {session.horaFin}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '2px' }}>
                    📅 {session.fecha}
                  </div>
                </div>

                {/* Resumen de Jugadores */}
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Jugadores Asignados ({assignedPlayers.length}):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {assignedPlayers.map(p => (
                      <span key={p.id} style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34D399',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 600
                      }}>
                        ⚽ {p.nombre} ({p.posicion})
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', color: statusCfg.colorHex, fontSize: '0.8rem', fontWeight: 700, marginTop: 'auto' }}>
                  <Eye size={16} /> Ver Ficha Técnica →
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal con Fichas Técnicas completas y actualizador de estado */}
      <SessionDetailModal
        isOpen={Boolean(selectedSession)}
        onClose={() => setSelectedSession(null)}
        session={selectedSession}
        players={selectedSession ? players.filter(p => selectedSession.jugadoresIds?.includes(p.id)) : []}
        coach={activeCoach}
      />

    </div>
  );
};

export default CoachCalendar;
