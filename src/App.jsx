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

const MainLayout = ({ defaultTab }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

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

const MainContent = () => {
  const { currentUser, role, authLoading } = useAuth();

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

  if (!currentUser) {
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
