import React, { useState, useMemo } from 'react';
import {
  Users, UserCheck, CalendarCheck, Award, CreditCard, Activity,
  Settings, ChevronLeft, ChevronRight, CheckCircle2, Clock, DollarSign,
  Calendar as CalendarIcon, TrendingUp, AlertCircle
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import Modal from '../common/Modal';
import { formatTo12Hour } from '../../utils/scheduling';

// ─── Utilidades de Fechas para Semanas (Lunes a Domingo) y Meses ───
const getMondayOfCurrentWeek = (d = new Date()) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const formatDateYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatSpanishDate = (date) => {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

const DashboardOverview = ({ setActiveTab }) => {
  const { players, coaches, sessions, paymentRates, updatePaymentRates, updateSessionStatus } = useData();

  // ─── Estados de Navegación y Filtros ───
  const [viewMode, setViewMode] = useState('weekly'); // 'weekly' | 'monthly'
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal de Tarifas
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [tempRates, setTempRates] = useState(paymentRates);
  const [savingRates, setSavingRates] = useState(false);

  // ─── Rango de la Semana Activa (Lunes a Domingo) ───
  const currentWeekRange = useMemo(() => {
    const monday = getMondayOfCurrentWeek();
    monday.setDate(monday.getDate() + weekOffset * 7);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const startStr = formatDateYMD(monday);
    const endStr = formatDateYMD(sunday);

    return {
      start: monday,
      end: sunday,
      startStr,
      endStr,
      label: `Semana: ${formatSpanishDate(monday)} - ${formatSpanishDate(sunday)} ${sunday.getFullYear()}`
    };
  }, [weekOffset]);

  // ─── Sesiones Filtradas según el Modo Temporal ───
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (s.estado === 'cancelada') return false;
      if (!s.fecha) return false;

      if (viewMode === 'weekly') {
        return s.fecha >= currentWeekRange.startStr && s.fecha <= currentWeekRange.endStr;
      } else {
        return s.fecha.startsWith(selectedMonth);
      }
    });
  }, [sessions, viewMode, currentWeekRange, selectedMonth]);

  // ─── Cálculos de Liquidación por Entrenador ───
  const coachSettlements = useMemo(() => {
    const rate11 = Number(paymentRates['1-1']) || 15;
    const rate12 = Number(paymentRates['1-2']) || 20;
    const rate13 = Number(paymentRates['1-3']) || 25;

    return coaches.map(coach => {
      // Sesiones del entrenador en el período
      const coachSessions = filteredSessions.filter(s => s.entrenadorId === coach.id);
      
      // Sesiones finalizadas (realizada o pagada)
      const realizedSessions = coachSessions.filter(s => s.estado === 'realizada' || s.estado === 'pagada');
      const pendingSessions = coachSessions.filter(s => s.estado === 'realizada');
      const paidSessions = coachSessions.filter(s => s.estado === 'pagada');

      // Conteo por formato
      const count11 = realizedSessions.filter(s => s.tipo === '1-1').length;
      const count12 = realizedSessions.filter(s => s.tipo === '1-2').length;
      const count13 = realizedSessions.filter(s => s.tipo === '1-3').length;

      // Monto total generado
      const totalAmount = (count11 * rate11) + (count12 * rate12) + (count13 * rate13);

      // Monto pendiente y pagado
      const pendingAmount = pendingSessions.reduce((acc, s) => {
        const rate = s.tipo === '1-1' ? rate11 : s.tipo === '1-2' ? rate12 : rate13;
        return acc + rate;
      }, 0);

      const paidAmount = paidSessions.reduce((acc, s) => {
        const rate = s.tipo === '1-1' ? rate11 : s.tipo === '1-2' ? rate12 : rate13;
        return acc + rate;
      }, 0);

      return {
        coach,
        totalSessions: coachSessions.length,
        realizedCount: realizedSessions.length,
        pendingSessions,
        paidSessions,
        count11,
        count12,
        count13,
        totalAmount,
        pendingAmount,
        paidAmount
      };
    });
  }, [coaches, filteredSessions, paymentRates]);

  // ─── Totales Generales del Período ───
  const totals = useMemo(() => {
    const totalRealized = coachSettlements.reduce((acc, c) => acc + c.realizedCount, 0);
    const totalGenerated = coachSettlements.reduce((acc, c) => acc + c.totalAmount, 0);
    const totalPending = coachSettlements.reduce((acc, c) => acc + c.pendingAmount, 0);
    const totalPaid = coachSettlements.reduce((acc, c) => acc + c.paidAmount, 0);

    return { totalRealized, totalGenerated, totalPending, totalPaid };
  }, [coachSettlements]);

  // ─── Acción: Marcar todas las sesiones pendientes de un entrenador como Pagadas ───
  const handleSettleCoachPending = async (coachItem) => {
    if (coachItem.pendingSessions.length === 0) return;
    const confirmMsg = `¿Deseas marcar como PAGADAS las ${coachItem.pendingSessions.length} sesiones pendientes de ${coachItem.coach.nombre} (Total: $${coachItem.pendingAmount})?`;
    if (!window.confirm(confirmMsg)) return;

    for (const ses of coachItem.pendingSessions) {
      try {
        await updateSessionStatus(ses.id, 'pagada', 'admin');
      } catch (err) {
        console.warn('Error al liquidar sesión:', err);
      }
    }
  };

  const handleSaveRates = async (e) => {
    e.preventDefault();
    setSavingRates(true);
    await updatePaymentRates({
      '1-1': Number(tempRates['1-1']) || 0,
      '1-2': Number(tempRates['1-2']) || 0,
      '1-3': Number(tempRates['1-3']) || 0
    });
    setSavingRates(false);
    setIsRatesModalOpen(false);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* ─── Encabezado Principal del Dashboard ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#F8FAFC' }}>
            Dashboard de Pagos y Liquidaciones <span style={{ color: '#10B981' }}>Parla Sport</span>
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '2px' }}>
            Control de sesiones finalizadas, cálculo automático de honorarios por profesor y liquidación semanal.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={() => {
              setTempRates(paymentRates);
              setIsRatesModalOpen(true);
            }}
            style={{ padding: '8px 14px', fontSize: '0.82rem', borderColor: 'rgba(212, 175, 55, 0.4)', color: '#FBBF24' }}
          >
            <Settings size={16} /> Configurar Tarifas
          </button>

          <button className="btn-primary" onClick={() => setActiveTab('scheduler')} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
            <CalendarCheck size={16} /> Programar Sesión
          </button>
        </div>
      </div>

      {/* ─── Barra de Control de Tiempo: Modo Semanal vs Mensual ─── */}
      <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        {/* Toggle Semanal / Mensual */}
        <div style={{
          display: 'flex',
          background: 'rgba(6, 13, 30, 0.8)',
          padding: '4px',
          borderRadius: '10px',
          border: '1px solid rgba(212, 175, 55, 0.25)'
        }}>
          <button
            type="button"
            onClick={() => setViewMode('weekly')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'weekly' ? 'linear-gradient(135deg, #FBBF24, #D4AF37)' : 'transparent',
              color: viewMode === 'weekly' ? '#060D1E' : '#94A3B8',
              fontWeight: viewMode === 'weekly' ? 800 : 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Liquidación Semanal (L-D)
          </button>

          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: viewMode === 'monthly' ? 'linear-gradient(135deg, #FBBF24, #D4AF37)' : 'transparent',
              color: viewMode === 'monthly' ? '#060D1E' : '#94A3B8',
              fontWeight: viewMode === 'monthly' ? 800 : 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            Vista Mensual (Hasta 1 Mes)
          </button>
        </div>

        {/* Controles de Navegación de Fecha */}
        {viewMode === 'weekly' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              onClick={() => setWeekOffset(prev => prev - 1)}
              title="Semana Anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC' }}>
              📅 {currentWeekRange.label}
            </span>

            <button
              className="btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              onClick={() => setWeekOffset(prev => prev + 1)}
              title="Semana Siguiente"
            >
              <ChevronRight size={16} />
            </button>

            {weekOffset !== 0 && (
              <button
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.75rem', color: '#10B981', borderColor: 'rgba(16,185,129,0.3)' }}
                onClick={() => setWeekOffset(0)}
              >
                Semana Actual
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarIcon size={18} color="#D4AF37" />
            <input
              type="month"
              className="input-field"
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* ─── Tarjetas de Métricas de Liquidación y Rendimiento ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
        gap: '14px'
      }}>
        {/* Total Clases Realizadas */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Clases Realizadas</span>
            <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Award size={18} color="#A78BFA" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC', margin: '8px 0 2px' }}>
            {totals.totalRealized}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#A78BFA' }}>
            En {viewMode === 'weekly' ? 'esta semana' : 'este mes'}
          </span>
        </div>

        {/* Monto Total a Pagar / Generado */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Total Honorarios</span>
            <div style={{ background: 'rgba(212, 175, 55, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <DollarSign size={18} color="#FBBF24" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FBBF24', margin: '8px 0 2px' }}>
            ${totals.totalGenerated}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#FBBF24' }}>
            Tarifas: 1:1 (${paymentRates['1-1'] || 15}) • 1:2 (${paymentRates['1-2'] || 20}) • 1:3 (${paymentRates['1-3'] || 25})
          </span>
        </div>

        {/* Monto Pendiente por Pagar */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Pendiente por Pagar</span>
            <div style={{ background: 'rgba(249, 115, 22, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <Clock size={18} color="#FB923C" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FB923C', margin: '8px 0 2px' }}>
            ${totals.totalPending}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#FB923C' }}>Listas para liquidación</span>
        </div>

        {/* Monto Ya Liquidado / Pagado */}
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Total Pagado</span>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '6px', borderRadius: '8px' }}>
              <CheckCircle2 size={18} color="#10B981" />
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10B981', margin: '8px 0 2px' }}>
            ${totals.totalPaid}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10B981' }}>Pagos confirmados</span>
        </div>
      </div>

      {/* ─── Tabla / Grid de Liquidación Detallada por Profesor ─── */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={20} color="#FBBF24" /> Resumen de Liquidación por Profesor ({viewMode === 'weekly' ? 'Semanal' : 'Mensual'})
          </h3>
          <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontStyle: 'italic' }}>
            💡 Al marcar las sesiones como "Pagada", se actualizan automáticamente las cuentas del profesor.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {coachSettlements.map((item) => {
            return (
              <div
                key={item.coach.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px'
                }}
              >
                {/* Info Entrenador y Desglose */}
                <div style={{ flex: 1, minWidth: '260px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC' }}>
                      {item.coach.nombre}
                    </h4>
                    <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                      {item.coach.especialidad || 'Profesor'}
                    </span>
                  </div>

                  {/* Detalle de Sesiones */}
                  <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginTop: '6px' }}>
                    <strong>{item.realizedCount} sesiones realizadas</strong> en el período:{' '}
                    <span style={{ color: '#94A3B8' }}>
                      ({item.count11} de 1:1 • {item.count12} de 1:2 • {item.count13} de 1:3)
                    </span>
                  </div>

                  {/* Estado de Pagos */}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{ color: item.pendingAmount > 0 ? '#FB923C' : '#64748B', fontWeight: 600 }}>
                      ⏳ Pendiente: ${item.pendingAmount} ({item.pendingSessions.length} clases)
                    </span>
                    <span style={{ color: item.paidAmount > 0 ? '#34D399' : '#64748B', fontWeight: 600 }}>
                      ✅ Pagado: ${item.paidAmount} ({item.paidSessions.length} clases)
                    </span>
                  </div>
                </div>

                {/* Monto Total y Botón de Liquidación */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700 }}>
                      Total Honorarios
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FBBF24' }}>
                      ${item.totalAmount}
                    </div>
                  </div>

                  {item.pendingAmount > 0 ? (
                    <button
                      className="btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem', background: 'linear-gradient(135deg, #10B981, #059669)' }}
                      onClick={() => handleSettleCoachPending(item)}
                      title="Liquidar todas las sesiones pendientes de este profesor"
                    >
                      <CheckCircle2 size={16} /> Liquidar ${item.pendingAmount}
                    </button>
                  ) : item.realizedCount > 0 ? (
                    <span className="badge badge-emerald" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
                      ✓ Al Día (Liquidado)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Sin clases completadas
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Modal de Configuración de Tarifas de Pago ─── */}
      <Modal
        isOpen={isRatesModalOpen}
        onClose={() => setIsRatesModalOpen(false)}
        title="⚙️ Configurar Tarifas de Pago por Sesión"
        widthPx="500px"
      >
        <form onSubmit={handleSaveRates} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '0.85rem', color: '#CBD5E1' }}>
            Establece el monto en dólares ($) a pagar al profesor por cada clase realizada según el formato de entrenamiento:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(130px, 100%), 1fr))', gap: '14px' }}>
            <div>
              <label className="input-label">Tarifa Formato 1-1 ($)</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                className="input-field"
                value={tempRates['1-1'] || ''}
                onChange={(e) => setTempRates({ ...tempRates, '1-1': e.target.value })}
                placeholder="Ej. 15"
              />
            </div>

            <div>
              <label className="input-label">Tarifa Formato 1-2 ($)</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                className="input-field"
                value={tempRates['1-2'] || ''}
                onChange={(e) => setTempRates({ ...tempRates, '1-2': e.target.value })}
                placeholder="Ej. 20"
              />
            </div>

            <div>
              <label className="input-label">Tarifa Formato 1-3 ($)</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                className="input-field"
                value={tempRates['1-3'] || ''}
                onChange={(e) => setTempRates({ ...tempRates, '1-3': e.target.value })}
                placeholder="Ej. 25"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={() => setIsRatesModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingRates}>
              {savingRates ? 'Guardando...' : 'Guardar Tarifas'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default DashboardOverview;
