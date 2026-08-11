import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, Smartphone, AlertCircle, BellOff, CheckCircle, Info, Zap } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import NotificationPermissionModal from '../common/NotificationPermissionModal';

const NotificationBell = () => {
  const { notifications, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const { role, activeCoachId, currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [permStatus, setPermStatus] = useState('default'); // 'default' | 'granted' | 'denied'
  const dropdownRef = useRef(null);

  const userEmail = (currentUser?.email || '').trim().toLowerCase();
  const userCoachId = activeCoachId || (currentUser?.uid ? `coach-${currentUser.uid}` : '');

  // Detectar estado del permiso al montar
  useEffect(() => {
    if ('Notification' in window) {
      setPermStatus(Notification.permission);
    }
  }, []);

  // Actualizar estado del permiso al abrir el panel
  useEffect(() => {
    if (isOpen && 'Notification' in window) {
      setPermStatus(Notification.permission);
    }
  }, [isOpen]);

  // Filtrar notificaciones según el rol activo y el destinatario
  const filteredNotifications = (notifications || []).filter(n => {
    if (!n) return false;
    if (role === 'admin') return true;

    const notifCoachId = String(n.recipientCoachId || '');
    const notifEmail = String(n.recipientEmail || '').trim().toLowerCase();
    const userName = String(currentUser?.nombre || '').trim().toLowerCase();

    if (n.recipientRole === 'all') return true;

    if (notifCoachId) {
      if (userCoachId && notifCoachId === String(userCoachId)) return true;
      if (activeCoachId && notifCoachId === String(activeCoachId)) return true;
      if (currentUser?.uid && (
        notifCoachId === String(currentUser.uid) ||
        notifCoachId.includes(String(currentUser.uid))
      )) return true;
    }

    if (userEmail && notifEmail && notifEmail === userEmail) return true;

    if (userName && userName.length > 2 && n.message && String(n.message).toLowerCase().includes(userName)) return true;
    if (userEmail && n.message && String(n.message).toLowerCase().includes(userEmail)) return true;

    if (n.recipientRole === 'coach' && !notifCoachId && !notifEmail) return true;

    return false;
  });

  const unreadCount = filteredNotifications.filter(n => !n.read).length;

  const handlePermissionGranted = (granted) => {
    setPermStatus(granted ? 'granted' : 'denied');
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertCircle size={14} color="#F59E0B" />;
      case 'success': return <CheckCircle size={14} color="#10B981" />;
      case 'info': return <Info size={14} color="#3B82F6" />;
      default: return <Bell size={14} color="#94A3B8" />;
    }
  };

  const getTypeBg = (type, read) => {
    if (read) return 'transparent';
    switch (type) {
      case 'warning': return 'rgba(245, 158, 11, 0.07)';
      case 'success': return 'rgba(16, 185, 129, 0.07)';
      case 'info': return 'rgba(59, 130, 246, 0.07)';
      default: return 'rgba(148, 163, 184, 0.05)';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        {/* ─── Ícono de Campana ─── */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'relative',
            background: isOpen
              ? 'rgba(212, 175, 55, 0.15)'
              : 'rgba(30, 41, 59, 0.7)',
            border: isOpen
              ? '1px solid rgba(212, 175, 55, 0.5)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            color: '#F8FAFC',
            padding: '10px',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          title="Centro de Notificaciones"
        >
          <Bell
            size={20}
            color={unreadCount > 0 ? '#FBBF24' : '#94A3B8'}
            style={{
              animation: unreadCount > 0 ? 'bell-shake 2s ease-in-out infinite' : 'none'
            }}
          />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              background: 'linear-gradient(135deg, #D4AF37, #FBBF24)',
              color: '#000',
              fontSize: '0.65rem',
              fontWeight: '800',
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              padding: '0 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(251, 191, 36, 0.6)',
              border: '1.5px solid #060D1E'
            }}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* ─── Panel de Notificaciones ─── */}
        {isOpen && (
          <div
            className="notification-dropdown-panel animate-fade-in"
            style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 10px)',
              width: 'min(370px, calc(100vw - 24px))',
              backgroundColor: 'rgba(10, 18, 40, 0.98)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(212,175,55,0.1)',
              zIndex: 9999,
              overflow: 'hidden'
            }}
          >
            {/* Encabezado */}
            <div style={{
              padding: '16px 18px 12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              background: 'rgba(15, 23, 42, 0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} color="#FBBF24" />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#F8FAFC' }}>
                    Notificaciones
                  </span>
                  {unreadCount > 0 && (
                    <span style={{
                      background: 'rgba(251,191,36,0.15)',
                      border: '1px solid rgba(251,191,36,0.4)',
                      color: '#FBBF24',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: '99px'
                    }}>
                      {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {filteredNotifications.length > 0 && (
                    <>
                      <button
                        onClick={() => markAllAsRead()}
                        style={{
                          background: 'rgba(16,185,129,0.08)',
                          border: '1px solid rgba(16,185,129,0.25)',
                          color: '#10B981',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700
                        }}
                        title="Marcar todas como leídas"
                      >
                        <Check size={12} /> Leídas
                      </button>
                      <button
                        onClick={clearNotifications}
                        style={{
                          background: 'rgba(239,68,68,0.08)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          color: '#EF4444',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Limpiar historial"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Estado del permiso de notificaciones */}
              <div style={{
                marginTop: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '10px',
                background: permStatus === 'granted'
                  ? 'rgba(16,185,129,0.08)'
                  : permStatus === 'denied'
                  ? 'rgba(239,68,68,0.08)'
                  : 'rgba(251,191,36,0.08)',
                border: permStatus === 'granted'
                  ? '1px solid rgba(16,185,129,0.25)'
                  : permStatus === 'denied'
                  ? '1px solid rgba(239,68,68,0.25)'
                  : '1px solid rgba(251,191,36,0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {permStatus === 'granted' ? (
                    <><CheckCircle size={13} color="#10B981" /><span style={{ fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>Push activo en este dispositivo</span></>
                  ) : permStatus === 'denied' ? (
                    <><BellOff size={13} color="#EF4444" /><span style={{ fontSize: '0.72rem', color: '#EF4444', fontWeight: 600 }}>Push bloqueado</span></>
                  ) : (
                    <><Bell size={13} color="#FBBF24" /><span style={{ fontSize: '0.72rem', color: '#FBBF24', fontWeight: 600 }}>Push no activado</span></>
                  )}
                </div>

                {permStatus !== 'granted' && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowPermModal(true);
                    }}
                    style={{
                      background: 'rgba(212,175,55,0.15)',
                      border: '1px solid rgba(212,175,55,0.4)',
                      color: '#FBBF24',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Smartphone size={11} /> Activar
                  </button>
                )}
              </div>
            </div>

            {/* Lista de Notificaciones */}
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {filteredNotifications.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🔔</div>
                  <div style={{ color: '#94A3B8', fontSize: '0.85rem', fontWeight: 500 }}>
                    Sin notificaciones pendientes
                  </div>
                  <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '4px' }}>
                    Las alertas aparecerán aquí en tiempo real
                  </div>
                </div>
              ) : (
                filteredNotifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => markAsRead(item.id)}
                    style={{
                      padding: '13px 18px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: getTypeBg(item.type, item.read),
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      borderLeft: !item.read
                        ? item.type === 'warning' ? '3px solid #F59E0B'
                        : item.type === 'success' ? '3px solid #10B981'
                        : item.type === 'info' ? '3px solid #3B82F6'
                        : '3px solid #64748B'
                        : '3px solid transparent'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                    onMouseOut={(e) => e.currentTarget.style.background = getTypeBg(item.type, item.read)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{
                        flexShrink: 0,
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '1px'
                      }}>
                        {getTypeIcon(item.type)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', gap: '8px' }}>
                          <span style={{
                            fontWeight: item.read ? 500 : 700,
                            fontSize: '0.82rem',
                            color: item.read ? '#94A3B8' : '#F8FAFC',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.title}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#475569', flexShrink: 0 }}>
                            {new Date(item.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{
                          fontSize: '0.76rem',
                          color: '#64748B',
                          lineHeight: '1.4',
                          margin: 0,
                          wordBreak: 'break-word'
                        }}>
                          {item.message}
                        </p>
                      </div>

                      {!item.read && (
                        <div style={{
                          flexShrink: 0,
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          background: '#FBBF24',
                          boxShadow: '0 0 6px rgba(251,191,36,0.6)',
                          marginTop: '6px'
                        }} />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {filteredNotifications.length > 0 && (
              <div style={{
                padding: '10px 18px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                textAlign: 'center',
                fontSize: '0.72rem',
                color: '#475569'
              }}>
                {filteredNotifications.length} notificaci{filteredNotifications.length !== 1 ? 'ones' : 'ón'} · Sincronizado con Firestore
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal in-app de permisos */}
      <NotificationPermissionModal
        isOpen={showPermModal}
        onClose={() => setShowPermModal(false)}
        onGranted={handlePermissionGranted}
      />

      <style>{`
        @keyframes bell-shake {
          0%, 100% { transform: rotate(0deg); }
          10%, 30% { transform: rotate(-10deg); }
          20%, 40% { transform: rotate(10deg); }
          50% { transform: rotate(0deg); }
        }
      `}</style>
    </>
  );
};

export default NotificationBell;
