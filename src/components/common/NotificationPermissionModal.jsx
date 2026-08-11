import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Shield, Smartphone, X, CheckCircle, ChevronRight } from 'lucide-react';

/* =============================================
   NotificationPermissionModal — Modal In-App
   Solicita permisos de notificación dentro
   de la aplicación, sin diálogos del browser.
   ============================================= */

const NotificationPermissionModal = ({ isOpen, onClose, onGranted }) => {
  const [step, setStep] = useState('prompt'); // 'prompt' | 'activating' | 'granted' | 'denied' | 'blocked'
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Verificar estado actual
      if (!('Notification' in window)) {
        setStep('denied');
      } else if (Notification.permission === 'granted') {
        setStep('granted');
      } else if (Notification.permission === 'denied') {
        setStep('blocked');
      } else {
        setStep('prompt');
      }
      setTimeout(() => setVisible(true), 20);
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const handleActivate = async () => {
    setStep('activating');

    try {
      // Intentar con OneSignal primero
      if (window.OneSignal) {
        try {
          await window.OneSignal.Notifications.requestPermission();
          const granted = window.OneSignal.Notifications.permission;
          if (granted) {
            setStep('granted');
            onGranted && onGranted(true);
            return;
          }
        } catch {
          // Fallback a la API nativa
        }
      }

      // Fallback: API nativa del navegador
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setStep('granted');
        onGranted && onGranted(true);
      } else if (permission === 'denied') {
        setStep('blocked');
        onGranted && onGranted(false);
      } else {
        setStep('prompt');
      }
    } catch (err) {
      console.warn('[NotificationModal] Error al solicitar permisos:', err);
      setStep('denied');
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose && onClose(), 300);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 99990,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: visible
            ? 'translate(-50%, -50%) scale(1)'
            : 'translate(-50%, -50%) scale(0.85)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 99991,
          width: '90%',
          maxWidth: '420px',
          background: 'linear-gradient(145deg, #0F1B3D 0%, #0A1228 100%)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 40px rgba(212,175,55,0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Franja decorativa superior */}
        <div style={{
          height: '4px',
          background: step === 'granted'
            ? 'linear-gradient(90deg, #10B981, #34D399)'
            : step === 'blocked'
            ? 'linear-gradient(90deg, #EF4444, #F87171)'
            : 'linear-gradient(90deg, #D4AF37, #FBBF24)'
        }} />

        {/* Botón cerrar */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#64748B',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F8FAFC'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; }}
        >
          <X size={16} />
        </button>

        {/* Contenido del Modal */}
        <div style={{ padding: '32px 28px 28px' }}>

          {/* ─── ESTADO: PROMPT (pedir activar) ─── */}
          {step === 'prompt' && (
            <>
              {/* Ícono central */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '2px solid rgba(212, 175, 55, 0.3)',
                  marginBottom: '16px',
                  boxShadow: '0 0 30px rgba(212,175,55,0.2)'
                }}>
                  <Bell size={36} color="#FBBF24" />
                </div>

                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#F8FAFC',
                  margin: '0 0 8px',
                  lineHeight: 1.2
                }}>
                  Activar Notificaciones
                </h2>
                <p style={{
                  fontSize: '0.85rem',
                  color: '#94A3B8',
                  margin: 0,
                  lineHeight: 1.5
                }}>
                  Recibe alertas en tiempo real sobre sesiones, pagos y actualizaciones importantes.
                </p>
              </div>

              {/* Beneficios */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {[
                  { icon: '⚽', text: 'Nuevas sesiones asignadas al instante' },
                  { icon: '💰', text: 'Confirmación de pagos de clases' },
                  { icon: '📅', text: 'Recordatorios de entrenamientos' },
                  { icon: '📱', text: 'Funciona en todos tus dispositivos' }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Info de privacidad */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                marginBottom: '24px',
                padding: '10px 12px',
                background: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.2)',
                borderRadius: '10px'
              }}>
                <Shield size={14} color="#3B82F6" style={{ flexShrink: 0, marginTop: '1px' }} />
                <span style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.5 }}>
                  Solo recibirás notificaciones relevantes. Sin spam ni publicidad.
                </span>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={handleActivate}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '13px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #D4AF37, #FBBF24)',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 20px rgba(212,175,55,0.35)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 25px rgba(212,175,55,0.5)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(212,175,55,0.35)'; }}
                >
                  <Bell size={16} />
                  Activar Notificaciones
                  <ChevronRight size={16} />
                </button>

                <button
                  onClick={handleClose}
                  style={{
                    width: '100%',
                    padding: '11px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent',
                    color: '#64748B',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  Ahora no
                </button>
              </div>
            </>
          )}

          {/* ─── ESTADO: ACTIVANDO ─── */}
          {step === 'activating' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(251,191,36,0.1)',
                border: '2px solid rgba(251,191,36,0.3)',
                marginBottom: '20px',
                animation: 'pulse 1.5s infinite'
              }}>
                <Bell size={36} color="#FBBF24" />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '8px' }}>
                Configurando notificaciones...
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                Por favor, acepta el permiso en el diálogo del navegador si aparece.
              </p>
            </div>
          )}

          {/* ─── ESTADO: CONCEDIDO ─── */}
          {step === 'granted' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.12)',
                border: '2px solid rgba(16,185,129,0.4)',
                marginBottom: '20px',
                boxShadow: '0 0 30px rgba(16,185,129,0.25)'
              }}>
                <CheckCircle size={40} color="#10B981" />
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10B981', marginBottom: '8px' }}>
                ¡Notificaciones Activas!
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '24px' }}>
                Recibirás alertas en tiempo real en este dispositivo.
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                marginBottom: '24px',
                fontSize: '0.78rem',
                color: '#64748B'
              }}>
                <Smartphone size={14} />
                <span>Dispositivo registrado correctamente</span>
              </div>
              <button
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.35)',
                  color: '#10B981',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Perfecto, cerrar
              </button>
            </div>
          )}

          {/* ─── ESTADO: BLOQUEADO ─── */}
          {step === 'blocked' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)',
                border: '2px solid rgba(239,68,68,0.35)',
                marginBottom: '20px'
              }}>
                <BellOff size={36} color="#EF4444" />
              </div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '8px' }}>
                Notificaciones bloqueadas
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '20px', lineHeight: 1.5 }}>
                Has bloqueado las notificaciones en este navegador. Para activarlas, ve a la configuración del sitio y cambia el permiso.
              </p>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: '#F8FAFC' }}>Cómo desbloquear:</strong><br />
                  Haz clic en el ícono de 🔒 o ℹ️ en la barra de direcciones del navegador → Configuración del sitio → Notificaciones → Permitir
                </p>
              </div>
              <button
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent',
                  color: '#94A3B8',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          )}

          {/* ─── ESTADO: NO SOPORTADO ─── */}
          {step === 'denied' && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '16px'
              }}>📵</div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '8px' }}>
                Notificaciones no disponibles
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '24px' }}>
                Tu navegador no soporta notificaciones push. Prueba con Chrome, Firefox o Safari en versiones recientes.
              </p>
              <button
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent',
                  color: '#94A3B8',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Entendido
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPermissionModal;
