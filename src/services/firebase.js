// Firebase Configuration Service for Spark Plan & Production Fallback
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAQFMfI2YWwQ-Z_MYMp3I-VmXzy4xzU26Y",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "evolution-aca6e.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "evolution-aca6e",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "evolution-aca6e.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "458002939896",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:458002939896:web:66bc1f7dd874c76c42e00d"
};

export const isFirebaseConfigured = true;

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Conexión opcional al emulador local de Firebase si VITE_USE_EMULATOR está explícitamente en 'true'
const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true';

if (useEmulator && !window._firebaseEmulatorsConnected) {
  window._firebaseEmulatorsConnected = true;
  const emulatorHost = import.meta.env.VITE_EMULATOR_HOST || 'localhost';
  
  try {
    connectFirestoreEmulator(db, emulatorHost, 8080);
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    console.log(`[Firebase Emulator] 🛠️ Conectado a Emulador Local (${emulatorHost}) - Auth: 9099, Firestore: 8080`);
  } catch (err) {
    console.warn('[Firebase Emulator] No se pudo conectar al emulador:', err.message);
  }
}

export default app;
