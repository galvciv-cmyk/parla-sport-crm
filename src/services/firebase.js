// Firebase Configuration Service for Spark Plan & Firebase Local Emulators
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-parla-sport-crm.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-parla-sport-crm",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-parla-sport-crm.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000"
};

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Conexión automática al emulador local de Firebase si está configurado VITE_USE_EMULATOR
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
