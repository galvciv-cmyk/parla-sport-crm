import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { sendSessionAssignmentEmail } from '../services/emailService';
import { sendOneSignalPush } from '../services/oneSignalService';
import { triggerLocalPushNotification } from '../services/pwaService';
import { useAuth } from './AuthContext';

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

  // Escuchar notificaciones en tiempo real desde Firestore con respaldo en LocalStorage
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

      if (!isInitialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const n = change.doc.data();
            // Evitar notificar si fue creada por este mismo dispositivo en los últimos 5 segundos
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
            } else if (notifCoachId && (notifCoachId === String(userCoachId) || notifCoachId === String(currentUser?.uid) || notifCoachId.includes(String(currentUser?.uid)))) {
              shouldNotify = true;
            } else if (userEmail && notifEmail && notifEmail === userEmail) {
              shouldNotify = true;
            } else if (n.recipientRole === 'coach' && !notifCoachId && !notifEmail) {
              shouldNotify = true;
            }

            if (shouldNotify && !isVeryRecent) {
              triggerLocalPushNotification(n.title, n.message);
            }
          }
        });
      }
      isInitialLoad = false;
    }, () => {
      // Manejo silencioso y elegante del respaldo en almacenamiento local
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
        console.warn('[NotificationContext] No se pudo guardar la notificación en Firestore (usando respaldo local):', err.message);
      }
    }
  };

  // Notificación de Asignación / Reasignación de Sesión (para el Entrenador Y para el Admin)
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

    // 1. Notificación para el ENTRENADOR
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

    // 2. Notificación para el ADMINISTRADOR
    const titleAdmin = isReassignment
      ? `⚠️ Sesión Reasignada a ${coachName}`
      : `📋 Sesión Agendada Exitosamente`;

    const messageAdmin = isReassignment
      ? `La sesión del ${session.fecha} (${session.horaInicio}-${session.horaFin}) fue reasignada a ${coachName}.`
      : `Se agendó la clase ${session.tipo} con ${coachName} para el ${session.fecha} (${session.horaInicio}-${session.horaFin}). Jugadores: ${playerNames.join(', ')}.`;

    const notifAdmin = {
      id: `notif-${Date.now()}-admin`,
      title: titleAdmin,
      message: messageAdmin,
      recipientRole: 'admin',
      recipientCoachId: '',
      recipientEmail: '',
      timestamp: new Date().toISOString(),
      read: false,
      type: 'info'
    };

    // Guardar localmente e intentar remoto sin bloquear
    await saveNotificationLocallyAndRemote([notifCoach, notifAdmin]);

    // Enviar correo electrónico mediante EmailJS
    sendSessionAssignmentEmail({
      coachName,
      coachEmail,
      sessionType: session.tipo,
      date: session.fecha,
      startTime: session.horaInicio,
      endTime: session.horaFin,
      playerNames,
      isReassignment,
      previousCoachName
    }).catch(() => {});

    // Disparar Push remoto vía OneSignal
    if (coachId) {
      sendOneSignalPush(titleCoach, messageCoach, coachId);
    } else {
      triggerLocalPushNotification(titleCoach, messageCoach);
    }
  };

  // Notificación de Clase Finalizada por el Entrenador (dirigida al Admin)
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
    // Asumimos que los Admins pueden estar suscritos bajo un tag o ID específico
    // Para simplificar, usamos notificación local si el Admin está usando la app
    triggerLocalPushNotification(notifAdmin.title, notifAdmin.message);
  };

  // Notificación de Clase Pagada por el Admin (dirigida al Entrenador)
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
    if (coachId) {
      sendOneSignalPush(notifCoach.title, notifCoach.message, coachId);
    } else {
      triggerLocalPushNotification(notifCoach.title, notifCoach.message);
    }
  };

  const markAsRead = (id) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      try {
        localStorage.setItem('parla_notifications_store', JSON.stringify(updated));
      } catch (e) { console.warn(e); }
      return updated;
    });
    setDoc(doc(db, 'notifications', id), { read: true }, { merge: true }).catch(() => {});
  };

  const markAllAsRead = () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      try {
        localStorage.setItem('parla_notifications_store', JSON.stringify(updated));
      } catch (e) { console.warn(e); }
      return updated;
    });
    notifications.forEach(n => {
      setDoc(doc(db, 'notifications', n.id), { read: true }, { merge: true }).catch(() => {});
    });
  };

  const clearNotifications = () => {
    setNotifications([]);
    try {
      localStorage.removeItem('parla_notifications_store');
    } catch (e) { console.warn(e); }
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
