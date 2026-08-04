import React, { createContext, useContext, useState, useEffect } from 'react';
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

  // --- CRUD JUGADORES ---
  const addPlayer = (playerData) => {
    const newPlayer = {
      ...playerData,
      id: `jug-${Date.now()}`,
      fechaRegistro: new Date().toISOString().split('T')[0]
    };
    setPlayers(prev => [newPlayer, ...prev]);
    return newPlayer;
  };

  const updatePlayer = (id, updatedFields) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updatedFields } : p));
  };

  const deletePlayer = (id) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  // --- CRUD ENTRENADORES ---
  const addCoach = (coachData) => {
    const newCoach = {
      ...coachData,
      id: `coach-${Date.now()}`,
      bloquesDisponibilidad: coachData.bloquesDisponibilidad || []
    };
    setCoaches(prev => [newCoach, ...prev]);
    return newCoach;
  };

  const updateCoach = (id, updatedFields) => {
    setCoaches(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));
  };

  const deleteCoach = (id) => {
    setCoaches(prev => prev.filter(c => c.id !== id));
  };

  // --- GESTIÓN DE SESIONES CON VALIDACIÓN ANTI-CHOQUE ---
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
      jugadoresIds,
      estado, // sin_confirmar, confirmada, realizada, pagada
      notas: notas || ''
    };

    setSessions(prev => [newSession, ...prev]);

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

  // CAMBIO DE ESTADO DE SESIÓN (Blanco, Amarillo, Naranja, Verde)
  const updateSessionStatus = (sessionId, newStatus) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, estado: newStatus } : s));
  };

  // REASIGNACIÓN POR AUSENCIA
  const reassignSession = (sessionId, newCoachId, reasonNotes = '') => {
    const targetSession = sessions.find(s => s.id === sessionId);
    if (!targetSession) throw new Error('Sesión no encontrada.');

    const newCoach = coaches.find(c => c.id === newCoachId);
    if (!newCoach) throw new Error('Nuevo entrenador no válido.');

    const oldCoach = coaches.find(c => c.id === targetSession.entrenadorId);

    // Validar disponibilidad del nuevo entrenador
    if (!isCoachAvailableBySchedule(newCoach, targetSession.fecha, targetSession.horaInicio, targetSession.horaFin)) {
      throw new Error(`El nuevo entrenador ${newCoach.nombre} no tiene bloque de disponibilidad en este horario.`);
    }

    // Validar choque del nuevo entrenador
    if (hasCoachSessionConflict(sessions, newCoachId, targetSession.fecha, targetSession.horaInicio, targetSession.horaFin, sessionId)) {
      throw new Error(`El nuevo entrenador ${newCoach.nombre} ya tiene una sesión agendada a esa misma hora.`);
    }

    const updatedSession = {
      ...targetSession,
      entrenadorId: newCoachId,
      notas: reasonNotes ? `${targetSession.notas} (Reasignado por ausencia: ${reasonNotes})` : targetSession.notas
    };

    setSessions(prev => prev.map(s => s.id === sessionId ? updatedSession : s));

    // Notificar al nuevo entrenador
    const assignedPlayers = players.filter(p => targetSession.jugadoresIds.includes(p.id));
    notifySessionAssignment({
      coach: newCoach,
      session: updatedSession,
      players: assignedPlayers,
      isReassignment: true,
      previousCoachName: oldCoach ? oldCoach.nombre : 'Entrenador Anterior'
    });

    return updatedSession;
  };

  // CANCELACIÓN DE SESIÓN
  const cancelSession = (sessionId) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, estado: 'cancelada' } : s));
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
