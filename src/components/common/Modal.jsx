import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, widthPx = '700px' }) => {
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
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(6, 13, 30, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)'
      }}
      className="animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Contenedor Modal Centrado sin Cortes */}
      <div
        className="glass-modal"
        style={{
          width: '100%',
          maxWidth: widthPx,
          maxHeight: '88vh',
          backgroundColor: '#0A1633',
          border: '1px solid rgba(212, 175, 55, 0.5)',
          borderRadius: '18px',
          boxShadow: '0 0 50px rgba(212, 175, 55, 0.25), 0 25px 60px rgba(0, 0, 0, 0.95)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado Fijo del Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(212, 175, 55, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(15, 28, 63, 0.95)'
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#F8FAFC' }}>
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#94A3B8',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del Modal con Scroll Deslizable Táctil Completo */}
        <div
          style={{
            padding: '20px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
