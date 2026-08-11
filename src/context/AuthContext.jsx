import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { MASTER_ADMIN_EMAIL } from '../utils/mockData';
import { loginToOneSignal, logoutFromOneSignal } from '../services/oneSignalService';

const AuthContext = createContext();

// Traduce los códigos de error de Firebase Auth a mensajes legibles en español
const translateAuthError = (code) => {
  switch (code) {
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Correo o contraseña incorrectos. Verifica tus credenciales.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta registrada con este correo. Ingresa tu contraseña.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'El inicio de sesión con Correo/Contraseña no está activado en Firebase.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Espera un momento antes de reintentar.';
    case 'auth/network-request-failed':
      return 'Error de conexión a la red. Revisa tu conexión a Internet.';
    default:
      return 'No se pudo iniciar sesión. Verifica tu contraseña e inténtalo de nuevo.';
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('parla_user_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authLoading, setAuthLoading] = useState(() => {
    return !localStorage.getItem('parla_user_session');
  });

  const isRegisteringRef = useRef(false);

  const updateSessionState = (userData) => {
    setCurrentUser(userData);
    setAuthLoading(false);
    if (userData) {
      localStorage.setItem('parla_user_session', JSON.stringify(userData));
    } else {
      localStorage.removeItem('parla_user_session');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          // Si no hay usuario en Firebase Auth y no hay sesión guardada en localStorage
          const savedSession = localStorage.getItem('parla_user_session');
          if (!savedSession) {
            updateSessionState(null);
          } else {
            setAuthLoading(false);
          }
          return;
        }

        const cleanEmail = (firebaseUser.email || '').toLowerCase().trim();
        const isMaster = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase() || cleanEmail.includes('admin@parlasport.com') || cleanEmail.startsWith('admin@');
        const defaultRole = isMaster ? 'admin' : 'coach';

        // Si el registro está en progreso, esperar brevemente a setDoc
        if (isRegisteringRef.current) {
          let attempts = 0;
          let docSnap = await getDoc(doc(db, 'users', firebaseUser.uid)).catch(() => null);
          while ((!docSnap || !docSnap.exists()) && attempts < 6 && isRegisteringRef.current) {
            await new Promise(r => setTimeout(r, 300));
            attempts++;
            docSnap = await getDoc(doc(db, 'users', firebaseUser.uid)).catch(() => null);
          }
        }

        let profile = null;
        try {
          const userDocSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDocSnap.exists()) {
            profile = userDocSnap.data();
          }
        } catch (err) {
          console.warn('[Auth] Error leyendo documento Firestore users:', err);
        }

        const generatedCoachId = isMaster ? null : (profile?.coachId || `coach-${firebaseUser.uid}`);

        if (!profile) {
          profile = {
            email: cleanEmail,
            nombre: isMaster ? 'Administrador Maestro' : (firebaseUser.displayName || 'Profesor / Entrenador'),
            role: defaultRole,
            coachId: generatedCoachId
          };
          setDoc(doc(db, 'users', firebaseUser.uid), profile, { merge: true }).catch(() => {});
          if (!isMaster) {
            setDoc(doc(db, 'coaches', generatedCoachId), {
              id: generatedCoachId,
              nombre: profile.nombre,
              email: cleanEmail,
              telefono: '',
              especialidad: 'Entrenador General',
              foto: '',
              bloquesDisponibilidad: [],
              fechaRegistro: new Date().toISOString().split('T')[0]
            }, { merge: true }).catch(() => {});
          }
        }

        const resolvedRole = profile?.role || defaultRole;

        updateSessionState({
          uid: firebaseUser.uid,
          email: cleanEmail,
          nombre: profile.nombre || (isMaster ? 'Administrador Maestro' : 'Entrenador'),
          role: resolvedRole,
          coachId: isMaster ? null : (profile.coachId || generatedCoachId)
        });

        // Autenticar en OneSignal
        const oneSignalId = (resolvedRole === 'admin' ? firebaseUser.uid : (profile.coachId || generatedCoachId)) || firebaseUser.uid;
        loginToOneSignal(oneSignalId, {
          uid: firebaseUser.uid,
          email: cleanEmail,
          role: resolvedRole,
          coachId: profile.coachId || generatedCoachId
        });
      } catch (err) {
        console.error('[Auth] Error en onAuthStateChanged:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    const fallbackTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  const login = async (email, password) => {
    const cleanEmail = (email || '').toLowerCase().trim();
    const isMaster = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase() || cleanEmail.includes('admin@parlasport.com') || cleanEmail.startsWith('admin@');

    // 1. Caso Administrador
    if (isMaster) {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const uid = cred.user.uid;

        let userDocSnap = await getDoc(doc(db, 'users', uid)).catch(() => null);
        let profile = userDocSnap && userDocSnap.exists() ? userDocSnap.data() : null;

        const masterUser = {
          uid,
          email: cleanEmail,
          nombre: profile?.nombre || 'Administrador Maestro',
          role: 'admin',
          coachId: null
        };

        await setDoc(doc(db, 'users', uid), masterUser, { merge: true }).catch(() => {});
        updateSessionState(masterUser);
        return { success: true, role: 'admin' };
      } catch (err) {
        console.warn('[Admin Login Error]:', err.code, err.message);

        // Si la cuenta admin no ha sido creada aún en Firebase Auth, crearla
        if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && password && password.length >= 6) {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            const newUid = newCred.user.uid;
            const masterUser = {
              uid: newUid,
              email: cleanEmail,
              nombre: 'Administrador Maestro',
              role: 'admin',
              coachId: null
            };
            await setDoc(doc(db, 'users', newUid), masterUser, { merge: true }).catch(() => {});
            updateSessionState(masterUser);
            return { success: true, role: 'admin' };
          } catch (createErr) {
            if (createErr.code === 'auth/email-already-in-use') {
              return { success: false, error: 'Contraseña de administrador incorrecta. Verifica tu contraseña.' };
            }
          }
        }

        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
          return { success: false, error: 'Contraseña de administrador incorrecta. Verifica tu contraseña.' };
        }

        return { success: false, error: translateAuthError(err.code || err.message) };
      }
    }

    // 2. Caso Entrenador / Profesor
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const uid = cred.user.uid;

      let userDocSnap = await getDoc(doc(db, 'users', uid)).catch(() => null);
      let profile = userDocSnap && userDocSnap.exists() ? userDocSnap.data() : null;

      const coachId = profile?.coachId || `coach-${uid}`;
      const resolvedRole = profile?.role || 'coach';

      if (!profile) {
        profile = { email: cleanEmail, nombre: 'Profesor / Entrenador', role: 'coach', coachId };
        await setDoc(doc(db, 'users', uid), profile, { merge: true }).catch(() => {});
      }

      updateSessionState({
        uid,
        email: cleanEmail,
        nombre: profile.nombre || 'Entrenador',
        role: resolvedRole,
        coachId: resolvedRole === 'admin' ? null : coachId
      });

      return { success: true, role: resolvedRole };
    } catch (err) {
      console.error('[Firebase Login Error]:', err.code, err.message);

      // Si el usuario aún no existe en Firebase Auth pero ingresó clave >= 6, registrarlo automáticamente
      if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') && password && password.length >= 6) {
        try {
          const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          const newUid = newCred.user.uid;
          const coachId = `coach-${newUid}`;
          const newProfile = { email: cleanEmail, nombre: 'Profesor / Entrenador', role: 'coach', coachId };

          await setDoc(doc(db, 'users', newUid), newProfile, { merge: true }).catch(() => {});
          await setDoc(doc(db, 'coaches', coachId), {
            id: coachId,
            nombre: 'Profesor / Entrenador',
            email: cleanEmail,
            especialidad: 'Entrenador General',
            bloquesDisponibilidad: []
          }, { merge: true }).catch(() => {});

          updateSessionState({
            uid: newUid,
            email: cleanEmail,
            nombre: 'Profesor / Entrenador',
            role: 'coach',
            coachId
          });

          return { success: true, role: 'coach' };
        } catch {
          // Ignorar error
        }
      }

      return { success: false, error: translateAuthError(err.code || err.message) };
    }
  };

  const register = async ({ email, password, nombre, coachProfile = null }) => {
    const cleanEmail = (email || '').toLowerCase().trim();
    const isMaster = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase() || cleanEmail.includes('admin@parlasport.com');
    const role = isMaster ? 'admin' : 'coach';

    isRegisteringRef.current = true;
    try {
      let uid;
      let credential;
      try {
        credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        uid = credential.user.uid;
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          try {
            const loginRes = await signInWithEmailAndPassword(auth, cleanEmail, password);
            uid = loginRes.user.uid;
          } catch {
            return {
              success: false,
              error: 'Ya existe una cuenta registrada con este correo. Ve a "Iniciar Sesión" e ingresa tu contraseña.'
            };
          }
        } else {
          return { success: false, error: translateAuthError(authErr.code) };
        }
      }

      const coachId = isMaster ? null : `coach-${uid}`;
      const userProfile = {
        uid,
        email: cleanEmail,
        nombre: nombre || (isMaster ? 'Administrador Maestro' : 'Profesor / Entrenador'),
        role,
        coachId
      };

      await setDoc(doc(db, 'users', uid), userProfile, { merge: true });

      if (!isMaster) {
        const fullCoachData = {
          id: coachId,
          nombre: userProfile.nombre,
          email: cleanEmail,
          telefono: coachProfile?.telefono || '',
          especialidad: coachProfile?.especialidad || 'Entrenador General',
          foto: coachProfile?.foto || '',
          bloquesDisponibilidad: coachProfile?.bloquesDisponibilidad || [],
          fechaRegistro: new Date().toISOString().split('T')[0]
        };
        await setDoc(doc(db, 'coaches', coachId), fullCoachData, { merge: true });
      }

      updateSessionState(userProfile);
      return { success: true, role };
    } catch (err) {
      console.error('[Register Error]:', err);
      return { success: false, error: translateAuthError(err.code || err.message) };
    } finally {
      isRegisteringRef.current = false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('[Auth] Error signOut:', err);
    }
    localStorage.removeItem('parla_user_session');
    sessionStorage.clear();
    setCurrentUser(null);
    logoutFromOneSignal().catch(() => {});
  };

  const updateUserProfile = async (updates) => {
    if (!currentUser?.uid) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, updates, { merge: true });

      if (currentUser.coachId) {
        const coachRef = doc(db, 'coaches', currentUser.coachId);
        await setDoc(coachRef, updates, { merge: true });
      }

      const updated = { ...currentUser, ...updates };
      updateSessionState(updated);
    } catch (err) {
      console.error('[Auth] Error actualizando perfil:', err);
    }
  };

  const role = currentUser?.role || 'admin';
  const isAdmin = role === 'admin';
  const isCoach = role === 'coach';
  const activeCoachId = currentUser?.coachId || null;

  return (
    <AuthContext.Provider value={{
      currentUser,
      role,
      isAdmin,
      isCoach,
      activeCoachId,
      authLoading,
      login,
      register,
      logout,
      updateUserProfile,
      masterEmail: MASTER_ADMIN_EMAIL
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
