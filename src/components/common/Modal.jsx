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
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        backgroundColor: 'rgba(4, 9, 23, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
      className="animate-fade-in modal-overlay-wrapper"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Contenedor Modal Centrado Responsive */}
      <div
        className="glass-modal modal-content-box"
        style={{
          width: '100%',
          maxWidth: widthPx,
          maxHeight: 'min(90dvh, 90vh)',
          backgroundColor: '#0A1633',
          border: '1px solid rgba(212, 175, 55, 0.5)',
          borderRadius: '16px',
          boxShadow: '0 0 50px rgba(212, 175, 55, 0.22), 0 25px 60px rgba(0, 0, 0, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          margin: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado Fijo del Modal */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 28, 63, 0.98)',
            flexShrink: 0
          }}
        >
          <h3 style={{
            fontSize: '1.05rem',
            fontWeight: 800,
            color: '#F8FAFC',
            margin: 0,
            lineHeight: 1.3
          }}>
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
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

        {/* Cuerpo del Modal con Scroll Suave */}
        <div
          style={{
            padding: '16px 18px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            flex: 1
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
