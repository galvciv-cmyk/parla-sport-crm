import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// ─── REGISTRAR EL SERVICE WORKER ───
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Registrar el Worker unificado (OneSignal Push + Cache PWA)
    navigator.serviceWorker.register('/OneSignalSDKWorker.js')
      .then((registration) => {
        console.log('Service Worker registrado con éxito. Scope:', registration.scope);
      })
      .catch((error) => {
        console.log('Fallo al registrar OneSignalSDKWorker, intentando /sw.js:', error);
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('Service Worker (/sw.js) registrado con éxito. Scope:', reg.scope);
          })
          .catch((err) => {
            console.log('Error al registrar el Service Worker:', err);
          });
      });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
