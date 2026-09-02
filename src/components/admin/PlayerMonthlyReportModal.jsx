import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Printer,
  Share2,
  User,
  MessageSquare,
  Sparkles,
  Phone,
  ShieldCheck
} from 'lucide-react';
import Modal from '../common/Modal';
import { formatTo12Hour } from '../../utils/scheduling';
import { showToast } from '../common/ToastNotification';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const PlayerMonthlyReportModal = ({
  isOpen,
  onClose,
  player,
  sessions = [],
  coaches = []
}) => {
  // Generar lista de los últimos 12 meses para el selector
  const availableMonths = useMemo(() => {
    const list = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNumber = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${monthNumber}`;
      const label = `${MONTH_NAMES[d.getMonth()]} ${year}`;
      list.push({ key, label, year, monthIndex: d.getMonth() });
    }
    return list;
  }, []);

  const [selectedMonthKey, setSelectedMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  if (!player) return null;

  // Filtrar sesiones del jugador en el mes seleccionado
  const monthSessions = useMemo(() => {
    if (!sessions || !player?.id) return [];
    return sessions.filter(s => {
      if (!s.fecha || !s.fecha.startsWith(selectedMonthKey)) return false;
      const playerIds = Array.isArray(s.jugadoresIds)
        ? s.jugadoresIds
        : (s.jugadorId ? [s.jugadorId] : []);
      return playerIds.includes(player.id);
    }).sort((a, b) => (a.fecha > b.fecha ? 1 : -1));
  }, [sessions, player?.id, selectedMonthKey]);

  // Métricas del mes
  const stats = useMemo(() => {
    const total = monthSessions.length;
    const completed = monthSessions.filter(s => s.estado === 'realizada').length;
    const cancelled = monthSessions.filter(s => s.estado === 'cancelada' || s.estado === 'ausente').length;
    const pending = monthSessions.filter(s => s.estado === 'confirmada' || s.estado === 'sin_confirmar').length;
    const attendanceRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    // Calcular horas de entrenamiento (suponiendo 1 hora estándar por sesión realizada)
    const hoursTrained = completed * 1;

    return {
      total,
      completed,
      cancelled,
      pending,
      attendanceRate,
      hoursTrained
    };
  }, [monthSessions]);

  const [filterMode, setFilterMode] = useState('all'); // 'all' (Todas las observaciones) | 'month' (Solo de este mes)

  // ─── AGREGAR TODAS LAS OBSERVACIONES DE TODOS LOS PROFESORES ───
  // Combina: historialObservaciones del jugador + notas de sesiones de cancha + observaciones técnicas del perfil
  const allObservations = useMemo(() => {
    if (!player?.id) return [];
    const list = [];
    const seenTexts = new Set();

    // 1. Historial explícito de observaciones del jugador
    const history = Array.isArray(player.historialObservaciones) ? player.historialObservaciones : [];
    history.forEach((obs, idx) => {
      const text = (obs.texto || '').trim();
      if (text) {
        seenTexts.add(text.toLowerCase());
        list.push({
          id: obs.id || `hist-${idx}`,
          fecha: obs.fecha || '',
          autorNombre: obs.autorNombre || 'Entrenador',
          texto: text,
          timestamp: obs.timestamp || obs.fecha || '',
          origen: 'Observación Técnica'
        });
      }
    });

    // 2. Notas registradas por los profesores en cada sesión donde participó el alumno
    (sessions || []).forEach((s) => {
      const pIds = Array.isArray(s.jugadoresIds) ? s.jugadoresIds : (s.jugadorId ? [s.jugadorId] : []);
      if (pIds.includes(player.id)) {
        const sessionNote = (s.notas || '').trim();
        if (sessionNote && !seenTexts.has(sessionNote.toLowerCase())) {
          seenTexts.add(sessionNote.toLowerCase());
          list.push({
            id: `session-note-${s.id}`,
            fecha: s.fecha || '',
            autorNombre: s.entrenadorNombre || 'Profesor de Cancha',
            texto: sessionNote,
            timestamp: s.fecha || '',
            tipo: s.tipo,
            origen: `Sesión ${s.tipo || '1-1'}`
          });
        }
      }
    });

    // 3. Observaciones técnicas generales del perfil (si no están ya en la lista)
    if (player.observacionesTecnicas && player.observacionesTecnicas.trim()) {
      const genText = player.observacionesTecnicas.trim();
      if (!seenTexts.has(genText.toLowerCase())) {
        list.push({
          id: `player-general-obs`,
          fecha: player.fechaRegistro || 'Registro',
          autorNombre: 'Diagnóstico Parla Sport',
          texto: genText,
          timestamp: player.fechaRegistro || '',
          origen: 'Diagnóstico Inicial'
        });
      }
    }

    // Ordenar cronológicamente (más recientes primero)
    return list.sort((a, b) => {
      const timeA = new Date(a.timestamp || a.fecha || 0).getTime();
      const timeB = new Date(b.timestamp || b.fecha || 0).getTime();
      return timeB - timeA;
    });
  }, [player.historialObservaciones, player.id, player.observacionesTecnicas, player.fechaRegistro, sessions]);

  // Observaciones del mes seleccionado
  const monthObservations = useMemo(() => {
    return allObservations.filter(obs => !obs.fecha || obs.fecha.startsWith(selectedMonthKey));
  }, [allObservations, selectedMonthKey]);

  // Observaciones activas según el filtro del usuario
  const displayedObservations = filterMode === 'all' ? allObservations : monthObservations;

  const selectedMonthLabel = availableMonths.find(m => m.key === selectedMonthKey)?.label || selectedMonthKey;

  // Acción de Imprimir / Generar PDF
  const handlePrint = () => {
    window.print();
  };

  // Compartir por WhatsApp al tutor
  const handleShareWhatsApp = () => {
    const rawPhone = (player.contactoTutor || '').replace(/[^0-9+]/g, '');
    
    let text = `⚽ *PARLA SPORT - REPORTE DE RENDIMIENTO*\n`;
    text += `👤 *Jugador:* ${player.nombre}\n`;
    text += `📅 *Periodo:* ${selectedMonthLabel}\n`;
    text += `📍 *Posición:* ${player.posicion} | ${player.edad} años\n\n`;
    text += `📊 *ESTADÍSTICAS DEL MES:*\n`;
    text += `• Sesiones Realizadas: ${stats.completed} de ${stats.total}\n`;
    text += `• Porcentaje de Asistencia: ${stats.attendanceRate}%\n`;
    text += `• Horas de Entrenamiento: ${stats.hoursTrained} hrs\n\n`;

    const notesToShare = displayedObservations.length > 0 ? displayedObservations : allObservations;
    if (notesToShare.length > 0) {
      text += `📝 *OBSERVACIONES DEL CUERPO TÉCNICO:*\n`;
      notesToShare.slice(0, 5).forEach((obs, idx) => {
        text += `${idx + 1}. [${obs.fecha}] *${obs.autorNombre || 'Entrenador'} (${obs.origen || 'Nota'}):* "${obs.texto}"\n`;
      });
      text += `\n`;
    } else {
      text += `📝 *Observaciones:* Sin notas particulares registradas.\n\n`;
    }

    text += `¡Seguimos entrenando al máximo nivel! 🏆\n_Parla Sport Training Academy_`;

    const encodedText = encodeURIComponent(text);
    const waUrl = rawPhone
      ? `https://wa.me/${rawPhone.replace('+', '')}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, '_blank');
    showToast('Enlace de WhatsApp generado', 'Abriendo WhatsApp con el resumen del reporte.', 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`📊 Reporte Mensual: ${player.nombre}`}
      widthPx="850px"
    >
      <div className="report-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Barra de Acciones y Selector de Mes (Oculta en Impresión) */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          background: 'rgba(15, 23, 42, 0.7)',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={18} color="#FBBF24" />
            <label style={{ fontSize: '0.85rem', color: '#CBD5E1', fontWeight: 600 }}>
              Seleccionar Mes:
            </label>
            <select
              className="input-field"
              style={{ width: 'auto', minWidth: '170px', padding: '6px 12px', fontSize: '0.85rem' }}
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
            >
              {availableMonths.map(m => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handlePrint}
              title="Imprimir o guardar como PDF"
            >
              <Printer size={15} color="#60A5FA" /> Imprimir / PDF
            </button>

            <button
              type="button"
              style={{
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#34D399',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease'
              }}
              onClick={handleShareWhatsApp}
              title="Compartir resumen por WhatsApp al tutor"
            >
              <Share2 size={15} /> WhatsApp Tutor
            </button>
          </div>
        </div>

        {/* ─── CONTENIDO DEL REPORTE (IMPRIMIBLE) ─── */}
        <div id="printable-report" className="printable-sheet" style={{
          background: 'rgba(6, 13, 30, 0.85)',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          
          {/* Membrete Oficial */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid rgba(212, 175, 55, 0.3)',
            paddingBottom: '16px',
            flexWrap: 'wrap',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}>
                <Award size={26} color="#FFFFFF" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#F8FAFC', margin: 0, letterSpacing: '-0.02em' }}>
                  PARLA SPORT
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#FBBF24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Informe Mensual de Rendimiento Deportivo
                </span>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38BDF8' }}>
                {selectedMonthLabel}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                Fecha de Emisión: {new Date().toLocaleDateString('es-ES')}
              </span>
            </div>
          </div>

          {/* Tarjeta del Jugador */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            flexWrap: 'wrap'
          }}>
            {player.foto ? (
              <img
                src={player.foto}
                alt={player.nombre}
                style={{ width: '70px', height: '70px', borderRadius: '14px', objectFit: 'cover', border: '2px solid #10B981' }}
              />
            ) : (
              <div style={{
                width: '70px', height: '70px', borderRadius: '14px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '2px solid rgba(16, 185, 129, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <User size={34} color="#34D399" />
              </div>
            )}

            <div style={{ flex: 1, minWidth: '220px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
                {player.nombre}
              </h3>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                <span className="badge badge-emerald">{player.posicion}</span>
                <span className="badge badge-gold">{player.edad} Años</span>
                <span className="badge badge-blue">Pierna: {player.piernaHabil}</span>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#94A3B8', textAlign: 'right' }}>
              <div><strong>F. Nacimiento:</strong> {player.fechaNacimiento || 'N/A'}</div>
              <div><strong>Tutor:</strong> {player.contactoTutor || 'No registrado'}</div>
            </div>
          </div>

          {/* Tarjetas KPI del Mes */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '12px'
          }}>
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              padding: '12px',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>SESIONES REALIZADAS</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34D399', marginTop: '2px' }}>
                {stats.completed} <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>/ {stats.total}</span>
              </div>
            </div>

            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              padding: '12px',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>% ASISTENCIA</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60A5FA', marginTop: '2px' }}>
                {stats.attendanceRate}%
              </div>
            </div>

            <div style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              padding: '12px',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>HORAS DE CANCHA</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FBBF24', marginTop: '2px' }}>
                {stats.hoursTrained} hrs
              </div>
            </div>

            <div style={{
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              padding: '12px',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>OBSERVACIONES TOTALES</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#C084FC', marginTop: '2px' }}>
                {allObservations.length}
              </div>
            </div>
          </div>

          {/* Historial de Observaciones Técnicas de los Profesores */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: '8px'
            }}>
              <div style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                color: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <MessageSquare size={18} color="#10B981" />
                Observaciones y Evaluaciones de los Profesores:
              </div>

              {/* Selector de filtro de observaciones (Mes vs Todo el Historial) */}
              <div className="no-print" style={{ display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.8)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  style={{
                    background: filterMode === 'all' ? '#10B981' : 'transparent',
                    color: filterMode === 'all' ? '#FFFFFF' : '#94A3B8',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setFilterMode('all')}
                >
                  📚 Todas ({allObservations.length})
                </button>

                <button
                  type="button"
                  style={{
                    background: filterMode === 'month' ? '#10B981' : 'transparent',
                    color: filterMode === 'month' ? '#FFFFFF' : '#94A3B8',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => setFilterMode('month')}
                >
                  📅 Este Mes ({monthObservations.length})
                </button>
              </div>
            </div>

            {displayedObservations.length === 0 ? (
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '20px',
                borderRadius: '10px',
                textAlign: 'center',
                color: '#94A3B8',
                fontSize: '0.85rem',
                fontStyle: 'italic'
              }}>
                {filterMode === 'month'
                  ? `No hay observaciones registradas en ${selectedMonthLabel}. Puedes pulsar en "Todas" para ver el historial acumulado.`
                  : 'Aún no se han registrado observaciones técnicas de los profesores para este alumno.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {displayedObservations.map((obs, idx) => (
                  <div
                    key={obs.id || idx}
                    style={{
                      background: 'rgba(15, 23, 42, 0.7)',
                      borderLeft: '4px solid #10B981',
                      padding: '12px 14px',
                      borderRadius: '0 10px 10px 0',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderLeftWidth: '4px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                      fontSize: '0.78rem',
                      color: '#94A3B8',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#34D399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={14} /> {obs.autorNombre || 'Entrenador'}
                        </span>
                        {obs.origen && (
                          <span style={{
                            background: 'rgba(59, 130, 246, 0.15)',
                            color: '#60A5FA',
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            {obs.origen}
                          </span>
                        )}
                      </div>
                      <span>📅 {obs.fecha || 'Fecha no registrada'}</span>
                    </div>
                    <div style={{ color: '#F1F5F9', fontSize: '0.88rem', lineHeight: '1.45', fontStyle: 'italic' }}>
                      "{obs.texto}"
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen de Sesiones del Mes */}
          {monthSessions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#CBD5E1',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: '4px'
              }}>
                Detalle de Sesiones Programadas en el Mes:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {monthSessions.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.78rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{s.fecha}</span>
                      <span style={{ color: '#94A3B8' }}>{formatTo12Hour(s.horaInicio)} - {formatTo12Hour(s.horaFin)}</span>
                      <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{s.tipo}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#94A3B8' }}>Prof: {s.entrenadorNombre}</span>
                      <span className={`badge ${s.estado === 'realizada' ? 'badge-emerald' : s.estado === 'cancelada' ? 'badge-danger' : 'badge-blue'}`} style={{ fontSize: '0.65rem' }}>
                        {s.estado === 'realizada' ? 'Completada' : s.estado === 'cancelada' ? 'Cancelada' : 'Programada'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pie de Reporte / Firma */}
          <div style={{
            marginTop: '10px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            color: '#64748B',
            fontSize: '0.72rem'
          }}>
            <div>
              <strong>Parla Sport Training System</strong> • Sistema de Fichas y Rendimiento Deportivo
            </div>
            <div style={{ textAlign: 'right', fontStyle: 'italic' }}>
              Validado por la Dirección Técnica
            </div>
          </div>

        </div>

      </div>

      {/* Estilos para Vista de Impresión / PDF */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print {
            display: none !important;
          }
          #printable-report, #printable-report * {
            visibility: visible;
          }
          #printable-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            background: #FFFFFF !important;
            color: #0F172A !important;
            border: none !important;
            box-shadow: none !important;
          }
          #printable-report h2, #printable-report h3, #printable-report div, #printable-report span {
            color: #0F172A !important;
          }
          #printable-report strong {
            color: #000000 !important;
          }
          .badge {
            border: 1px solid #94A3B8 !important;
            color: #0F172A !important;
            background: #E2E8F0 !important;
          }
        }
      `}</style>
    </Modal>
  );
};

export default PlayerMonthlyReportModal;
