import React from 'react';
import { LayoutDashboard, Users, UserCheck, CalendarPlus, Calendar, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { role, isAdmin } = useAuth();

  const adminMenu = [
    { id: 'dashboard', label: 'Dashboard Control', icon: LayoutDashboard },
    { id: 'players', label: 'Jugadores (Fichas)', icon: Users },
    { id: 'coaches', label: 'Entrenadores', icon: UserCheck },
    { id: 'scheduler', label: 'Gestionar Sesiones', icon: CalendarPlus },
    { id: 'general-calendar', label: 'Calendario General', icon: Calendar },
  ];

  const coachMenu = [
    { id: 'coach-calendar', label: 'Mi Calendario', icon: Calendar },
    { id: 'general-calendar', label: 'Vista Academia (Solo lectura)', icon: Eye },
  ];

  const currentMenu = isAdmin ? adminMenu : coachMenu;

  return (
    <aside className="sidebar-container" style={{
      width: '240px',
      flexShrink: 0,
      background: 'rgba(15, 23, 42, 0.6)',
      borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '20px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div className="sidebar-header" style={{
        padding: '8px 12px',
        fontSize: '0.72rem',
        fontWeight: 700,
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: '0.06em'
      }}>
        Navegación ({role === 'admin' ? 'Administrador' : 'Entrenador'})
      </div>

      {currentMenu.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={isActive ? 'active' : ''}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '12px 14px',
              borderRadius: '12px',
              border: 'none',
              background: isActive 
                ? (isAdmin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)') 
                : 'transparent',
              borderLeft: isActive 
                ? (isAdmin ? '4px solid #10B981' : '4px solid #3B82F6') 
                : '4px solid transparent',
              color: isActive 
                ? (isAdmin ? '#34D399' : '#60A5FA') 
                : '#94A3B8',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            }}
            onMouseOut={(e) => {
              if (!isActive) e.currentTarget.style.background = 'transparent';
            }}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </aside>
  );
};

export default Sidebar;
