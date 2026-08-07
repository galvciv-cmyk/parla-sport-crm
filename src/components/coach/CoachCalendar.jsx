import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock, Eye, Sparkles, Settings, Plus, Trash2, User, Edit3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { STATUS_CONFIG } from '../../utils/mockData';
import { formatTo12Hour } from '../../utils/scheduling';
import SessionDetailModal from './SessionDetailModal';
import Modal from '../common/Modal';

const DAYS_BUTTONS = [
  { code: 'L', name: 'Lunes' },
  { code: 'M', name: 'Martes' },
  { code: 'MI', name: 'Miércoles' },
  { code: 'J', name: 'Jueves' },
  { code: 'V', name: 'Viernes' },
  { code: 'S', name: 'Sábado' },
  { code: 'D', name: 'Domingo' }
];

const CoachCalendar = () => {
  const { activeCoachId, currentUser, updateUserProfileName } = useAuth();
  const { coaches, sessions, players, updateCoach } = useData();

  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [newCoachName, setNewCoachName] = useState('');

  const [selectedDays, setSelectedDays] = useState([]);
  const [timeRange, setTimeRange] = useState({ horaInicio: '08:00', horaFin: '12:00' });

  const coachEmail = (currentUser?.email || '').trim().toLowerCase();
  const userUid = currentUser?.uid || '';
  const userCoachId = activeCoachId || (userUid ? `coach-${userUid}` : '');

  // Buscar la ficha del entrenador en la colección global
  const activeCoach = coaches.find(c =>
    (c.id && userCoachId && c.id === userCoachId) ||
    (c.id && userUid && (c.id === userUid || c.id.includes(userUid))) ||
    (c.email && coachEmail && c.email.trim().toLowerCase() === coachEmail)
  );

  const coachName = (activeCoach?.nombre || currentUser?.nombre || '').trim().toLowerCase();

  // Algoritmo de filtrado de 4 capas para garantizar la máxima coincidencia
  const coachSessions = sessions.filter(s => {
    if (s.estado === 'cancelada') return false;

    // Capa 1: Coincidencia por ID de entrenador
    if (s.entrenadorId) {
      if (activeCoach?.id && s.entrenadorId === activeCoach.id) return true;
      if (userCoachId && s.entrenadorId === userCoachId) return true;
      if (userUid && (s.entrenadorId === userUid || s.entrenadorId.includes(userUid))) return true;
    }

    // Capa 2: Coincidencia por Email registrado en el documento de la sesión o del usuario
    if (coachEmail) {
      if (s.entrenadorEmail && s.entrenadorEmail.trim().toLowerCase() === coachEmail) return true;
      if (activeCoach?.email && s.entrenadorEmail && s.entrenadorEmail.trim().toLowerCase() === activeCoach.email.trim().toLowerCase()) return true;
    }

    // Capa 3: Coincidencia por Nombre de Entrenador (s.entrenadorNombre)
    if (coachName && s.entrenadorNombre && s.entrenadorNombre.trim().toLowerCase() === coachName) return true;

    // Capa 4: Coincidencia mediante búsqueda cruzada en la lista global de entrenadores
    const sessionCoach = coaches.find(c => c.id === s.entrenadorId);
    if (sessionCoach) {
      if (sessionCoach.email && coachEmail && sessionCoach.email.trim().toLowerCase() === coachEmail) return true;
      if (sessionCoach.nombre && coachName && sessionCoach.nombre.trim().toLowerCase() === coachName) return true;
    }

    return false;
  });

  const [selectedSession, setSelectedSession] = useState(null);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);

  const [profileData, setProfileData] = useState({
    nombre: activeCoach?.nombre || '',
    telefono: activeCoach?.telefono || '',
    especialidad: activeCoach?.especialidad || '',
    bloquesDisponibilidad: activeCoach?.bloquesDisponibilidad || []
  });

  const handleOpenModal = () => {
    if (activeCoach) {
      setProfileData({
        nombre: activeCoach.nombre || '',
        telefono: activeCoach.telefono || '',
        especialidad: activeCoach.especialidad || '',
        bloquesDisponibilidad: activeCoach.bloquesDisponibilidad || []
      });
    }
    setIsAvailabilityModalOpen(true);
  };

  const handleAddMultipleBlocks = () => {
    if (selectedDays.length === 0) {
      alert('Por favor selecciona al menos un día de la semana (L, M, MI, J, V, S, D).');
      return;
    }

    const newBlocks = selectedDays.map(code => {
      const dayObj = DAYS_BUTTONS.find(d => d.code === code);
      return {
        dia: dayObj ? dayObj.name : 'Lunes',
        horaInicio: timeRange.horaInicio,
        horaFin: timeRange.horaFin
      };
    });

    setProfileData(prev => ({
      ...prev,
      bloquesDisponibilidad: [...prev.bloquesDisponibilidad, ...newBlocks]
    }));

    setSelectedDays([]);
  };

  const handleRemoveBlock = (index) => {
    setProfileData(prev => ({
      ...prev,
      bloquesDisponibilidad: prev.bloquesDisponibilidad.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (activeCoach) {
      updateCoach(activeCoach.id, profileData);
    }
    setIsAvailabilityModalOpen(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Perfil del Entrenador Activo */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {activeCoach?.foto ? (
            <img
              src={activeCoach.foto}
              alt={activeCoach.nombre}
              style={{ width: '64px', height: '64px', borderRadius: '18px', objectFit: 'cover', border: '3px solid #3B82F6' }}
            />
          ) : (
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '3px solid #3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <User size={30} color="#60A5FA" />
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F8FAFC' }}>
                {activeCoach?.nombre || currentUser?.nombre}
              </h2>

              {/* Botón del Lápiz para Editar Nombre */}
              <button
                type="button"
                onClick={() => {
                  setNewCoachName(activeCoach?.nombre || currentUser?.nombre || '');
                  setIsEditNameModalOpen(true);
                }}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#FBBF24',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}
                title="Editar Nombre del Entrenador"
              >
                <Edit3 size={14} /> Editar
              </button>

              <span className="badge badge-blue">Mi Panel de Entrenador</span>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '2px' }}>
              {activeCoach?.especialidad} • {activeCoach?.email || currentUser?.email}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '10px 16px', borderRadius: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60A5FA' }}>{coachSessions.length}</span>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>Sesiones Asignadas</div>
          </div>

          <button className="btn-primary" onClick={handleOpenModal} style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
            <Settings size={18} /> Editar Mi Disponibilidad
          </button>
        </div>
      </div>

      {/* Resumen de Disponibilidad Configurada del Entrenador */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FBBF24', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} /> Mis Días y Horarios Disponibles Configurados:
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {activeCoach?.bloquesDisponibilidad && activeCoach.bloquesDisponibilidad.length > 0 ? (
            activeCoach.bloquesDisponibilidad.map((b, idx) => (
              <span key={idx} style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#FBBF24',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                📅 {b.dia}: {b.horaInicio} - {b.horaFin}
              </span>
            ))
          ) : (
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              Aún no has configurado tus bloques de disponibilidad. Haz clic en "Editar Mi Disponibilidad" para agregarlos.
            </span>
          )}
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

      {/* Grid de Tarjetas de Sesión Interactivas */}
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
                    <Clock size={18} color={statusCfg.colorHex} /> {formatTo12Hour(session.horaInicio)} - {formatTo12Hour(session.horaFin)}
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

      {/* Modal Editar Mi Disponibilidad y Perfil (Entrenador) */}
      <Modal
        isOpen={isAvailabilityModalOpen}
        onClose={() => setIsAvailabilityModalOpen(false)}
        title="Configurar Mi Disponibilidad y Perfil"
      >
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="input-label">Nombre Completo</label>
              <input
                type="text"
                required
                className="input-field"
                value={profileData.nombre}
                onChange={(e) => setProfileData({ ...profileData, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">Teléfono / WhatsApp</label>
              <input
                type="text"
                className="input-field"
                value={profileData.telefono}
                onChange={(e) => setProfileData({ ...profileData, telefono: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="input-label">Especialidad</label>
            <input
              type="text"
              className="input-field"
              value={profileData.especialidad}
              onChange={(e) => setProfileData({ ...profileData, especialidad: e.target.value })}
            />
          </div>

          {/* Configuración de Bloques de Horarios Disponibles */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FBBF24', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} /> Configurar Disponibilidad por Días y Rango Horario
            </h4>

            {/* Selector Multi-Día (L, M, MI, J, V, S, D) */}
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>
                  1. Selecciona los Días de la Semana:
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {DAYS_BUTTONS.map(d => {
                    const isSelected = selectedDays.includes(d.code);
                    return (
                      <button
                        key={d.code}
                        type="button"
                        onClick={() => {
                          setSelectedDays(prev =>
                            prev.includes(d.code) ? prev.filter(c => c !== d.code) : [...prev, d.code]
                          );
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          border: isSelected ? '2px solid #FBBF24' : '1px solid rgba(255, 255, 255, 0.15)',
                          background: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(15, 23, 42, 0.8)',
                          color: isSelected ? '#FBBF24' : '#94A3B8',
                          boxShadow: isSelected ? '0 0 12px rgba(245, 158, 11, 0.3)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {d.code}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horas Inicio y Fin */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label className="input-label">Hora Inicio</label>
                  <input
                    type="time"
                    className="input-field"
                    value={timeRange.horaInicio}
                    onChange={(e) => setTimeRange({ ...timeRange, horaInicio: e.target.value })}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label className="input-label">Hora Fin</label>
                  <input
                    type="time"
                    className="input-field"
                    value={timeRange.horaFin}
                    onChange={(e) => setTimeRange({ ...timeRange, horaFin: e.target.value })}
                  />
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleAddMultipleBlocks}
                  style={{ color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.4)', padding: '10px 14px' }}
                >
                  <Plus size={16} /> Añadir Horarios a Días Seleccionados
                </button>
              </div>
            </div>

            {/* Lista actual de bloques */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
              <span style={{ fontSize: '0.8rem', color: '#CBD5E1', fontWeight: 600 }}>
                Horarios Configurados en tu Ficha ({profileData.bloquesDisponibilidad.length}):
              </span>
              {profileData.bloquesDisponibilidad.map((block, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '0.85rem'
                }}>
                  <span>📅 <strong>{block.dia}</strong>: {formatTo12Hour(block.horaInicio)} a {formatTo12Hour(block.horaFin)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlock(idx)}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
            <button type="button" className="btn-secondary" onClick={() => setIsAvailabilityModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar Disponibilidad
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Nombre del Entrenador */}
      <Modal
        isOpen={isEditNameModalOpen}
        onClose={() => setIsEditNameModalOpen(false)}
        title="✏️ Editar Nombre del Entrenador"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (newCoachName.trim()) {
              await updateUserProfileName(newCoachName.trim());
              if (activeCoach) {
                await updateCoach(activeCoach.id, { nombre: newCoachName.trim() });
              }
              setIsEditNameModalOpen(false);
            }
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div>
            <label className="input-label">Nuevo Nombre Completo</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="Ej. Profesor Carlos Mendoza"
              value={newCoachName}
              onChange={(e) => setNewCoachName(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsEditNameModalOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar Nombre
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal con Fichas Técnicas completas */}
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
