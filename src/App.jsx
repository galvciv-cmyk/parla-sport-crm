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

// Error Boundary silencioso: si ocurre algún desajuste, muestra la pantalla de Login directamente
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Se capturó un desajuste:', error, errorInfo);
    try {
      localStorage.removeItem('parla_user_session');
    } catch (e) {
      console.warn(e);
    }
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
      <Navbar />

      <div style={{ display: 'flex', flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {activeTab === 'dashboard' && <DashboardOverview setActiveTab={setActiveTab} />}
          {activeTab === 'players' && <PlayerManager />}
          {activeTab === 'coaches' && <CoachManager />}
          {activeTab === 'scheduler' && <SessionScheduler />}
          {activeTab === 'coach-calendar' && <CoachCalendar />}
          {activeTab === 'general-calendar' && <AcademyCalendar />}
        </main>
      </div>
    </div>
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
        fontSize: '0.9rem'
      }}>
        Cargando sesión...
      </div>
    );
  }

  // Si no hay usuario en sesión, mostrar la pantalla de Login directamente
  if (!currentUser) {
    return <LoginScreen />;
  }

  // Determinar rol y vista inicial (Admin -> Dashboard | Entrenador -> Mi Calendario)
  const userRole = role || currentUser?.role || 'admin';
  const initialTab = userRole === 'coach' ? 'coach-calendar' : 'dashboard';

  return <MainLayout key={currentUser.uid || userRole} userRole={userRole} defaultTab={initialTab} />;
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
