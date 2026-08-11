import React, { useState, useEffect, Component } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { NotificationProvider } from './context/NotificationContext';

import LoginScreen from './components/auth/LoginScreen';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

import DashboardOverview from './components/admin/DashboardOverview';
import PlayerManager from './components/admin/PlayerManager';
import CoachManager from './components/admin/CoachManager';
import SessionScheduler from './components/admin/SessionScheduler';

import CoachCalendar from './components/coach/CoachCalendar';
import AcademyCalendar from './components/coach/AcademyCalendar';

import ToastContainer from './components/common/ToastNotification';
import NotificationPermissionModal from './components/common/NotificationPermissionModal';
import NotificationDebugPanel from './components/common/NotificationDebugPanel';

import { registerServiceWorker } from './services/pwaService';
import { initOneSignal } from './services/oneSignalService';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <LoginScreen />;
    }
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
          {activeTab === 'dashboard'        && <DashboardOverview setActiveTab={setActiveTab} />}
          {activeTab === 'players'          && <PlayerManager />}
          {activeTab === 'coaches'          && <CoachManager />}
          {activeTab === 'scheduler'        && <SessionScheduler />}
          {activeTab === 'coach-calendar'   && <CoachCalendar />}
          {activeTab === 'general-calendar' && <AcademyCalendar />}
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

    // Solo mostrar el modal si el usuario nunca lo ha visto (o no lo ha descartado en esta sesión)
    const alreadyAsked = sessionStorage.getItem('parla_notif_modal_shown');
    if (!alreadyAsked) {
      const timer = setTimeout(() => {
        setShowModal(true);
        sessionStorage.setItem('parla_notif_modal_shown', '1');
      }, 3000); // Esperar 3 segundos para no interrumpir el login
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
      {/* Banner de configuración de notificaciones — se muestra automáticamente si no hay permiso */}
      <NotificationSetupBanner />
    </>
  );
};

export default function App() {
  useEffect(() => {
    // 1. Registrar Service Worker (sw.js) para PWA y push en background
    registerServiceWorker();

    // 2. Inicializar OneSignal (asíncrono, no bloquea el render)
    initOneSignal().catch((err) => {
      console.warn('[App] OneSignal init falló silenciosamente:', err);
    });
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <DataProvider>
          <ErrorBoundary>
            <MainContent />
          </ErrorBoundary>
        </DataProvider>
      </NotificationProvider>

      {/* Toast Container — montado FUERA de ErrorBoundary para garantizar visibilidad global */}
      <ToastContainer />

      {/* Panel de Debug de Notificaciones — visible siempre para monitorear el flujo */}
      <NotificationDebugPanel />
    </AuthProvider>
  );
}
