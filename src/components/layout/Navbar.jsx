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
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Inicio', icon: LayoutDashboard },
    { id: 'scheduler', label: 'Sesiones', shortLabel: 'Sesiones', icon: CalendarPlus },
    { id: 'players', label: 'Jugadores', shortLabel: 'Jugadores', icon: Users },
    { id: 'coaches', label: 'Entrenadores', shortLabel: 'Profes', icon: UserCheck },
    { id: 'general-calendar', label: 'Calendario', shortLabel: 'Calendario', icon: Calendar },
  ];

  const coachMenuItems = [
    { id: 'coach-calendar', label: 'Mi Calendario', shortLabel: 'Mi Agenda', icon: Calendar },
    { id: 'general-calendar', label: 'Vista Academia', shortLabel: 'Academia', icon: Eye },
  ];

  const menuItems = isAdmin ? adminMenuItems : coachMenuItems;

  const handleNavClick = (id) => {
    if (setActiveTab) setActiveTab(id);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* ─── ENCABEZADO SUPERIOR FIJO ─── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(6, 13, 30, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
        padding: '8px 14px',
        paddingTop: 'calc(8px + var(--sat))'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '46px'
        }}>
          {/* Logo Oficial Parla Sport */}
          <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleNavClick(isAdmin ? 'dashboard' : 'coach-calendar')}>
            <img
              src="/logo.png"
              alt="Parla Sport CRM"
              style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
            />
          </div>

          {/* DERECHA: Campana de Notificaciones + Botón Menú */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <NotificationBell />

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{
                background: 'rgba(15, 28, 63, 0.9)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                color: '#FBBF24',
                borderRadius: '10px',
                padding: '7px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontWeight: 700,
                fontSize: '0.8rem',
                minHeight: '36px'
              }}
              title="Menú Principal"
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
              <span style={{ fontSize: '0.76rem' }}>Menú</span>
            </button>
          </div>
        </div>

        {/* MENÚ DESPLEGABLE RESPONSIVO */}
        {isMenuOpen && (
          <div
            className="glass-modal animate-fade-in"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: '10px',
              width: 'min(360px, calc(100vw - 20px))',
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
                padding: '10px 14px',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.nombre}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentUser.email}
                  </span>
                </div>

                {isAdmin ? (
                  <span className="badge badge-gold" style={{ fontSize: '0.62rem', flexShrink: 0 }}>
                    ADMIN MAESTRO
                  </span>
                ) : (
                  <span className="badge badge-blue" style={{ fontSize: '0.62rem', flexShrink: 0 }}>
                    <UserCheck size={10} /> ENTRENADOR
                  </span>
                )}
              </div>
            )}

            {/* Opciones de Navegación del Menú */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 6px' }}>
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
                      gap: '10px',
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isActive ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                      color: isActive ? '#FBBF24' : '#F8FAFC',
                      fontWeight: isActive ? 800 : 500,
                      fontSize: '0.85rem',
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

            {/* Botón PWA Install */}
            {canInstallPwa && (
              <button
                onClick={handleInstallClick}
                className="btn-secondary"
                style={{ width: '100%', padding: '9px', fontSize: '0.8rem', color: '#FBBF24', borderColor: 'rgba(212, 175, 55, 0.4)' }}
              >
                <Download size={15} /> Instalar Aplicación PWA
              </button>
            )}

            {/* Botón Cerrar Sesión */}
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
                fontSize: '0.84rem',
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

      {/* ─── BARRA DE NAVEGACIÓN MÓVIL INFERIOR (PANTALLAS < 768px) ─── */}
      <nav className="mobile-bottom-nav" aria-label="Navegación Móvil">
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} color={isActive ? '#FBBF24' : '#94A3B8'} />
              <span>{item.shortLabel || item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};

export default Navbar;
