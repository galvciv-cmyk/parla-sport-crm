import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, widthPx = '680px' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-top, 16px)) 12px max(32px, env(safe-area-inset-bottom, 32px)) 12px',
        backgroundColor: 'rgba(4, 9, 23, 0.88)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
      className="animate-fade-in modal-overlay-wrapper"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Contenedor Modal Centrado Responsive sin bloqueos de altura */}
      <div
        className="glass-modal modal-content-box"
        style={{
          width: '100%',
          maxWidth: `min(${widthPx}, 100%)`,
          backgroundColor: '#0A1633',
          border: '1.5px solid rgba(212, 175, 55, 0.5)',
          borderRadius: '16px',
          boxShadow: '0 0 50px rgba(212, 175, 55, 0.22), 0 25px 60px rgba(0, 0, 0, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          margin: 'auto 0',
          flexShrink: 0
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado Fijo/Sticky del Modal */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(10, 22, 51, 0.98)',
            borderTopLeftRadius: '15px',
            borderTopRightRadius: '15px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            flexShrink: 0
          }}
        >
          <h3 style={{
            fontSize: '1rem',
            fontWeight: 800,
            color: '#F8FAFC',
            margin: 0,
            lineHeight: 1.3,
            paddingRight: '8px'
          }}>
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#94A3B8',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 700,
              flexShrink: 0,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F8FAFC'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del Modal con espacio natural sin restricciones */}
        <div
          style={{
            padding: '18px 20px 24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
