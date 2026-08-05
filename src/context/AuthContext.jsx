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

const AuthContext = createContext();

// Traduce los códigos de error de Firebase Auth a mensajes legibles en español
const translateAuthError = (code) => {
  switch (code) {
    case 'auth/invalid-email':
      return 'El correo electrónico no es válido.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use':
      return 'Ya existe una cuenta registrada con este correo. Ve a la pestaña "Iniciar Sesión" e ingresa con tu contraseña.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'El inicio de sesión con Correo/Contraseña no está activado en la consola de Firebase.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento antes de volver a intentar.';
    default:
      return 'Ocurrió un error al procesar la solicitud. Inténtalo de nuevo.';
  }
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isRegisteringRef = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setAuthLoading(false);
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

      // Auto-reparación: si existe en Auth pero sin documento en Firestore
      if (!profile) {
        profile = {
          email: cleanEmail,
          nombre: isMaster ? 'Administrador Maestro' : (firebaseUser.displayName || 'Profesor / Entrenador'),
          role: defaultRole,
          coachId: null
        };
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), profile);
        } catch (setErr) {
          console.warn('[Auth] No se pudo escribir perfil en Firestore:', setErr);
        }
      }

      setCurrentUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        nombre: profile.nombre || (isMaster ? 'Administrador Maestro' : 'Entrenador'),
        role: profile.role || defaultRole,
        coachId: profile.coachId || null
      });

      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      return { success: true };
    } catch (err) {
      console.error('[Firebase Auth Error]:', err.code, err.message);
      return { success: false, error: translateAuthError(err.code) };
    }
  };

  /**
   * Registra un nuevo usuario. Si es entrenador, también guarda su ficha completa
   * en Firestore (coaches/{coachId}) DESPUÉS de que el usuario esté autenticado.
   * Campos de coachProfile (opcionales, solo para role=coach):
   *   { nombre, email, telefono, especialidad, foto, bloquesDisponibilidad }
   */
  const register = async ({ email, password, nombre, coachProfile = null }) => {
    const cleanEmail = email.toLowerCase().trim();
    const isMaster = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase();
    const role = isMaster ? 'admin' : 'coach';

    isRegisteringRef.current = true;
    try {
      // 1. Crear usuario en Firebase Auth
      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const uid = credential.user.uid;

      // 2. Generar ID para la ficha del entrenador
      const coachId = role === 'coach' ? `coach-${uid}` : null;

      // 3. Guardar perfil de usuario en Firestore users/{uid}
      const userProfile = { email: cleanEmail, nombre, role, coachId };
      await setDoc(doc(db, 'users', uid), userProfile);

      // 4. Si es entrenador, guardar su ficha en Firestore coaches/{coachId}
      if (role === 'coach' && coachProfile) {
        const ficha = {
          id: coachId,
          nombre: coachProfile.nombre || nombre,
          email: cleanEmail,
          telefono: coachProfile.telefono || '',
          especialidad: coachProfile.especialidad || '',
          foto: coachProfile.foto || '',
          bloquesDisponibilidad: coachProfile.bloquesDisponibilidad || [],
          fechaRegistro: new Date().toISOString().split('T')[0]
        };
        try {
          await setDoc(doc(db, 'coaches', coachId), ficha);
          console.log('[Auth] ✅ Ficha de entrenador guardada en Firestore:', ficha);
        } catch (coachErr) {
          console.warn('[Auth] No se pudo guardar la ficha del entrenador en Firestore:', coachErr);
        }
      }

      setCurrentUser({ uid, email: cleanEmail, nombre, role, coachId });
      return { success: true, role, coachId };
    } catch (err) {
      console.error('[Firebase Auth Error]:', err.code, err.message);
      return { success: false, error: translateAuthError(err.code) };
    } finally {
      isRegisteringRef.current = false;
    }
  };

  const logout = () => signOut(auth);

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
      masterEmail: MASTER_ADMIN_EMAIL
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
