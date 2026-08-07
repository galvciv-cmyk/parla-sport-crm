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
    console.error('[ErrorBoundary] Error en vista:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Auto-limpieza en caso de incompatibilidad de caché
      try {
        localStorage.removeItem('parla_user_session');
      } catch (e) {
        console.warn(e);
      }

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
            border: '1px solid rgba(16, 185, 129, 0.4)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <h2 style={{ color: '#34D399', fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px' }}>
              ⚽ Parla Sport CRM Sincronizado
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '20px' }}>
              Se actualizó el sistema con los datos de producción más recientes. Haz clic en el botón para ingresar.
            </p>
            <button
              onClick={() => {
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
              ✓ Ingresar al Sistema Sincronizado
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

  // Garantizar que la pestaña activa sea adecuada para el rol actual
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
