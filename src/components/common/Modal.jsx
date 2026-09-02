import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

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

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(10px, env(safe-area-inset-top, 10px)) max(10px, env(safe-area-inset-right, 10px)) max(12px, env(safe-area-inset-bottom, 12px)) max(10px, env(safe-area-inset-left, 10px))',
        backgroundColor: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflow: 'hidden'
      }}
      className="animate-fade-in modal-overlay-wrapper"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Contenedor Modal de Alto Rendimiento */}
      <div
        className="glass-modal modal-content-box"
        style={{
          width: '100%',
          maxWidth: `min(${widthPx}, 96vw)`,
          maxHeight: 'min(92dvh, 92vh)',
          height: 'auto',
          backgroundColor: '#0A1633',
          border: '1.5px solid rgba(212, 175, 55, 0.6)',
          borderRadius: '16px',
          boxShadow: '0 0 50px rgba(212, 175, 55, 0.25), 0 25px 60px rgba(0, 0, 0, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado Fijo */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(10, 22, 51, 0.98)',
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

        {/* Cuerpo del Modal con Scroll Fluido y Completo */}
        <div
          style={{
            padding: '18px 20px 24px 20px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            flex: 1,
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default Modal;
