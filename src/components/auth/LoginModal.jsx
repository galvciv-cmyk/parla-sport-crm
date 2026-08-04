import React, { useState } from 'react';
import { KeyRound, Mail, UserCheck, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import Modal from '../common/Modal';

const LoginModal = ({ isOpen, onClose }) => {
  const { loginWithEmail, masterEmail } = useAuth();
  const { coaches } = useData();

  const [inputEmail, setInputEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!inputEmail) {
      setErrorMessage('Por favor introduce tu correo electrónico.');
      return;
    }

    const result = loginWithEmail(inputEmail, coaches);
    if (result.success) {
      onClose();
    }
  };

  const handleQuickDemo = (email) => {
    loginWithEmail(email, coaches);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Iniciar Sesión en Parla Sport CRM"
      maxWidth="max-w-md"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '0.82rem',
          color: '#CBD5E1',
          lineHeight: '1.4'
        }}>
          🛡️ El correo maestro <strong style={{ color: '#10B981' }}>{masterEmail}</strong> obtendrá automáticamente acceso como <strong>Administrador</strong>. Cualquier otro correo ingresará como <strong>Entrenador</strong>.
        </div>

        {errorMessage && (
          <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', fontSize: '0.85rem' }}>
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="input-label">Correo Electrónico</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
              <input
                type="email"
                required
                placeholder="ej. admin@parlasport.com o tu correo..."
                className="input-field"
                style={{ paddingLeft: '38px' }}
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '6px' }}>
            <KeyRound size={18} /> Entrar al Sistema
          </button>
        </form>

        {/* Accesos Rápidos de Demostración */}
        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94A3B8', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color="#F59E0B" /> Accesos Directos de Demostración:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Admin Maestro */}
            <button
              onClick={() => handleQuickDemo(masterEmail)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#34D399',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} /> Entrar como Administrador Maestro
              </span>
              <span style={{ fontSize: '0.72rem', opacity: 0.8 }}>({masterEmail})</span>
            </button>

            {/* Profesores */}
            {coaches.map(c => (
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
                  background: 'rgba(30, 41, 59, 0.6)',
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
    </Modal>
  );
};

export default LoginModal;
