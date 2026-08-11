import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Shield, Smartphone, X, CheckCircle, ChevronRight, Share2, PlusSquare } from 'lucide-react';

/* =============================================
   NotificationPermissionModal — Modal In-App
   Totalmente centralizado y responsivo en móviles.
   Incluye soporte específico para Safari / iOS.
   ============================================= */

const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  return ('standalone' in window.navigator && window.navigator.standalone) ||
    window.matchMedia('(display-mode: standalone)').matches;
};

const NotificationPermissionModal = ({ isOpen, onClose, onGranted }) => {
  const [step, setStep] = useState('prompt'); // 'prompt' | 'activating' | 'granted' | 'denied' | 'blocked'
  const [visible, setVisible] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);

  useEffect(() => {
    setIsIOSDevice(isIOS());
    setIsPWAInstalled(isStandalone());

    if (isOpen) {
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
          // Fallback a API nativa
        }
      }

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        backgroundColor: 'rgba(4, 9, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Modal Centrado */}
      <div
        className="glass-modal"
        style={{
          width: '100%',
          maxWidth: '440px',
          maxHeight: 'min(90dvh, 90vh)',
          background: 'linear-gradient(145deg, #0F1B3D 0%, #0A1228 100%)',
          border: '1px solid rgba(212, 175, 55, 0.45)',
          borderRadius: '18px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9), 0 0 40px rgba(212,175,55,0.2)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          margin: 'auto',
          transform: visible ? 'scale(1)' : 'scale(0.92)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Franja superior decorativa */}
        <div style={{
          height: '4px',
          background: step === 'granted'
            ? 'linear-gradient(90deg, #10B981, #34D399)'
            : step === 'blocked'
            ? 'linear-gradient(90deg, #EF4444, #F87171)'
            : 'linear-gradient(90deg, #D4AF37, #FBBF24)',
          flexShrink: 0
        }} />

        {/* Botón cerrar */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '8px',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#F8FAFC'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; }}
        >
          <X size={16} />
        </button>

        {/* Cuerpo del Modal con Scroll */}
        <div style={{
          padding: '24px 20px 20px',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>

          {/* ─── ESTADO: PROMPT ─── */}
          {step === 'prompt' && (
            <>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(212, 175, 55, 0.12)',
                  border: '2px solid rgba(212, 175, 55, 0.35)',
                  marginBottom: '12px',
                  boxShadow: '0 0 25px rgba(212,175,55,0.2)'
                }}>
                  <Bell size={28} color="#FBBF24" />
                </div>

                <h2 style={{
                  fontSize: '1.18rem',
                  fontWeight: 800,
                  color: '#F8FAFC',
                  margin: '0 0 6px',
                  lineHeight: 1.25
                }}>
                  Activar Notificaciones
                </h2>
                <p style={{
                  fontSize: '0.82rem',
                  color: '#94A3B8',
                  margin: 0,
                  lineHeight: 1.45
                }}>
                  Alertas en tiempo real sobre entrenamientos, reasignaciones y pagos.
                </p>
              </div>

              {/* Instrucciones para iPhone / Safari si está en el navegador regular */}
              {isIOSDevice && !isPWAInstalled && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60A5FA', fontWeight: 700, fontSize: '0.78rem' }}>
                    <Share2 size={14} /> <span>Para iPhone / iPad (Safari):</span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: '#CBD5E1', margin: 0, lineHeight: 1.45 }}>
                    Apple requiere instalar la app para recibir notificaciones cuando esté cerrada:
                  </p>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span>1. Pulsa <strong>Compartir ⎋</strong> abajo en Safari.</span>
                    <span>2. Selecciona <strong>"Añadir a pantalla de inicio" 📲</strong>.</span>
                    <span>3. Abre la app desde el icono instalado.</span>
                  </div>
                </div>
              )}

              {/* Beneficios */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {[
                  { icon: '⚽', text: 'Sesiones asignadas y reasignaciones' },
                  { icon: '💰', text: 'Registro de pagos de clases' },
                  { icon: '📱', text: 'Toasts en pantalla y alertas sonoras' }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.95rem' }}>{item.icon}</span>
                    <span style={{ fontSize: '0.78rem', color: '#CBD5E1' }}>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                <button
                  onClick={handleActivate}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #D4AF37, #FBBF24)',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(212,175,55,0.35)',
                    transition: 'all 0.2s'
                  }}
                >
                  <Bell size={16} />
                  Activar Notificaciones
                  <ChevronRight size={16} />
                </button>

                <button
                  onClick={handleClose}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'transparent',
                    color: '#64748B',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Ahora no
                </button>
              </div>
            </>
          )}

          {/* ─── ESTADO: ACTIVANDO ─── */}
          {step === 'activating' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(251,191,36,0.1)',
                border: '2px solid rgba(251,191,36,0.3)',
                marginBottom: '16px'
              }}>
                <Bell size={28} color="#FBBF24" />
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '6px' }}>
                Configurando notificaciones...
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                Si aparece un cuadro de permiso, pulsa "Permitir".
              </p>
            </div>
          )}

          {/* ─── ESTADO: CONCEDIDO ─── */}
          {step === 'granted' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.12)',
                border: '2px solid rgba(16,185,129,0.4)',
                marginBottom: '16px',
                boxShadow: '0 0 25px rgba(16,185,129,0.25)'
              }}>
                <CheckCircle size={32} color="#10B981" />
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10B981', marginBottom: '6px' }}>
                ¡Notificaciones Activas!
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginBottom: '16px' }}>
                Este dispositivo recibirá alertas en tiempo real.
              </p>
              <button
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.35)',
                  color: '#10B981',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          )}

          {/* ─── ESTADO: BLOQUEADO ─── */}
          {step === 'blocked' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)',
                border: '2px solid rgba(239,68,68,0.35)',
                marginBottom: '16px'
              }}>
                <BellOff size={28} color="#EF4444" />
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '6px' }}>
                Notificaciones Bloqueadas
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '14px', lineHeight: 1.45 }}>
                Las notificaciones están desactivadas en la configuración de este navegador.
              </p>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '10px',
                marginBottom: '14px',
                textAlign: 'left'
              }}>
                <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: 0, lineHeight: 1.45 }}>
                  <strong style={{ color: '#F8FAFC' }}>Para desbloquear:</strong><br />
                  Haz clic en el icono 🔒 en la barra de direcciones → Permisos del sitio → Notificaciones → Permitir
                </p>
              </div>
              <button
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent',
                  color: '#94A3B8',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          )}

          {/* ─── ESTADO: NO SOPORTADO ─── */}
          {step === 'denied' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📱</div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '6px' }}>
                Alertas In-App Activas
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '16px', lineHeight: 1.45 }}>
                Recibirás todas las notificaciones en pantalla mediante Toasts y sonidos dentro de la app.
              </p>
              <button
                onClick={handleClose}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'transparent',
                  color: '#94A3B8',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                Entendido
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionModal;
