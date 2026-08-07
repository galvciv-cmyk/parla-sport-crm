import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, Mail, Smartphone, AlertCircle } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

const NotificationBell = () => {
  const { notifications, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const { role, activeCoachId, currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const userEmail = (currentUser?.email || '').trim().toLowerCase();
  const userCoachId = activeCoachId || (currentUser?.uid ? `coach-${currentUser.uid}` : '');

  // Filtrar notificaciones según el rol activo y el destinatario
  const filteredNotifications = notifications.filter(n => {
    if (role === 'admin') {
      return n.recipientRole === 'admin' || n.recipientRole === 'all' || !n.recipientRole;
    }
    return (
      (n.recipientCoachId && n.recipientCoachId === userCoachId) ||
      (n.recipientCoachId && activeCoachId && n.recipientCoachId === activeCoachId) ||
      (n.recipientEmail && n.recipientEmail.trim().toLowerCase() === userEmail) ||
      n.recipientRole === 'coach' ||
      n.recipientRole === 'all'
    );
  });

  const unreadCount = filteredNotifications.filter(n => !n.read).length;

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
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Icono de Campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'rgba(30, 41, 59, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#F8FAFC',
          padding: '10px',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease'
        }}
        title="Notificaciones Omnicanal"
      >
        <Bell size={20} className={unreadCount > 0 ? "text-emerald-400" : "text-gray-400"} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#10B981',
            color: '#000',
            fontSize: '0.7rem',
            fontWeight: '800',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Desplegable de Notificaciones */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          marginTop: '10px',
          width: '360px',
          backgroundColor: '#0F172A',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          zIndex: 100,
          overflow: 'hidden'
        }} className="animate-fade-in">
          {/* Encabezado */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 23, 42, 0.95)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Notificaciones</span>
              <span className="badge badge-emerald">{unreadCount} nuevas</span>
            </div>
            {filteredNotifications.length > 0 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => markAllAsRead(role === 'coach' ? activeCoachId : null)}
                  style={{ background: 'none', border: 'none', color: '#10B981', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  title="Marcar todas como leídas"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={clearNotifications}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.75rem' }}
                  title="Limpiar historial"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Canales Integrados Badge */}
          <div style={{
            padding: '8px 18px',
            background: 'rgba(16, 185, 129, 0.08)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem',
            color: '#94A3B8'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Mail size={12} color="#10B981" /> EmailJS Disparado
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Smartphone size={12} color="#3B82F6" /> Push PWA Activo
            </span>
          </div>

          {/* Lista de Notificaciones */}
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {filteredNotifications.length === 0 ? (
              <div style={{ padding: '30px 20px', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                No tienes notificaciones pendientes.
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markAsRead(item.id)}
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: item.read ? 'transparent' : 'rgba(16, 185, 129, 0.06)',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                  onMouseOut={(e) => e.currentTarget.style.background = item.read ? 'transparent' : 'rgba(16, 185, 129, 0.06)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ marginTop: '2px' }}>
                      {item.type === 'warning' ? (
                        <AlertCircle size={16} color="#F59E0B" />
                      ) : (
                        <Bell size={16} color="#10B981" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: item.read ? '#CBD5E1' : '#F8FAFC' }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#94A3B8', lineHeight: '1.35' }}>
                        {item.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
