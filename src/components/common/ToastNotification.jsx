import React, { useState, useEffect, useCallback } from 'react';
import { X, Bell, BellOff, CheckCircle, AlertTriangle, Info, Zap } from 'lucide-react';

/* =============================================
   ToastNotification — Sistema de Toasts In-App
   Reemplaza las notificaciones nativas del
   navegador cuando la app está en primer plano.
   ============================================= */

// ─── STORE SINGLETON (fuera del componente para que sea global) ───
let toastListeners = [];
let toastIdCounter = 0;

export const showToast = (title, message, type = 'info', duration = 5000) => {
  const id = ++toastIdCounter;
  const toast = { id, title, message, type, duration, timestamp: Date.now() };
  toastListeners.forEach((listener) => listener(toast));
  return id;
};

// ─── TIPOS DE TOAST ───────────────────────────
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.4)',
    glow: 'rgba(16, 185, 129, 0.25)'
  },
  warning: {
    icon: AlertTriangle,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.4)',
    glow: 'rgba(245, 158, 11, 0.25)'
  },
  error: {
    icon: BellOff,
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.4)',
    glow: 'rgba(239, 68, 68, 0.25)'
  },
  info: {
    icon: Info,
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.4)',
    glow: 'rgba(59, 130, 246, 0.25)'
  },
  notification: {
    icon: Bell,
    color: '#FBBF24',
    bg: 'rgba(251, 191, 36, 0.10)',
    border: 'rgba(251, 191, 36, 0.4)',
    glow: 'rgba(251, 191, 36, 0.2)'
  }
};

// ─── COMPONENTE INDIVIDUAL DE TOAST ──────────
const Toast = ({ toast, onRemove }) => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = config.icon;

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 350);
  }, [toast.id, onRemove]);

  useEffect(() => {
    // Entrada
    const enterTimer = setTimeout(() => setVisible(true), 20);

    // Auto-dismiss
    const exitTimer = setTimeout(() => handleClose(), toast.duration || 5000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, [toast.duration, handleClose]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 16px',
        borderRadius: '14px',
        background: config.bg,
        border: `1px solid ${config.border}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 20px ${config.glow}`,
        minWidth: '300px',
        maxWidth: '380px',
        width: '100%',
        position: 'relative',
        transform: visible && !exiting ? 'translateX(0) scale(1)' : 'translateX(120%) scale(0.92)',
        opacity: visible && !exiting ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        cursor: 'default',
        userSelect: 'none'
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
          opacity: 0.6,
          animation: `toast-progress ${toast.duration || 5000}ms linear forwards`
        }}
      />

      {/* Ícono */}
      <div style={{
        flexShrink: 0,
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: `${config.color}22`,
        border: `1px solid ${config.color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '1px'
      }}>
        <Icon size={18} color={config.color} />
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 700,
          fontSize: '0.85rem',
          color: '#F8FAFC',
          marginBottom: '3px',
          lineHeight: 1.3
        }}>
          {toast.title}
        </div>
        <div style={{
          fontSize: '0.78rem',
          color: '#94A3B8',
          lineHeight: 1.45,
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
          borderRadius: '8px',
          color: '#64748B',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          marginTop: '1px'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#F8FAFC'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

// ─── CONTENEDOR GLOBAL DE TOASTS ─────────────
const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (toast) => {
      setToasts((prev) => {
        // Máximo 4 toasts visibles
        const trimmed = prev.length >= 4 ? prev.slice(1) : prev;
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
      `}</style>
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'flex-end',
          pointerEvents: 'none'
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto' }}>
            <Toast toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </>
  );
};

export default ToastContainer;
