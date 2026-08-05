import React, { useState } from 'react';
import { UserPlus, Search, Edit3, Trash2, Eye, User } from 'lucide-react';
import { useData } from '../../context/DataContext';
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
    edad: 10,
    posicion: 'Mediocampista',
    piernaHabil: 'Derecha',
    contactoTutor: '',
    foto: '',
    observacionesTecnicas: ''
  });

  const handleOpenAdd = () => {
    setFormData({
      nombre: '',
      edad: 10,
      posicion: 'Mediocampista',
      piernaHabil: 'Derecha',
      contactoTutor: '',
      foto: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=300',
      observacionesTecnicas: ''
    });
    setIsEditing(false);
    setIsAddModalOpen(true);
  };

  const handleOpenDetail = (player, editMode = false) => {
    setSelectedPlayer(player);
    setFormData({ ...player });
    setIsEditing(editMode);
    setIsDetailModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (isEditing && selectedPlayer) {
      updatePlayer(selectedPlayer.id, formData);
      setIsDetailModalOpen(false);
    } else {
      addPlayer(formData);
      setIsAddModalOpen(false);
    }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${name}?`)) {
      deletePlayer(id);
    }
  };

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
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
                onClick={() => handleDelete(player.id, player.nombre)}
                title="Eliminar Jugador"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para Crear o Ver/Editar Ficha Técnica */}
      <Modal
        isOpen={isAddModalOpen || isDetailModalOpen}
        onClose={() => { setIsAddModalOpen(false); setIsDetailModalOpen(false); }}
        title={isAddModalOpen ? "Registrar Nuevo Jugador" : (isEditing ? `Editar Ficha: ${formData.nombre}` : `Ficha Técnica Deportiva`)}
      >
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="input-label">Nombre del Jugador</label>
              <input
                type="text"
                required
                disabled={!isAddModalOpen && !isEditing}
                className="input-field"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>

            <div>
              <label className="input-label">Edad (Años)</label>
              <input
                type="number"
                min="4"
                max="20"
                required
                disabled={!isAddModalOpen && !isEditing}
                className="input-field"
                value={formData.edad}
                onChange={(e) => setFormData({ ...formData, edad: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
                <option value="Ambidiestro">Ambidiestro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="input-label">Contacto del Tutor / Representante</label>
            <input
              type="text"
              placeholder="+58 414 1234567 (Papá)"
              disabled={!isAddModalOpen && !isEditing}
              className="input-field"
              value={formData.contactoTutor}
              onChange={(e) => setFormData({ ...formData, contactoTutor: e.target.value })}
            />
          </div>

          <div>
            <label className="input-label">URL Fotografía de Perfil</label>
            <input
              type="text"
              placeholder="https://..."
              disabled={!isAddModalOpen && !isEditing}
              className="input-field"
              value={formData.foto}
              onChange={(e) => setFormData({ ...formData, foto: e.target.value })}
            />
          </div>

          <div>
            <label className="input-label">Observaciones Técnicas & Evaluación</label>
            <textarea
              rows="4"
              placeholder="Describe aspectos a mejorar, fortalezas tácticas o físicas..."
              disabled={!isAddModalOpen && !isEditing}
              className="input-field"
              value={formData.observacionesTecnicas}
              onChange={(e) => setFormData({ ...formData, observacionesTecnicas: e.target.value })}
            />
          </div>

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

    </div>
  );
};

export default PlayerManager;
