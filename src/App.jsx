import React, { useState, useEffect } from 'react';
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

const MainContent = () => {
  const { currentUser, role } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Cambiar pestaña por defecto según el usuario y su rol
  useEffect(() => {
    if (role === 'admin') {
      setActiveTab('dashboard');
    } else if (role === 'coach') {
      setActiveTab('coach-calendar');
    }
  }, [role, currentUser]);

  // Si no se ha iniciado sesión, desplegar la pantalla de inicio / registro
  if (!currentUser) {
    return <LoginScreen />;
  }

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

export default function App() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <DataProvider>
          <MainContent />
        </DataProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
