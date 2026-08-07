import React, { useState, useEffect } from 'react';
import { UserCheck, LogOut, Download, Menu, X, LayoutDashboard, Users, CalendarPlus, Calendar, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import { promptPwaInstall } from '../../services/pwaService';

const Navbar = ({ activeTab, setActiveTab }) => {
  const { currentUser, isAdmin, logout } = useAuth();
  const [canInstallPwa, setCanInstallPwa] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handlePwaReady = () => setCanInstallPwa(true);
    window.addEventListener('pwa-installable', handlePwaReady);
    return () => window.removeEventListener('pwa-installable', handlePwaReady);
  }, []);

  const handleInstallClick = async () => {
    const installed = await promptPwaInstall();
    if (installed) setCanInstallPwa(false);
  };

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard Control', icon: LayoutDashboard },
    { id: 'players', label: 'Jugadores (Fichas)', icon: Users },
    { id: 'coaches', label: 'Entrenadores', icon: UserCheck },
    { id: 'scheduler', label: 'Gestionar Sesiones', icon: CalendarPlus },
    { id: 'general-calendar', label: 'Calendario General', icon: Calendar },
  ];

  const coachMenuItems = [
    { id: 'coach-calendar', label: 'Mi Calendario', icon: Calendar },
    { id: 'general-calendar', label: 'Vista Academia', icon: Eye },
  ];

  const menuItems = isAdmin ? adminMenuItems : coachMenuItems;

  const handleNavClick = (id) => {
    if (setActiveTab) setActiveTab(id);
    setIsMenuOpen(false);
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(6, 13, 30, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
      padding: '10px 18px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '46px'
      }}>
        {/* IZQUIERDA: Logo Oficial Parla Sport */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src="/logo.png"
            alt="Parla Sport Logo Oficial"
            style={{ height: '42px', width: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* DERECHA: Campana de Notificaciones EN LA MISMA LÍNEA QUE EL LOGO + Menú Desplegable Responsivo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Campana de Notificaciones Fija en la Misma Línea del Logo */}
          <NotificationBell />

          {/* Botón de Menú Desplegable Responsivo para Administrador / Entrenador */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              background: 'rgba(15, 28, 63, 0.9)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              color: '#FBBF24',
              borderRadius: '10px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 700,
              fontSize: '0.82rem'
            }}
            title="Menú Principal"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            <span style={{ fontSize: '0.78rem' }}>Menú</span>
          </button>
        </div>
      </div>

      {/* MENÚ DESPLEGABLE RESPONSIVO (DROPDOWN DRAWER) */}
      {isMenuOpen && (
        <div
          className="glass-modal animate-fade-in"
          style={{
            position: 'absolute',
            top: '62px',
            right: '16px',
            width: 'calc(100% - 32px)',
            maxWidth: '360px',
            backgroundColor: 'rgba(10, 22, 51, 0.98)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(212, 175, 55, 0.45)',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(212, 175, 55, 0.2)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 1001
          }}
        >
          {/* Tarjeta de Perfil en el Menú */}
          {currentUser && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(15, 28, 63, 0.8)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '12px',
              padding: '10px 14px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#F8FAFC' }}>
                  {currentUser.nombre}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
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
            </div>
          )}

          {/* Opciones de Navegación del Menú */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 6px' }}>
              Navegación ({isAdmin ? 'Administrador' : 'Entrenador'})
            </span>

            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isActive ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: isActive ? '#FBBF24' : '#F8FAFC',
                    fontWeight: isActive ? 800 : 500,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Icon size={18} color={isActive ? '#FBBF24' : '#94A3B8'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Botón PWA Install si está disponible */}
          {canInstallPwa && (
            <button
              onClick={handleInstallClick}
              className="btn-secondary"
              style={{ width: '100%', padding: '10px', fontSize: '0.82rem', color: '#FBBF24', borderColor: 'rgba(212, 175, 55, 0.4)' }}
            >
              <Download size={16} /> Instalar Aplicación PWA
            </button>
          )}

          {/* Botón Salir / Cerrar Sesión */}
          <button
            onClick={() => {
              setIsMenuOpen(false);
              logout();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#F87171',
              borderRadius: '10px',
              padding: '10px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '4px'
            }}
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;
