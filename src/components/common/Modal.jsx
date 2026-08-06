import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, widthPx = '740px' }) => {
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
        top: '76px', // Inicia exactamente debajo del Navbar/Header
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 900, // Por debajo del zIndex del Navbar (1000)
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 16px 16px min(240px, 15vw)',
        backgroundColor: 'rgba(6, 13, 30, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)'
      }}
      className="animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Contenedor Modal que queda estrictamente por debajo del Header */}
      <div
        style={{
          width: '100%',
          maxWidth: widthPx,
          maxHeight: 'calc(100vh - 108px)',
          backgroundColor: '#0A1633',
          border: '2px solid #D4AF37',
          borderRadius: '18px',
          boxShadow: '0 0 50px rgba(212, 175, 55, 0.35), 0 25px 60px rgba(0, 0, 0, 0.95)',
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
            padding: '18px 24px',
            borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            background: 'rgba(15, 28, 63, 0.95)',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
            flexShrink: 0
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F8FAFC', margin: 0 }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.5)',
              color: '#FBBF24',
              cursor: 'pointer',
              padding: '6px 14px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
              fontWeight: 700,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(212, 175, 55, 0.3)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)')}
          >
            <X size={18} /> Cerrar
          </button>
        </div>

        {/* Cuerpo del Modal con desplazamiento vertical independiente */}
        <div
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto',
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
