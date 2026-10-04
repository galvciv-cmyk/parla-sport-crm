import React, { useState, useEffect, Component, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { NotificationProvider } from './context/NotificationContext';

import LoginScreen from './components/auth/LoginScreen';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

import ToastContainer from './components/common/ToastNotification';
import NotificationPermissionModal from './components/common/NotificationPermissionModal';

import { registerServiceWorker } from './services/pwaService';
import { initOneSignal } from './services/oneSignalService';

// ─── CARGA SEGURA DE MÓDULOS CON AUTO-REINTENTO EN CASO DE DEPLOY NUEVO ───
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const hasBeenRefreshed = sessionStorage.getItem('parla_chunk_refreshed') === 'true';
    try {
      const component = await componentImport();
      sessionStorage.removeItem('parla_chunk_refreshed');
      return component;
    } catch (error) {
      if (!hasBeenRefreshed) {
        sessionStorage.setItem('parla_chunk_refreshed', 'true');
        window.location.reload();
        return { default: () => null };
      }
      throw error;
    }
  });

const DashboardOverview = lazyWithRetry(() => import('./components/admin/DashboardOverview'));
const PlayerManager = lazyWithRetry(() => import('./components/admin/PlayerManager'));
const CoachManager = lazyWithRetry(() => import('./components/admin/CoachManager'));
const SessionScheduler = lazyWithRetry(() => import('./components/admin/SessionScheduler'));
const CoachCalendar = lazyWithRetry(() => import('./components/coach/CoachCalendar'));
const AcademyCalendar = lazyWithRetry(() => import('./components/coach/AcademyCalendar'));

const ModuleLoadingFallback = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '350px',
    flexDirection: 'column',
    gap: '14px',
    color: '#94A3B8'
  }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid rgba(212,175,55,0.2)',
      borderTopColor: '#FBBF24',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite'
    }} />
    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Cargando módulo...</span>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: false };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[App] Error capturado:', error, errorInfo);
  }

  render() {
    return this.props.children;
  }
}

const resolveTabFromHash = (defaultTab) => {
  if (typeof window === 'undefined') return defaultTab;
  const rawHash = (window.location.hash || '').replace('#', '').trim();
  if (!rawHash) return defaultTab;
  if (rawHash === 'coach-calendar') return 'coach-calendar';
  if (rawHash === 'scheduler') return 'scheduler';
  if (rawHash === 'players' || rawHash.startsWith('player') || rawHash.startsWith('report')) return 'players';
  if (rawHash === 'coaches') return 'coaches';
  if (rawHash === 'general-calendar') return 'general-calendar';
  if (rawHash === 'dashboard') return 'dashboard';
  return defaultTab;
};

const MainLayout = ({ defaultTab }) => {
  const [activeTab, setActiveTab] = useState(() => resolveTabFromHash(defaultTab));

  useEffect(() => {
    const handleHashChange = () => {
      const target = resolveTabFromHash(defaultTab);
      if (target) setActiveTab(target);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [defaultTab]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#060D1E' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="app-container" style={{ display: 'flex', flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="main-content" style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Suspense fallback={<ModuleLoadingFallback />}>
            {activeTab === 'dashboard'        && <DashboardOverview setActiveTab={setActiveTab} />}
            {activeTab === 'players'          && <PlayerManager />}
            {activeTab === 'coaches'          && <CoachManager />}
            {activeTab === 'scheduler'        && <SessionScheduler />}
            {activeTab === 'coach-calendar'   && <CoachCalendar />}
            {activeTab === 'general-calendar' && <AcademyCalendar />}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

// ─── Banner in-app para solicitar permisos de notificación ───
const NotificationSetupBanner = () => {
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    const alreadyAsked = sessionStorage.getItem('parla_notif_modal_shown');
    if (!alreadyAsked) {
      const timer = setTimeout(() => {
        setShowModal(true);
        sessionStorage.setItem('parla_notif_modal_shown', '1');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  if (dismissed) return null;

  return (
    <NotificationPermissionModal
      isOpen={showModal}
      onClose={() => {
        setShowModal(false);
        setDismissed(true);
      }}
      onGranted={() => {
        setShowModal(false);
        setDismissed(true);
      }}
    />
  );
};

const PublicPlayerDossierView = ({ onGoToLogin }) => {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#060D1E', display: 'flex', flexDirection: 'column' }}>
      {/* Barra Superior Oficial */}
      <header style={{
        background: 'linear-gradient(135deg, #030712 0%, #08132B 45%, #0C1E47 100%)',
        borderBottom: '3px solid #D4AF37',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 18px rgba(0,0,0,0.5)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="Parla Sport" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
          <div>
            <div style={{ color: '#FFFFFF', fontWeight: 900, fontSize: '1.15rem', letterSpacing: '0.04em' }}>
              PARLA SPORT TRAINING ACADEMY
            </div>
            <div style={{ color: '#FBBF24', fontWeight: 800, fontSize: '0.68rem', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              EXPEDIENTE OFICIAL DE SEGUIMIENTO FORMATIVO
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onGoToLogin}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            color: '#F8FAFC',
            padding: '7px 14px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          🔐 Acceso de Personal
        </button>
      </header>

      {/* Contenido: PlayerManager con modal abierto automáticamente */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        <Suspense fallback={<ModuleLoadingFallback />}>
          <PlayerManager />
        </Suspense>
      </main>
    </div>
  );
};

const MainContent = () => {
  const { currentUser, role, authLoading } = useAuth();
  const [currentHash, setCurrentHash] = useState(() => (typeof window !== 'undefined' ? (window.location.hash || '') : ''));

  useEffect(() => {
    const handleHash = () => setCurrentHash(window.location.hash || '');
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#060D1E',
        color: '#94A3B8',
        fontSize: '0.9rem',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(212,175,55,0.2)',
          borderTopColor: '#FBBF24',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span>Cargando sesión...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isPublicShareLink = currentHash.startsWith('#player-') || currentHash.startsWith('#report-');

  if (!currentUser) {
    if (isPublicShareLink) {
      return (
        <PublicPlayerDossierView
          onGoToLogin={() => {
            window.location.hash = '';
            setCurrentHash('');
          }}
        />
      );
    }
    return <LoginScreen />;
  }

  const userRole = role || currentUser?.role || 'admin';
  const initialTab = userRole === 'coach' ? 'coach-calendar' : 'dashboard';

  return (
    <>
      <MainLayout key={currentUser.uid || userRole} defaultTab={initialTab} />
      <NotificationSetupBanner />
    </>
  );
};

export default function App() {
  useEffect(() => {
    // 1. Registrar Service Worker unificado
    registerServiceWorker();

    // 2. Inicializar OneSignal de forma asíncrona no bloqueante
    initOneSignal().catch((err) => {
      console.warn('[App] OneSignal init falló silenciosamente:', err);
    });
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <DataProvider>
            <MainContent />
          </DataProvider>
        </NotificationProvider>

        {/* Toast Container — montado globalmente */}
        <ToastContainer />
      </AuthProvider>
    </ErrorBoundary>
  );
}
