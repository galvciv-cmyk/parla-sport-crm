import React from 'react';
import { Trash2, Clock, Mail, Phone, User } from 'lucide-react';
import { useData } from '../../context/DataContext';

const CoachManager = () => {
  const { coaches, deleteCoach } = useData();

  const handleDelete = (id, nombre) => {
    if (window.confirm(`¿Estás seguro de desvincular a ${nombre}? Se eliminará su registro del sistema.`)) {
      deleteCoach(id);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC' }}>
            Directorio de Entrenadores
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.88rem', marginTop: '4px' }}>
            Los entrenadores se registran y gestionan su propia disponibilidad. Como Administrador puedes consultar sus fichas o desvincularlos.
          </p>
        </div>
      </div>

      {/* Grid de Entrenadores */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '20px'
      }}>
        {coaches.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', gridColumn: '1 / -1' }}>
            <p style={{ color: '#94A3B8' }}>No hay entrenadores registrados en el sistema actualmente.</p>
          </div>
        ) : (
          coaches.map((coach) => (
            <div key={coach.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {coach.foto ? (
                  <img
                    src={coach.foto}
                    alt={coach.nombre}
                    style={{ width: '60px', height: '60px', borderRadius: '16px', objectFit: 'cover', border: '2px solid rgba(59, 130, 246, 0.5)' }}
                  />
                ) : (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '2px solid rgba(59, 130, 246, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={28} color="#60A5FA" />
                  </div>
                )}
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC' }}>{coach.nombre}</h3>
                  <span className="badge badge-blue" style={{ fontSize: '0.7rem', marginTop: '4px' }}>
                    {coach.especialidad || 'Entrenador'}
                  </span>
                </div>
              </div>

              {/* Contacto */}
              <div style={{ fontSize: '0.8rem', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="#10B981" /> {coach.email}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} color="#3B82F6" /> {coach.telefono || 'Sin teléfono'}
                </span>
              </div>

              {/* Bloques de Disponibilidad Configurados por el Entrenador */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="#F59E0B" /> Disponibilidad Configurada por el Profesor:
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

              {/* Acciones del Administrador: Únicamente Desvincular / Borrar en caso de despido */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '6px' }}>
                <button
                  className="btn-danger"
                  style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => handleDelete(coach.id, coach.nombre)}
                >
                  <Trash2 size={16} /> Desvincular Entrenador
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default CoachManager;
