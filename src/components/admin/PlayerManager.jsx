import React, { useState } from 'react';
import { UserPlus, Search, Edit3, Trash2, Eye, User, MessageSquare } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { showToast } from '../common/ToastNotification';
import Modal from '../common/Modal';

const PlayerManager = () => {
  const { players, addPlayer, updatePlayer, deletePlayer } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');

  // Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    fechaNacimiento: '',
    edad: 0,
    posicion: 'Mediocampista',
    piernaHabil: 'Derecha',
    contactoTutor: '',
    foto: '',
    observacionesTecnicas: ''
  });

  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return 0;
    const today = new Date();
    const birthDate = new Date(birthDateStr + 'T00:00:00');
    if (isNaN(birthDate.getTime())) return 0;
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  };

  const handleBirthDateChange = (dateStr) => {
    const calculatedAge = calculateAge(dateStr);
    setFormData(prev => ({
      ...prev,
      fechaNacimiento: dateStr,
      edad: calculatedAge
    }));
  };

  const handleOpenAdd = () => {
    setFormData({
      nombre: '',
      fechaNacimiento: '',
      edad: 0,
      posicion: 'Mediocampista',
      piernaHabil: 'Derecha',
      contactoTutor: '',
      foto: '',
      observacionesTecnicas: '',
      historialObservaciones: []
    });
    setIsEditing(false);
    setIsAddModalOpen(true);
  };

  const handleOpenDetail = (player, editMode = false) => {
    setSelectedPlayer(player);
    const birthDate = player.fechaNacimiento || '';
    const age = birthDate ? calculateAge(birthDate) : (player.edad || 0);
    setFormData({
      ...player,
      fechaNacimiento: birthDate,
      edad: age,
      historialObservaciones: Array.isArray(player.historialObservaciones) ? player.historialObservaciones : []
    });
    setIsEditing(editMode);
    setIsDetailModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.nombre.trim()) {
      showToast('Nombre Requerido', 'Por favor ingresa el nombre del jugador.', 'warning');
      return;
    }
    if (isEditing && selectedPlayer) {
      updatePlayer(selectedPlayer.id, formData);
      setIsDetailModalOpen(false);
      showToast('Ficha Actualizada', `Se guardaron los cambios de ${formData.nombre}.`, 'success');
    } else {
      addPlayer(formData);
      setIsAddModalOpen(false);
      showToast('Jugador Registrado', `${formData.nombre} fue registrado con éxito.`, 'success');
    }
  };

  const [playerToDelete, setPlayerToDelete] = useState(null);

  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPos = positionFilter === 'ALL' || p.posicion === positionFilter;
    return matchesSearch && matchesPos;
  });

  const getPositionBadgeClass = (pos) => {
    switch (pos) {
      case 'Portero': return 'badge-gold';
      case 'Defensa': return 'badge-blue';
      case 'Mediocampista': return 'badge-purple';
      case 'Delantero': return 'badge-emerald';
      default: return 'badge-emerald';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Encabezado y Acciones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC' }}>
            Gestor de Jugadores (Fichas Técnicas)
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.88rem', marginTop: '4px' }}>
            Fichas personalizadas para entrenamientos 1-1, 1-2 y 1-3 en Parla Sport.
          </p>
        </div>

        <button className="btn-primary" onClick={handleOpenAdd}>
          <UserPlus size={18} /> Registrar Nuevo Jugador
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="glass-panel" style={{ padding: '14px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
          <input
            type="text"
            placeholder="Buscar por nombre de jugador..."
            className="input-field"
            style={{ paddingLeft: '38px' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="input-field"
          style={{ width: 'auto', minWidth: '160px' }}
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
        >
          <option value="ALL">Todas las posiciones</option>
          <option value="Portero">Portero</option>
          <option value="Defensa">Defensa</option>
          <option value="Mediocampista">Mediocampista</option>
          <option value="Delantero">Delantero</option>
        </select>
      </div>

      {/* Grid de Carnets / Fichas de Jugadores */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(270px, 100%), 1fr))',
        gap: '18px'
      }}>
        {filteredPlayers.map((player) => (
          <div key={player.id} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {player.foto ? (
                <img
                  src={player.foto}
                  alt={player.nombre}
                  style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover', border: '2px solid rgba(16, 185, 129, 0.4)' }}
                />
              ) : (
                <div style={{
                  width: '56px', height: '56px', borderRadius: '14px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '2px solid rgba(16, 185, 129, 0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <User size={26} color="#34D399" />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>{player.nombre}</h3>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span className={`badge ${getPositionBadgeClass(player.posicion)}`}>
                    {player.posicion}
                  </span>
                  <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                    {player.edad} Años
                  </span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', color: '#CBD5E1', background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '8px' }}>
              {player.fechaNacimiento && <div style={{ marginBottom: '2px' }}><strong>F. Nacimiento:</strong> {player.fechaNacimiento}</div>}
              <div><strong>Pierna Hábil:</strong> {player.piernaHabil}</div>
              <div style={{ color: '#94A3B8', marginTop: '2px' }}><strong>Tutor:</strong> {player.contactoTutor || 'No registrado'}</div>
            </div>

            <p style={{
              fontSize: '0.78rem',
              color: '#94A3B8',
              fontStyle: 'italic',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              "{player.observacionesTecnicas || 'Sin observaciones aún.'}"
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <button
                className="btn-secondary"
                style={{ flex: 1, padding: '6px 10px', fontSize: '0.8rem' }}
                onClick={() => handleOpenDetail(player, false)}
              >
                <Eye size={14} /> Ficha completa
              </button>

              <button
                style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60A5FA', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => handleOpenDetail(player, true)}
                title="Editar Ficha"
              >
                <Edit3 size={14} />
              </button>

              <button
                style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}
                onClick={() => setPlayerToDelete(player)}
                title="Eliminar Jugador"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

    {/* Modal Añadir / Editar Jugador */}
    <Modal
      isOpen={isAddModalOpen || isDetailModalOpen}
      onClose={() => { setIsAddModalOpen(false); setIsDetailModalOpen(false); }}
      title={isAddModalOpen ? '⚽ Registrar Nuevo Jugador' : (isEditing ? '✏️ Editar Ficha Técnica' : '📋 Ficha Técnica del Jugador')}
      widthPx="700px"
    >
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '12px' }}>
          <div>
            <label className="input-label">Nombre Completo del Jugador</label>
            <input
              type="text"
              required
              disabled={!isAddModalOpen && !isEditing}
              placeholder="Ej. Carlos Mendoza"
              className="input-field"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            />
          </div>

          <div>
            <label className="input-label">Fecha de Nacimiento</label>
            <input
              type="date"
              disabled={!isAddModalOpen && !isEditing}
              className="input-field"
              value={formData.fechaNacimiento || ''}
              onChange={(e) => handleBirthDateChange(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '12px' }}>
          <div>
            <label className="input-label">Edad (Cálculo Automático)</label>
            <input
              type="number"
              disabled
              className="input-field"
              value={formData.edad}
            />
          </div>

          <div>
            <label className="input-label">Posición Principal</label>
            <select
              disabled={!isAddModalOpen && !isEditing}
              className="input-field"
              value={formData.posicion}
              onChange={(e) => setFormData({ ...formData, posicion: e.target.value })}
            >
              <option value="Portero">Portero</option>
              <option value="Defensa">Defensa</option>
              <option value="Mediocampista">Mediocampista</option>
              <option value="Delantero">Delantero</option>
            </select>
          </div>

          <div>
            <label className="input-label">Pierna Hábil</label>
            <select
              disabled={!isAddModalOpen && !isEditing}
              className="input-field"
              value={formData.piernaHabil}
              onChange={(e) => setFormData({ ...formData, piernaHabil: e.target.value })}
            >
              <option value="Derecha">Derecha</option>
              <option value="Izquierda">Izquierda</option>
              <option value="Ambidextro">Ambidextro</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label className="input-label">Contacto Representante / Tutor</label>
            <input
              type="text"
              disabled={!isAddModalOpen && !isEditing}
              placeholder="+58 412 9988776"
              className="input-field"
              value={formData.contactoTutor}
              onChange={(e) => setFormData({ ...formData, contactoTutor: e.target.value })}
            />
          </div>

          <div>
            <label className="input-label">URL Foto de Perfil (Opcional)</label>
            <input
              type="url"
              disabled={!isAddModalOpen && !isEditing}
              placeholder="https://..."
              className="input-field"
              value={formData.foto}
              onChange={(e) => setFormData({ ...formData, foto: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="input-label">Observaciones Técnicas Generales</label>
          <textarea
            disabled={!isAddModalOpen && !isEditing}
            rows={3}
            className="input-field"
            placeholder="Comentarios sobre fortalezas, técnica, visión de juego o aspectos a entrenar..."
            value={formData.observacionesTecnicas}
            onChange={(e) => setFormData({ ...formData, observacionesTecnicas: e.target.value })}
          />
        </div>

        {/* Historial de Notas de Profesores (si existen) */}
        {!isAddModalOpen && formData.historialObservaciones && formData.historialObservaciones.length > 0 && (
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FBBF24', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={16} /> Historial de Observaciones por Entrenadores:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
              {formData.historialObservaciones.map(obs => (
                <div
                  key={obs.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderLeft: '3px solid #3B82F6',
                    padding: '8px 12px',
                    borderRadius: '0 8px 8px 0',
                    fontSize: '0.82rem'
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
          </div>
        )}

        {(isAddModalOpen || isEditing) && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => { setIsAddModalOpen(false); setIsDetailModalOpen(false); }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar Ficha
            </button>
          </div>
        )}
      </form>
    </Modal>

    {/* Modal de Confirmación de Eliminación de Jugador */}
    <Modal
      isOpen={!!playerToDelete}
      onClose={() => setPlayerToDelete(null)}
      title="🗑️ Eliminar Ficha de Jugador"
    >
      {playerToDelete && (
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
            <strong style={{ fontSize: '0.95rem' }}>⚠️ ¿Estás seguro de eliminar a {playerToDelete.nombre}?</strong>
            <span>
              Posición: <strong>{playerToDelete.posicion}</strong> | Edad: <strong>{playerToDelete.edad} años</strong>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>
              Se borra la ficha técnica y la información de contacto del jugador.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPlayerToDelete(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-danger"
              style={{ padding: '8px 16px', fontWeight: 700 }}
              onClick={() => {
                deletePlayer(playerToDelete.id);
                setPlayerToDelete(null);
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

export default PlayerManager;
