import React, { useState } from 'react';
import { Phone, Award, User, MessageSquare, Send, Sparkles } from 'lucide-react';
import { STATUS_CONFIG } from '../../utils/mockData';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatTo12Hour } from '../../utils/scheduling';
import { showToast } from '../common/ToastNotification';
import Modal from '../common/Modal';

const SessionDetailModal = ({ isOpen, onClose, session, players = [], coach }) => {
  const { updateSessionStatus, addPlayerObservation } = useData();
  const { role, currentUser } = useAuth();

  // Notas de observación temporal escritas por el profesor en esta sesión por cada jugador
  const [playerNotes, setPlayerNotes] = useState({});
  const [savingPlayerId, setSavingPlayerId] = useState(null);
  const [submittingStatus, setSubmittingStatus] = useState(false);

  if (!session) return null;

  const currentStatusCfg = STATUS_CONFIG[session.estado] || STATUS_CONFIG.sin_confirmar;
  const currentCoachName = coach?.nombre || currentUser?.nombre || 'Entrenador';

  const handleNoteChange = (playerId, text) => {
    setPlayerNotes(prev => ({
      ...prev,
      [playerId]: text
    }));
  };

  const handleSavePlayerObservation = async (player) => {
    const noteText = (playerNotes[player.id] || '').trim();
    if (!noteText) {
      showToast('Observación Vacía', 'Escribe una observación técnica antes de guardar.', 'warning');
      return;
    }

    setSavingPlayerId(player.id);
    try {
      await addPlayerObservation(player.id, {
        texto: noteText,
        autorNombre: currentCoachName,
        autorId: currentUser?.uid || coach?.id || '',
        sessionId: session.id,
        fecha: session.fecha
      });

      // Limpiar el campo para ese jugador
      setPlayerNotes(prev => ({
        ...prev,
        [player.id]: ''
      }));

      showToast(
        'Observación Registrada',
        `Nota técnica guardada en la ficha de ${player.nombre}. Visible para todo el cuerpo técnico.`,
        'success',
        4000
      );
    } catch (err) {
      showToast('Error', err.message || 'No se pudo guardar la observación.', 'error');
    } finally {
      setSavingPlayerId(null);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setSubmittingStatus(true);
    try {
      // Si el profesor está finalizando la sesión y tiene notas escritas pendientes, guardarlas automáticamente
      if (newStatus === 'realizada') {
        for (const player of players) {
          const pendingText = (playerNotes[player.id] || '').trim();
          if (pendingText) {
            await addPlayerObservation(player.id, {
              texto: pendingText,
              autorNombre: currentCoachName,
              autorId: currentUser?.uid || coach?.id || '',
              sessionId: session.id,
              fecha: session.fecha
            });
          }
        }
      }

      await updateSessionStatus(session.id, newStatus, role || 'coach');

      if (newStatus === 'realizada') {
        showToast(
          '¡Entrenamiento Finalizado!',
          'Se ha registrado la sesión y se han guardado las observaciones de los jugadores.',
          'success',
          5000
        );
        onClose();
      } else {
        showToast(
          'Estado Actualizado',
          `Sesión actualizada a ${newStatus}.`,
          'info',
          3000
        );
      }
    } catch (err) {
      showToast('Error al actualizar', err.message || 'Error al actualizar el estado de la sesión.', 'error');
    } finally {
      setSubmittingStatus(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalle de Sesión (${session.tipo}) - ${session.fecha}`}
      widthPx="860px"
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
              👤 {coach ? coach.nombre : (session.entrenadorNombre || 'Profesor')}
            </div>
          </div>

          <span className={`badge ${currentStatusCfg.badgeClass}`} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            {currentStatusCfg.label}
          </span>
        </div>

        {/* CONTROLES DE ESTADO SEGÚN ROL */}
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '8px' }}>
            Gestión del Estado de la Clase:
          </h4>

          {role === 'coach' ? (
            /* Vista y Acciones Exclusivas del Entrenador */
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
                  disabled={submittingStatus}
                  onClick={() => handleStatusChange('realizada')}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: submittingStatus ? 'not-allowed' : 'pointer',
                    opacity: submittingStatus ? 0.7 : 1,
                    boxShadow: '0 4px 15px rgba(249, 115, 22, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Award size={18} /> {submittingStatus ? 'Finalizando...' : '🟠 Finalizar Sesión y Guardar Observaciones'}
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
                disabled={session.estado === 'realizada' || session.estado === 'pagada'}
                title={(session.estado === 'realizada' || session.estado === 'pagada') ? 'La clase ya fue finalizada por el profesor, no puede cancelarse' : 'Cancelar clase'}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: session.estado === 'cancelada' ? '2px solid #F87171' : '1px solid rgba(239,68,68,0.3)',
                  background: session.estado === 'cancelada' ? 'rgba(239,68,68,0.25)' : 'rgba(15,23,42,0.8)',
                  color: '#F87171',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: (session.estado === 'realizada' || session.estado === 'pagada') ? 'not-allowed' : 'pointer',
                  opacity: (session.estado === 'realizada' || session.estado === 'pagada') ? 0.45 : 1
                }}
              >
                🔴 Cancelada {(session.estado === 'realizada' || session.estado === 'pagada') ? '(Bloqueada)' : ''}
              </button>
            </div>
          )}
        </div>

        {session.notas && (
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', color: '#CBD5E1' }}>
            <strong>Notas Generales del Entrenamiento:</strong> "{session.notas}"
          </div>
        )}

        {/* ─── FICHAS TÉCNICAS Y PANEL DE OBSERVACIONES POR JUGADOR ─── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={18} color="#F59E0B" /> Fichas Técnicas y Observaciones de los Jugadores ({players.length})
            </h4>
            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
              💡 Las observaciones se guardan en el expediente del jugador y son visibles para otros entrenadores.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {players.map(player => {
              const history = Array.isArray(player.historialObservaciones) ? player.historialObservaciones : [];

              return (
                <div
                  key={player.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '14px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  {/* Encabezado del Jugador */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
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
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#F8FAFC' }}>{player.nombre}</div>
                        <div style={{ display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center' }}>
                          <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>{player.posicion}</span>
                          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>• {player.edad} Años</span>
                          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>• Pierna: {player.piernaHabil}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15, 23, 42, 0.6)', padding: '6px 12px', borderRadius: '8px' }}>
                      <Phone size={13} color="#10B981" /> Contacto Tutor: <strong>{player.contactoTutor || 'No registrado'}</strong>
                    </div>
                  </div>

                  {/* Historial de Observaciones Previas de otros Entrenadores */}
                  <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FBBF24', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={14} /> Observaciones Técnicas Registradas:
                    </div>

                    {history.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                        {history.map(obs => (
                          <div
                            key={obs.id}
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                              borderLeft: '3px solid #3B82F6',
                              padding: '8px 10px',
                              borderRadius: '0 8px 8px 0',
                              fontSize: '0.8rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94A3B8', fontSize: '0.72rem', marginBottom: '3px' }}>
                              <span style={{ color: '#60A5FA', fontWeight: 700 }}>👤 {obs.autorNombre || 'Entrenador'}</span>
                              <span>📅 {obs.fecha}</span>
                            </div>
                            <div style={{ color: '#F8FAFC', fontStyle: 'italic', lineHeight: '1.4' }}>
                              "{obs.texto}"
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.8rem', color: '#CBD5E1', margin: 0, fontStyle: 'italic' }}>
                        "{player.observacionesTecnicas || 'Sin observaciones previas registradas para este jugador.'}"
                      </p>
                    )}
                  </div>

                  {/* Panel para que el entrenador en turno agregue observaciones de la sesión */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label className="input-label" style={{ fontSize: '0.78rem', color: '#34D399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={14} /> Añadir Observación Técnica / Progreso en esta Sesión:
                    </label>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <textarea
                        rows={2}
                        className="input-field"
                        placeholder={`Aspectos trabajados con ${player.nombre}, fortalezas, visión de juego o recomendaciones para el próximo profesor...`}
                        value={playerNotes[player.id] || ''}
                        onChange={(e) => handleNoteChange(player.id, e.target.value)}
                        style={{ flex: 1, fontSize: '0.82rem', padding: '8px 12px' }}
                      />

                      <button
                        type="button"
                        className="btn-secondary"
                        disabled={savingPlayerId === player.id || !(playerNotes[player.id] || '').trim()}
                        onClick={() => handleSavePlayerObservation(player)}
                        style={{
                          padding: '10px 14px',
                          color: '#34D399',
                          borderColor: 'rgba(16, 185, 129, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          height: 'auto',
                          alignSelf: 'stretch'
                        }}
                        title="Guardar observación en la ficha técnica del jugador"
                      >
                        <Send size={14} /> {savingPlayerId === player.id ? 'Guardando...' : 'Guardar Nota'}
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
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
