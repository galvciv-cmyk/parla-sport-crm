import React, { useState, useEffect, useCallback } from 'react';
import { X, Bell, BellOff, CheckCircle, AlertTriangle, Info } from 'lucide-react';

/* =============================================
   ToastNotification — Sistema de Toasts In-App
   Totalmente responsivo y centrado en móviles.
   ============================================= */

let toastListeners = [];
let toastIdCounter = 0;

export const showToast = (title, message, type = 'info', duration = 5000) => {
  const id = ++toastIdCounter;
  const toast = { id, title, message, type, duration, timestamp: Date.now() };
  toastListeners.forEach((listener) => listener(toast));
  return id;
};

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.45)',
    glow: 'rgba(16, 185, 129, 0.25)'
  },
  warning: {
    icon: AlertTriangle,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.45)',
    glow: 'rgba(245, 158, 11, 0.25)'
  },
  error: {
    icon: BellOff,
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.45)',
    glow: 'rgba(239, 68, 68, 0.25)'
  },
  info: {
    icon: Info,
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.15)',
    border: 'rgba(59, 130, 246, 0.45)',
    glow: 'rgba(59, 130, 246, 0.25)'
  },
  notification: {
    icon: Bell,
    color: '#FBBF24',
    bg: 'rgba(251, 191, 36, 0.14)',
    border: 'rgba(251, 191, 36, 0.45)',
    glow: 'rgba(251, 191, 36, 0.25)'
  }
};

const Toast = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = config.icon;

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  useEffect(() => {
    const enterTimer = setTimeout(() => setVisible(true), 20);
    const exitTimer = setTimeout(() => handleClose(), toast.duration || 5000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [toast.duration, handleClose]);

  return (
    <div
      className="toast-card-item"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '14px',
        background: '#0F1A3A',
        border: `1px solid ${config.border}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: `0 8px 30px rgba(0,0,0,0.7), 0 0 20px ${config.glow}`,
        width: '100%',
        maxWidth: '380px',
        position: 'relative',
        transform: visible && !exiting ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity: visible && !exiting ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        overflow: 'hidden'
      }}
    >
      {/* Barra de progreso */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '3px',
          borderRadius: '0 0 14px 14px',
          background: config.color,
          opacity: 0.8,
          animation: `toast-progress ${toast.duration || 5000}ms linear forwards`
        }}
      />

      {/* Ícono */}
      <div style={{
        flexShrink: 0,
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: `${config.color}22`,
        border: `1px solid ${config.color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '1px'
      }}>
        <Icon size={16} color={config.color} />
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700,
          fontSize: '0.82rem',
          color: '#F8FAFC',
          marginBottom: '2px',
          lineHeight: 1.3
        }}>
          {toast.title}
        </div>
        <div style={{
          fontSize: '0.75rem',
          color: '#94A3B8',
          lineHeight: 1.4,
          wordBreak: 'break-word'
        }}>
          {toast.message}
        </div>
      </div>

      {/* Botón cerrar */}
      <button
        onClick={handleClose}
        style={{
          flexShrink: 0,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '6px',
          color: '#94A3B8',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <X size={12} />
      </button>
    </div>
  );
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (toast) => {
      setToasts((prev) => {
        const trimmed = prev.length >= 3 ? prev.slice(1) : prev;
        return [...trimmed, toast];
      });
    };

    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener);
    };
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .toast-wrapper-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-end;
          pointer-events: none;
          max-width: calc(100vw - 32px);
        }
        @media (max-width: 640px) {
          .toast-wrapper-container {
            bottom: 16px;
            left: 16px;
            right: 16px;
            align-items: center;
            max-width: 100%;
          }
          .toast-card-item {
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
      <div className="toast-wrapper-container">
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Toast toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </>
  );
};

export default ToastContainer;
