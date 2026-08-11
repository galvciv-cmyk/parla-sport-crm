import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { sendOneSignalPush } from '../services/oneSignalService';
import { triggerLocalPushNotification } from '../services/pwaService';
import { useAuth } from './AuthContext';
import { logNotifEvent } from '../components/common/NotificationDebugPanel';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('parla_notifications_store');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const { currentUser, role, activeCoachId } = useAuth() || {};

  // ─── Escuchar notificaciones en tiempo real desde Firestore ───
  useEffect(() => {
    let isInitialLoad = true;

    const unsub = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const firestoreNotifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      firestoreNotifs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      setNotifications(firestoreNotifs);

      try {
        localStorage.setItem('parla_notifications_store', JSON.stringify(firestoreNotifs));
      } catch (e) {
        console.warn(e);
      }

      // Log del snapshot de Firestore
      if (!isInitialLoad) {
        const added = snapshot.docChanges().filter(c => c.type === 'added').length;
        const modified = snapshot.docChanges().filter(c => c.type === 'modified').length;
        if (added > 0 || modified > 0) {
          logNotifEvent('firestore',
            `📥 Firestore: ${added} nueva${added !== 1 ? 's' : ''}, ${modified} modificada${modified !== 1 ? 's' : ''}`,
            `Total en colección: ${firestoreNotifs.length}`,
            { added, modified, total: firestoreNotifs.length }
          );
        }
      } else {
        logNotifEvent('firestore',
          `🔌 Firestore conectado — ${firestoreNotifs.length} notificaciones cargadas`,
          `Escuchando colección: notifications`,
          { count: firestoreNotifs.length }
        );
      }

      // Solo procesar cambios DESPUÉS de la carga inicial (evitar notificaciones duplicadas al abrir la app)
      if (!isInitialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const n = change.doc.data();

            // Ignorar notificaciones creadas por ESTE dispositivo en los últimos 5 segundos
            const isVeryRecent = (new Date() - new Date(n.timestamp)) < 5000;

            let shouldNotify = false;
            const notifCoachId = String(n.recipientCoachId || '');
            const notifEmail = String(n.recipientEmail || '').trim().toLowerCase();
            const userEmail = (currentUser?.email || '').trim().toLowerCase();
            const userCoachId = activeCoachId || (currentUser?.uid ? `coach-${currentUser.uid}` : '');

            if (role === 'admin') {
              shouldNotify = true;
            } else if (n.recipientRole === 'all') {
              shouldNotify = true;
            } else if (notifCoachId && (
              notifCoachId === String(userCoachId) ||
              notifCoachId === String(currentUser?.uid) ||
              notifCoachId.includes(String(currentUser?.uid))
            )) {
              shouldNotify = true;
            } else if (userEmail && notifEmail && notifEmail === userEmail) {
              shouldNotify = true;
            } else if (n.recipientRole === 'coach' && !notifCoachId && !notifEmail) {
              shouldNotify = true;
            }

            // Mostrar toast in-app (y notificación del OS si hay permisos)
            if (shouldNotify && !isVeryRecent) {
              const notifType = n.type === 'warning' ? 'warning'
                : n.type === 'success' ? 'success'
                : 'notification';
              logNotifEvent('toast',
                `🔔 Notificación entregada: ${n.title}`,
                n.message,
                { id: n.id, type: n.type, recipientRole: n.recipientRole, recipientCoachId: n.recipientCoachId }
              );
              triggerLocalPushNotification(n.title, n.message, notifType);
            } else if (shouldNotify && isVeryRecent) {
              logNotifEvent('info',
                `⏭️ Notificación propia omitida (muy reciente)`,
                n.title
              );
            }
          }
        });
      }

      isInitialLoad = false;
    }, () => {
      // Fallback local si Firestore falla
      try {
        const saved = localStorage.getItem('parla_notifications_store');
        if (saved) setNotifications(JSON.parse(saved));
      } catch {
        // Silencioso
      }
    });

    return () => unsub();
  }, [currentUser, role, activeCoachId]);

  const saveNotificationLocallyAndRemote = async (newNotifs) => {
    setNotifications(prev => {
      const updated = [...newNotifs, ...prev.filter(p => !newNotifs.some(n => n.id === p.id))];
      try {
        localStorage.setItem('parla_notifications_store', JSON.stringify(updated));
      } catch (e) {
        console.warn(e);
      }
      return updated;
    });

    for (const notif of newNotifs) {
      try {
        await setDoc(doc(db, 'notifications', notif.id), notif);
      } catch (err) {
        console.warn('[NotificationContext] No se pudo guardar en Firestore (respaldo local activo):', err.message);
      }
    }
  };

  // ─── Notificación de Asignación / Reasignación ───
  const notifySessionAssignment = async ({
    coach,
    session,
    players = [],
    isReassignment = false,
    previousCoachName = ''
  }) => {
    if (!session) return;

    const playerNames = (players || []).map(p => p.nombre || 'Jugador').filter(Boolean);
    const coachName = coach?.nombre || session.entrenadorNombre || 'Entrenador';
    const coachEmail = (coach?.email || session.entrenadorEmail || '').trim().toLowerCase();
    const coachId = String(coach?.id || session.entrenadorId || '');

    // Notificación para el ENTRENADOR
    const titleCoach = isReassignment
      ? `⚠️ Reasignación: Sesión ${session.tipo || '1-1'}`
      : `⚽ Nueva Sesión Asignada (${session.tipo || '1-1'})`;

    const messageCoach = isReassignment
      ? `Se te ha reasignado la sesión del ${session.fecha} (${session.horaInicio}-${session.horaFin}) por ausencia de ${previousCoachName || 'profesor'}. Jugadores: ${playerNames.join(', ')}.`
      : `Nueva sesión programada para el ${session.fecha} (${session.horaInicio}-${session.horaFin}). Jugadores: ${playerNames.join(', ')}.`;

    const notifCoach = {
      id: `notif-${Date.now()}-coach`,
      title: titleCoach,
      message: messageCoach,
      recipientCoachId: coachId,
      recipientEmail: coachEmail,
      recipientRole: 'coach',
      timestamp: new Date().toISOString(),
      read: false,
      type: isReassignment ? 'warning' : 'success'
    };

    // Notificación para el ADMINISTRADOR
    const titleAdmin = isReassignment
      ? `⚠️ Sesión Reasignada a ${coachName}`
      : `📋 Sesión Agendada Exitosamente`;

    const messageAdmin = isReassignment
      ? `La sesión del ${session.fecha} (${session.horaInicio}-${session.horaFin}) fue reasignada a ${coachName}.`
      : `Se agendó la clase ${session.tipo} con ${coachName} para el ${session.fecha} (${session.horaInicio}-${session.horaFin}). Jugadores: ${playerNames.join(', ')}.`;

    const notifAdmin = {
      id: `notif-${Date.now() + 1}-admin`,
      title: titleAdmin,
      message: messageAdmin,
      recipientRole: 'admin',
      recipientCoachId: '',
      recipientEmail: '',
      timestamp: new Date().toISOString(),
      read: false,
      type: 'info'
    };

    // 1. Guardar en Firestore (esto disparará el onSnapshot en TODOS los dispositivos conectados)
    await saveNotificationLocallyAndRemote([notifCoach, notifAdmin]);

    // 2. Enviar Push remoto via OneSignal al entrenador (para cuando tiene la app CERRADA)
    if (coachId) {
      logNotifEvent('onesignal',
        `📤 Push OneSignal enviado → ${coachId}`,
        titleCoach,
        { coachId, title: titleCoach, message: messageCoach }
      );
      sendOneSignalPush(titleCoach, messageCoach, coachId);
    }
    // El admin recibirá el toast in-app vía el onSnapshot listener
  };

  // ─── Notificación de Sesión Completada (para el Admin) ───
  const notifySessionCompleted = async ({ session, coachName }) => {
    if (!session) return;

    const notifAdmin = {
      id: `notif-${Date.now()}-completed`,
      title: `🟠 Entrenamiento Finalizado`,
      message: `El profesor ${coachName || 'asignado'} ha finalizado la sesión del ${session.fecha} (${session.horaInicio}-${session.horaFin}). Lista para revisión y pago.`,
      recipientRole: 'admin',
      recipientCoachId: '',
      recipientEmail: '',
      timestamp: new Date().toISOString(),
      read: false,
      type: 'warning'
    };

    await saveNotificationLocallyAndRemote([notifAdmin]);
    // El Admin recibirá el toast vía onSnapshot
  };

  // ─── Notificación de Pago Registrado (para el Entrenador) ───
  const notifySessionPaid = async ({ session, coach }) => {
    if (!session) return;

    const coachId = String(coach?.id || session.entrenadorId || '');
    const coachEmail = (coach?.email || session.entrenadorEmail || '').trim().toLowerCase();

    const notifCoach = {
      id: `notif-${Date.now()}-paid`,
      title: `🟢 Pago de Clase Registrado`,
      message: `Se ha registrado el pago de tu clase del ${session.fecha} (${session.horaInicio}-${session.horaFin}).`,
      recipientCoachId: coachId,
      recipientEmail: coachEmail,
      recipientRole: 'coach',
      timestamp: new Date().toISOString(),
      read: false,
      type: 'success'
    };

    await saveNotificationLocallyAndRemote([notifCoach]);

    // Push remoto al entrenador si tiene la app cerrada
    if (coachId) {
      logNotifEvent('onesignal',
        `📤 Push OneSignal enviado → ${coachId} (pago)`,
        notifCoach.title,
        { coachId, title: notifCoach.title }
      );
      sendOneSignalPush(notifCoach.title, notifCoach.message, coachId);
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      try { localStorage.setItem('parla_notifications_store', JSON.stringify(updated)); } catch (e) { console.warn(e); }
      return updated;
    });
    setDoc(doc(db, 'notifications', id), { read: true }, { merge: true }).catch(() => {});
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      try { localStorage.setItem('parla_notifications_store', JSON.stringify(updated)); } catch (e) { console.warn(e); }
      return updated;
    });
    notifications.forEach(n => {
      setDoc(doc(db, 'notifications', n.id), { read: true }, { merge: true }).catch(() => {});
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    try { localStorage.removeItem('parla_notifications_store'); } catch (e) { console.warn(e); }
    notifications.forEach(n => {
      deleteDoc(doc(db, 'notifications', n.id)).catch(() => {});
    });
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      notifySessionAssignment,
      notifySessionCompleted,
      notifySessionPaid,
      markAsRead,
      markAllAsRead,
      clearNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
