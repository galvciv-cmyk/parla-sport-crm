import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity, Bell, X, ChevronDown, ChevronUp, Wifi, Database,
  Smartphone, Clock, AlertTriangle, CheckCircle, Info, Zap, Trash2
} from 'lucide-react';

/* =============================================
   NotificationDebugPanel
   Panel en tiempo real que muestra CUÁNDO y 
   CÓMO llegan/se intercambian las notificaciones.
   Solo visible en desarrollo o si el admin lo activa.
   ============================================= */

// ─── Colores por canal ───
const CHANNEL_CONFIG = {
  'firestore':   { color: '#F97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.4)', label: 'Firestore',    icon: Database },
  'onesignal':   { color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.4)',  label: 'OneSignal',   icon: Smartphone },
  'toast':       { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.4)',  label: 'Toast In-App', icon: Bell },
  'sw-push':     { color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.4)',  label: 'SW Push (OS)', icon: Zap },
  'permission':  { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)',  label: 'Permisos',    icon: CheckCircle },
  'error':       { color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.4)',   label: 'Error',        icon: AlertTriangle },
  'info':        { color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.3)', label: 'Sistema',      icon: Info }
};

import { logNotifEvent, subscribeDebugEvents } from '../../utils/debugLogger';

// ─── Tiempo relativo ───
const timeAgo = (date) => {
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 2) return 'ahora';
  if (diff < 60) return `hace ${Math.floor(diff)}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// ─── Fila de evento ───
const EventRow = ({ event }) => {
  const [expanded, setExpanded] = useState(false);
  const [age, setAge] = useState('ahora');
  const cfg = CHANNEL_CONFIG[event.channel] || CHANNEL_CONFIG.info;
  const Icon = cfg.icon;

  useEffect(() => {
    const iv = setInterval(() => setAge(timeAgo(event.timestamp)), 1000);
    return () => clearInterval(iv);
  }, [event.timestamp]);

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        transition: 'background 0.15s'
      }}
    >
      <div
        onClick={() => event.data && setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '9px 14px',
          cursor: event.data ? 'pointer' : 'default'
        }}
      >
        {/* Canal badge */}
        <div style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 7px',
          borderRadius: '6px',
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          fontSize: '0.65rem',
          fontWeight: 700,
          color: cfg.color,
          marginTop: '1px',
          whiteSpace: 'nowrap'
        }}>
          <Icon size={10} />
          {cfg.label}
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#E2E8F0',
            lineHeight: 1.3,
            marginBottom: event.detail ? '2px' : 0
          }}>
            {event.title}
          </div>
          {event.detail && (
            <div style={{
              fontSize: '0.72rem',
              color: '#64748B',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}>
              {event.detail}
            </div>
          )}
        </div>

        {/* Timestamp + expand */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span style={{
            fontSize: '0.63rem',
            color: '#475569',
            whiteSpace: 'nowrap'
          }}>
            {event.timestamp.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          {event.data && (
            expanded
              ? <ChevronUp size={12} color="#64748B" />
              : <ChevronDown size={12} color="#64748B" />
          )}
        </div>
      </div>

      {/* Datos expandidos */}
      {expanded && event.data && (
        <div style={{
          margin: '0 14px 10px',
          padding: '10px',
          borderRadius: '8px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid rgba(255,255,255,0.06)',
          fontSize: '0.68rem',
          color: '#94A3B8',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          maxHeight: '120px',
          overflowY: 'auto',
          lineHeight: 1.5
        }}>
          {typeof event.data === 'string' ? event.data : JSON.stringify(event.data, null, 2)}
        </div>
      )}
    </div>
  );
};

// ─── Panel Principal ───
const NotificationDebugPanel = () => {
  const [events, setEvents] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [filter, setFilter] = useState('all');
  const [newCount, setNewCount] = useState(0);
  const listRef = useRef(null);
  const lastOpenedRef = useRef(0);

  const addEvent = useCallback((event) => {
    setEvents(prev => {
      const updated = [event, ...prev].slice(0, 200); // Máximo 200 eventos
      return updated;
    });
    setNewCount(c => c + 1);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeDebugEvents(addEvent);

    // Evento inicial al montar
    logNotifEvent('info', '🟢 Panel de Debug iniciado', 'Escuchando eventos de notificaciones...');

    // Monitorear permiso de notificaciones
    if ('Notification' in window) {
      const perm = Notification.permission;
      logNotifEvent('permission',
        `Permiso actual: ${perm === 'granted' ? '✅ Concedido' : perm === 'denied' ? '❌ Bloqueado' : '⏳ Sin decidir'}`,
        `Notification.permission = "${perm}"`
      );
    }

    // Detectar si el Service Worker está activo
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration('/').then(reg => {
        if (reg) {
          logNotifEvent('sw-push',
            `✅ Service Worker activo`,
            `Scope: ${reg.scope} | Estado: ${reg.active?.state || 'desconocido'}`
          );
        } else {
          logNotifEvent('sw-push', '⚠️ Service Worker no registrado', 'sw.js no está activo aún');
        }
      }).catch(() => {
        logNotifEvent('error', 'Error al verificar Service Worker');
      });
    }

    return () => {
      unsubscribe();
    };
  }, [addEvent]);

  // Resetear contador de nuevos al abrir
  useEffect(() => {
    if (isOpen) {
      setNewCount(0);
      lastOpenedRef.current = Date.now();
    }
  }, [isOpen]);

  // Auto-scroll al recibir nuevos eventos
  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [events.length, isOpen]);

  const filteredEvents = filter === 'all'
    ? events
    : events.filter(e => e.channel === filter);

  const channels = ['all', 'firestore', 'toast', 'onesignal', 'sw-push', 'permission', 'error'];

  return (
    <>
      {/* ─── Botón flotante ─── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        title="Panel de Debug — Notificaciones"
        style={{
          position: 'fixed',
          bottom: 'calc(72px + var(--sab))',
          left: '14px',
          zIndex: 99998,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          border: `2px solid ${newCount > 0 ? 'rgba(251,191,36,0.7)' : 'rgba(255,255,255,0.12)'}`,
          background: newCount > 0
            ? 'linear-gradient(135deg, rgba(30,41,59,0.98), rgba(15,28,63,0.98))'
            : 'rgba(15,23,42,0.95)',
          backdropFilter: 'blur(12px)',
          color: newCount > 0 ? '#FBBF24' : '#64748B',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: newCount > 0
            ? '0 0 20px rgba(251,191,36,0.35), 0 4px 16px rgba(0,0,0,0.5)'
            : '0 4px 16px rgba(0,0,0,0.4)',
          transition: 'all 0.3s ease',
          animation: newCount > 0 ? 'debug-pulse 2s ease-in-out infinite' : 'none'
        }}
      >
        <Activity size={18} />
        {newCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#FBBF24',
            color: '#000',
            fontSize: '0.6rem',
            fontWeight: 800,
            minWidth: '16px',
            height: '16px',
            borderRadius: '8px',
            padding: '0 3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #060D1E'
          }}>
            {newCount > 99 ? '99+' : newCount}
          </span>
        )}
      </button>

      {/* ─── Panel desplegable ─── */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isPinned ? 0 : 'calc(75px + var(--sab))',
            left: isPinned ? 0 : '12px',
            width: isPinned ? '100%' : 'min(420px, calc(100vw - 24px))',
            height: isPinned ? '45vh' : 'min(500px, 70vh)',
            background: 'rgba(8, 15, 35, 0.98)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: isPinned ? '16px 16px 0 0' : '16px',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
            zIndex: 99997,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Cabecera */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: 'rgba(15,23,42,0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#FBBF24" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F8FAFC' }}>
                Debug Notificaciones
              </span>
              <span style={{
                fontSize: '0.65rem',
                color: '#64748B',
                background: 'rgba(255,255,255,0.05)',
                padding: '1px 6px',
                borderRadius: '99px',
                border: '1px solid rgba(255,255,255,0.06)'
              }}>
                {events.length} eventos
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setEvents([])}
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#EF4444',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  fontSize: '0.65rem',
                  fontWeight: 700
                }}
                title="Limpiar logs"
              >
                <Trash2 size={11} /> Limpiar
              </button>
              <button
                onClick={() => setIsPinned(p => !p)}
                style={{
                  background: isPinned ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                  border: isPinned ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  color: isPinned ? '#FBBF24' : '#64748B',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  fontWeight: 700
                }}
                title={isPinned ? 'Modo ventana' : 'Expandir'}
              >
                {isPinned ? '⊡' : '⊟'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#64748B',
                  borderRadius: '6px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Filtros de canal */}
          <div style={{
            padding: '8px 14px',
            display: 'flex',
            gap: '5px',
            overflowX: 'auto',
            flexShrink: 0,
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            {channels.map(ch => {
              const cfg = ch === 'all' ? null : CHANNEL_CONFIG[ch];
              const count = ch === 'all'
                ? events.length
                : events.filter(e => e.channel === ch).length;
              return (
                <button
                  key={ch}
                  onClick={() => setFilter(ch)}
                  style={{
                    flexShrink: 0,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: filter === ch
                      ? `1px solid ${cfg?.border || 'rgba(251,191,36,0.5)'}`
                      : '1px solid rgba(255,255,255,0.06)',
                    background: filter === ch
                      ? (cfg?.bg || 'rgba(251,191,36,0.1)')
                      : 'transparent',
                    color: filter === ch
                      ? (cfg?.color || '#FBBF24')
                      : '#64748B',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s'
                  }}
                >
                  {ch === 'all' ? '🔍 Todo' : (cfg?.label || ch)} ({count})
                </button>
              );
            })}
          </div>

          {/* Lista de eventos */}
          <div
            ref={listRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              fontSize: '0.8rem'
            }}
          >
            {filteredEvents.length === 0 ? (
              <div style={{
                padding: '30px',
                textAlign: 'center',
                color: '#475569',
                fontSize: '0.8rem'
              }}>
                <Activity size={28} color="#1E293B" style={{ marginBottom: '10px' }} />
                <div>Sin eventos en este canal</div>
                <div style={{ fontSize: '0.72rem', marginTop: '4px', color: '#334155' }}>
                  Los eventos aparecerán aquí en tiempo real
                </div>
              </div>
            ) : (
              filteredEvents.map(event => (
                <EventRow key={event.id} event={event} />
              ))
            )}
          </div>

          {/* Pie */}
          <div style={{
            padding: '6px 14px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10B981',
              boxShadow: '0 0 6px #10B981',
              animation: 'debug-live 1.5s ease-in-out infinite'
            }} />
            <span style={{ fontSize: '0.65rem', color: '#475569' }}>
              En vivo · Firestore + OneSignal + SW monitoreados
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes debug-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(251,191,36,0.35), 0 4px 16px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 30px rgba(251,191,36,0.6), 0 4px 20px rgba(0,0,0,0.6); }
        }
        @keyframes debug-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </>
  );
};

export default NotificationDebugPanel;
