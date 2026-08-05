import React, { createContext, useContext, useState, useEffect } from 'react';
import { sendSessionAssignmentEmail, sendWeeklyAvailabilityReminderEmail } from '../services/emailService';
import { triggerLocalPushNotification } from '../services/pwaService';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('parla_notifications');
    return saved ? JSON.parse(saved) : [
      {
        id: 'notif-init-1',
        title: 'Bienvenido a Parla Sport CRM',
        message: 'Sistema listo para gestionar 1-1, 1-2, 1-3, ausencias y notificaciones de disponibilidad.',
        recipientCoachId: 'coach-1',
        timestamp: new Date().toISOString(),
        read: false,
        type: 'info'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('parla_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Notificación de Asignación / Reasignación de Sesión (In-App, Email y Push)
  const notifySessionAssignment = async ({
    coach,
    session,
    players,
    isReassignment = false,
    previousCoachName = ''
  }) => {
    if (!coach) return;

    const playerNames = players.map(p => p.nombre);
    const title = isReassignment
      ? `⚠️ Reasignación: Sesión ${session.tipo}`
      : `⚽ Nueva Sesión Asignada (${session.tipo})`;

    const message = isReassignment
      ? `Se te ha reasignado la sesión del ${session.fecha} (${session.horaInicio}-${session.horaFin}) por ausencia de ${previousCoachName || 'profesor'}. Jugadores: ${playerNames.join(', ')}.`
      : `Nueva sesión programada para el ${session.fecha} (${session.horaInicio}-${session.horaFin}). Jugadores: ${playerNames.join(', ')}.`;

    // 1. In-App Notification
    const newNotif = {
      id: `notif-${Date.now()}`,
      title,
      message,
      recipientCoachId: coach.id,
      timestamp: new Date().toISOString(),
      read: false,
      type: isReassignment ? 'warning' : 'success'
    };

    setNotifications(prev => [newNotif, ...prev]);

    // 2. Email Notification
    await sendSessionAssignmentEmail({
      coachName: coach.nombre,
      coachEmail: coach.email,
      sessionType: session.tipo,
      date: session.fecha,
      startTime: session.horaInicio,
      endTime: session.horaFin,
      playerNames,
      isReassignment,
      previousCoachName
    });

    // 3. PWA Push Notification
    triggerLocalPushNotification(title, message);
  };

  // Recordatorio semanal de disponibilidad dominical para un entrenador
  const sendWeeklyAvailabilityReminder = async (coach) => {
    if (!coach) return;

    const title = '🗓️ Recordatorio Semanal: Disponibilidad Horaria';
    const message = `Hola ${coach.nombre}, recuerda revisar y actualizar tus días y bloques de horarios disponibles para la próxima semana.`;

    const newNotif = {
      id: `notif-weekly-${Date.now()}`,
      title,
      message,
      recipientCoachId: coach.id,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'info'
    };

    setNotifications(prev => [newNotif, ...prev]);

    await sendWeeklyAvailabilityReminderEmail({
      coachName: coach.nombre,
      coachEmail: coach.email
    });

    triggerLocalPushNotification(title, message);
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = (coachId = null) => {
    setNotifications(prev =>
      prev.map(n => {
        if (!coachId || n.recipientCoachId === coachId) {
          return { ...n, read: true };
        }
        return n;
      })
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      notifySessionAssignment,
      sendWeeklyAvailabilityReminder,
      markAsRead,
      markAllAsRead,
      clearNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
