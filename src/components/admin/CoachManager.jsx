import React from 'react';
import { Search, Trash2, ShieldCheck, User } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatTo12Hour } from '../../utils/scheduling';

const CoachManager = () => {
  const { coaches, deleteCoach } = useData();
  const [searchTerm, setSearchTerm] = React.useState('');

  const handleDelete = (id, nombre) => {
    if (window.confirm(`¿Estás seguro de desvincular a ${nombre}? Se eliminará su registro del sistema.`)) {
      deleteCoach(id);
    }
  };

  const filteredCoaches = coaches.filter(c =>
    (c.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.especialidad || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Encabezado */}
      <div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={26} color="#10B981" /> Directorio de Entrenadores y Disponibilidad
        </h2>
        <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '2px' }}>
          Listado de profesores de la academia. Cada entrenador registra y gestiona sus propios bloques de disponibilidad semanal.
        </p>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
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
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>{coach.nombre}</h3>
                  <span className="badge badge-emerald" style={{ marginTop: '4px', fontSize: '0.7rem' }}>
                    {coach.especialidad || 'Entrenador General'}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>📧 {coach.email}</div>
                <div>📞 {coach.telefono || 'Sin teléfono'}</div>
              </div>

              {/* Disponibilidad Semanal */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                  Disponibilidad Semanal Configurada:
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
                        {b.dia}: {formatTo12Hour(b.horaInicio)} - {formatTo12Hour(b.horaFin)}
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
