import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, Smartphone, AlertCircle, BellOff, CheckCircle, Info, Zap } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import NotificationPermissionModal from '../common/NotificationPermissionModal';

const NotificationBell = () => {
  const { notifications, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const { role, activeCoachId, currentUser, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [permStatus, setPermStatus] = useState('default');
  const dropdownRef = useRef(null);

  const userEmail = (currentUser?.email || '').trim().toLowerCase();
  const userCoachId = activeCoachId || (currentUser?.uid ? `coach-${currentUser.uid}` : '');
  const isUserAdmin = isAdmin || role === 'admin' || currentUser?.role === 'admin';

  useEffect(() => {
    if ('Notification' in window) {
      setPermStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (isOpen && 'Notification' in window) {
      setPermStatus(Notification.permission);
    }
  }, [isOpen]);

  // ─── REGLA ESTRICTA DE PRIVACIDAD: ───
  // 1. El ADMINISTRADOR es el ÚNICO que puede ver todas las notificaciones de los entrenadores
  // 2. Un ENTRENADOR SOLO ve notificaciones dirigidas ESTRICTAMENTE a él (sus sesiones asignadas, pagos, cancelaciones)
  const filteredNotifications = (notifications || []).filter(n => {
    if (!n) return false;

    // Si es Administrador -> Ve TODO el flujo y eventos del sistema
    if (isUserAdmin) return true;

    // Si es Entrenador -> NUNCA ve notificaciones de administración ni de otros entrenadores
    if (n.recipientRole === 'admin') return false;

    const notifCoachId = String(n.recipientCoachId || '');
    const notifEmail = String(n.recipientEmail || '').trim().toLowerCase();

    // Solo si coincide exactamente con SU ID de entrenador o su correo
    if (notifCoachId) {
      if (userCoachId && notifCoachId === String(userCoachId)) return true;
      if (activeCoachId && notifCoachId === String(activeCoachId)) return true;
      if (currentUser?.uid && (
        notifCoachId === String(currentUser.uid) ||
        notifCoachId === `coach-${currentUser.uid}`
      )) return true;
    }

    if (userEmail && notifEmail && notifEmail === userEmail) return true;

    // Notificaciones globales (no admin)
    if (n.recipientRole === 'all') return true;

    return false;
  });

  const unreadCount = filteredNotifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const getNotifIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertCircle size={15} color="#F59E0B" />;
      case 'success':
        return <CheckCircle size={15} color="#10B981" />;
      case 'system':
        return <Zap size={15} color="#8B5CF6" />;
      default:
        return <Info size={15} color="#3B82F6" />;
    }
  };

  const getNotifBorderColor = (type) => {
    switch (type) {
      case 'warning': return 'rgba(245, 158, 11, 0.4)';
      case 'success': return 'rgba(16, 185, 129, 0.4)';
      case 'system':  return 'rgba(139, 92, 246, 0.4)';
      default:        return 'rgba(59, 130, 246, 0.3)';
    }
  };

  const formatNotifTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHour / 24);

      if (diffSec < 60) return 'hace un momento';
      if (diffMin < 60) return `hace ${diffMin}m`;
      if (diffHour < 24) return `hace ${diffHour}h`;
      if (diffDays === 1) return 'ayer';
      if (diffDays < 7) return `hace ${diffDays}d`;
      return date.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
        {/* Botón Campana */}
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="notification-bell-btn"
          aria-label="Notificaciones"
          style={{
            position: 'relative',
            background: unreadCount > 0 ? 'rgba(212,175,55,0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: unreadCount > 0 ? '1px solid rgba(212, 175, 55, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '8px',
            color: unreadCount > 0 ? '#FBBF24' : '#94A3B8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: unreadCount > 0 ? '0 0 15px rgba(212, 175, 55, 0.25)' : 'none'
          }}
        >
          <Bell size={18} />

          {unreadCount > 0 && (
            <span
              className="animate-pulse"
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                color: '#FFFFFF',
                fontSize: '0.62rem',
                fontWeight: 800,
                minWidth: '17px',
                height: '17px',
                borderRadius: '99px',
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.7)',
                border: '1.5px solid #060D1E'
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
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
              padding: '14px 16px 10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              background: 'rgba(15, 23, 42, 0.8)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} color="#FBBF24" />
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#F8FAFC' }}>
                    {isUserAdmin ? 'Notificaciones (Admin)' : 'Mis Notificaciones'}
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
                        title="Limpiar todas"
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Estado Push */}
              <div style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 8px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {permStatus === 'granted' ? (
                    <><CheckCircle size={12} color="#10B981" /><span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 600 }}>Push Activo en este móvil</span></>
                  ) : permStatus === 'denied' ? (
                    <><BellOff size={12} color="#EF4444" /><span style={{ fontSize: '0.7rem', color: '#EF4444', fontWeight: 600 }}>Push bloqueado</span></>
                  ) : (
                    <><Bell size={12} color="#FBBF24" /><span style={{ fontSize: '0.7rem', color: '#FBBF24', fontWeight: 600 }}>Push no activado</span></>
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
            <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
              {filteredNotifications.length === 0 ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748B' }}>
                  <BellOff size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>Sin notificaciones</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem' }}>
                    {isUserAdmin ? 'Las alertas del sistema aparecerán aquí' : 'Tus avisos de sesiones y pagos aparecerán aquí'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      backgroundColor: notif.read ? 'transparent' : 'rgba(212, 175, 55, 0.04)',
                      cursor: notif.read ? 'default' : 'pointer',
                      transition: 'background 0.15s',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px'
                    }}
                  >
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${getNotifBorderColor(notif.type)}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}>
                      {getNotifIcon(notif.type)}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <h4 style={{
                          margin: 0,
                          fontSize: '0.82rem',
                          fontWeight: notif.read ? 600 : 800,
                          color: notif.read ? '#CBD5E1' : '#F8FAFC',
                          lineHeight: 1.3
                        }}>
                          {notif.title}
                        </h4>
                        {!notif.read && (
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#FBBF24',
                            flexShrink: 0
                          }} />
                        )}
                      </div>

                      <p style={{
                        margin: '3px 0 0',
                        fontSize: '0.75rem',
                        color: '#94A3B8',
                        lineHeight: 1.4,
                        wordBreak: 'break-word'
                      }}>
                        {notif.message}
                      </p>

                      <span style={{
                        display: 'block',
                        marginTop: '4px',
                        fontSize: '0.65rem',
                        color: '#475569'
                      }}>
                        {formatNotifTime(notif.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <NotificationPermissionModal
        isOpen={showPermModal}
        onClose={() => setShowPermModal(false)}
        onGranted={() => {
          setShowPermModal(false);
          setPermStatus('granted');
        }}
      />
    </>
  );
};

export default NotificationBell;
