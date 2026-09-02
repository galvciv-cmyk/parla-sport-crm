import React, { useState } from 'react';
import { Search, Trash2, ShieldCheck, User, Edit3, Phone, Mail } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatTo12Hour, groupAvailabilityBlocks } from '../../utils/scheduling';
import Modal from '../common/Modal';
import ImageUploader from '../common/ImageUploader';
import { showToast } from '../common/ToastNotification';

const CoachManager = () => {
  const { coaches, updateCoach, deleteCoach } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [coachToDelete, setCoachToDelete] = useState(null);
  const [editingCoach, setEditingCoach] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    especialidad: '',
    telefono: '',
    foto: ''
  });

  const filteredCoaches = coaches.filter(c =>
    (c.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.especialidad || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenEdit = (coach) => {
    setEditingCoach(coach);
    setFormData({
      nombre: coach.nombre || '',
      especialidad: coach.especialidad || 'Entrenador General',
      telefono: coach.telefono || '',
      foto: coach.foto || ''
    });
  };

  const handleSaveCoach = async (e) => {
    e.preventDefault();
    if (!editingCoach) return;

    if (!formData.nombre.trim()) {
      showToast('Nombre Requerido', 'Ingresa el nombre del entrenador.', 'warning');
      return;
    }

    try {
      await updateCoach(editingCoach.id, {
        nombre: formData.nombre.trim(),
        especialidad: formData.especialidad.trim(),
        telefono: formData.telefono.trim(),
        foto: formData.foto || ''
      });
      showToast('Entrenador Actualizado', `Se guardó la información de ${formData.nombre}.`, 'success');
      setEditingCoach(null);
    } catch (err) {
      console.error(err);
      showToast('Error', 'No se pudo actualizar el entrenador.', 'error');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={26} color="#10B981" /> Directorio de Entrenadores
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '2px' }}>
            Consulta la disponibilidad semanal, datos de contacto y fotos de todo el staff técnico.
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Search size={18} color="#94A3B8" />
        <input
          type="text"
          placeholder="Buscar entrenador por nombre, especialidad o correo..."
          className="input-field"
          style={{ border: 'none', background: 'transparent', padding: 0, width: '100%' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid de Fichas de Entrenadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '18px' }}>
        {filteredCoaches.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
            <p style={{ color: '#94A3B8' }}>No se encontraron entrenadores con los criterios de búsqueda.</p>
          </div>
        ) : (
          filteredCoaches.map((coach) => (
            <div key={coach.id} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {coach.foto ? (
                  <img
                    src={coach.foto}
                    alt={coach.nombre}
                    style={{ width: '58px', height: '58px', borderRadius: '14px', objectFit: 'cover', border: '2px solid rgba(16, 185, 129, 0.5)' }}
                  />
                ) : (
                  <div style={{
                    width: '58px', height: '58px', borderRadius: '14px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '2px solid rgba(16, 185, 129, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={28} color="#34D399" />
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>{coach.nombre}</h3>
                  <span className="badge badge-emerald" style={{ marginTop: '4px', fontSize: '0.7rem' }}>
                    {coach.especialidad || 'Entrenador General'}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(15, 23, 42, 0.5)', padding: '10px', borderRadius: '8px' }}>
                <div>📧 {coach.email}</div>
                <div>📞 {coach.telefono || 'Sin teléfono'}</div>
              </div>

              {/* Disponibilidad Semanal */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                  Disponibilidad Semanal:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {coach.bloquesDisponibilidad && coach.bloquesDisponibilidad.length > 0 ? (
                    groupAvailabilityBlocks(coach.bloquesDisponibilidad).map((g, idx) => (
                      <span key={idx} style={{
                        background: 'rgba(245, 158, 11, 0.12)',
                        color: '#FBBF24',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700
                      }}>
                        ⏰ {g.label}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Sin horarios configurados</span>
                  )}
                </div>
              </div>

              {/* Acciones del Administrador: Editar Ficha / Foto y Desvincular */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', gap: '8px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  onClick={() => handleOpenEdit(coach)}
                >
                  <Edit3 size={14} color="#60A5FA" /> Editar Ficha
                </button>

                <button
                  className="btn-danger"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                  onClick={() => setCoachToDelete(coach)}
                  title="Desvincular Entrenador"
                >
                  <Trash2 size={13} /> Desvincular
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Editar Ficha / Foto del Entrenador */}
      <Modal
        isOpen={!!editingCoach}
        onClose={() => setEditingCoach(null)}
        title={`✏️ Editar Ficha: ${editingCoach?.nombre || 'Entrenador'}`}
        widthPx="550px"
      >
        {editingCoach && (
          <form onSubmit={handleSaveCoach} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ImageUploader
              value={formData.foto}
              onChange={(url) => setFormData(prev => ({ ...prev, foto: url }))}
              label="Foto de Perfil del Entrenador (Cámara o Galería)"
              sizePx={84}
            />

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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="input-label">Especialidad</label>
                <input
                  type="text"
                  placeholder="Ej. Táctico / Físico"
                  className="input-field"
                  value={formData.especialidad}
                  onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                />
              </div>

              <div>
                <label className="input-label">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  placeholder="+58 414 1234567"
                  className="input-field"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setEditingCoach(null)}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
                Guardar Cambios
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal de Confirmación de Desvinculación de Entrenador */}
      <Modal
        isOpen={!!coachToDelete}
        onClose={() => setCoachToDelete(null)}
        title="🗑️ Desvincular Entrenador"
      >
        {coachToDelete && (
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
              <strong style={{ fontSize: '0.95rem' }}>⚠️ ¿Estás seguro de desvincular a {coachToDelete.nombre}?</strong>
              <span>
                Se eliminará el perfil del profesor <strong>({coachToDelete.email})</strong> y su registro de la academia.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setCoachToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                style={{ padding: '8px 16px', fontWeight: 700 }}
                onClick={() => {
                  deleteCoach(coachToDelete.id);
                  setCoachToDelete(null);
                }}
              >
                <Trash2 size={16} /> Confirmar Desvinculación
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};

export default CoachManager;
