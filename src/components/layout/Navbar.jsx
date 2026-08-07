import React, { useState, useEffect } from 'react';
import { UserCheck, LogOut, Download } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import { promptPwaInstall } from '../../services/pwaService';

const Navbar = () => {
  const { currentUser, isAdmin, logout } = useAuth();
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  useEffect(() => {
    const handlePwaReady = () => setCanInstallPwa(true);
    window.addEventListener('pwa-installable', handlePwaReady);
    return () => window.removeEventListener('pwa-installable', handlePwaReady);
  }, []);

  const handleInstallClick = async () => {
    const installed = await promptPwaInstall();
    if (installed) setCanInstallPwa(false);
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(6, 13, 30, 0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
      padding: '12px 24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Logo Oficial de Parla Sport + Campana de Notificaciones Fija en la Izquierda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/logo.png"
            alt="Parla Sport Logo Oficial"
            style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
          />
          <NotificationBell />
        </div>

        {/* User Profile Badge & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          
          {currentUser && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(15, 28, 63, 0.9)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: '12px',
              padding: '6px 14px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#F8FAFC' }}>
                  {currentUser.nombre}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                  {currentUser.email}
                </span>
              </div>

              {isAdmin ? (
                <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                  ADMIN MAESTRO
                </span>
              ) : (
                <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                  <UserCheck size={10} /> ENTRENADOR
                </span>
              )}

              <button
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#F87171',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: '4px'
                }}
                title="Cerrar Sesión"
              >
                <LogOut size={13} /> Salir
              </button>
            </div>
          )}

          {/* Botón PWA Install */}
          {canInstallPwa && (
            <button
              onClick={handleInstallClick}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#FBBF24', borderColor: 'rgba(212, 175, 55, 0.4)' }}
            >
              <Download size={14} /> Instalar PWA
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
