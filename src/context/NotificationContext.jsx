import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { sendOneSignalPush, sendOneSignalEmail, sendSessionAssignmentNotification, sendNetlifyEmail } from '../services/oneSignalService';
import { triggerLocalPushNotification } from '../services/pwaService';
import { useAuth } from './AuthContext';
import { logNotifEvent } from '../utils/debugLogger';
import { formatTo12Hour } from '../utils/scheduling';
import {
  buildWelcomeCoachHtml,
  buildAdminNewCoachHtml,
  buildCoachMotivationalHtml,
  buildCoachWorkdayThanksHtml
} from '../services/emailTemplates';

const NotificationContext = createContext();
const ADMIN_NOTIFICATION_EMAIL = 'parlasport.vzla@gmail.com';

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
        const addedDocs = snapshot.docChanges().filter(c => c.type === 'added');
        const modifiedDocs = snapshot.docChanges().filter(c => c.type === 'modified');
        
        if (addedDocs.length > 0 || modifiedDocs.length > 0) {
          logNotifEvent('firestore',
            `📥 Firestore: ${addedDocs.length} nueva(s), ${modifiedDocs.length} modif.`,
            `Total en colección: ${firestoreNotifs.length}`,
            { added: addedDocs.length, modified: modifiedDocs.length, total: firestoreNotifs.length }
          );
        }
      } else {
        logNotifEvent('firestore',
          `🔌 Firestore conectado — ${firestoreNotifs.length} notificaciones`,
          `Escuchando colección: notifications`,
          { count: firestoreNotifs.length }
        );
      }

      // Procesar cambios en tiempo real (después de la carga inicial)
      if (!isInitialLoad) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const n = change.doc.data();

            // Identificar si la notificación fue originada por el usuario actual en este dispositivo
            const isSender = (
              (n.senderUid && currentUser?.uid && String(n.senderUid) === String(currentUser.uid)) ||
              (n.senderEmail && currentUser?.email && String(n.senderEmail).toLowerCase() === String(currentUser.email).toLowerCase())
            );

            let shouldNotify = false;
            const notifCoachId = String(n.recipientCoachId || '');
            const notifEmail = String(n.recipientEmail || '').trim().toLowerCase();
            const userEmail = (currentUser?.email || '').trim().toLowerCase();
            const userCoachId = activeCoachId || currentUser?.coachId || (currentUser?.uid ? `coach-${currentUser.uid}` : '');
            const rawUid = String(currentUser?.uid || '');
            const coachProfileId = String(currentUser?.coachId || '');

            const isUserAdmin = role === 'admin' || currentUser?.role === 'admin';

            if (isUserAdmin) {
              // El Administrador es el ÚNICO que recibe alertas de administración o globales
              shouldNotify = (n.recipientRole === 'admin' || n.recipientRole === 'all');
            } else {
              // Los entrenadores NUNCA reciben alertas de administración ni de otros entrenadores
              if (n.recipientRole === 'admin') {
                shouldNotify = false;
              } else if (n.recipientRole === 'all') {
                shouldNotify = true;
              } else if (notifCoachId && (
                notifCoachId === String(userCoachId) ||
                notifCoachId === rawUid ||
                notifCoachId === `coach-${rawUid}` ||
                notifCoachId === coachProfileId ||
                (coachProfileId && notifCoachId.replace('coach-', '') === coachProfileId.replace('coach-', '')) ||
                (activeCoachId && (notifCoachId === String(activeCoachId) || notifCoachId === `coach-${activeCoachId}` || notifCoachId.replace('coach-', '') === String(activeCoachId).replace('coach-', ''))) ||
                (rawUid && notifCoachId.replace('coach-', '') === rawUid)
              )) {
                shouldNotify = true;
              } else if (userEmail && notifEmail && notifEmail === userEmail) {
                shouldNotify = true;
              }
            }

            // Si es destinatario válido y NO es quien originó la acción
            if (shouldNotify && !isSender) {
              const notifType = n.type === 'warning' ? 'warning'
                : n.type === 'success' ? 'success'
                : 'notification';

              logNotifEvent('toast',
                `🔔 ¡Notificación recibida! ${n.title}`,
                n.message,
                { id: n.id, type: n.type, recipientRole: n.recipientRole, recipientCoachId: n.recipientCoachId }
              );

              triggerLocalPushNotification(n.title, n.message, notifType);
            } else if (isSender) {
              logNotifEvent('info',
                `✅ Notificación enviada por ti registrada en el sistema`,
                n.title
              );
            }
          }
        });
      }

      isInitialLoad = false;
    }, (error) => {
      console.warn('[NotificationContext] Error en snapshot Firestore:', error);
      logNotifEvent('error', 'Error en conexión Firestore notifications', error?.message);
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

  // ─── 1. Notificación de Asignación / Reasignación / Modificación ───
  const notifySessionAssignment = async ({
    coach,
    session,
    players = [],
    isReassignment = false,
    previousCoachName = '',
    isModification = false
  }) => {
    if (!session) return;

    const playerNames = (players || []).map(p => p.nombre || 'Jugador').filter(Boolean);
    const coachName = coach?.nombre || session.entrenadorNombre || 'Entrenador';
    const coachEmail = (coach?.email || session.entrenadorEmail || '').trim().toLowerCase();
    const coachId = String(coach?.id || session.entrenadorId || '');
    const formattedStart = session?.horaInicio ? formatTo12Hour(session.horaInicio) : 'Por definir';
    const formattedEnd = session?.horaFin ? formatTo12Hour(session.horaFin) : '';
    const horarioStr = formattedEnd ? `${formattedStart} - ${formattedEnd}` : formattedStart;

    // Notificación para el ENTRENADOR
    const titleCoach = isReassignment
      ? `⚠️ Reasignación: Sesión ${session.tipo || '1-1'}`
      : (isModification
        ? `✏️ Sesión Modificada (${session.tipo || '1-1'})`
        : `⚽ Nueva Sesión Asignada (${session.tipo || '1-1'})`);

    const messageCoach = isReassignment
      ? `Se te ha reasignado la sesión del ${session.fecha} (${horarioStr}) por ausencia de ${previousCoachName || 'profesor'}. Jugadores: ${playerNames.join(', ')}.`
      : (isModification
        ? `Se ha modificado la sesión asignada a las ${formattedStart} (${session.fecha}). Modalidad: ${session.tipo}. Jugadores: ${playerNames.join(', ')}.`
        : `Nueva sesión programada para el ${session.fecha} (${horarioStr}). Jugadores: ${playerNames.join(', ')}.`);

    const notifCoach = {
      id: `notif-${Date.now()}-coach`,
      title: titleCoach,
      message: messageCoach,
      recipientCoachId: coachId,
      recipientEmail: coachEmail,
      recipientRole: 'coach',
      senderUid: currentUser?.uid || 'admin',
      senderEmail: currentUser?.email || '',
      timestamp: new Date().toISOString(),
      read: false,
      type: (isReassignment || isModification) ? 'warning' : 'success'
    };

    // Notificación de confirmación para el ADMIN
    const titleAdmin = isReassignment
      ? `⚠️ Sesión Reasignada a ${coachName}`
      : (isModification
        ? `✏️ Sesión Modificada: ${coachName}`
        : `📋 Sesión Agendada Exitosamente`);

    const messageAdmin = isReassignment
      ? `La sesión del ${session.fecha} (${horarioStr}) fue reasignada a ${coachName}.`
      : (isModification
        ? `Se modificó la sesión de ${coachName} a las ${formattedStart} (${session.fecha}). Formato: ${session.tipo}. Jugadores: ${playerNames.join(', ')}.`
        : `Se agendó la clase ${session.tipo} con ${coachName} para el ${session.fecha} (${horarioStr}). Jugadores: ${playerNames.join(', ')}.`);

    const notifAdmin = {
      id: `notif-${Date.now()}-admin`,
      title: titleAdmin,
      message: messageAdmin,
      recipientCoachId: '',
      recipientEmail: '',
      recipientRole: 'admin',
      senderUid: currentUser?.uid || 'admin',
      senderEmail: currentUser?.email || '',
      timestamp: new Date().toISOString(),
      read: false,
      type: isReassignment ? 'warning' : 'info'
    };

    // Disparar Push remoto + Email al entrenador
    sendSessionAssignmentNotification({
      session,
      coach,
      players,
      isReassignment,
      previousCoachName,
      isModification
    }).catch(err => console.warn('[NotificationContext] Error enviando OneSignal multicanal:', err));

    // Disparar Correo Electrónico de Confirmación al Administrador
    const adminSubject = isReassignment
      ? `⚠️ Sesión Reasignada: ${coachName} - ${session.fecha} (${formattedStart}) - Parla Sport`
      : (isModification
        ? `✏️ Sesión Modificada: ${coachName} - ${session.fecha} (${formattedStart}) - Parla Sport`
        : `📋 Sesión Agendada: ${coachName} - ${session.fecha} (${formattedStart}) - Parla Sport`);

    sendNetlifyEmail({
      toEmail: ADMIN_NOTIFICATION_EMAIL,
      coachName,
      session,
      players,
      isReassignment,
      isModification,
      customSubject: adminSubject
    }).catch(err => console.warn('[NotificationContext] Error enviando email de asignación al admin:', err));

    // Guardar en Firestore y local
    await saveNotificationLocallyAndRemote([notifCoach, notifAdmin]);
  };

  // ─── 2. Notificación de Sesión Completada (para el Admin) ───
  const notifySessionCompleted = async ({ session, coachName, players = [] }) => {
    if (!session) return;

    const notifAdmin = {
      id: `notif-${Date.now()}-completed`,
      title: `🟠 Entrenamiento Finalizado`,
      message: `El profesor ${coachName || 'asignado'} ha finalizado la sesión del ${session.fecha} (${formatTo12Hour(session.horaInicio)} - ${formatTo12Hour(session.horaFin)}). Lista para revisión y pago.`,
      recipientRole: 'admin',
      recipientCoachId: '',
      recipientEmail: '',
      senderUid: currentUser?.uid || 'coach',
      senderEmail: currentUser?.email || '',
      timestamp: new Date().toISOString(),
      read: false,
      type: 'warning'
    };

    // 1. Disparar Push remoto al Administrador (App cerrada)
    sendOneSignalPush({
      title: notifAdmin.title,
      message: notifAdmin.message,
      recipientRole: 'admin',
      url: '/#dashboard'
    });

    // 2. Disparar Correo Electrónico Automático al Administrador
    sendNetlifyEmail({
      toEmail: ADMIN_NOTIFICATION_EMAIL,
      coachName: coachName || 'Entrenador',
      session,
      players,
      customSubject: `🟠 Entrenamiento Finalizado: ${coachName || 'Entrenador'} - ${session.fecha} (${formatTo12Hour(session.horaInicio)}) - Parla Sport`
    }).catch(err => console.warn('[NotificationContext] Error enviando email de sesión finalizada al admin:', err));

    // 3. Disparar Agradecimiento de Fin de Jornada al Entrenador
    const coachEmail = (session.entrenadorEmail || '').trim().toLowerCase();
    const coachId = String(session.entrenadorId || '');

    if (coachEmail) {
      const thanksHtml = buildCoachWorkdayThanksHtml({
        coachName: coachName || 'Entrenador',
        completedCount: 1,
        date: session.fecha || new Date().toLocaleDateString('es-ES')
      });

      sendNetlifyEmail({
        toEmail: coachEmail,
        coachName: coachName || 'Entrenador',
        customSubject: `👏 ¡Excelente trabajo en cancha, Profe ${coachName || 'Entrenador'}! - Parla Sport`,
        customHtml: thanksHtml
      }).catch(err => console.warn('[NotificationContext] Error enviando agradecimiento al coach:', err));

      sendOneSignalPush({
        title: `👏 ¡Misión cumplida, Profe ${coachName || 'Entrenador'}!`,
        message: `Gracias por tu dedicación y entrega hoy en cancha con nuestros muchachos. ¡Buen descanso!`,
        externalUserId: coachId,
        recipientEmail: coachEmail,
        url: '/#coach-calendar'
      });
    }

    await saveNotificationLocallyAndRemote([notifAdmin]);
  };

  // ─── 3. Notificación de Pago Registrado (para el Entrenador) ───
  const notifySessionPaid = async ({ session, coach }) => {
    if (!session) return;

    const coachId = String(coach?.id || session.entrenadorId || '');
    const coachEmail = (coach?.email || session.entrenadorEmail || '').trim().toLowerCase();

    const notifCoach = {
      id: `notif-${Date.now()}-paid`,
      title: `🟢 Pago de Clase Registrado`,
      message: `Se ha registrado el pago de tu clase del ${session.fecha} (${formatTo12Hour(session.horaInicio)} - ${formatTo12Hour(session.horaFin)}).`,
      recipientCoachId: coachId,
      recipientEmail: coachEmail,
      recipientRole: 'coach',
      senderUid: currentUser?.uid || 'admin',
      senderEmail: currentUser?.email || '',
      timestamp: new Date().toISOString(),
      read: false,
      type: 'success'
    };

    await saveNotificationLocallyAndRemote([notifCoach]);

    // 1. Disparar Push remoto al Entrenador
    if (coachId || coachEmail) {
      sendOneSignalPush({
        title: notifCoach.title,
        message: notifCoach.message,
        externalUserId: coachId,
        recipientEmail: coachEmail,
        url: '/#coach-calendar'
      });
    }

    if (coachEmail && coachEmail.includes('@')) {
      sendNetlifyEmail({
        toEmail: coachEmail,
        coachName: coach?.nombre || 'Entrenador',
        session,
        customSubject: `🟢 Pago Registrado: Sesión ${session.fecha} (${formatTo12Hour(session.horaInicio)}) - Parla Sport`
      }).catch(err => console.warn('[NotificationContext] Error enviando email de pago al profesor:', err));
    }

    // Disparar Correo Electrónico de Confirmación/Duplicado al Administrador
    sendNetlifyEmail({
      toEmail: ADMIN_NOTIFICATION_EMAIL,
      coachName: coach?.nombre || session.entrenadorNombre || 'Entrenador',
      session,
      customSubject: `🟢 Confirmación Admin: Pago Registrado a ${coach?.nombre || 'Entrenador'} - ${session.fecha} (${formatTo12Hour(session.horaInicio)}) - Parla Sport`
    }).catch(err => console.warn('[NotificationContext] Error enviando copia de pago al admin:', err));
  };

  // ─── 4. Notificación al Admin por Cambio de Disponibilidad del Entrenador ───
  const notifyCoachAvailabilityChanged = async ({ coach, affectedSessions = [], players = [] }) => {
    if (!coach) return;
    const coachName = coach.nombre || 'Un entrenador';

    const notifs = [];

    if (affectedSessions && affectedSessions.length > 0) {
      // Caso A: Tiene sesiones activas en horarios que dejó de atender
      for (const ses of affectedSessions) {
        const sesPlayers = players.filter(p => Array.isArray(ses.jugadoresIds) && ses.jugadoresIds.includes(p.id));
        const playerNamesStr = sesPlayers.map(p => p.nombre).join(', ') || 'jugador(es)';

        notifs.push({
          id: `notif-${Date.now()}-${ses.id}-avail-conflict`,
          title: `⚠️ Reasignar Sesión: Cambio de Horario`,
          message: `${coachName} ha cambiado su disponibilidad. Por favor reasignar la sesión de ${playerNamesStr} a las ${formatTo12Hour(ses.horaInicio)} (${ses.fecha}).`,
          recipientRole: 'admin',
          recipientCoachId: '',
          recipientEmail: '',
          senderUid: currentUser?.uid || coach.id || 'coach',
          senderEmail: currentUser?.email || coach.email || '',
          timestamp: new Date().toISOString(),
          read: false,
          type: 'warning'
        });
      }
    } else {
      // Caso B: Cambio estándar de disponibilidad sin choque
      notifs.push({
        id: `notif-${Date.now()}-avail-update`,
        title: `📅 Disponibilidad Actualizada`,
        message: `${coachName} ha cambiado su disponibilidad semanal.`,
        recipientRole: 'admin',
        recipientCoachId: '',
        recipientEmail: '',
        senderUid: currentUser?.uid || coach.id || 'coach',
        senderEmail: currentUser?.email || coach.email || '',
        timestamp: new Date().toISOString(),
        read: false,
        type: 'info'
      });
    }

    await saveNotificationLocallyAndRemote(notifs);

    // Disparar Push remoto a Administradores (App cerrada)
    if (notifs.length > 0) {
      sendOneSignalPush({
        title: notifs[0].title,
        message: notifs[0].message,
        recipientRole: 'admin',
        url: '/#scheduler'
      });

      // Disparar Correo Electrónico al Administrador
      sendNetlifyEmail({
        toEmail: ADMIN_NOTIFICATION_EMAIL,
        coachName,
        customSubject: `📅 Cambio de Disponibilidad: ${coachName} - Parla Sport`
      }).catch(err => console.warn('[NotificationContext] Error enviando email de disponibilidad al admin:', err));
    }
  };

  // ─── 5. Notificación al Entrenador por Cancelación / Eliminación de Sesión ───
  const notifySessionDeleted = async ({ session, players = [], coach = null }) => {
    if (!session) return;

    const coachId = String(coach?.id || session.entrenadorId || '');
    const coachEmail = (coach?.email || session.entrenadorEmail || '').trim().toLowerCase();
    const playerNames = (players || []).map(p => p.nombre || 'Jugador').filter(Boolean);

    const titleCoach = `❌ Sesión Cancelada (${session.tipo || '1-1'})`;
    const messageCoach = `La sesión del ${session.fecha} (${formatTo12Hour(session.horaInicio)} - ${formatTo12Hour(session.horaFin)})${playerNames.length > 0 ? ` con ${playerNames.join(', ')}` : ''} ha sido cancelada o eliminada por la administración.`;

    const notifCoach = {
      id: `notif-${Date.now()}-deleted`,
      title: titleCoach,
      message: messageCoach,
      recipientCoachId: coachId,
      recipientEmail: coachEmail,
      recipientRole: 'coach',
      senderUid: currentUser?.uid || 'admin',
      senderEmail: currentUser?.email || '',
      timestamp: new Date().toISOString(),
      read: false,
      type: 'warning'
    };

    await saveNotificationLocallyAndRemote([notifCoach]);

    if (coachId || coachEmail) {
      sendOneSignalPush({
        title: titleCoach,
        message: messageCoach,
        externalUserId: coachId,
        recipientEmail: coachEmail,
        url: '/#coach-calendar'
      });
    }

    if (coachEmail && coachEmail.includes('@')) {
      sendNetlifyEmail({
        toEmail: coachEmail,
        coachName: coach?.nombre || 'Entrenador',
        session,
        players,
        customSubject: `❌ Sesión Cancelada: ${session.fecha} (${formatTo12Hour(session.horaInicio)}) - Parla Sport`
      }).catch(err => console.warn('[NotificationContext] Error enviando email de cancelación al profesor:', err));
    }

    // Disparar Correo Electrónico de Confirmación/Duplicado al Administrador
    sendNetlifyEmail({
      toEmail: ADMIN_NOTIFICATION_EMAIL,
      coachName: coach?.nombre || session.entrenadorNombre || 'Entrenador',
      session,
      players,
      customSubject: `❌ Sesión Cancelada: ${coach?.nombre || session.entrenadorNombre || 'Entrenador'} - ${session.fecha} (${formatTo12Hour(session.horaInicio)}) - Parla Sport`
    }).catch(err => console.warn('[NotificationContext] Error enviando copia de cancelación al admin:', err));
  };

  // ─── 6. Notificación y Correo de Bienvenida a Nuevo Entrenador ───
  const notifyCoachRegistered = async ({ coach }) => {
    if (!coach) return;
    const coachName = coach.nombre || 'Entrenador';
    const coachEmail = (coach.email || '').trim().toLowerCase();
    const coachId = String(coach.id || '');

    // A. Correo de Bienvenida al Entrenador
    if (coachEmail && coachEmail.includes('@')) {
      const welcomeHtml = buildWelcomeCoachHtml({
        coachName,
        coachEmail
      });

      sendNetlifyEmail({
        toEmail: coachEmail,
        coachName,
        customSubject: `⚽ ¡Bienvenido al Cuerpo Técnico de Parla Sport, Profe ${coachName}!`,
        customHtml: welcomeHtml
      }).catch(err => console.warn('[NotificationContext] Error enviando bienvenida al coach:', err));

      sendOneSignalPush({
        title: `⚽ ¡Bienvenido a Parla Sport!`,
        message: `Hola Profe ${coachName}, tu cuenta ha sido activada. Ya puedes configurar tu disponibilidad semanal.`,
        externalUserId: coachId,
        recipientEmail: coachEmail,
        url: '/#coach-calendar'
      });
    }

    // B. Correo Duplicado para el Administrador (parlasport.vzla@gmail.com)
    const adminNotifHtml = buildAdminNewCoachHtml({
      coachName,
      coachEmail,
      coachPhone: coach.telefono,
      coachSpecialty: coach.especialidad,
      date: coach.fechaRegistro || new Date().toLocaleDateString('es-ES')
    });

    sendNetlifyEmail({
      toEmail: ADMIN_NOTIFICATION_EMAIL,
      coachName,
      customSubject: `📋 Nuevo Entrenador Registrado: ${coachName} - Parla Sport`,
      customHtml: adminNotifHtml
    }).catch(err => console.warn('[NotificationContext] Error enviando aviso de nuevo coach al admin:', err));

    // Notificación In-App para el Administrador
    const notifAdmin = {
      id: `notif-${Date.now()}-new-coach`,
      title: `👤 Nuevo Entrenador Registrado`,
      message: `${coachName} (${coachEmail}) se ha unido al cuerpo técnico de Parla Sport.`,
      recipientRole: 'admin',
      recipientCoachId: '',
      recipientEmail: '',
      senderUid: coach.id || 'system',
      senderEmail: coachEmail,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'success'
    };
    await saveNotificationLocallyAndRemote([notifAdmin]);
  };

  // ─── 7. Difusión de Mensaje Motivacional del Día ───
  const broadcastCoachMotivation = async ({ title, message, targetCoaches = [] }) => {
    const finalTitle = title || '¡Hoy se deja el corazón en la cancha!';
    const finalMessage = message || 'Cada pase, cada corrección y cada palabra tuya inspiran a nuestros alumnos a ser su mejor versión. ¡A darlo todo hoy en cancha con pasión y excelencia Parla Sport!';

    const notifs = [];

    for (const coach of targetCoaches) {
      const coachEmail = (coach.email || '').trim().toLowerCase();
      const coachName = coach.nombre || 'Entrenador';
      const coachId = String(coach.id || '');

      if (coachEmail && coachEmail.includes('@')) {
        const motHtml = buildCoachMotivationalHtml({
          coachName,
          title: finalTitle,
          message: finalMessage,
          sessionCount: coach.sessionCount || 0
        });

        sendNetlifyEmail({
          toEmail: coachEmail,
          coachName,
          customSubject: `🌅 ${finalTitle} - Parla Sport`,
          customHtml: motHtml
        }).catch(err => console.warn(`[NotificationContext] Error motivacion a ${coachEmail}:`, err));

        sendOneSignalPush({
          title: `🌅 ${finalTitle}`,
          message: `${coachName}: "${finalMessage}"`,
          externalUserId: coachId,
          recipientEmail: coachEmail,
          url: '/#coach-calendar'
        });

        notifs.push({
          id: `notif-${Date.now()}-${coachId}-motivation`,
          title: `🌅 ${finalTitle}`,
          message: `"${finalMessage}"`,
          recipientRole: 'coach',
          recipientCoachId: coachId,
          recipientEmail: coachEmail,
          senderUid: currentUser?.uid || 'admin',
          senderEmail: ADMIN_NOTIFICATION_EMAIL,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'info'
        });
      }
    }

    if (notifs.length > 0) {
      await saveNotificationLocallyAndRemote(notifs);
    }

    // Copia al Administrador
    sendNetlifyEmail({
      toEmail: ADMIN_NOTIFICATION_EMAIL,
      coachName: 'Equipo Técnico',
      customSubject: `📢 Mensaje Motivacional Enviado (${targetCoaches.length} Profesores) - Parla Sport`,
      customHtml: buildCoachMotivationalHtml({
        coachName: 'Cuerpo Técnico',
        title: `📢 Copia Admin: ${finalTitle}`,
        message: finalMessage,
        sessionCount: targetCoaches.length
      })
    }).catch(() => {});
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
      notifyCoachAvailabilityChanged,
      notifySessionDeleted,
      notifyCoachRegistered,
      broadcastCoachMotivation,
      markAsRead,
      markAllAsRead,
      clearNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
