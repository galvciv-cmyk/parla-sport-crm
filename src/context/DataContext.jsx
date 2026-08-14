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

  // 4. Estado de Tarifas de Pago por Sesión (1:1, 1:2, 1:3)
  const DEFAULT_RATES = { '1-1': 15, '1-2': 20, '1-3': 25 };
  const [paymentRates, setPaymentRates] = useState(() => {
    try {
      const saved = localStorage.getItem('parla_payment_rates');
      return saved ? JSON.parse(saved) : DEFAULT_RATES;
    } catch {
      return DEFAULT_RATES;
    }
  });

  // Escuchar configuración de tarifas desde Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'payment_rates'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPaymentRates(prev => ({ ...prev, ...data }));
        try { localStorage.setItem('parla_payment_rates', JSON.stringify(data)); } catch {}
      }
    }, () => {});

    return () => unsub();
  }, []);

  const updatePaymentRates = async (newRates) => {
    const merged = { ...paymentRates, ...newRates };
    setPaymentRates(merged);
    try { localStorage.setItem('parla_payment_rates', JSON.stringify(merged)); } catch {}
    await setDoc(doc(db, 'settings', 'payment_rates'), merged, { merge: true }).catch(err => {
      console.warn('[DataContext] Error al guardar tarifas en Firestore:', err);
    });
  };

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

  const updatePlayer = async (playerId, updatedData) => {
    setPlayers(prev =>
      prev.map(p => (p.id === playerId ? { ...p, ...updatedData } : p))
    );
    await setDoc(doc(db, 'players', playerId), updatedData, { merge: true }).catch(err => {
      console.warn('[DataContext] Error al actualizar jugador en Firestore:', err);
    });
  };

  const deletePlayer = async (playerId) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    await deleteDoc(doc(db, 'players', playerId)).catch(err => {
      console.warn('[DataContext] Error al eliminar jugador en Firestore:', err);
    });
  };

  // --- CRUD ENTRENADORES CON SINCRO EN FIRESTORE ---
  const addCoach = (coachData) => {
    const newCoach = {
      ...coachData,
      id: coachData.id || `coach-${Date.now()}`,
      foto: coachData.foto || '',
      bloquesDisponibilidad: coachData.bloquesDisponibilidad || []
    };
    setCoaches(prev => [newCoach, ...prev]);
    setDoc(doc(db, 'coaches', newCoach.id), newCoach).catch(err => {
      console.warn('[DataContext] No se pudo guardar el entrenador en Firestore:', err);
    });
    return newCoach;
  };

  const updateCoach = async (coachId, updatedData) => {
    setCoaches(prev =>
      prev.map(c => (c.id === coachId ? { ...c, ...updatedData } : c))
    );
    await setDoc(doc(db, 'coaches', coachId), updatedData, { merge: true }).catch(err => {
      console.warn('[DataContext] Error al actualizar entrenador en Firestore:', err);
    });
  };

  const deleteCoach = async (coachId) => {
    setCoaches(prev => prev.filter(c => c.id !== coachId));
    await deleteDoc(doc(db, 'coaches', coachId)).catch(err => {
      console.warn('[DataContext] Error al desvincular entrenador en Firestore:', err);
    });
  };

  // --- GESTIÓN DE SESIONES ---
  const createSession = async (sessionData) => {
    const { fecha, horaInicio, horaFin, tipo, entrenadorId, jugadoresIds, estado, notas } = sessionData;

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

    // UI Optimista Inmediata (0ms de latencia)
    setSessions(prev => [cleanSession, ...prev.filter(s => s.id !== cleanSession.id)]);

    // Guardar en segundo plano en Firestore
    setDoc(doc(db, 'sessions', cleanSession.id), cleanSession).catch(err => {
      console.warn('[DataContext] Error al guardar sesión en Firestore:', err);
    });

    // REGLA CLAVE: Solo notificar al profesor si la sesión está en estado CONFIRMADA ('confirmada')
    if (cleanSession.estado === 'confirmada' && notifySessionAssignment) {
      const assignedPlayers = players.filter(p => cleanSession.jugadoresIds.includes(p.id));
      notifySessionAssignment({
        coach,
        session: cleanSession,
        players: assignedPlayers,
        isReassignment: false
      }).catch(() => {});
    }

    return cleanSession;
  };

  const addPlayerObservation = async (playerId, observation) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    const newObs = {
      id: `obs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      texto: (observation.texto || '').trim(),
      autorNombre: observation.autorNombre || 'Entrenador',
      autorId: observation.autorId || '',
      sessionId: observation.sessionId || '',
      fecha: observation.fecha || new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    };

    const currentHistory = Array.isArray(player.historialObservaciones) ? player.historialObservaciones : [];
    const updatedHistory = [newObs, ...currentHistory];
    const updatedObservacionesTecnicas = newObs.texto || player.observacionesTecnicas || '';

    const updatedPlayer = {
      ...player,
      observacionesTecnicas: updatedObservacionesTecnicas,
      historialObservaciones: updatedHistory
    };

    setPlayers(prev => prev.map(p => p.id === playerId ? updatedPlayer : p));
    await setDoc(doc(db, 'players', playerId), {
      observacionesTecnicas: updatedObservacionesTecnicas,
      historialObservaciones: updatedHistory
    }, { merge: true }).catch(err => {
      console.warn('[DataContext] Error al guardar observación del jugador en Firestore:', err);
    });

    return updatedPlayer;
  };

  const updateSessionStatus = async (sessionId, newStatus, userRole = 'admin') => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const previousStatus = session.estado;

    // Regla 1: El Administrador no puede marcar la sesión como realizada (eso es exclusivo del Entrenador)
    if (newStatus === 'realizada' && userRole === 'admin') {
      throw new Error('Solo el entrenador asignado puede marcar la sesión como realizada / finalizada.');
    }

    // Regla 2: El Administrador no puede marcar como pagada si el entrenador NO la ha marcado previamente como realizada
    if (newStatus === 'pagada' && previousStatus !== 'realizada') {
      throw new Error('No puedes marcar la sesión como pagada hasta que el entrenador la haya marcado como realizada / finalizada.');
    }

    // Regla 3: Si la sesión ya fue realizada o pagada, NO se puede cancelar
    if (newStatus === 'cancelada' && (previousStatus === 'realizada' || previousStatus === 'pagada')) {
      throw new Error('Esta sesión ya fue finalizada por el profesor y está lista para cobro/liquidación. No puede ser cancelada.');
    }

    // UI Optimista Inmediata
    setSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, estado: newStatus } : s))
    );

    // Guardar en segundo plano en Firestore
    setDoc(doc(db, 'sessions', sessionId), { estado: newStatus }, { merge: true }).catch(err => {
      console.warn('[DataContext] Error al actualizar estado de sesión en Firestore:', err);
    });

    // Disparar notificaciones correspondientes según el cambio
    const coach = coaches.find(c =>
      c.id === session.entrenadorId ||
      (session.entrenadorEmail && c.email && c.email.trim().toLowerCase() === session.entrenadorEmail.trim().toLowerCase())
    ) || {
      id: session.entrenadorId,
      nombre: session.entrenadorNombre || 'Entrenador',
      email: session.entrenadorEmail || ''
    };
    const assignedPlayers = players.filter(p => Array.isArray(session.jugadoresIds) && session.jugadoresIds.includes(p.id));

    // Si cambió a 'confirmada', notificar de inmediato al entrenador
    if (newStatus === 'confirmada' && previousStatus !== 'confirmada' && notifySessionAssignment) {
      notifySessionAssignment({
        coach,
        session: { ...session, estado: newStatus },
        players: assignedPlayers,
        isReassignment: false
      }).catch(() => {});
    } else if (newStatus === 'realizada' && notifySessionCompleted) {
      notifySessionCompleted({ session, coachName: coach ? coach.nombre : session.entrenadorNombre }).catch(() => {});
    } else if (newStatus === 'pagada' && notifySessionPaid && coach) {
      notifySessionPaid({ session, coach }).catch(() => {});
    }
  };

  const deleteSession = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Regla de Protección: No eliminar sesiones ya realizadas o pagadas
    if (session.estado === 'realizada' || session.estado === 'pagada') {
      throw new Error('No se puede eliminar una sesión que ya fue finalizada por el entrenador.');
    }

    // UI Optimista Inmediata
    setSessions(prev => prev.filter(s => s.id !== sessionId));

    deleteDoc(doc(db, 'sessions', sessionId)).catch(err => {
      console.warn('[DataContext] Error al eliminar sesión en Firestore:', err);
    });

    // Notificar al entrenador si era una sesión activa/confirmada
    if (session.estado !== 'sin_confirmar' && notifySessionDeleted) {
      const coach = coaches.find(c => c.id === session.entrenadorId);
      const assignedPlayers = players.filter(p => Array.isArray(session.jugadoresIds) && session.jugadoresIds.includes(p.id));
      notifySessionDeleted({
        session,
        players: assignedPlayers,
        coach
      }).catch(() => {});
    }
  };

  const reassignSession = (sessionId, newCoachId, reason = '') => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Sesión no encontrada.');

    if (session.estado === 'realizada' || session.estado === 'pagada') {
      throw new Error('No se puede reasignar una sesión que ya ha sido completada.');
    }

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
            entrenadorNombre: newCoach.nombre || '',
            notasReasignacion: reason
          };
        }
        return s;
      })
    );

    setDoc(doc(db, 'sessions', sessionId), {
      entrenadorId: newCoachId,
      entrenadorEmail: newCoach.email || '',
      entrenadorNombre: newCoach.nombre || '',
      notasReasignacion: reason
    }, { merge: true }).catch(err => {
      console.warn('[DataContext] Error al reasignar sesión en Firestore:', err);
    });

    const assignedPlayers = players.filter(p => session.jugadoresIds?.includes(p.id));
    notifySessionAssignment({
      coach: newCoach,
      session: { ...session, entrenadorId: newCoachId, entrenadorNombre: newCoach.nombre },
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
      paymentRates,
      updatePaymentRates,
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
      cancelSession,
      addPlayerObservation
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
