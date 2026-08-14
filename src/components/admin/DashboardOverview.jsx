import React from 'react';
import { Users, UserCheck, CalendarCheck, Award, CreditCard, Activity } from 'lucide-react';
import { useData } from '../../context/DataContext';

const DashboardOverview = ({ setActiveTab }) => {
  const { players, coaches, sessions } = useData();

  const totalPlayers = players.length;
  const totalCoaches = coaches.length;
  const activeSessions = sessions.filter(s => s.estado !== 'cancelada');
  const completedCount = sessions.filter(s => s.estado === 'completada').length;

  // Sesiones por entrenador
  const sessionsByCoach = coaches.map(coach => {
    const count = activeSessions.filter(s => s.entrenadorId === coach.id).length;
    return { ...coach, sessionCount: count };
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Encabezado del Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC' }}>
            Dashboard de Control <span style={{ color: '#10B981' }}>Parla Sport</span>
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.88rem', marginTop: '4px' }}>
            Resumen de métricas generales de entrenamientos personalizados 1-1, 1-2 y 1-3.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setActiveTab('scheduler')}>
          <CalendarCheck size={18} /> Programar Nueva Sesión
        </button>
      </div>

      {/* Tarjetas de Métricas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))',
        gap: '14px'
      }}>
        {/* Jugadores */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Jugadores</span>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Users size={18} color="#10B981" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC', margin: '8px 0 2px' }}>
            {totalPlayers}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10B981' }}>Fichas técnicas al día</span>
        </div>

        {/* Entrenadores */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Profesores</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <UserCheck size={18} color="#3B82F6" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC', margin: '8px 0 2px' }}>
            {totalCoaches}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#3B82F6' }}>Bloques activos</span>
        </div>

        {/* Sesiones Programadas */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Sesiones</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Activity size={18} color="#F59E0B" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC', margin: '8px 0 2px' }}>
            {activeSessions.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#F59E0B' }}>1-1, 1-2, 1-3 agendadas</span>
        </div>

        {/* Sesiones Completadas */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Realizadas</span>
            <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Award size={18} color="#A78BFA" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC', margin: '8px 0 2px' }}>
            {completedCount}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#A78BFA' }}>Finalizadas</span>
        </div>
      </div>

      {/* Grid de Rendimiento por Entrenador + Módulo de Pagos preparado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '20px' }}>
        
        {/* Rendimiento / Carga por Entrenador */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', color: '#F8FAFC' }}>
            Distribución de Sesiones por Entrenador
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sessionsByCoach.map(c => {
              const percentage = activeSessions.length > 0 ? Math.round((c.sessionCount / activeSessions.length) * 100) : 0;
              return (
                <div key={c.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: '#CBD5E1' }}>{c.nombre}</span>
                    <span style={{ color: '#10B981', fontWeight: 700 }}>{c.sessionCount} sesiones ({percentage}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #10B981, #3B82F6)',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Módulo Preparado: Gestión de Pagos */}
        <div className="glass-panel" style={{
          padding: '20px',
          border: '1px dashed rgba(245, 158, 11, 0.4)',
          background: 'rgba(245, 158, 11, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '8px', borderRadius: '8px' }}>
              <CreditCard size={20} color="#F59E0B" />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>
                Módulo de Gestión de Pagos (En Preparación)
              </h3>
              <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>Próxima Fase</span>
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#94A3B8', lineHeight: '1.5', marginBottom: '14px' }}>
            La estructura del esquema de datos en Firestore incluye los identificadores de paquetes (1-1, 1-2, 1-3) listos para conectar las pasarelas de pago y control de cobro por mensualidades.
          </p>
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.6)',
            fontSize: '0.8rem',
            color: '#CBD5E1'
          }}>
            ✓ Base de datos desacoplada para vincular Stripe / MercadoPago.<br />
            ✓ Historial de recibos por jugador y tutor listo para consumo.
          </div>
        </div>

      </div>

    </div>
  );
};

export default DashboardOverview;
