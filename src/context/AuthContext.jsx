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
      return 'Ya existe una cuenta registrada con este correo en Firebase Auth. Ve a la pestaña "Iniciar Sesión" e ingresa con tu contraseña.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'El inicio de sesión con Correo/Contraseña no está activado en la consola de Firebase (Build > Authentication > Sign-in method).';
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

      // Si el registro está en progreso, dar tiempo a que setDoc en register() cree el documento
      if (isRegisteringRef.current) {
        let attempts = 0;
        let docSnap = await getDoc(doc(db, 'users', firebaseUser.uid)).catch(() => null);
        while ((!docSnap || !docSnap.exists()) && attempts < 6 && isRegisteringRef.current) {
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

      // Auto-reparación: si el usuario existe en Auth pero no tiene documento en Firestore, crearlo automáticamente
      if (!profile) {
        profile = {
          email: cleanEmail,
          nombre: isMaster ? 'Administrador Maestro' : (firebaseUser.displayName || 'Profesor / Entrenador'),
          role: defaultRole,
          coachId: null
        };

        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), profile);
          console.log('[Auth] Perfil de usuario creado/reparado exitosamente en Firestore:', profile);
        } catch (setErr) {
          console.warn('[Auth] No se pudo escribir perfil en Firestore (¿verificar reglas?):', setErr);
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

  const register = async ({ email, password, nombre, coachId = null }) => {
    const cleanEmail = email.toLowerCase().trim();
    const role = cleanEmail === MASTER_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'coach';

    isRegisteringRef.current = true;
    try {
      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      const userProfile = {
        email: cleanEmail,
        nombre,
        role,
        coachId
      };

      try {
        await setDoc(doc(db, 'users', credential.user.uid), userProfile);
      } catch (docErr) {
        console.warn('[Auth] No se pudo escribir en Firestore durante registro:', docErr);
      }

      setCurrentUser({
        uid: credential.user.uid,
        email: cleanEmail,
        nombre,
        role,
        coachId
      });

      return { success: true, role };
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
