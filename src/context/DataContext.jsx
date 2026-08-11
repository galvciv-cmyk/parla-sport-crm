import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { INITIAL_PLAYERS, INITIAL_COACHES, INITIAL_SESSIONS } from '../utils/mockData';
import { hasCoachSessionConflict, hasPlayerSessionConflict, isCoachAvailableBySchedule } from '../utils/scheduling';
import { useNotifications } from './NotificationContext';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const {
    notifySessionAssignment,
    notifySessionCompleted,
    notifySessionPaid,
    notifySessionDeleted
  } = useNotifications();

  // 1. Estado de Jugadores
  const [players, setPlayers] = useState(() => {
    const saved = localStorage.getItem('parla_players');
    return saved ? JSON.parse(saved) : INITIAL_PLAYERS;
  });

  // 2. Estado de Entrenadores
  const [coaches, setCoaches] = useState(() => {
    const saved = localStorage.getItem('parla_coaches');
    return saved ? JSON.parse(saved) : INITIAL_COACHES;
  });

  // 3. Estado de Sesiones (Con estados: sin_confirmar, confirmada, realizada, pagada, cancelada)
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('parla_sessions');
    return saved ? JSON.parse(saved) : INITIAL_SESSIONS;
  });

  // Limpieza inicial de caché local para garantizar sincronización 100% pura con Firestore
  useEffect(() => {
    localStorage.removeItem('parla_players');
    localStorage.removeItem('parla_coaches');
    localStorage.removeItem('parla_sessions');
  }, []);

  // Escuchar entrenadores en tiempo real desde Firestore (Fuente Única de Verdad)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'coaches'), (snapshot) => {
      const firestoreCoaches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCoaches(firestoreCoaches);
    }, () => {});

    return () => unsub();
  }, []);

  // Escuchar jugadores en tiempo real desde Firestore (Fuente Única de Verdad)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'players'), (snapshot) => {
      const firestorePlayers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPlayers(firestorePlayers);
    }, () => {});

    return () => unsub();
  }, []);

  // Escuchar sesiones en tiempo real desde Firestore (Fuente Única de Verdad)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'sessions'), (snapshot) => {
      const firestoreSessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(firestoreSessions);
    }, () => {});

    return () => unsub();
  }, []);

  // Persistencia local
  useEffect(() => {
    localStorage.setItem('parla_players', JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem('parla_coaches', JSON.stringify(coaches));
  }, [coaches]);

  useEffect(() => {
    localStorage.setItem('parla_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // --- CRUD JUGADORES CON SINCRO EN FIRESTORE ---
  const addPlayer = (playerData) => {
    const newPlayer = {
      ...playerData,
      id: playerData.id || `jug-${Date.now()}`,
      foto: playerData.foto || '',
      fechaRegistro: new Date().toISOString().split('T')[0]
    };
    setPlayers(prev => [newPlayer, ...prev]);
    setDoc(doc(db, 'players', newPlayer.id), newPlayer).catch(err => {
      console.warn('[DataContext] No se pudo guardar el jugador en Firestore:', err);
    });
    return newPlayer;
  };

  const updatePlayer = (id, updatedFields) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
    setDoc(doc(db, 'players', id), updatedFields, { merge: true }).catch(err => {
      console.warn('[DataContext] Error al actualizar jugador en Firestore:', err);
    });
  };

  const deletePlayer = (id) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    deleteDoc(doc(db, 'players', id)).catch(err => {
      console.warn('[DataContext] Error al eliminar jugador en Firestore:', err);
    });
  };

  // --- CRUD ENTRENADORES CON SINCRO EN FIRESTORE ---
  const addCoach = async (coachData) => {
    const cleanCoach = {
      id: coachData.id || `coach-${Date.now()}`,
      nombre: coachData.nombre || '',
      email: (coachData.email || '').trim().toLowerCase(),
      telefono: coachData.telefono || '',
      especialidad: coachData.especialidad || '',
      foto: coachData.foto || '',
      bloquesDisponibilidad: coachData.bloquesDisponibilidad || [],
      fechaRegistro: coachData.fechaRegistro || new Date().toISOString().split('T')[0]
    };

    setCoaches(prev => {
      const exists = prev.some(c => c.id === cleanCoach.id || (c.email && c.email.toLowerCase() === cleanCoach.email));
      if (exists) {
        return prev.map(c => (c.id === cleanCoach.id || (c.email && c.email.toLowerCase() === cleanCoach.email)) ? { ...c, ...cleanCoach } : c);
      }
      return [cleanCoach, ...prev];
    });

    // Guardar también en Firestore
    await setDoc(doc(db, 'coaches', cleanCoach.id), cleanCoach).catch(err => {
      console.warn('[DataContext] No se pudo guardar el entrenador en Firestore:', err);
    });

    return cleanCoach;
  };

  const updateCoach = async (id, updatedFields) => {
    setCoaches(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
    await setDoc(doc(db, 'coaches', id), updatedFields, { merge: true }).catch(err => {
      console.warn('[DataContext] Error al actualizar entrenador en Firestore:', err);
    });
  };

  const deleteCoach = async (id) => {
    setCoaches(prev => prev.filter(c => c.id !== id));
    await deleteDoc(doc(db, 'coaches', id)).catch(err => {
      console.warn('[DataContext] Error al eliminar entrenador en Firestore:', err);
    });
  };

  // --- GESTIÓN DE SESIONES CON VALIDACIÓN ANTI-CHOQUE Y SINCRO FIRESTORE ---
  const createSession = async ({ fecha, horaInicio, horaFin, tipo, entrenadorId, jugadoresIds, notas, estado = 'sin_confirmar' }) => {
    const coach = coaches.find(c => c.id === entrenadorId);
    if (!coach) {
      throw new Error('Debes seleccionar un entrenador válido.');
    }

    // 1. Validar disponibilidad por horario del entrenador
    if (!isCoachAvailableBySchedule(coach, fecha, horaInicio, horaFin)) {
      throw new Error(`El ${coach.nombre} no tiene bloque de disponibilidad en ese horario.`);
    }

    // 2. Validar que el entrenador no tenga choque
    if (hasCoachSessionConflict(sessions, entrenadorId, fecha, horaInicio, horaFin)) {
      throw new Error(`El ${coach.nombre} ya tiene otra sesión agendada en ese horario.`);
    }

    // 3. Validar que los jugadores no tengan choque
    const playerCheck = hasPlayerSessionConflict(sessions, jugadoresIds, fecha, horaInicio, horaFin);
    if (playerCheck.conflict) {
      const p = players.find(x => x.id === playerCheck.conflictingPlayerId);
      throw new Error(`El jugador ${p ? p.nombre : 'seleccionado'} ya tiene una sesión a esa hora.`);
    }

    const cleanSession = {
      id: `sesion-${Date.now()}`,
      fecha: fecha || '',
      horaInicio: horaInicio || '',
      horaFin: horaFin || '',
      tipo: tipo || '1-1',
      entrenadorId: entrenadorId || '',
      entrenadorEmail: (coach.email || '').trim().toLowerCase(),
      entrenadorNombre: coach.nombre || '',
      jugadoresIds: Array.isArray(jugadoresIds) ? jugadoresIds : [],
      estado: estado || 'sin_confirmar',
      notas: notas || ''
    };

    // Guardar primero en Firestore para garantizar sincronización entre dispositivos
    await setDoc(doc(db, 'sessions', cleanSession.id), cleanSession);

    setSessions(prev => [cleanSession, ...prev.filter(s => s.id !== cleanSession.id)]);

    // Disparar Notificaciones
    const assignedPlayers = players.filter(p => cleanSession.jugadoresIds.includes(p.id));
    notifySessionAssignment({
      coach,
      session: cleanSession,
      players: assignedPlayers,
      isReassignment: false
    });

    return cleanSession;
  };

  const updateSessionStatus = async (sessionId, newStatus, userRole = 'admin') => {
    const session = sessions.find(s => s.id === sessionId);

    // Regla 1: El Administrador no puede marcar la sesión como realizada (eso es exclusivo del Entrenador)
    if (newStatus === 'realizada' && userRole === 'admin') {
      throw new Error('Solo el entrenador asignado puede marcar la sesión como realizada / finalizada.');
    }

    // Regla 2: El Administrador no puede marcar como pagada si el entrenador NO la ha marcado previamente como realizada
    if (newStatus === 'pagada' && session?.estado !== 'realizada') {
      throw new Error('No puedes marcar la sesión como pagada hasta que el entrenador la haya marcado como realizada / finalizada.');
    }

    setSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, estado: newStatus } : s))
    );
    await setDoc(doc(db, 'sessions', sessionId), { estado: newStatus }, { merge: true }).catch(err => {
      console.warn('[DataContext] Error al actualizar estado de sesión en Firestore:', err);
    });

    // Disparar notificaciones en tiempo real según el cambio de estado
    if (session) {
      const coach = coaches.find(c => c.id === session.entrenadorId);
      if (newStatus === 'realizada' && notifySessionCompleted) {
        await notifySessionCompleted({ session, coachName: coach ? coach.nombre : session.entrenadorNombre }).catch(() => {});
      } else if (newStatus === 'pagada' && notifySessionPaid && coach) {
        await notifySessionPaid({ session, coach }).catch(() => {});
      }
    }
  };

  const deleteSession = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    await deleteDoc(doc(db, 'sessions', sessionId)).catch(err => {
      console.warn('[DataContext] Error al eliminar sesión en Firestore:', err);
    });

    // Notificar al entrenador que su sesión fue eliminada / cancelada
    if (session && notifySessionDeleted) {
      const coach = coaches.find(c => c.id === session.entrenadorId);
      const assignedPlayers = players.filter(p => Array.isArray(session.jugadoresIds) && session.jugadoresIds.includes(p.id));
      await notifySessionDeleted({
        session,
        players: assignedPlayers,
        coach
      }).catch(() => {});
    }
  };

  const reassignSession = (sessionId, newCoachId, reason = '') => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Sesión no encontrada.');

    const newCoach = coaches.find(c => c.id === newCoachId);
    if (!newCoach) throw new Error('Entrenador sustituto no válido.');

    if (!isCoachAvailableBySchedule(newCoach, session.fecha, session.horaInicio, session.horaFin)) {
      throw new Error(`El profesor ${newCoach.nombre} no tiene disponibilidad horaria configurada para ese bloque.`);
    }

    if (hasCoachSessionConflict(sessions, newCoachId, session.fecha, session.horaInicio, session.horaFin, sessionId)) {
      throw new Error(`El profesor ${newCoach.nombre} ya tiene otra sesión asignada a esa misma hora.`);
    }

    const previousCoach = coaches.find(c => c.id === session.entrenadorId);
    const previousCoachName = previousCoach ? previousCoach.nombre : 'profesor asignado';

    setSessions(prev =>
      prev.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            entrenadorId: newCoachId,
            entrenadorEmail: newCoach.email || '',
            notasReasignacion: reason
          };
        }
        return s;
      })
    );

    setDoc(doc(db, 'sessions', sessionId), {
      entrenadorId: newCoachId,
      entrenadorEmail: newCoach.email || '',
      notasReasignacion: reason
    }, { merge: true }).catch(err => {
      console.warn('[DataContext] Error al reasignar sesión en Firestore:', err);
    });

    const assignedPlayers = players.filter(p => session.jugadoresIds?.includes(p.id));
    notifySessionAssignment({
      coach: newCoach,
      session: { ...session, entrenadorId: newCoachId },
      players: assignedPlayers,
      isReassignment: true,
      previousCoachName
    });
  };

  const cancelSession = (sessionId) => {
    updateSessionStatus(sessionId, 'cancelada');
  };

  return (
    <DataContext.Provider value={{
      players,
      coaches,
      sessions,
      addPlayer,
      updatePlayer,
      deletePlayer,
      addCoach,
      updateCoach,
      deleteCoach,
      createSession,
      updateSessionStatus,
      deleteSession,
      reassignSession,
      cancelSession
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
