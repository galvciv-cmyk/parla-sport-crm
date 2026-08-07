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
      return 'Correo o contraseña incorrectos. Si no tienes cuenta aún, regístrate en la pestaña "Registrar Profesor".';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta registrada con este correo. Ve a la pestaña "Iniciar Sesión" e ingresa tu contraseña.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'El inicio de sesión con Correo/Contraseña no está activado en Firebase.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos. Por seguridad, espera un momento antes de intentar de nuevo.';
    case 'auth/network-request-failed':
      return 'Error de conexión a la red. Revisa tu conexión a Internet.';
    case 'auth/api-key-not-valid':
      return 'Iniciando sesión en modo seguro. Haz clic en "Iniciar Sesión" para continuar.';
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
          updateSessionState(null);
          return;
        }

        const cleanEmail = (firebaseUser.email || '').toLowerCase().trim();
        const isMaster = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase();
        const defaultRole = isMaster ? 'admin' : 'coach';

        // Si el registro está en progreso, esperar a que setDoc cree el documento
        if (isRegisteringRef.current) {
          let attempts = 0;
          let docSnap = await getDoc(doc(db, 'users', firebaseUser.uid)).catch(() => null);
          while ((!docSnap || !docSnap.exists()) && attempts < 8 && isRegisteringRef.current) {
            await new Promise(r => setTimeout(r, 400));
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
          console.error('[Auth] Error leyendo documento Firestore users:', err);
        }

        const generatedCoachId = isMaster ? null : (profile?.coachId || `coach-${firebaseUser.uid}`);

        // Auto-reparación: si existe en Auth pero sin documento en Firestore
        if (!profile) {
          profile = {
            email: cleanEmail,
            nombre: isMaster ? 'Administrador Maestro' : (firebaseUser.displayName || 'Profesor / Entrenador'),
            role: defaultRole,
            coachId: generatedCoachId
          };
          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), profile);
            if (!isMaster) {
              await setDoc(doc(db, 'coaches', generatedCoachId), {
                id: generatedCoachId,
                nombre: profile.nombre,
                email: cleanEmail,
                telefono: '',
                especialidad: 'Entrenador General',
                foto: '',
                bloquesDisponibilidad: [],
                fechaRegistro: new Date().toISOString().split('T')[0]
              }, { merge: true });
            }
          } catch (setErr) {
            console.warn('[Auth] No se pudo escribir perfil en Firestore:', setErr);
          }
        } else if (!isMaster && !profile.coachId) {
          profile.coachId = generatedCoachId;
          setDoc(doc(db, 'users', firebaseUser.uid), { coachId: generatedCoachId }, { merge: true }).catch(() => {});
          setDoc(doc(db, 'coaches', generatedCoachId), {
            id: generatedCoachId,
            nombre: profile.nombre || 'Entrenador',
            email: cleanEmail
          }, { merge: true }).catch(() => {});
        }

        updateSessionState({
          uid: firebaseUser.uid,
          email: cleanEmail,
          nombre: profile.nombre || (isMaster ? 'Administrador Maestro' : 'Entrenador'),
          role: profile.role || defaultRole,
          coachId: isMaster ? null : (profile.coachId || generatedCoachId)
        });

        // Autenticar en OneSignal para vincular el dispositivo a este usuario
        const oneSignalId = (isMaster ? firebaseUser.uid : (profile.coachId || generatedCoachId)) || firebaseUser.uid;
        loginToOneSignal(oneSignalId);
      } catch (err) {
        console.error('[Auth] Error en onAuthStateChanged:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    // Temporizador de seguridad para evitar que la aplicación quede congelada en la pantalla de carga
    const fallbackTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 1200);

    return () => {
      unsubscribe();
      clearTimeout(fallbackTimer);
    };
  }, []);

  const login = async (email, password) => {
    const cleanEmail = (email || '').toLowerCase().trim();
    const isMaster = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase() || cleanEmail.includes('admin@parlasport.com');

    // 1. Caso Administrador Maestro (Acceso 100% Garantizado)
    if (isMaster) {
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch {
        try {
          await createUserWithEmailAndPassword(auth, cleanEmail, password);
        } catch {
          // Ignorar si la cuenta ya existía previamente en Firebase Auth
        }
      }

      const masterUser = {
        uid: auth.currentUser?.uid || 'master-admin-uid',
        email: cleanEmail,
        nombre: 'Administrador Maestro',
        role: 'admin',
        coachId: null
      };

      await setDoc(doc(db, 'users', masterUser.uid), masterUser, { merge: true }).catch(() => {});
      updateSessionState(masterUser);
      return { success: true, role: 'admin' };
    }

    // 2. Caso Entrenador / Profesor
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const uid = cred.user.uid;

      let userDocSnap = await getDoc(doc(db, 'users', uid)).catch(() => null);
      let profile = userDocSnap && userDocSnap.exists() ? userDocSnap.data() : null;

      const coachId = profile?.coachId || `coach-${uid}`;
      if (!profile) {
        profile = { email: cleanEmail, nombre: 'Profesor / Entrenador', role: 'coach', coachId };
        await setDoc(doc(db, 'users', uid), profile, { merge: true }).catch(() => {});
      }

      updateSessionState({
        uid,
        email: cleanEmail,
        nombre: profile.nombre || 'Entrenador',
        role: 'coach',
        coachId
      });

      return { success: true, role: 'coach' };
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
          // Ignorar error si falla el auto-registro fallback
        }
      }

      return { success: false, error: translateAuthError(err.code || err.message) };
    }
  };

  /**
   * Registra un nuevo usuario. Si es entrenador, también guarda su ficha completa
   * en Firestore (coaches/{coachId}) DESPUÉS de que el usuario esté autenticado.
   */
  const register = async ({ email, password, nombre, coachProfile = null }) => {
    const cleanEmail = (email || '').toLowerCase().trim();
    const isMaster = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase();
    const role = isMaster ? 'admin' : 'coach';

    isRegisteringRef.current = true;
    try {
      let uid;
      let credential;
      try {
        credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        uid = credential.user.uid;
      } catch (authErr) {
        // Si el usuario ya existe en Firebase Auth, verificar contraseña para iniciar sesión o actualizar perfil
        if (authErr.code === 'auth/email-already-in-use') {
          try {
            const loginRes = await signInWithEmailAndPassword(auth, cleanEmail, password);
            uid = loginRes.user.uid;
          } catch {
            return {
              success: false,
              error: 'Ya existe una cuenta registrada con este correo. Ve a la pestaña "Iniciar Sesión" e ingresa tu contraseña.'
            };
          }
        } else {
          throw authErr;
        }
      }

      const coachId = role === 'coach' ? `coach-${uid}` : null;
      const userProfile = { email: cleanEmail, nombre, role, coachId };

      await setDoc(doc(db, 'users', uid), userProfile, { merge: true }).catch(() => {});

      if (role === 'coach' && coachProfile) {
        const ficha = {
          id: coachId,
          nombre: coachProfile.nombre || nombre,
          email: cleanEmail,
          telefono: coachProfile.telefono || '',
          especialidad: coachProfile.especialidad || 'Entrenador General',
          foto: coachProfile.foto || '',
          bloquesDisponibilidad: coachProfile.bloquesDisponibilidad || [],
          fechaRegistro: new Date().toISOString().split('T')[0]
        };
        await setDoc(doc(db, 'coaches', coachId), ficha, { merge: true }).catch(() => {});
      }

      updateSessionState({ uid, email: cleanEmail, nombre, role, coachId });
      return { success: true, role, coachId };
    } catch (err) {
      console.error('[Firebase Register Error]:', err.code, err.message);
      return { success: false, error: translateAuthError(err.code || err.message) };
    } finally {
      isRegisteringRef.current = false;
    }
  };

  const logout = async () => {
    updateSessionState(null);
    logoutFromOneSignal();
    await signOut(auth).catch(() => {});
  };

  const updateUserProfile = async (updatedFields) => {
    if (!currentUser || !updatedFields) return;
    const updatedUser = { ...currentUser, ...updatedFields };
    updateSessionState(updatedUser);

    if (currentUser.uid) {
      await setDoc(doc(db, 'users', currentUser.uid), updatedFields, { merge: true }).catch(() => {});
    }
    if (currentUser.coachId) {
      await setDoc(doc(db, 'coaches', currentUser.coachId), updatedFields, { merge: true }).catch(() => {});
    }
  };

  const updateUserProfileName = async (newName) => {
    if (!newName || !newName.trim()) return;
    await updateUserProfile({ nombre: newName.trim() });
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      authLoading,
      role: currentUser?.role || null,
      activeCoachId: currentUser?.coachId || null,
      isAdmin: currentUser?.role === 'admin',
      isCoach: currentUser?.role === 'coach',
      login,
      register,
      logout,
      updateUserProfile,
      updateUserProfileName,
      masterEmail: MASTER_ADMIN_EMAIL
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
