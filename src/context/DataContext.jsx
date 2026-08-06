import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { INITIAL_PLAYERS, INITIAL_COACHES, INITIAL_SESSIONS } from '../utils/mockData';
import { hasCoachSessionConflict, hasPlayerSessionConflict, isCoachAvailableBySchedule } from '../utils/scheduling';
import { useNotifications } from './NotificationContext';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const { notifySessionAssignment } = useNotifications();

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

  // Limpieza inicial para comenzar todo desde cero (sin datos predeterminados)
  useEffect(() => {
    if (!localStorage.getItem('parla_clean_start_v2')) {
      localStorage.removeItem('parla_players');
      localStorage.removeItem('parla_coaches');
      localStorage.removeItem('parla_sessions');
      localStorage.setItem('parla_clean_start_v2', 'true');
      setPlayers([]);
      setCoaches([]);
      setSessions([]);
    }
  }, []);

  // Escuchar entrenadores en tiempo real desde Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'coaches'), (snapshot) => {
      const firestoreCoaches = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (firestoreCoaches.length > 0) {
        setCoaches(prev => {
          const map = new Map();
          // Cargar primero los de Firestore (fuente principal)
          firestoreCoaches.forEach(c => map.set(c.id, c));
          // Conservar los locales si aún no se han sincronizado
          prev.forEach(c => {
            if (!map.has(c.id)) map.set(c.id, c);
          });
          return Array.from(map.values());
        });
      }
    }, (err) => {
      console.warn('[DataContext] Error escuchando Firestore coaches:', err);
    });

    return () => unsub();
  }, []);

  // Escuchar jugadores en tiempo real desde Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'players'), (snapshot) => {
      const firestorePlayers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (firestorePlayers.length > 0) {
        setPlayers(prev => {
          const map = new Map();
          firestorePlayers.forEach(p => map.set(p.id, p));
          prev.forEach(p => {
            if (!map.has(p.id)) map.set(p.id, p);
          });
          return Array.from(map.values());
        });
      }
    }, (err) => {
      console.warn('[DataContext] Error escuchando Firestore players:', err);
    });

    return () => unsub();
  }, []);

  // Escuchar sesiones en tiempo real desde Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'sessions'), (snapshot) => {
      const firestoreSessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(prev => {
        const map = new Map();
        firestoreSessions.forEach(s => map.set(s.id, s));
        prev.forEach(s => {
          if (!map.has(s.id)) map.set(s.id, s);
        });
        return Array.from(map.values());
      });
    }, (err) => {
      console.warn('[DataContext] Error escuchando Firestore sessions:', err);
    });

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
  const addCoach = (coachData) => {
    const newCoach = {
      ...coachData,
      id: coachData.id || `coach-${Date.now()}`,
      foto: coachData.foto || '',
      bloquesDisponibilidad: coachData.bloquesDisponibilidad || []
    };

    setCoaches(prev => {
      const exists = prev.some(c => c.id === newCoach.id || (c.email && c.email.toLowerCase() === newCoach.email?.toLowerCase()));
      if (exists) {
        return prev.map(c => (c.id === newCoach.id || (c.email && c.email.toLowerCase() === newCoach.email?.toLowerCase())) ? { ...c, ...newCoach } : c);
      }
      return [newCoach, ...prev];
    });

    // Guardar también en Firestore
    setDoc(doc(db, 'coaches', newCoach.id), newCoach).catch(err => {
      console.warn('[DataContext] No se pudo guardar el entrenador en Firestore:', err);
    });

    return newCoach;
  };

  const updateCoach = (id, updatedFields) => {
    setCoaches(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
    setDoc(doc(db, 'coaches', id), updatedFields, { merge: true }).catch(err => {
      console.warn('[DataContext] Error al actualizar entrenador en Firestore:', err);
    });
  };

  const deleteCoach = (id) => {
    setCoaches(prev => prev.filter(c => c.id !== id));
    deleteDoc(doc(db, 'coaches', id)).catch(err => {
      console.warn('[DataContext] Error al eliminar entrenador en Firestore:', err);
    });
  };

  // --- GESTIÓN DE SESIONES CON VALIDACIÓN ANTI-CHOQUE Y SINCRO FIRESTORE ---
  const createSession = ({ fecha, horaInicio, horaFin, tipo, entrenadorId, jugadoresIds, notas, estado = 'sin_confirmar' }) => {
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

    const newSession = {
      id: `sesion-${Date.now()}`,
      fecha,
      horaInicio,
      horaFin,
      tipo,
      entrenadorId,
      entrenadorEmail: coach.email || '',
      jugadoresIds,
      estado, // sin_confirmar, confirmada, realizada, pagada
      notas: notas || ''
    };

    setSessions(prev => [newSession, ...prev]);

    // Guardar en Firestore para sincronización inmediata entre dispositivos
    setDoc(doc(db, 'sessions', newSession.id), newSession).catch(err => {
      console.warn('[DataContext] Error al guardar sesión en Firestore:', err);
    });

    // Disparar Notificaciones
    const assignedPlayers = players.filter(p => jugadoresIds.includes(p.id));
    notifySessionAssignment({
      coach,
      session: newSession,
      players: assignedPlayers,
      isReassignment: false
    });

    return newSession;
  };

  const updateSessionStatus = (sessionId, newStatus) => {
    setSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, estado: newStatus } : s))
    );
    setDoc(doc(db, 'sessions', sessionId), { estado: newStatus }, { merge: true }).catch(err => {
      console.warn('[DataContext] Error al actualizar estado de sesión en Firestore:', err);
    });
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
      reassignSession,
      cancelSession
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
