import React, { useState } from 'react';
import { KeyRound, Mail, Lock, UserPlus, Plus, Trash2, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../common/ToastNotification';

const DAYS_BUTTONS = [
  { code: 'L', name: 'Lunes' },
  { code: 'M', name: 'Martes' },
  { code: 'MI', name: 'Miércoles' },
  { code: 'J', name: 'Jueves' },
  { code: 'V', name: 'Viernes' },
  { code: 'S', name: 'Sábado' },
  { code: 'D', name: 'Domingo' }
];

const LoginScreen = () => {
  const authContext = useAuth();
  const login = authContext?.login;
  const register = authContext?.register;
  const masterEmail = authContext?.masterEmail || 'admin@parlasport.com';

  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [submitting, setSubmitting] = useState(false);

  // Login State
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Register State
  const [regData, setRegData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    telefono: '',
    especialidad: 'Entrenador General',
    foto: '',
    bloquesDisponibilidad: []
  });

  const [selectedRegDays, setSelectedRegDays] = useState([]);
  const [regTimeRange, setRegTimeRange] = useState({ horaInicio: '08:00', horaFin: '12:00' });

  const handleAddMultipleBlocks = () => {
    if (selectedRegDays.length === 0) {
      showToast('Selección Requerida', 'Por favor selecciona al menos un día (L, M, MI, J, V, S, D).', 'warning');
      return;
    }

    const newBlocks = selectedRegDays.map(code => {
      const dayObj = DAYS_BUTTONS.find(d => d.code === code);
      return {
        dia: dayObj ? dayObj.name : 'Lunes',
        horaInicio: regTimeRange.horaInicio,
        horaFin: regTimeRange.horaFin
      };
    });

    setRegData(prev => ({
      ...prev,
      bloquesDisponibilidad: [...prev.bloquesDisponibilidad, ...newBlocks]
    }));

  };

  const handleRemoveBlock = (index) => {
    setRegData(prev => ({
      ...prev,
      bloquesDisponibilidad: prev.bloquesDisponibilidad.filter((_, i) => i !== index)
    }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!emailInput || !passwordInput) {
      setErrorMsg('Por favor introduce tu correo y contraseña.');
      return;
    }

    setSubmitting(true);
    const res = await login(emailInput, passwordInput);
    setSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!regData.nombre || !regData.email || !regData.password) {
      setErrorMsg('Por favor completa nombre, correo y contraseña.');
      return;
    }
    if (regData.password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (regData.password !== regData.confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);

    const isMaster = regData.email.toLowerCase().trim() === masterEmail.toLowerCase();

    // Pasar el perfil completo del entrenador a register().
    // register() guarda la ficha en Firestore coaches/{coachId} DESPUÉS de autenticar.
    // No llamamos addCoach() aquí porque el usuario aún no está autenticado.
    const coachProfile = isMaster ? null : {
      nombre: regData.nombre,
      email: regData.email,
      telefono: regData.telefono || '',
      especialidad: regData.especialidad || '',
      foto: regData.foto || '',
      bloquesDisponibilidad: regData.bloquesDisponibilidad || []
    };

    const res = await register({
      email: regData.email,
      password: regData.password,
      nombre: regData.nombre,
      coachProfile
    });

    setSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error);
    }
  };

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 12px',
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
          maxWidth: activeTab === 'register' ? '540px' : '440px',
          padding: '28px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          transition: 'all 0.3s ease'
        }}
      >
        {/* Header con Logo Oficial */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <img
            src="/logo.png"
            alt="Parla Sport Logo Oficial"
            style={{ height: '85px', width: 'auto', objectFit: 'contain' }}
          />
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

        {errorMsg && (
          <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#F87171', fontSize: '0.82rem' }}>
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
                  placeholder="Tu correo electrónico..."
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="input-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#D4AF37' }} />
                <input
                  type="password"
                  required
                  placeholder="Tu contraseña..."
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', marginTop: '4px' }} disabled={submitting}>
              <KeyRound size={18} /> {submitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        )}

        {/* TAB 2: REGISTRAR PROFESOR */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="input-label">Nombre Completo del Profesor</label>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: '10px' }}>
              <div>
                <label className="input-label">Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="Mín. 6 caracteres"
                  className="input-field"
                  value={regData.password}
                  onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="input-label">Confirmar Contraseña</label>
                <input
                  type="password"
                  required
                  placeholder="Repite la contraseña"
                  className="input-field"
                  value={regData.confirmPassword}
                  onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="input-label">Teléfono / WhatsApp (Opcional)</label>
              <input
                type="text"
                placeholder="+58 414 0001122"
                className="input-field"
                value={regData.telefono}
                onChange={(e) => setRegData({ ...regData, telefono: e.target.value })}
              />
            </div>

            {/* Configuración de Disponibilidad durante Registro */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              padding: '14px',
              borderRadius: '12px',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              marginTop: '4px'
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FBBF24', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> Configura tus Días y Horarios Disponibles:
              </div>

              {/* Selector Multi-Día para Registro */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label className="input-label" style={{ fontSize: '0.72rem', marginBottom: '6px', display: 'block' }}>
                    Selecciona tus días disponibles:
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {DAYS_BUTTONS.map(d => {
                      const isSelected = selectedRegDays.includes(d.code);
                      return (
                        <button
                          key={d.code}
                          type="button"
                          onClick={() => {
                            setSelectedRegDays(prev =>
                              prev.includes(d.code) ? prev.filter(c => c !== d.code) : [...prev, d.code]
                            );
                          }}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            border: isSelected ? '2px solid #FBBF24' : '1px solid rgba(255, 255, 255, 0.15)',
                            background: isSelected ? 'rgba(245, 158, 11, 0.25)' : 'rgba(15, 23, 42, 0.8)',
                            color: isSelected ? '#FBBF24' : '#94A3B8',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {d.code}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '95px' }}>
                    <label className="input-label" style={{ fontSize: '0.72rem' }}>Hora Inicio</label>
                    <input
                      type="time"
                      className="input-field"
                      style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                      value={regTimeRange.horaInicio}
                      onChange={(e) => setRegTimeRange({ ...regTimeRange, horaInicio: e.target.value })}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: '95px' }}>
                    <label className="input-label" style={{ fontSize: '0.72rem' }}>Hora Fin</label>
                    <input
                      type="time"
                      className="input-field"
                      style={{ padding: '6px 8px', fontSize: '0.8rem' }}
                      value={regTimeRange.horaFin}
                      onChange={(e) => setRegTimeRange({ ...regTimeRange, horaFin: e.target.value })}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleAddMultipleBlocks}
                    style={{ padding: '7px 10px', fontSize: '0.75rem', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                  >
                    <Plus size={14} /> Añadir a Días
                  </button>
                </div>
              </div>

              {/* Lista de bloques configurados */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                {regData.bloquesDisponibilidad.map((block, idx) => (
                  <span key={idx} style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#FBBF24',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    📅 {block.dia}: {block.horaInicio} - {block.horaFin}
                    <button
                      type="button"
                      onClick={() => handleRemoveBlock(idx)}
                      style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', marginTop: '6px' }} disabled={submitting}>
              <UserPlus size={18} /> {submitting ? 'Registrando...' : 'Registrar Profesor e Ingresar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
