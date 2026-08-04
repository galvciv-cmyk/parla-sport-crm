import React, { useState } from 'react';
import { KeyRound, Mail, UserPlus, Sparkles, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

const LoginScreen = () => {
  const { loginWithEmail, masterEmail } = useAuth();
  const { coaches, addCoach } = useData();

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  
  // Login State
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Register State
  const [regData, setRegData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    especialidad: 'Táctica & Fundamentos 1-1',
    foto: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=300'
  });

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!emailInput) {
      setErrorMsg('Por favor introduce tu correo electrónico.');
      return;
    }

    const res = loginWithEmail(emailInput, coaches);
    if (!res.success) {
      setErrorMsg('Ocurrió un error al ingresar.');
    }
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regData.nombre || !regData.email) {
      setErrorMsg('Por favor completa el nombre y correo del entrenador.');
      return;
    }

    const newCoach = addCoach(regData);
    loginWithEmail(newCoach.email, [...coaches, newCoach]);
  };

  const handleQuickDemo = (email) => {
    loginWithEmail(email, coaches);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundColor: '#060D1E',
      backgroundImage: `
        radial-gradient(circle at 50% 20%, rgba(212, 175, 55, 0.15) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)
      `
    }}>
      <div 
        className="glass-modal animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px'
        }}
      >
        {/* Header con Logo Oficial Procesado */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <img
            src="/logo.png"
            alt="Parla Sport Logo Oficial"
            style={{ height: '80px', width: 'auto', objectFit: 'contain', marginBottom: '10px' }}
          />
          <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>
            Sistema de Gestión Deportiva CRM 1-1, 1-2 y 1-3
          </p>
        </div>

        {/* Pestañas Iniciar Sesión vs Registrar Profesor */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px',
          background: 'rgba(6, 13, 30, 0.7)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid rgba(212, 175, 55, 0.3)'
        }}>
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
            style={{
              padding: '10px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'login' ? 'linear-gradient(135deg, #FBBF24 0%, #D4AF37 100%)' : 'transparent',
              color: activeTab === 'login' ? '#060D1E' : '#94A3B8',
              fontWeight: activeTab === 'login' ? 800 : 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Iniciar Sesión
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
            style={{
              padding: '10px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'register' ? 'linear-gradient(135deg, #FBBF24 0%, #D4AF37 100%)' : 'transparent',
              color: activeTab === 'register' ? '#060D1E' : '#94A3B8',
              fontWeight: activeTab === 'register' ? 800 : 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Registrar Profesor
          </button>
        </div>

        {/* Alerta explicativa de Correo Maestro vs Entrenador */}
        <div style={{
          background: 'rgba(212, 175, 55, 0.1)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '12px',
          padding: '12px 14px',
          fontSize: '0.8rem',
          color: '#FBBF24',
          lineHeight: '1.4'
        }}>
          🛡️ Correo Maestro Admin: <strong>{masterEmail}</strong> (Panel Admin completo).<br />
          👤 Cualquier otro correo registrado ingresa al <strong>Panel de Entrenador</strong>.
        </div>

        {errorMsg && (
          <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#F87171', fontSize: '0.82rem' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* TAB 1: INICIAR SESIÓN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="input-label">Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#D4AF37' }} />
                <input
                  type="email"
                  required
                  placeholder="ej. admin@parlasport.com o tu correo..."
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', marginTop: '4px' }}>
              <KeyRound size={18} /> Entrar al CRM
            </button>
          </form>
        )}

        {/* TAB 2: REGISTRAR PROFESOR */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="input-label">Nombre del Profesor</label>
              <input
                type="text"
                required
                placeholder="ej. Prof. Gabriel Torres"
                className="input-field"
                value={regData.nombre}
                onChange={(e) => setRegData({ ...regData, nombre: e.target.value })}
              />
            </div>

            <div>
              <label className="input-label">Correo Electrónico del Profesor</label>
              <input
                type="email"
                required
                placeholder="ej. gabriel.torres@parlasport.com"
                className="input-field"
                value={regData.email}
                onChange={(e) => setRegData({ ...regData, email: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="input-label">Teléfono</label>
                <input
                  type="text"
                  placeholder="+58 414 0001122"
                  className="input-field"
                  value={regData.telefono}
                  onChange={(e) => setRegData({ ...regData, telefono: e.target.value })}
                />
              </div>
              <div>
                <label className="input-label">Especialidad</label>
                <input
                  type="text"
                  placeholder="Técnica 1-1"
                  className="input-field"
                  value={regData.especialidad}
                  onChange={(e) => setRegData({ ...regData, especialidad: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', marginTop: '6px' }}>
              <UserPlus size={18} /> Registrar e Ingresar
            </button>
          </form>
        )}

        {/* ACCESOS DIRECTOS DE PRUEBA RÁPIDA */}
        <div style={{ borderTop: '1px solid rgba(212, 175, 55, 0.2)', paddingTop: '16px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#FBBF24" /> Pruebas Rápidas de un Clic:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => handleQuickDemo(masterEmail)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#FBBF24',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} /> Entrar como Administrador Maestro
              </span>
              <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>({masterEmail})</span>
            </button>

            {coaches.slice(0, 2).map(c => (
              <button
                key={c.id}
                onClick={() => handleQuickDemo(c.email)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  background: 'rgba(15, 28, 63, 0.7)',
                  color: '#94A3B8',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F8FAFC' }}>
                  <UserCheck size={14} color="#3B82F6" /> {c.nombre}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#64748B' }}>({c.email})</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginScreen;
