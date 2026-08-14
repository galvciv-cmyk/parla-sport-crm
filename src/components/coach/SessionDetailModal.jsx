import React from 'react';
import { Phone, Award, User } from 'lucide-react';
import { STATUS_CONFIG } from '../../utils/mockData';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatTo12Hour } from '../../utils/scheduling';
import Modal from '../common/Modal';

const SessionDetailModal = ({ isOpen, onClose, session, players, coach }) => {
  const { updateSessionStatus } = useData();
  const { role, isAdmin } = useAuth();
  if (!session) return null;

  const currentStatusCfg = STATUS_CONFIG[session.estado] || STATUS_CONFIG.sin_confirmar;

  const handleStatusChange = async (newStatus) => {
    try {
      await updateSessionStatus(session.id, newStatus, role || 'coach');
    } catch (err) {
      alert(err.message || 'Error al actualizar el estado.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalle de Sesión (${session.tipo}) - ${session.fecha}`}
      widthPx="800px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Banner de Info General y Estado */}
        <div style={{
          background: currentStatusCfg.bgLight,
          border: `1px solid ${currentStatusCfg.colorHex}40`,
          borderLeft: `6px solid ${currentStatusCfg.colorHex}`,
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Horario Programado:</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC' }}>
              ⏰ {formatTo12Hour(session.horaInicio)} a {formatTo12Hour(session.horaFin)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Entrenador Asignado:</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F8FAFC' }}>
              👤 {coach ? coach.nombre : 'Profesor'}
            </div>
          </div>

          <span className={`badge ${currentStatusCfg.badgeClass}`} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            {currentStatusCfg.label} ({currentStatusCfg.colorName})
          </span>
        </div>

        {/* CONTROLES DE ESTADO POR ROL ESTRICTO */}
        <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: '10px' }}>
            Acciones de Estado ({isAdmin ? 'Perfil Administrador' : 'Perfil Entrenador'}):
          </span>

          {!isAdmin ? (
            /* Vista y Acción Exclusiva del Entrenador */
            <div>
              {session.estado === 'realizada' ? (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  color: '#34D399',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ✅ Has marcado este entrenamiento como Finalizado / Realizado. Pendiente por cierre administrativo.
                </div>
              ) : session.estado === 'pagada' ? (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  color: '#34D399',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  🟢 Clase Finalizada y Pagada.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStatusChange('realizada')}
                  style={{
                    width: '100%',
                    padding: '12px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(249, 115, 22, 0.35)'
                  }}
                >
                  🟠 Marcar Clase como Finalizada / Realizada
                </button>
              )}
            </div>
          ) : (
            /* Vista y Acciones Exclusivas del Administrador */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(110px, 100%), 1fr))', gap: '8px' }}>
              <button
                onClick={() => handleStatusChange('sin_confirmar')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: session.estado === 'sin_confirmar' ? '2px solid #FFF' : '1px solid rgba(255,255,255,0.2)',
                  background: session.estado === 'sin_confirmar' ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.8)',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                ⚪ Sin Confirmar
              </button>

              <button
                onClick={() => handleStatusChange('confirmada')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: session.estado === 'confirmada' ? '2px solid #FBBF24' : '1px solid rgba(245,158,11,0.3)',
                  background: session.estado === 'confirmada' ? 'rgba(245,158,11,0.25)' : 'rgba(15,23,42,0.8)',
                  color: '#FBBF24',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                🟡 Confirmada
              </button>

              <button
                onClick={() => handleStatusChange('pagada')}
                disabled={session.estado !== 'realizada'}
                title={session.estado !== 'realizada' ? 'El entrenador debe marcar la sesión como realizada antes de ser pagada' : 'Registrar Pago de la Clase'}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: session.estado === 'pagada' ? '2px solid #34D399' : '1px solid rgba(16,185,129,0.3)',
                  background: session.estado === 'pagada' ? 'rgba(16,185,129,0.25)' : 'rgba(15,23,42,0.8)',
                  color: '#34D399',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: session.estado !== 'realizada' ? 'not-allowed' : 'pointer',
                  opacity: session.estado !== 'realizada' ? 0.45 : 1
                }}
              >
                🟢 Pagada {session.estado !== 'realizada' ? '(Requiere realizada)' : ''}
              </button>

              <button
                onClick={() => handleStatusChange('cancelada')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: session.estado === 'cancelada' ? '2px solid #F87171' : '1px solid rgba(239,68,68,0.3)',
                  background: session.estado === 'cancelada' ? 'rgba(239,68,68,0.25)' : 'rgba(15,23,42,0.8)',
                  color: '#F87171',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                🔴 Cancelada
              </button>
            </div>
          )}
        </div>

        {session.notas && (
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', color: '#CBD5E1' }}>
            <strong>Notas del Entrenamiento:</strong> "{session.notas}"
          </div>
        )}

        {/* FICHAS TÉCNICAS DE LOS JUGADORES ASIGNADOS */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={18} color="#F59E0B" /> Fichas Técnicas de los Jugadores ({players.length})
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '14px' }}>
            {players.map(player => (
              <div
                key={player.id}
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {player.foto ? (
                    <img
                      src={player.foto}
                      alt={player.nombre}
                      style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', border: '2px solid #10B981' }}
                    />
                  ) : (
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '12px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '2px solid #10B981',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <User size={24} color="#34D399" />
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#F8FAFC' }}>{player.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>
                      {player.posicion} • {player.edad} Años
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: '#CBD5E1', background: 'rgba(15, 23, 42, 0.7)', padding: '8px 10px', borderRadius: '8px' }}>
                  <div><strong>Pierna Hábil:</strong> {player.piernaHabil}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', color: '#94A3B8' }}>
                    <Phone size={12} /> {player.contactoTutor || 'No registrado'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8' }}>
                    Observaciones Técnicas:
                  </span>
                  <p style={{ fontSize: '0.78rem', color: '#CBD5E1', marginTop: '4px', lineHeight: '1.4', fontStyle: 'italic' }}>
                    "{player.observacionesTecnicas || 'Sin observaciones aún.'}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button className="btn-secondary" onClick={onClose}>
            Cerrar Ficha
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default SessionDetailModal;
