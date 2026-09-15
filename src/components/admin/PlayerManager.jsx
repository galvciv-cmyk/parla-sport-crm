import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { UserPlus, Search, Edit3, Trash2, Eye, MessageSquare, BarChart3, Calendar, RotateCcw } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../common/ToastNotification';
import Modal from '../common/Modal';
import ImageUploader from '../common/ImageUploader';
import PlayerMonthlyReportModal from './PlayerMonthlyReportModal';
import FieldPositionSelector from './FieldPositionSelector';
import { FIELD_POSITIONS, getCategoryForPositions } from '../../utils/fieldPositions';

const PlayerManager = () => {
  const { players, sessions, coaches, addPlayer, updatePlayer, deletePlayer } = useData();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('NAME_ASC');

  // Modales
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [reportPlayer, setReportPlayer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Obtener posiciones iniciales para compatibilidad con jugadores existentes
  const getInitialPositions = (player) => {
    if (Array.isArray(player?.posicionesCampo) && player.posicionesCampo.length > 0) {
      return player.posicionesCampo;
    }
    switch (player?.posicion) {
      case 'Portero': return ['POR'];
      case 'Defensa': return ['DFCI', 'DFCD'];
      case 'Mediocampista': return ['MC'];
      case 'Delantero': return ['DC'];
      default: return ['MC'];
    }
  };

  const calculateAge = (birthDateStr) => {
    if (!birthDateStr) return 0;
    const today = new Date();
    const birthDate = new Date(birthDateStr + 'T00:00:00');
    if (isNaN(birthDate.getTime())) return 0;
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  };

  // Obtener año de nacimiento (a partir de fechaNacimiento o edad)
  const getPlayerBirthYear = (player) => {
    if (!player) return null;
    if (player.fechaNacimiento) {
      const str = String(player.fechaNacimiento).trim();
      const match = str.match(/\b(19\d{2}|20\d{2})\b/);
      if (match) return parseInt(match[1], 10);
    }
    if (player.edad && Number(player.edad) > 0) {
      return new Date().getFullYear() - Number(player.edad);
    }
    return null;
  };

  // Lista única de años de nacimiento disponibles, ordenados de menor a mayor o más recientes
  const availableBirthYears = useMemo(() => {
    const yearsSet = new Set();
    players.forEach(p => {
      const yr = getPlayerBirthYear(p);
      if (yr) yearsSet.add(yr);
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [players]);

  // Formulario
  const [formData, setFormData] = useState({
    nombre: '',
    fechaNacimiento: '',
    edad: 0,
    posicion: 'Mediocampista',
    posicionesCampo: ['MC'],
    piernaHabil: 'Derecha',
    club: '',
    contactoTutor: '',
    foto: '',
    observacionesTecnicas: ''
  });

  const handleBirthDateChange = (dateStr) => {
    const calculatedAge = calculateAge(dateStr);
    setFormData(prev => ({
      ...prev,
      fechaNacimiento: dateStr,
      edad: calculatedAge
    }));
  };

  const handlePositionsChange = (newPositions) => {
    const autoCat = getCategoryForPositions(newPositions);
    setFormData(prev => ({
      ...prev,
      posicionesCampo: newPositions,
      posicion: autoCat || prev.posicion
    }));
  };

  const handleOpenAdd = () => {
    setFormData({
      nombre: '',
      fechaNacimiento: '',
      edad: 0,
      posicion: 'Mediocampista',
      posicionesCampo: ['MC'],
      piernaHabil: 'Derecha',
      club: '',
      contactoTutor: '',
      foto: '',
      observacionesTecnicas: '',
      historialObservaciones: []
    });
    setIsEditing(false);
    setIsAddModalOpen(true);
  };

  const handleOpenDetail = useCallback((player, editMode = false) => {
    setSelectedPlayer(player);
    const birthDate = player.fechaNacimiento || '';
    const age = birthDate ? calculateAge(birthDate) : (player.edad || 0);
    const positions = getInitialPositions(player);
    setFormData({
      ...player,
      posicionesCampo: positions,
      fechaNacimiento: birthDate,
      edad: age,
      club: player.club || player.equipo || '',
      historialObservaciones: Array.isArray(player.historialObservaciones) ? player.historialObservaciones : []
    });
    setIsEditing(isAdmin ? editMode : false);
    setIsDetailModalOpen(true);
  }, [isAdmin]);

  // Obtener observaciones de sesiones para la ficha técnica
  const getPlayerSessionObservations = (player) => {
    if (!player) return [];
    const list = [];
    const seenKeys = new Set();

    if (Array.isArray(player.historialObservaciones)) {
      player.historialObservaciones.forEach(obs => {
        const key = `${obs.fecha}-${obs.texto}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          list.push({
            id: obs.id || Math.random().toString(),
            texto: obs.texto,
            autorNombre: obs.autorNombre || 'Entrenador',
            fecha: obs.fecha || '',
            modalidad: obs.sessionId ? (sessions.find(s => s.id === obs.sessionId)?.tipo || '') : ''
          });
        }
      });
    }

    if (Array.isArray(sessions)) {
      sessions.forEach(s => {
        if (s.estado === 'cancelada') return;
        if (Array.isArray(s.jugadoresIds) && s.jugadoresIds.includes(player.id)) {
          if (s.notas && s.notas.trim()) {
            const key = `${s.fecha}-${s.notas.trim()}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              list.push({
                id: `ses-${s.id}`,
                texto: s.notas.trim(),
                autorNombre: s.entrenadorNombre || 'Entrenador',
                fecha: s.fecha || '',
                modalidad: s.tipo || '1-1'
              });
            }
          }
        }
      });
    }

    return list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setIsDetailModalOpen(false);
    if (typeof window !== 'undefined' && window.location.hash && (window.location.hash.startsWith('#player-') || window.location.hash.startsWith('#report-'))) {
      window.history.replaceState(null, '', window.location.pathname + '#players');
    }
  };

  // Rastreo del último hash procesado para evitar bucle de auto-apertura al re-renderizar
  const lastOpenedHashRef = useRef('');

  // Auto-abrir modal si la URL contiene un hash específico de jugador (#player-xxx o #report-xxx)
  useEffect(() => {
    if (typeof window === 'undefined' || !players.length) return;

    const checkHash = () => {
      const hash = window.location.hash || '';
      if (!hash || hash === lastOpenedHashRef.current) return;

      if (hash.startsWith('#report-player-') || hash.startsWith('#report-')) {
        const pId = hash.replace('#report-player-', '').replace('#report-', '').trim();
        const found = players.find(p => String(p.id) === String(pId));
        if (found) {
          lastOpenedHashRef.current = hash;
          setIsDetailModalOpen(false);
          setReportPlayer(found);
        }
      } else if (hash.startsWith('#player-')) {
        const pId = hash.replace('#player-', '').trim();
        const found = players.find(p => String(p.id) === String(pId));
        if (found) {
          lastOpenedHashRef.current = hash;
          handleOpenDetail(found, false);
        }
      }
    };

    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [players, handleOpenDetail]);

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.nombre.trim()) {
      showToast('Nombre Requerido', 'Por favor ingresa el nombre del jugador.', 'warning');
      return;
    }
    if (isEditing && selectedPlayer) {
      updatePlayer(selectedPlayer.id, formData);
      handleCloseModal();
      showToast('Ficha Actualizada', `Se guardaron los cambios de ${formData.nombre}.`, 'success');
    } else {
      addPlayer(formData);
      handleCloseModal();
      showToast('Jugador Registrado', `${formData.nombre} fue registrado con éxito.`, 'success');
    }
  };

  const [playerToDelete, setPlayerToDelete] = useState(null);

  const filteredAndSortedPlayers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    const filtered = players.filter(p => {
      const birthYear = getPlayerBirthYear(p);
      const birthYearStr = birthYear ? String(birthYear) : '';

      const matchesSearch = !term || (
        (p.nombre && p.nombre.toLowerCase().includes(term)) ||
        (p.club && p.club.toLowerCase().includes(term)) ||
        (p.equipo && p.equipo.toLowerCase().includes(term)) ||
        (p.posicion && p.posicion.toLowerCase().includes(term)) ||
        birthYearStr.includes(term) ||
        String(p.edad || '').includes(term)
      );

      const matchesPos = positionFilter === 'ALL' || p.posicion === positionFilter;
      const matchesYear = yearFilter === 'ALL' || (birthYear && String(birthYear) === String(yearFilter));

      return matchesSearch && matchesPos && matchesYear;
    });

    return filtered.sort((a, b) => {
      const yearA = getPlayerBirthYear(a) || 0;
      const yearB = getPlayerBirthYear(b) || 0;
      const nameA = (a.nombre || '').toLowerCase();
      const nameB = (b.nombre || '').toLowerCase();

      switch (sortBy) {
        case 'YEAR_DESC': // Más jóvenes primero (año más alto, ej. 2018 antes que 2012)
          if (yearB !== yearA) return yearB - yearA;
          return nameA.localeCompare(nameB);
        case 'YEAR_ASC': // Más mayores primero (año más bajo, ej. 2008 antes que 2015)
          if (yearA === 0) return 1;
          if (yearB === 0) return -1;
          if (yearA !== yearB) return yearA - yearB;
          return nameA.localeCompare(nameB);
        case 'NAME_DESC':
          return nameB.localeCompare(nameA);
        case 'NAME_ASC':
        default:
          return nameA.localeCompare(nameB);
      }
    });
  }, [players, searchTerm, positionFilter, yearFilter, sortBy]);

  const getPositionBadgeClass = (pos) => {
    switch (pos) {
      case 'Portero': return 'badge-gold';
      case 'Defensa': return 'badge-blue';
      case 'Mediocampista': return 'badge-purple';
      case 'Delantero': return 'badge-emerald';
      default: return 'badge-emerald';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Encabezado y Acciones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC' }}>
            Gestor de Jugadores (Fichas Técnicas)
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.88rem', marginTop: '4px' }}>
            Fichas personalizadas para entrenamientos 1-1, 1-2 y 1-3 en Parla Sport.
          </p>
        </div>

        {isAdmin && (
          <button className="btn-primary" onClick={handleOpenAdd}>
            <UserPlus size={18} /> Registrar Nuevo Jugador
          </button>
        )}
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="glass-panel" style={{ padding: '14px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
          <input
            type="text"
            placeholder="Buscar por nombre, año (ej. 2012) o club..."
            className="input-field"
            style={{ paddingLeft: '38px', width: '100%' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Filtro por Año de Nacimiento */}
        <select
          className="input-field"
          style={{ width: 'auto', minWidth: '160px' }}
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          title="Filtrar por año de nacimiento"
        >
          <option value="ALL">📅 Todos los años</option>
          {availableBirthYears.map((year) => (
            <option key={year} value={year}>
              Año {year}
            </option>
          ))}
        </select>

        {/* Filtro por Posición */}
        <select
          className="input-field"
          style={{ width: 'auto', minWidth: '160px' }}
          value={positionFilter}
          onChange={(e) => setPositionFilter(e.target.value)}
          title="Filtrar por posición"
        >
          <option value="ALL">⚽ Todas las posiciones</option>
          <option value="Portero">Portero</option>
          <option value="Defensa">Defensa</option>
          <option value="Mediocampista">Mediocampista</option>
          <option value="Delantero">Delantero</option>
        </select>

        {/* Ordenar por */}
        <select
          className="input-field"
          style={{ width: 'auto', minWidth: '180px' }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          title="Organizar y ordenar jugadores"
        >
          <option value="NAME_ASC">↕️ Nombre (A - Z)</option>
          <option value="NAME_DESC">↕️ Nombre (Z - A)</option>
          <option value="YEAR_DESC">👶 Año (Más jóvenes primero)</option>
          <option value="YEAR_ASC">🧑 Año (Más mayores primero)</option>
        </select>

        {(searchTerm || positionFilter !== 'ALL' || yearFilter !== 'ALL' || sortBy !== 'NAME_ASC') && (
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '0 12px', fontSize: '0.82rem', height: '42px', display: 'flex', alignItems: 'center', gap: '6px', color: '#EF4444' }}
            onClick={() => {
              setSearchTerm('');
              setPositionFilter('ALL');
              setYearFilter('ALL');
              setSortBy('NAME_ASC');
            }}
            title="Restablecer todos los filtros"
          >
            <RotateCcw size={14} /> Limpiar
          </button>
        )}
      </div>

      {/* Resumen de Resultados y Contador */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: '#94A3B8', padding: '0 4px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          Mostrando <strong style={{ color: '#F8FAFC' }}>{filteredAndSortedPlayers.length}</strong> de <strong style={{ color: '#F8FAFC' }}>{players.length}</strong> jugadores
          {yearFilter !== 'ALL' && (
            <span style={{ marginLeft: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#FBBF24', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '0.78rem' }}>
              Año {yearFilter}
            </span>
          )}
          {positionFilter !== 'ALL' && (
            <span style={{ marginLeft: '6px', background: 'rgba(56, 189, 248, 0.15)', color: '#38BDF8', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontSize: '0.78rem' }}>
              {positionFilter}
            </span>
          )}
        </div>
        {filteredAndSortedPlayers.length > 0 && (
          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
            {sortBy === 'YEAR_DESC' && 'Orden: Año (Más jóvenes primero)'}
            {sortBy === 'YEAR_ASC' && 'Orden: Año (Más mayores primero)'}
            {sortBy === 'NAME_ASC' && 'Orden: Nombre (A-Z)'}
            {sortBy === 'NAME_DESC' && 'Orden: Nombre (Z-A)'}
          </span>
        )}
      </div>

      {/* Grid de Carnets / Fichas de Jugadores */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(270px, 100%), 1fr))',
        gap: '18px'
      }}>
        {filteredAndSortedPlayers.map((player) => {
          const playerBirthYear = getPlayerBirthYear(player);
          return (
            <div key={player.id} className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {player.foto ? (
                  <img
                    src={player.foto}
                    alt={player.nombre}
                    style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover', border: '2px solid rgba(16, 185, 129, 0.4)' }}
                  />
                ) : (
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '14px',
                    background: 'linear-gradient(135deg, #070F1E 0%, #0F172A 100%)',
                    border: '2px solid rgba(212, 175, 55, 0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '5px',
                    flexShrink: 0
                  }}>
                    <img src="/logo.png" alt="Parla Sport" style={{ width: '46px', height: '46px', objectFit: 'contain' }} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>{player.nombre}</h3>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className={`badge ${getPositionBadgeClass(player.posicion)}`}>
                      {player.posicion}
                    </span>
                    {Array.isArray(player.posicionesCampo) && player.posicionesCampo.length > 0 && (
                      player.posicionesCampo.map(pCode => (
                        <span
                          key={pCode}
                          title={FIELD_POSITIONS.find(p => p.id === pCode)?.label || pCode}
                          style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#F1F5F9',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '6px'
                          }}
                        >
                          {pCode}
                        </span>
                      ))
                    )}
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                      {player.edad} Años
                    </span>
                    {playerBirthYear && (
                      <span className="badge badge-gold" style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#FBBF24' }}>
                        Año {playerBirthYear}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: '#CBD5E1', background: 'rgba(15, 23, 42, 0.6)', padding: '10px', borderRadius: '8px' }}>
                {player.fechaNacimiento ? (
                  <div style={{ marginBottom: '2px' }}><strong>F. Nacimiento:</strong> {player.fechaNacimiento} {playerBirthYear ? `(${playerBirthYear})` : ''}</div>
                ) : (playerBirthYear ? (
                  <div style={{ marginBottom: '2px' }}><strong>Año Nacimiento:</strong> {playerBirthYear}</div>
                ) : null)}
                <div><strong>Pierna Hábil:</strong> {player.piernaHabil}</div>
                <div><strong>Club donde entrena:</strong> {player.club || player.equipo || 'Parla Sport'}</div>
                <div style={{ color: '#94A3B8', marginTop: '2px' }}><strong>Tutor:</strong> {player.contactoTutor || 'No registrado'}</div>
              </div>

              <p style={{
                fontSize: '0.78rem',
                color: '#94A3B8',
                fontStyle: 'italic',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                "{player.observacionesTecnicas || 'Sin observaciones aún.'}"
              </p>

              <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', flexWrap: 'wrap' }}>
                <button
                  className="btn-secondary"
                  style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem', minWidth: '90px' }}
                  onClick={() => handleOpenDetail(player, false)}
                >
                  <Eye size={13} /> Ficha
                </button>

                <button
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#FBBF24',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => setReportPlayer(player)}
                  title="Generar Reporte Mensual y Observaciones"
                >
                  <BarChart3 size={13} /> Reporte
                </button>

                {isAdmin && (
                  <>
                    <button
                      style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60A5FA', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer' }}
                      onClick={() => handleOpenDetail(player, true)}
                      title="Editar Ficha"
                    >
                      <Edit3 size={13} />
                    </button>

                    <button
                      style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#F87171', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer' }}
                      onClick={() => setPlayerToDelete(player)}
                      title="Eliminar Jugador"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {filteredAndSortedPlayers.length === 0 && (
          <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', color: '#94A3B8' }}>
            <Calendar size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5, color: '#FBBF24' }} />
            <p style={{ fontWeight: 600, fontSize: '1rem', color: '#F1F5F9' }}>No se encontraron jugadores</p>
            <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>
              Intenta cambiar los términos de búsqueda o los filtros aplicados.
            </p>
            <button
              type="button"
              className="btn-secondary"
              style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => {
                setSearchTerm('');
                setPositionFilter('ALL');
                setYearFilter('ALL');
                setSortBy('NAME_ASC');
              }}
            >
              <RotateCcw size={14} /> Restablecer filtros
            </button>
          </div>
        )}
      </div>

    {/* Modal Añadir / Editar / Ver Ficha Técnica */}
    <Modal
      isOpen={isAddModalOpen || isDetailModalOpen}
      onClose={handleCloseModal}
      title={isAddModalOpen ? '⚽ Registrar Nuevo Jugador' : (isEditing ? '✏️ Editar Ficha Técnica' : '📋 Ficha Técnica del Jugador')}
      widthPx={(!isAddModalOpen && !isEditing) ? '760px' : '700px'}
    >
      {(!isAddModalOpen && !isEditing && selectedPlayer) ? (
        /* ═══════════════════════════════════════════════════════════════
           VISTA OFICIAL DE FICHA TÉCNICA DEL JUGADOR
           ═══════════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 1. Foto (o logo Parla) + Nombre en grande + Año de nacimiento */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '16px',
            padding: '18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
          }}>
            {selectedPlayer.foto ? (
              <img
                src={selectedPlayer.foto}
                alt={selectedPlayer.nombre}
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '16px',
                  objectFit: 'cover',
                  border: '2px solid #FBBF24',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
                  flexShrink: 0
                }}
              />
            ) : (
              <div style={{
                width: '96px',
                height: '96px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #070F1E 0%, #0F172A 100%)',
                border: '2px solid rgba(212, 175, 55, 0.45)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                flexShrink: 0
              }}>
                <img
                  src="/logo.png"
                  alt="Parla Sport"
                  style={{ width: '80px', height: '80px', objectFit: 'contain' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
              <h3 style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                color: '#F8FAFC',
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                wordBreak: 'break-word'
              }}>
                {selectedPlayer.nombre}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#FBBF24',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Calendar size={14} />
                  Año {selectedPlayer.fechaNacimiento ? selectedPlayer.fechaNacimiento.split('-')[0] : (selectedPlayer.edad ? (new Date().getFullYear() - selectedPlayer.edad) : 'N/D')}
                  {selectedPlayer.edad ? ` (${selectedPlayer.edad} años)` : ''}
                </span>

                <span className={getPositionBadgeClass(selectedPlayer.posicion)} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                  {selectedPlayer.posicion || 'Jugador'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Posición en diagrama de cancha (abajo) + al lado Pierna Hábil y Club */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(290px, 100%), 1fr))',
            gap: '16px',
            alignItems: 'stretch'
          }}>
            {/* Columna Izquierda: Diagrama de Cancha */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#38BDF8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                ⚽ Posición en el Diagrama de Cancha:
              </div>

              <FieldPositionSelector
                selectedPositions={selectedPlayer.posicionesCampo || getInitialPositions(selectedPlayer)}
                readOnly={true}
              />
            </div>

            {/* Columna Derecha: Tarjetas de Pierna Hábil, Club y Tutor */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
              {/* Pierna Hábil */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}>
                  🦶
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Pierna Hábil
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC', marginTop: '2px' }}>
                    {selectedPlayer.piernaHabil || 'Derecha'}
                  </div>
                </div>
              </div>

              {/* Club / Academia */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FBBF24',
                  fontSize: '1.25rem',
                  flexShrink: 0
                }}>
                  🛡️
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Club donde entrena
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC', marginTop: '2px' }}>
                    {selectedPlayer.club || selectedPlayer.equipo || 'Parla Sport'}
                  </div>
                </div>
              </div>

              {/* Contacto Tutor */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34D399',
                  fontSize: '1.15rem',
                  flexShrink: 0
                }}>
                  📞
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                    Contacto Tutor / Representante
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#F8FAFC', marginTop: '2px' }}>
                    {selectedPlayer.contactoTutor || 'No registrado'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Observación General */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#FBBF24',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📝 Observación General
            </div>
            <p style={{
              margin: 0,
              fontSize: '0.92rem',
              color: selectedPlayer.observacionesTecnicas ? '#F8FAFC' : '#94A3B8',
              lineHeight: 1.6,
              fontStyle: selectedPlayer.observacionesTecnicas ? 'normal' : 'italic'
            }}>
              {selectedPlayer.observacionesTecnicas || 'Sin observaciones técnicas generales registradas en el expediente del jugador.'}
            </p>
          </div>

          {/* 4. Observaciones hechas por los profesores según las sesiones */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <MessageSquare size={16} /> Observaciones hechas por los Profesores según las Sesiones:
            </div>

            {getPlayerSessionObservations(selectedPlayer).length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                {getPlayerSessionObservations(selectedPlayer).map(obs => (
                  <div
                    key={obs.id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.55)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderLeft: '4px solid #10B981',
                      padding: '12px 14px',
                      borderRadius: '0 10px 10px 0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '0.78rem' }}>
                      <span style={{ color: '#34D399', fontWeight: 700 }}>
                        👤 Prof. {obs.autorNombre || 'Entrenador'}
                      </span>
                      <span style={{ color: '#94A3B8', fontSize: '0.74rem' }}>
                        📅 {obs.fecha} {obs.modalidad ? `• Modalidad ${obs.modalidad}` : ''}
                      </span>
                    </div>
                    <div style={{ color: '#F8FAFC', fontSize: '0.88rem', fontStyle: 'italic', lineHeight: 1.5 }}>
                      "{obs.texto}"
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '22px 16px',
                color: '#64748B',
                fontSize: '0.85rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '10px'
              }}>
                Aún no se han registrado observaciones en sesiones para este alumno.
              </div>
            )}
          </div>

          {/* Acciones al pie de la Ficha Técnica */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              className="btn-secondary"
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#FBBF24',
                padding: '8px 14px',
                fontSize: '0.82rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700
              }}
              onClick={() => {
                setIsDetailModalOpen(false);
                setReportPlayer(selectedPlayer);
              }}
            >
              <BarChart3 size={15} /> Ver Reporte Mensual Completo
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              {isAdmin && (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 size={14} /> Editar Ficha
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCloseModal}
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           FORMULARIO PARA REGISTRAR O EDITAR JUGADOR
           ═══════════════════════════════════════════════════════════════ */
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '12px' }}>
            <div>
              <label className="input-label">Nombre Completo del Jugador</label>
              <input
                type="text"
                required
                placeholder="Ej. Carlos Mendoza"
                className="input-field"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>

            <div>
              <label className="input-label">Fecha de Nacimiento</label>
              <input
                type="date"
                className="input-field"
                value={formData.fechaNacimiento || ''}
                onChange={(e) => handleBirthDateChange(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '12px' }}>
            <div>
              <label className="input-label">Edad (Cálculo Automático)</label>
              <input
                type="number"
                disabled
                className="input-field"
                value={formData.edad}
              />
            </div>

            <div>
              <label className="input-label">Posición Principal</label>
              <select
                className="input-field"
                value={formData.posicion}
                onChange={(e) => setFormData({ ...formData, posicion: e.target.value })}
              >
                <option value="Portero">Portero</option>
                <option value="Defensa">Defensa</option>
                <option value="Mediocampista">Mediocampista</option>
                <option value="Delantero">Delantero</option>
                <option value="Polivalente">Polivalente</option>
              </select>
            </div>

            <div>
              <label className="input-label">Pierna Hábil</label>
              <select
                className="input-field"
                value={formData.piernaHabil}
                onChange={(e) => setFormData({ ...formData, piernaHabil: e.target.value })}
              >
                <option value="Derecha">Derecha</option>
                <option value="Izquierda">Izquierda</option>
                <option value="Ambidextro">Ambidextro</option>
              </select>
            </div>
          </div>

          {/* ─── Selector Táctico de Posición en Mitad de Cancha ─── */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <label className="input-label" style={{ margin: 0, fontWeight: 700, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>⚽ Ubicación en el Campo (Selección Múltiple)</span>
              </label>
              <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600 }}>
                Toca los círculos para activar / desactivar posiciones
              </span>
            </div>

            <FieldPositionSelector
              selectedPositions={formData.posicionesCampo || []}
              onChange={handlePositionsChange}
              readOnly={false}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '12px' }}>
            <div>
              <label className="input-label">Club donde Entrena</label>
              <input
                type="text"
                placeholder="Ej. Club Santa Paula, Valle Arriba, Sebucán, Parla Sport..."
                className="input-field"
                value={formData.club || ''}
                onChange={(e) => setFormData({ ...formData, club: e.target.value })}
              />
            </div>

            <div>
              <label className="input-label">Contacto Representante / Tutor</label>
              <input
                type="text"
                placeholder="+58 412 9988776"
                className="input-field"
                value={formData.contactoTutor}
                onChange={(e) => setFormData({ ...formData, contactoTutor: e.target.value })}
              />
            </div>
          </div>

          <div>
            <ImageUploader
              value={formData.foto}
              onChange={(url) => setFormData(prev => ({ ...prev, foto: url }))}
              label="Foto del Jugador (Galería o Cámara)"
              sizePx={84}
            />
          </div>

          <div>
            <label className="input-label">Observaciones Técnicas Generales</label>
            <textarea
              rows={3}
              className="input-field"
              placeholder="Comentarios sobre fortalezas, técnica, visión de juego o aspectos a entrenar..."
              value={formData.observacionesTecnicas}
              onChange={(e) => setFormData({ ...formData, observacionesTecnicas: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCloseModal}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar Ficha
            </button>
          </div>
        </form>
      )}
    </Modal>

    {/* Modal de Confirmación de Eliminación de Jugador */}
    <Modal
      isOpen={!!playerToDelete}
      onClose={() => setPlayerToDelete(null)}
      title="🗑️ Eliminar Ficha de Jugador"
    >
      {playerToDelete && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            padding: '14px',
            borderRadius: '12px',
            color: '#F87171',
            fontSize: '0.9rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <strong style={{ fontSize: '0.95rem' }}>⚠️ ¿Estás seguro de eliminar a {playerToDelete.nombre}?</strong>
            <span>
              Posición: <strong>{playerToDelete.posicion}</strong> | Edad: <strong>{playerToDelete.edad} años</strong>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '4px' }}>
              Se borra la ficha técnica y la información de contacto del jugador.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPlayerToDelete(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-danger"
              style={{ padding: '8px 16px', fontWeight: 700 }}
              onClick={() => {
                deletePlayer(playerToDelete.id);
                setPlayerToDelete(null);
              }}
            >
              <Trash2 size={16} /> Confirmar Eliminación
            </button>
          </div>
        </div>
      )}
    </Modal>

    {/* Modal de Reporte Mensual Imprimible y Compartible */}
    {reportPlayer && (
      <PlayerMonthlyReportModal
        isOpen={Boolean(reportPlayer)}
        onClose={() => setReportPlayer(null)}
        player={reportPlayer}
        sessions={sessions}
        coaches={coaches}
      />
    )}

    </div>
  );
};

export default PlayerManager;
