import React, { useState } from 'react';
import { UserCheck, Plus, Trash2, Clock, Mail, Phone, Calendar } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Modal from '../common/Modal';

const DAYS_LIST = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const CoachManager = () => {
  const { coaches, addCoach, updateCoach, deleteCoach } = useData();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    especialidad: '',
    foto: '',
    bloquesDisponibilidad: []
  });

  const [newBlock, setNewBlock] = useState({
    dia: 'Lunes',
    horaInicio: '08:00',
    horaFin: '12:00'
  });

  const handleOpenAdd = () => {
    setSelectedCoach(null);
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      especialidad: 'Táctica & Fundamentos 1-1',
      foto: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300',
      bloquesDisponibilidad: [
        { dia: 'Lunes', horaInicio: '08:00', horaFin: '12:00' },
        { dia: 'Miércoles', horaInicio: '08:00', horaFin: '12:00' }
      ]
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coach) => {
    setSelectedCoach(coach);
    setFormData({ ...coach });
    setIsModalOpen(true);
  };

  const handleAddBlock = () => {
    setFormData(prev => ({
      ...prev,
      bloquesDisponibilidad: [...prev.bloquesDisponibilidad, { ...newBlock }]
    }));
  };

  const handleRemoveBlock = (index) => {
    setFormData(prev => ({
      ...prev,
      bloquesDisponibilidad: prev.bloquesDisponibilidad.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedCoach) {
      updateCoach(selectedCoach.id, formData);
    } else {
      addCoach(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id, nombre) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${nombre}?`)) {
      deleteCoach(id);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC' }}>
            Gestor de Entrenadores y Disponibilidad
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.88rem', marginTop: '4px' }}>
            Define bloques de horarios para validación estricta de ausencias y prevención de choques.
          </p>
        </div>

        <button className="btn-primary" onClick={handleOpenAdd}>
          <Plus size={18} /> Registrar Entrenador
        </button>
      </div>

      {/* Grid de Entrenadores */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {coaches.map((coach) => (
          <div key={coach.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img
                src={coach.foto || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300'}
                alt={coach.nombre}
                style={{ width: '60px', height: '60px', borderRadius: '16px', objectFit: 'cover', border: '2px solid rgba(59, 130, 246, 0.5)' }}
              />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC' }}>{coach.nombre}</h3>
                <span className="badge badge-blue" style={{ fontSize: '0.7rem', marginTop: '4px' }}>
                  {coach.especialidad}
                </span>
              </div>
            </div>

            {/* Contacto */}
            <div style={{ fontSize: '0.8rem', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} color="#10B981" /> {coach.email}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} color="#3B82F6" /> {coach.telefono}
              </span>
            </div>

            {/* Bloques de Disponibilidad Predefinidos */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="#F59E0B" /> Bloques de Disponibilidad:
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {coach.bloquesDisponibilidad && coach.bloquesDisponibilidad.length > 0 ? (
                  coach.bloquesDisponibilidad.map((b, idx) => (
                    <span key={idx} style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      color: '#FBBF24',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600
                    }}>
                      {b.dia}: {b.horaInicio} - {b.horaFin}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Sin horarios configurados</span>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <button
                className="btn-secondary"
                style={{ flex: 1, padding: '8px', fontSize: '0.82rem' }}
                onClick={() => handleOpenEdit(coach)}
              >
                Editar Disponibilidad
              </button>
              <button
                className="btn-danger"
                style={{ padding: '8px 12px' }}
                onClick={() => handleDelete(coach.id, coach.nombre)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Editar o Crear Entrenador */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCoach ? `Editar Entrenador: ${selectedCoach.nombre}` : "Registrar Entrenador"}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="input-label">Nombre Completo</label>
              <input
                type="text"
                required
                className="input-field"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">Correo Electrónico (Notificaciones EmailJS)</label>
              <input
                type="email"
                required
                className="input-field"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label className="input-label">Teléfono</label>
              <input
                type="text"
                className="input-field"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
            <div>
              <label className="input-label">Especialidad</label>
              <input
                type="text"
                className="input-field"
                value={formData.especialidad}
                onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
              />
            </div>
          </div>

          {/* Gestión de Bloques de Disponibilidad */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '10px' }}>
              Bloques de Disponibilidad Semanal
            </h4>

            {/* Agregar nuevo bloque */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap', background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '10px' }}>
              <div style={{ flex: 1, minWidth: '110px' }}>
                <label className="input-label">Día</label>
                <select
                  className="input-field"
                  value={newBlock.dia}
                  onChange={(e) => setNewBlock({ ...newBlock, dia: e.target.value })}
                >
                  {DAYS_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div style={{ width: '110px' }}>
                <label className="input-label">Inicio</label>
                <input
                  type="time"
                  className="input-field"
                  value={newBlock.horaInicio}
                  onChange={(e) => setNewBlock({ ...newBlock, horaInicio: e.target.value })}
                />
              </div>

              <div style={{ width: '110px' }}>
                <label className="input-label">Fin</label>
                <input
                  type="time"
                  className="input-field"
                  value={newBlock.horaFin}
                  onChange={(e) => setNewBlock({ ...newBlock, horaFin: e.target.value })}
                />
              </div>

              <button type="button" className="btn-secondary" onClick={handleAddBlock} style={{ color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                <Plus size={16} /> Añadir Bloque
              </button>
            </div>

            {/* Lista actual de bloques */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {formData.bloquesDisponibilidad.map((block, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(30, 41, 59, 0.5)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}>
                  <span>📅 <strong>{block.dia}</strong>: {block.horaInicio} a {block.horaFin}</span>
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
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar Entrenador
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default CoachManager;
