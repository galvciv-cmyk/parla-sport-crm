import React, { useState } from 'react';
import { CalendarPlus, RefreshCw, CheckCircle, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import {
  getAvailableCoaches,
  getSpanishDayName,
  formatTo12Hour,
  addOneHour,
  generateTimeOptions,
  hasPlayerSessionConflict,
  hasPlayerDailySession
} from '../../utils/scheduling';
import { STATUS_CONFIG } from '../../utils/mockData';
import Modal from '../common/Modal';

const SessionScheduler = () => {
  const { players, coaches, sessions, createSession, updateSessionStatus, deleteSession, reassignSession } = useData();

  // Estado de Confirmación de Eliminación (Modal de la App)
  const [sessionToDelete, setSessionToDelete] = useState(null);

  // Estado del Formulario de Creación
  const [sessionData, setSessionData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    horaInicio: '09:00',
    horaFin: '10:00',
    tipo: '1-1',
    entrenadorId: '',
    jugadoresIds: [],
    estado: 'sin_confirmar', // Blanco por defecto
    notas: ''
  });

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const timeOptions = generateTimeOptions(15);

  const handleDateChange = (newDate) => {
    setSessionData(prev => {
      // Filtrar jugadores que ya tengan sesión en la nueva fecha
      const validJugadores = prev.jugadoresIds.filter(
        pId => !hasPlayerDailySession(sessions, pId, newDate).hasSession
      );
      return {
        ...prev,
        fecha: newDate,
        entrenadorId: '',
        jugadoresIds: validJugadores
      };
    });
  };

  const handleHoraInicioChange = (newHoraInicio) => {
    const newHoraFin = addOneHour(newHoraInicio);
    setSessionData(prev => ({
      ...prev,
      horaInicio: newHoraInicio,
      horaFin: newHoraFin,
      entrenadorId: ''
    }));
  };

  const handleHoraFinChange = (newHoraFin) => {
    setSessionData(prev => ({
      ...prev,
      horaFin: newHoraFin,
      entrenadorId: ''
    }));
  };

  // Reasignación Modal
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedSessionToReassign, setSelectedSessionToReassign] = useState(null);
  const [newCoachId, setNewCoachId] = useState('');
  const [absenceReason, setAbsenceReason] = useState('');

  // Obtener entrenadores estrictamente disponibles para la fecha/hora seleccionada
  const availableCoachesForForm = getAvailableCoaches(
    coaches,
    sessions,
    sessionData.fecha,
    sessionData.horaInicio,
    sessionData.horaFin
  );

  // Obtener entrenadores disponibles para la reasignación
  const availableCoachesForReassign = selectedSessionToReassign
    ? getAvailableCoaches(
        coaches,
        sessions,
        selectedSessionToReassign.fecha,
        selectedSessionToReassign.horaInicio,
        selectedSessionToReassign.horaFin,
        selectedSessionToReassign.id
      ).filter(c => c.id !== selectedSessionToReassign.entrenadorId)
    : [];

  const handlePlayerToggle = (pId) => {
    const maxAllowed = sessionData.tipo === '1-1' ? 1 : sessionData.tipo === '1-2' ? 2 : 3;

    if (sessionData.jugadoresIds.includes(pId)) {
      setSessionData(prev => ({
        ...prev,
        jugadoresIds: prev.jugadoresIds.filter(id => id !== pId)
      }));
    } else {
      if (sessionData.jugadoresIds.length >= maxAllowed) {
        alert(`Para el formato ${sessionData.tipo} solo puedes seleccionar máximo ${maxAllowed} jugador(es).`);
        return;
      }
      setSessionData(prev => ({
        ...prev,
        jugadoresIds: [...prev.jugadoresIds, pId]
      }));
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const maxNeeded = sessionData.tipo === '1-1' ? 1 : sessionData.tipo === '1-2' ? 2 : 3;
    if (sessionData.jugadoresIds.length !== maxNeeded) {
      setErrorMessage(`Para la modalidad ${sessionData.tipo} debes seleccionar exactamente ${maxNeeded} jugador(es).`);
      return;
    }

    // Validación estricta: Máximo 1 sesión diaria por jugador
    for (const pId of sessionData.jugadoresIds) {
      const dailyCheck = hasPlayerDailySession(sessions, pId, sessionData.fecha);
      if (dailyCheck.hasSession) {
        const p = players.find(x => x.id === pId);
        const hora = dailyCheck.existingSession ? formatTo12Hour(dailyCheck.existingSession.horaInicio) : '';
        setErrorMessage(`El jugador ${p ? p.nombre : 'seleccionado'} ya tiene una sesión asignada el ${sessionData.fecha}${hora ? ` a las ${hora}` : ''}. Los jugadores solo pueden realizar 1 sesión diaria.`);
        return;
      }
    }

    if (!sessionData.entrenadorId) {
      setErrorMessage('Debes seleccionar un entrenador disponible del menú.');
      return;
    }

    try {
      await createSession(sessionData);
      setSuccessMessage('¡Sesión agendada exitosamente! Se han enviado las notificaciones.');
      
      // Reset
      setSessionData({
        fecha: new Date().toISOString().split('T')[0],
        horaInicio: '09:00',
        horaFin: '10:00',
        tipo: '1-1',
        entrenadorId: '',
        jugadoresIds: [],
        estado: 'sin_confirmar',
        notas: ''
      });
    } catch (err) {
      setErrorMessage(err.message || 'Error al agendar la sesión.');
    }
  };

  const handleOpenReassign = (sessionObj) => {
    setSelectedSessionToReassign(sessionObj);
    setNewCoachId('');
    setAbsenceReason('');
    setReassignModalOpen(true);
  };

  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!newCoachId) return;

    try {
      await reassignSession(selectedSessionToReassign.id, newCoachId, absenceReason);
      setReassignModalOpen(false);
      alert('Entrenador reasignado exitosamente. Se ha notificado al nuevo entrenador.');
    } catch (err) {
      alert(err.message || 'Error al reasignar entrenador.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarPlus size={26} color="#10B981" /> Agendamiento de Sesiones (Anti-Conflicto)
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '2px' }}>
            Agenda entrenamientos con verificación de disponibilidad de profesores y prevención de duplicados.
          </p>
        </div>
      </div>

      {/* Contenedor Principal: Formulario + Sesiones Existentes */}
      <div className="contenedor-padre">
        
        {/* FORMULARIO DE AGENDAMIENTO */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
            Nueva Sesión
          </h3>

          {errorMessage && (
            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#FCA5A5', fontSize: '0.85rem', marginBottom: '14px' }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {successMessage && (
            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34D399', fontSize: '0.85rem', marginBottom: '14px' }}>
              ✓ {successMessage}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Fecha y Día */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: '12px' }}>
              <div>
                <label className="input-label">Fecha de la Sesión</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={sessionData.fecha}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label">Día Detectado</label>
                <input
                  type="text"
                  readOnly
                  className="input-field"
                  style={{ color: '#10B981', fontWeight: 700 }}
                  value={getSpanishDayName(sessionData.fecha)}
                />
              </div>
            </div>

            {/* Horario inicio / fin en formato 12h (AM/PM) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: '12px' }}>
              <div>
                <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Hora Inicio</span>
                  <span style={{ color: '#10B981', fontWeight: 700, fontSize: '0.75rem' }}>
                    {formatTo12Hour(sessionData.horaInicio)}
                  </span>
                </label>
                <select
                  className="input-field"
                  value={sessionData.horaInicio}
                  onChange={(e) => handleHoraInicioChange(e.target.value)}
                >
                  {timeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Hora Fin (Auto +1h)</span>
                  <span style={{ color: '#10B981', fontWeight: 700, fontSize: '0.75rem' }}>
                    {formatTo12Hour(sessionData.horaFin)}
                  </span>
                </label>
                <select
                  className="input-field"
                  value={sessionData.horaFin}
                  onChange={(e) => handleHoraFinChange(e.target.value)}
                >
                  {timeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estado Inicial de la Sesión */}
            <div>
              <label className="input-label">Estado Inicial (Código de Colores)</label>
              <select
                className="input-field"
                value={sessionData.estado}
                onChange={(e) => setSessionData({ ...sessionData, estado: e.target.value })}
              >
                <option value="sin_confirmar">⚪ Blanco - Sin Confirmar</option>
                <option value="confirmada">🟡 Amarillo - Confirmado</option>
                <option value="realizada">🟠 Naranja - Realizada</option>
                <option value="pagada">🟢 Verde - Pagada</option>
              </select>
            </div>

            {/* Tipo de Formato 1-1, 1-2, 1-3 */}
            <div>
              <label className="input-label">Formato de Entrenamiento</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(80px, 100%), 1fr))', gap: '8px' }}>
                {['1-1', '1-2', '1-3'].map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setSessionData({ ...sessionData, tipo, jugadoresIds: [] })}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: sessionData.tipo === tipo ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.1)',
                      background: sessionData.tipo === tipo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15,23,42,0.6)',
                      color: sessionData.tipo === tipo ? '#34D399' : '#94A3B8',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '0.82rem'
                    }}
                  >
                    {tipo} Personal
                  </button>
                ))}
              </div>
            </div>

            {/* SELECCIÓN DE JUGADORES */}
            <div>
              <label className="input-label">
                Seleccionar Jugador(es) - Requeridos: {sessionData.tipo === '1-1' ? 1 : sessionData.tipo === '1-2' ? 2 : 3}
              </label>
              <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(15,23,42,0.6)', padding: '10px', borderRadius: '10px' }}>
                {players.map(p => {
                  const isSelected = sessionData.jugadoresIds.includes(p.id);
                  const dailyCheck = hasPlayerDailySession(sessions, p.id, sessionData.fecha);
                  const hasDailySession = dailyCheck.hasSession;

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (hasDailySession && !isSelected) {
                          const hora = dailyCheck.existingSession ? formatTo12Hour(dailyCheck.existingSession.horaInicio) : '';
                          alert(`⚠️ El jugador ${p.nombre} ya tiene una sesión agendada el ${sessionData.fecha}${hora ? ` a las ${hora}` : ''}.\n\nRegla: Los jugadores solo realizan máximo 1 sesión diaria. Cambia la fecha para agendarle otra clase.`);
                          return;
                        }
                        handlePlayerToggle(p.id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        background: isSelected
                          ? 'rgba(16, 185, 129, 0.15)'
                          : (hasDailySession ? 'rgba(239, 68, 68, 0.08)' : 'transparent'),
                        border: isSelected
                          ? '1px solid rgba(16, 185, 129, 0.45)'
                          : (hasDailySession ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid transparent'),
                        cursor: hasDailySession && !isSelected ? 'not-allowed' : 'pointer',
                        opacity: hasDailySession && !isSelected ? 0.55 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.85rem', color: isSelected ? '#F8FAFC' : (hasDailySession ? '#94A3B8' : '#CBD5E1'), fontWeight: isSelected ? 700 : 500 }}>
                          ⚽ {p.nombre} ({p.posicion})
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isSelected && <CheckCircle size={16} color="#10B981" />}
                        {hasDailySession && !isSelected && (
                          <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                            ⚠️ Ya tiene sesión hoy {dailyCheck.existingSession ? `(${formatTo12Hour(dailyCheck.existingSession.horaInicio)})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SELECCIÓN FILTRADA ESTRICTA DE ENTRENADOR */}
            <div>
              <label className="input-label" style={{ color: '#F59E0B' }}>
                Entrenadores Disponibles (Filtro Anti-Choque)
              </label>
              <select
                required
                className="input-field"
                style={{ borderColor: availableCoachesForForm.length > 0 ? '#10B981' : '#EF4444' }}
                value={sessionData.entrenadorId}
                onChange={(e) => setSessionData({ ...sessionData, entrenadorId: e.target.value })}
              >
                <option value="">
                  {availableCoachesForForm.length > 0
                    ? `-- Selecciona entre los ${availableCoachesForForm.length} disponibles --`
                    : '❌ Ningún entrenador disponible en este bloque'}
                </option>
                {availableCoachesForForm.map(c => (
                  <option key={c.id} value={c.id}>
                    👤 {c.nombre}{c.especialidad ? ` (${c.especialidad})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Notas u Objetivos Técnicos</label>
              <textarea
                rows="2"
                className="input-field"
                placeholder="Ej. Trabajar recepción orientada y finalización..."
                value={sessionData.notas}
                onChange={(e) => setSessionData({ ...sessionData, notas: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={availableCoachesForForm.length === 0}
              style={{ marginTop: '8px' }}
            >
              Confirmar y Programar Sesión
            </button>

          </form>
        </div>

        {/* Lista de Sesiones Programadas (con Selector de Estado y Reasignación) */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: '#F8FAFC' }}>
            Sesiones Agendadas ({sessions.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '580px' }}>
            {sessions.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '0.85rem' }}>No hay sesiones agendadas actualmente.</p>
            ) : (
              sessions.map(s => {
                const coachObj = coaches.find(c => c.id === s.entrenadorId);
                const sessionPlayers = players.filter(p => s.jugadoresIds?.includes(p.id));
                const statusCfg = STATUS_CONFIG[s.estado] || STATUS_CONFIG.sin_confirmar;

                return (
                  <div
                    key={s.id}
                    style={{
                      background: statusCfg.bgLight,
                      border: `1px solid ${statusCfg.colorHex}40`,
                      borderLeft: `5px solid ${statusCfg.colorHex}`,
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-emerald">{s.tipo}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F8FAFC' }}>
                          📅 {s.fecha} ({formatTo12Hour(s.horaInicio)} - {formatTo12Hour(s.horaFin)})
                        </span>
                      </div>

                      {/* Selector directo del estado (Código de Colores y Reglas de Rol) */}
                      <select
                        value={s.estado}
                        onChange={async (e) => {
                          try {
                            await updateSessionStatus(s.id, e.target.value, 'admin');
                          } catch (err) {
                            alert(err.message || 'Error al actualizar el estado.');
                          }
                        }}
                        className={`badge ${statusCfg.badgeClass}`}
                        style={{ cursor: 'pointer', outline: 'none', padding: '3px 8px' }}
                      >
                        <option value="sin_confirmar" style={{ color: '#000' }}>⚪ Sin Confirmar</option>
                        <option value="confirmada" style={{ color: '#000' }}>🟡 Confirmada</option>
                        {s.estado === 'realizada' && (
                          <option value="realizada" style={{ color: '#000' }}>🟠 Realizada (Por Entrenador)</option>
                        )}
                        <option
                          value="pagada"
                          disabled={s.estado !== 'realizada'}
                          style={{ color: s.estado === 'realizada' ? '#000' : '#888' }}
                        >
                          🟢 Pagada {s.estado !== 'realizada' ? '(Requiere estar realizada por el entrenador)' : ''}
                        </option>
                        <option
                          value="cancelada"
                          disabled={s.estado === 'realizada' || s.estado === 'pagada'}
                          style={{ color: (s.estado === 'realizada' || s.estado === 'pagada') ? '#888' : '#000' }}
                        >
                          🔴 Cancelada {(s.estado === 'realizada' || s.estado === 'pagada') ? '(Bloqueada: clase ya finalizada)' : ''}
                        </option>
                      </select>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>
                      <strong>Entrenador:</strong> {coachObj ? coachObj.nombre : 'No asignado'}
                    </div>

                    <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                      <strong>Jugadores ({sessionPlayers.length}):</strong>{' '}
                      {sessionPlayers.map(p => p.nombre).join(', ')}
                    </div>

                    {s.notas && (
                      <div style={{ fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic' }}>
                        "{s.notas}"
                      </div>
                    )}

                    {/* Acciones de Admin: Reasignación y Eliminar Sesión con Bloqueo de Protección */}
                    {s.estado === 'realizada' || s.estado === 'pagada' ? (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#34D399',
                        background: 'rgba(16, 185, 129, 0.12)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        🔒 Clase finalizada por el profesor. Lista para liquidación y cobro. No puede ser cancelada.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {s.estado !== 'cancelada' && (
                          <button
                            className="btn-secondary"
                            style={{ flex: 1, padding: '6px 10px', fontSize: '0.78rem', color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                            onClick={() => handleOpenReassign(s)}
                          >
                            <RefreshCw size={14} /> Reasignar Entrenador
                          </button>
                        )}

                        <button
                          className="btn-danger"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          onClick={() => setSessionToDelete(s)}
                          title="Eliminar esta sesión de la base de datos"
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Modal Reasignación de Entrenador por Ausencia */}
      <Modal
        isOpen={reassignModalOpen}
        onClose={() => setReassignModalOpen(false)}
        title="Reasignar Entrenador por Ausencia"
      >
        {selectedSessionToReassign && (
          <form onSubmit={handleReassignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '10px', fontSize: '0.85rem', color: '#FBBF24' }}>
              ⚠️ Reasignando sesión del <strong>{selectedSessionToReassign.fecha} ({formatTo12Hour(selectedSessionToReassign.horaInicio)} - {formatTo12Hour(selectedSessionToReassign.horaFin)})</strong>.
            </div>

            <div>
              <label className="input-label">Nuevo Entrenador Disponible</label>
              <select
                required
                className="input-field"
                value={newCoachId}
                onChange={(e) => setNewCoachId(e.target.value)}
              >
                <option value="">-- Selecciona nuevo profesor sin choque --</option>
                {availableCoachesForReassign.map(c => (
                  <option key={c.id} value={c.id}>
                    👤 {c.nombre} ({c.especialidad})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">Motivo de la Reasignación / Ausencia</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Entrenador indispuesto o ausente..."
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button type="button" className="btn-secondary" onClick={() => setReassignModalOpen(false)}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={availableCoachesForReassign.length === 0}
              >
                Confirmar Reasignación y Notificar
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de Confirmación de Eliminación de Sesión (Diseño de la App) */}
      <Modal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        title="🗑️ Eliminar Sesión Agendada"
      >
        {sessionToDelete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              padding: '14px',
              borderRadius: '12px',
              color: '#F87171',
              fontSize: '0.9rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <strong style={{ fontSize: '0.95rem' }}>⚠️ ¿Estás seguro de eliminar esta sesión?</strong>
              <span>
                Sesión de tipo <strong>{sessionToDelete.tipo}</strong> programada para el <strong>{sessionToDelete.fecha}</strong> ({formatTo12Hour(sessionToDelete.horaInicio)} - {formatTo12Hour(sessionToDelete.horaFin)}).
              </span>
              <span style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>
                Esta acción eliminará la clase de la aplicación y de la base de datos Firestore.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSessionToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                style={{ padding: '8px 16px', fontWeight: 700 }}
                onClick={async () => {
                  try {
                    await deleteSession(sessionToDelete.id);
                    setSessionToDelete(null);
                    setSuccessMessage('Sesión eliminada de la base de datos.');
                    setTimeout(() => setSuccessMessage(''), 3500);
                  } catch (err) {
                    setErrorMessage(err.message || 'Error al eliminar sesión.');
                    setSessionToDelete(null);
                  }
                }}
              >
                <Trash2 size={16} /> Confirmar Eliminación
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default SessionScheduler;
