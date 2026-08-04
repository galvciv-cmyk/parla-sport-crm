import React, { createContext, useContext, useState, useEffect } from 'react';
import { MASTER_ADMIN_EMAIL, INITIAL_COACHES } from '../utils/mockData';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Usuario logueado (por defecto inicia nulo si no hay sesión guardada para mostrar la pantalla de inicio)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('parla_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Determinar si es Administrador Maestro o Entrenador por el correo
  const isMasterAdmin = currentUser?.email?.toLowerCase().trim() === MASTER_ADMIN_EMAIL.toLowerCase();
  const role = isMasterAdmin ? 'admin' : (currentUser ? 'coach' : null);

  // ID del profesor asociado
  const activeCoachId = currentUser?.coachId || INITIAL_COACHES[0].id;

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('parla_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('parla_current_user');
    }
  }, [currentUser]);

  const loginWithEmail = (email, coaches = []) => {
    const cleanEmail = email.toLowerCase().trim();

    if (cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
      const adminUser = {
        email: MASTER_ADMIN_EMAIL,
        nombre: 'Administrador Maestro',
        role: 'admin'
      };
      setCurrentUser(adminUser);
      return { success: true, role: 'admin' };
    }

    // Buscar si el correo pertenece a uno de los profesores registrados
    const matchedCoach = coaches.find(c => c.email.toLowerCase().trim() === cleanEmail);

    const coachUser = {
      email: cleanEmail,
      nombre: matchedCoach ? matchedCoach.nombre : `Prof. (${cleanEmail.split('@')[0]})`,
      coachId: matchedCoach ? matchedCoach.id : (coaches[0]?.id || 'coach-1'),
      role: 'coach'
    };

    setCurrentUser(coachUser);
    return { success: true, role: 'coach', coach: matchedCoach };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      role,
      activeCoachId,
      isAdmin: role === 'admin',
      isCoach: role === 'coach',
      loginWithEmail,
      logout,
      masterEmail: MASTER_ADMIN_EMAIL
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
