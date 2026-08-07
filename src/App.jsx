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

import { registerServiceWorker } from './services/pwaService';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado en renderizado:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#060D1E',
          color: '#F8FAFC',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <h2 style={{ color: '#EF4444', fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px' }}>
              ⚠️ Ocurrió un inconveniente al cargar la vista
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '20px' }}>
              Se ha detectado un pequeño desajuste en el caché. Haz clic en el botón inferior para restaurar la sesión limpia.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('parla_user_session');
                window.location.reload();
              }}
              style={{
                background: '#10B981',
                color: '#000',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              ↻ Restaurar y Recargar Página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainContent = () => {
  const { currentUser, role, authLoading } = useAuth();
  
  const userRole = role || currentUser?.role || 'admin';
  const [activeTab, setActiveTab] = useState(() => {
    return userRole === 'coach' ? 'coach-calendar' : 'dashboard';
  });

  // Mantener sincronizada la pestaña activa si cambia el rol
  useEffect(() => {
    if (userRole === 'coach' && activeTab === 'dashboard') {
      setActiveTab('coach-calendar');
    } else if (userRole === 'admin' && activeTab === 'coach-calendar') {
      setActiveTab('dashboard');
    }
  }, [userRole, activeTab]);

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#060D1E',
        color: '#94A3B8',
        fontSize: '0.9rem'
      }}>
        Cargando sesión...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen />;
  }

  // Garantizar que nunca quede en blanco determinando pestaña efectiva
  const effectiveTab = (userRole === 'coach' && activeTab === 'dashboard') 
    ? 'coach-calendar' 
    : activeTab;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#060D1E' }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        <Sidebar activeTab={effectiveTab} setActiveTab={setActiveTab} />

        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {effectiveTab === 'dashboard' && <DashboardOverview setActiveTab={setActiveTab} />}
          {effectiveTab === 'players' && <PlayerManager />}
          {effectiveTab === 'coaches' && <CoachManager />}
          {effectiveTab === 'scheduler' && <SessionScheduler />}
          {effectiveTab === 'coach-calendar' && <CoachCalendar />}
          {effectiveTab === 'general-calendar' && <AcademyCalendar />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <DataProvider>
            <MainContent />
          </DataProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
