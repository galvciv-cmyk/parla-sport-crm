import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  UserPlus, Search, Edit3, Trash2, Eye, MessageSquare, BarChart3, 
  Calendar, RotateCcw, Share2, Printer, Award, ShieldCheck, 
  Activity, Compass, CheckCircle2, User, FileText, Clock, MapPin, 
  Shield, Copy, Link, Check, ExternalLink
} from 'lucide-react';
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
  const [shareModalPlayer, setShareModalPlayer] = useState(null);
  const [printingProfilePlayer, setPrintingProfilePlayer] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);

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

  // Obtener subcategoría formativa técnica (Sub-7 a Sub-20)
  const getPlayerSubCategory = (birthYear) => {
    if (!birthYear) return 'FORMATIVA';
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (age <= 7) return 'SUB-7';
    if (age <= 9) return 'SUB-9';
    if (age <= 11) return 'SUB-11';
    if (age <= 13) return 'SUB-13';
    if (age <= 15) return 'SUB-15';
    if (age <= 17) return 'SUB-17';
    if (age <= 20) return 'SUB-20';
    return 'SENIOR / LIBRE';
  };

  // Obtener descripción técnica de lateralidad / perfil hábil
  const getLateralidadLabel = (foot) => {
    if (!foot) return 'Perfil Diestro Natural';
    const f = String(foot).toLowerCase();
    if (f.includes('izq') || f.includes('zurdo')) return 'Perfil Zurdo (Pie Izquierdo)';
    if (f.includes('ambi') || f.includes('ambas')) return 'Ambidextro (Dominio Bilateral)';
    return 'Perfil Diestro (Pie Derecho)';
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

  // Separar mención de Club dentro de la descripción técnica
  const handleSeparateClubFromDescription = () => {
    const text = formData.observacionesTecnicas || '';
    if (!text.trim()) {
      showToast('Sin Texto', 'No hay descripción escrita para analizar.', 'info');
      return;
    }

    const clubRegex = /(?:juega en|entrena en|club|pertenece a|adscrito a|escuela|academia)\s*:?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s]+?)(?=[,.\n]|$)/i;
    const match = text.match(clubRegex);

    if (match && match[1]) {
      const detectedClub = match[1].trim();
      const cleanedDesc = text
        .replace(match[0], '')
        .replace(/^\s*[,.-]\s*/, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      setFormData(prev => ({
        ...prev,
        club: prev.club && prev.club !== 'Parla Sport' ? prev.club : detectedClub,
        observacionesTecnicas: cleanedDesc
      }));
      showToast('Club Separado', `Se extrajo "${detectedClub}" al campo Club y se limpió la descripción.`, 'success');
    } else {
      showToast('Revisión', 'No se detectó un prefijo explícito (ej: "Club...", "Juega en..."). Puedes ingresar el Club manualmente.', 'info');
    }
  };

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

  // Acción de Imprimir / Generar PDF del Perfil Oficial con diseño idéntico a la App
  const handlePrintProfile = (player) => {
    if (!player) return;
    setPrintingProfilePlayer(player);
    showToast('Generando PDF', 'Abriendo vista de perfil para guardar como PDF...', 'info');

    // Desbloquear overflow para evitar que los navegadores corten la vista de impresión en blanco
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'visible';

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.style.overflow = prevOverflow;
      }, 1500);
    }, 300);
  };

  // Obtener enlace web personalizado directo al perfil de un jugador
  const getPlayerProfileUrl = (player) => {
    if (!player || typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}#player-${player.id}`;
  };

  // Obtener enlace web personalizado directo al informe de asistencias
  const getPlayerReportUrl = (player) => {
    if (!player || typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}#report-${player.id}`;
  };

  // Copiar enlace al portapapeles con feedback instantáneo
  const handleCopyLink = (url, label = 'Enlace del perfil') => {
    if (!url) return;
    const copySuccess = () => {
      setCopiedLink(url);
      showToast('Enlace Copiado', `El ${label} se ha copiado al portapapeles.`, 'success');
      setTimeout(() => setCopiedLink(null), 3000);
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(copySuccess).catch(() => {
        fallbackCopy(url, copySuccess);
      });
    } else {
      fallbackCopy(url, copySuccess);
    }
  };

  const fallbackCopy = (text, callback) => {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      if (callback) callback();
    } catch {
      showToast('Error', 'No se pudo copiar automáticamente. Por favor selecciónalo manualmente.', 'warning');
    }
  };

  // Compartir Ficha de Perfil por WhatsApp con Enlace Personalizado
  const handleShareProfileWhatsApp = (player) => {
    if (!player) return;
    const rawPhone = (player.contactoTutor || '').replace(/[^0-9+]/g, '');
    const birthYear = getPlayerBirthYear(player);
    const subCat = getPlayerSubCategory(birthYear);
    const profileUrl = getPlayerProfileUrl(player);

    let text = `⚽ *PARLA SPORT - DOSSIER TÉCNICO OFICIAL*\n\n`;
    text += `👤 *Deportista:* ${player.nombre}\n`;
    text += `🎂 *Categoría:* ${subCat} • Gen ${birthYear || 'N/D'}${player.edad ? ` (${player.edad} años)` : ''}\n`;
    text += `📍 *Demarcación Nominal:* ${player.posicion}\n`;
    if (Array.isArray(player.posicionesCampo) && player.posicionesCampo.length > 0) {
      text += `🗺️ *Roles en Cancha:* ${player.posicionesCampo.join(', ')}\n`;
    }
    text += `🦶 *Lateralidad:* ${player.piernaHabil || 'Derecha'} (${getLateralidadLabel(player.piernaHabil)})\n`;
    text += `🛡️ *Club de Adscripción:* ${player.club || player.equipo || 'Parla Sport Academy'}\n`;
    text += `📞 *Tutor / Contacto:* ${player.contactoTutor || 'No registrado'}\n\n`;
    if (player.observacionesTecnicas) {
      text += `📋 *Diagnóstico Técnico-Táctico:*\n"${player.observacionesTecnicas}"\n\n`;
    }
    if (profileUrl) {
      text += `🔗 *Ver Expediente Interactivo en Línea:*\n${profileUrl}\n\n`;
    }
    text += `🏆 *Parla Sport Training Academy*\n_Departamento de Metodología y Alto Rendimiento_`;

    const encodedText = encodeURIComponent(text);
    const waUrl = rawPhone
      ? `https://wa.me/${rawPhone.replace('+', '')}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, '_blank');
    showToast('Enlace de WhatsApp generado', 'Abriendo WhatsApp con la ficha oficial y enlace del jugador.', 'success');
  };

  // Compartir Informe de Asistencias y Rendimiento por WhatsApp
  const handleShareReportWhatsApp = (player) => {
    if (!player) return;
    const rawPhone = (player.contactoTutor || '').replace(/[^0-9+]/g, '');
    const reportUrl = getPlayerReportUrl(player);

    let text = `📊 *PARLA SPORT - INFORME DE RENDIMIENTO Y ASISTENCIAS*\n\n`;
    text += `👤 *Deportista:* ${player.nombre}\n`;
    text += `📍 *Demarcación:* ${player.posicion}\n`;
    text += `🛡️ *Club:* ${player.club || player.equipo || 'Parla Sport Academy'}\n\n`;
    if (reportUrl) {
      text += `🔗 *Consultar Registro de Asistencias en Línea:*\n${reportUrl}\n\n`;
    }
    text += `🏆 *Parla Sport Training Academy*\n_Auditoría y Control de Carga Deportiva_`;

    const encodedText = encodeURIComponent(text);
    const waUrl = rawPhone
      ? `https://wa.me/${rawPhone.replace('+', '')}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(waUrl, '_blank');
    showToast('Enlace de WhatsApp generado', 'Abriendo WhatsApp con el informe de rendimiento.', 'success');
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
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>
                    {player.nombre}{playerBirthYear ? ` - ${playerBirthYear}` : ''}
                  </h3>
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
                  style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem', minWidth: '75px' }}
                  onClick={() => handleOpenDetail(player, false)}
                  title="Ver Ficha y Perfil Oficial con Cancha Táctica"
                >
                  <Eye size={13} /> Perfil
                </button>

                <button
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    color: '#FBBF24',
                    padding: '6px 9px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => setReportPlayer(player)}
                  title="Ver Registro de Rendimiento y Asistencias Mensuales"
                >
                  <BarChart3 size={13} /> Registro
                </button>

                <button
                  style={{
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38BDF8',
                    padding: '6px 9px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => setShareModalPlayer(player)}
                  title="Compartir o exportar en PDF: 1. Registro o 2. Perfil"
                >
                  <Share2 size={13} /> Compartir
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
           VISTA OFICIAL DE FICHA TÉCNICA / DOSSIER DEL JUGADOR
           ═══════════════════════════════════════════════════════════════ */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Barra Superior de Identificación Oficial */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.25)',
            borderRadius: '12px',
            padding: '8px 16px',
            fontSize: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FBBF24', fontWeight: 800, letterSpacing: '0.06em' }}>
              <Award size={15} />
              <span>DOSSIER TÉCNICO Y EXPEDIENTE METODOLÓGICO</span>
            </div>
            <div style={{ color: '#94A3B8', fontWeight: 600 }}>
              FOLIO: <strong style={{ color: '#F8FAFC', letterSpacing: '0.04em' }}>EXP-{getPlayerBirthYear(selectedPlayer) || '2026'}-{String(selectedPlayer.id || '001').slice(-4).toUpperCase()}</strong>
            </div>
          </div>

          {/* 1. Tarjeta de Identidad y Biometría del Deportista */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%)',
            border: '1px solid rgba(212, 175, 55, 0.35)',
            borderRadius: '16px',
            padding: '18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: '260px',
              backgroundImage: 'radial-gradient(ellipse at 85% 50%, rgba(212, 175, 55, 0.15) 0%, rgba(56, 189, 248, 0.08) 40%, transparent 70%)',
              pointerEvents: 'none'
            }} />

            {selectedPlayer.foto ? (
              <img
                src={selectedPlayer.foto}
                alt={selectedPlayer.nombre}
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '16px',
                  objectFit: 'cover',
                  border: '2.5px solid #D4AF37',
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
                border: '2.5px solid rgba(212, 175, 55, 0.7)',
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                DEPORTISTA REGISTRADO
              </div>
              <h3 style={{
                fontSize: '1.65rem',
                fontWeight: 900,
                color: '#F8FAFC',
                margin: 0,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                textShadow: '0 2px 6px rgba(0,0,0,0.5)',
                wordBreak: 'break-word'
              }}>
                {selectedPlayer.nombre}{getPlayerBirthYear(selectedPlayer) ? ` - ${getPlayerBirthYear(selectedPlayer)}` : ''}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                <span style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#FBBF24',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <Calendar size={13} />
                  CAT. {getPlayerSubCategory(getPlayerBirthYear(selectedPlayer))} • GEN {getPlayerBirthYear(selectedPlayer) || 'N/D'} {selectedPlayer.edad ? `(${selectedPlayer.edad} años)` : ''}
                </span>

                <span className={getPositionBadgeClass(selectedPlayer.posicion)} style={{ fontSize: '0.78rem', padding: '3px 10px', fontWeight: 800 }}>
                  DEMARCACIÓN: {selectedPlayer.posicion?.toUpperCase() || 'JUGADOR'}
                </span>

                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34D399',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <CheckCircle2 size={13} /> ACTIVO EN SEGUIMIENTO
                </span>
              </div>
            </div>
          </div>

          {/* 2. Grid de Ocupación Táctica y Parámetros Deportivos */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(290px, 100%), 1fr))',
            gap: '16px',
            alignItems: 'stretch'
          }}>
            {/* Columna Izquierda: Diagrama de Cancha Táctica */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#38BDF8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  <Compass size={16} /> MAPA POSICIONAL Y ZONA DE ACCIÓN:
                </div>
                {Array.isArray(selectedPlayer.posicionesCampo) && selectedPlayer.posicionesCampo.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {selectedPlayer.posicionesCampo.map(pCode => (
                      <span
                        key={pCode}
                        style={{
                          background: 'rgba(56, 189, 248, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          color: '#38BDF8',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        {pCode}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <FieldPositionSelector
                selectedPositions={selectedPlayer.posicionesCampo || getInitialPositions(selectedPlayer)}
                readOnly={true}
              />
            </div>

            {/* Columna Derecha: Tarjetas de Parámetros Técnicos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
              {/* Lateralidad y Pierna Hábil */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
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
                  <div style={{ fontSize: '0.68rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                    LATERALIDAD Y PIE DOMINANTE
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC', marginTop: '1px' }}>
                    {selectedPlayer.piernaHabil || 'Derecha'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#60A5FA', fontWeight: 600 }}>
                    {getLateralidadLabel(selectedPlayer.piernaHabil)}
                  </div>
                </div>
              </div>

              {/* Club de Formación */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
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
                  <div style={{ fontSize: '0.68rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                    CLUB DE ADSCRIPCIÓN FORMATIVA
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#F8FAFC', marginTop: '1px' }}>
                    {selectedPlayer.club || selectedPlayer.equipo || 'Parla Sport Academy'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#FBBF24', fontWeight: 600 }}>
                    Entidad deportiva activa de procedencia
                  </div>
                </div>
              </div>

              {/* Tutor Legal / Representante */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
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
                  <div style={{ fontSize: '0.68rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                    REPRESENTACIÓN / TUTOR LEGAL
                  </div>
                  <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#F8FAFC', marginTop: '1px' }}>
                    {selectedPlayer.contactoTutor || 'No registrado'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600 }}>
                    Canal oficial directo de enlace institucional
                  </div>
                </div>
              </div>

              {/* Programa Metodológico */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px'
              }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  border: '1px solid rgba(168, 85, 247, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#C084FC',
                  fontSize: '1.2rem',
                  flexShrink: 0
                }}>
                  ⭐
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#94A3B8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                    PROGRAMA METODOLÓGICO ASIGNADO
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#F8FAFC', marginTop: '1px' }}>
                    Tecnificación & Alto Rendimiento
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#C084FC', fontWeight: 600 }}>
                    Seguimiento continuo de progresión motriz
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Diagnóstico Técnico-Táctico General */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderLeft: '4px solid #D4AF37',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#FBBF24',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <FileText size={16} /> DIAGNÓSTICO TÉCNICO-TÁCTICO INTEGRAL
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
                Dictamen Metodológico General
              </span>
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

          {/* 4. Bitácora de Campo: Evaluaciones Continuas del Cuerpo Técnico */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#38BDF8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <MessageSquare size={16} /> BITÁCORA DE CAMPO: DEVOLUCIONES DEL CUERPO TÉCNICO EN SESIÓN
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>
                {getPlayerSessionObservations(selectedPlayer).length} Registro(s) de Campo
              </span>
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
                      <span style={{ color: '#34D399', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ShieldCheck size={14} /> PROF. {String(obs.autorNombre || 'Entrenador').toUpperCase()}
                        {obs.modalidad ? <span style={{ color: '#60A5FA', fontWeight: 600, fontSize: '0.72rem' }}>• MODALIDAD {obs.modalidad}</span> : ''}
                      </span>
                      <span style={{ color: '#94A3B8', fontSize: '0.74rem' }}>
                        📅 {obs.fecha}
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

          {/* Acciones al pie del Dossier Técnico */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                style={{
                  padding: '8px 14px',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 700
                }}
                onClick={() => handlePrintProfile(selectedPlayer)}
                title="Descargar o imprimir dossier en PDF oficial de alta calidad"
              >
                <Printer size={15} /> Descargar / Imprimir Dossier PDF
              </button>

              <button
                type="button"
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#34D399',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onClick={() => handleShareProfileWhatsApp(selectedPlayer)}
                title="Compartir ficha oficial por WhatsApp"
              >
                <Share2 size={14} /> WhatsApp
              </button>

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
                title="Ver Registro de Rendimiento y Asistencias Mensuales"
              >
                <BarChart3 size={15} /> Informe de Rendimiento
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {isAdmin && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.35)', color: '#60A5FA' }}
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
                Cerrar
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
              <label className="input-label" style={{ margin: 0 }}>
                Descripción Técnica / Perfil del Jugador
              </label>
              <button
                type="button"
                onClick={handleSeparateClubFromDescription}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#FBBF24',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Detecta si el texto menciona un club y lo pasa automáticamente al campo Club donde Entrena"
              >
                🧹 Separar Club del Texto
              </button>
            </div>
            <textarea
              rows={3}
              className="input-field"
              placeholder="Breve descripción del perfil deportivo, fortalezas, visión de juego o aspectos a entrenar..."
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

    {/* Modal de Reporte Mensual Imprimible y Compartible (El registro que ya está) */}
    {reportPlayer && (
      <PlayerMonthlyReportModal
        isOpen={Boolean(reportPlayer)}
        onClose={() => setReportPlayer(null)}
        player={reportPlayer}
        sessions={sessions}
        coaches={coaches}
        onOpenProfile={(p) => {
          setReportPlayer(null);
          handleOpenDetail(p, false);
        }}
      />
    )}

    {/* Modal para Compartir Dossier Técnico y Reporte de Rendimiento */}
    {shareModalPlayer && (
      <Modal
        isOpen={Boolean(shareModalPlayer)}
        onClose={() => setShareModalPlayer(null)}
        title={`📤 Compartir Expediente: ${shareModalPlayer.nombre}`}
        widthPx="720px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Bloque Destacado: Enlace Web Directo y Personalizado */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(8, 19, 43, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1.5px solid rgba(212, 175, 55, 0.4)',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FBBF24', fontWeight: 800, fontSize: '0.86rem', letterSpacing: '0.04em' }}>
                <Link size={16} />
                <span>ENLACE PERSONALIZADO DEL DEPORTISTA</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                ✓ Enlace Web Único
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.5 }}>
              Cada deportista cuenta con un enlace web directo y exclusivo. Al enviarlo a padres, representantes o visores deportivos, podrán consultar su expediente en tiempo real:
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '8px 12px'
            }}>
              <span style={{
                flex: 1,
                fontSize: '0.8rem',
                color: '#38BDF8',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {getPlayerProfileUrl(shareModalPlayer)}
              </span>

              <button
                type="button"
                className="btn-primary"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  flexShrink: 0
                }}
                onClick={() => handleCopyLink(getPlayerProfileUrl(shareModalPlayer), 'enlace del perfil')}
              >
                {copiedLink === getPlayerProfileUrl(shareModalPlayer) ? <Check size={14} /> : <Copy size={14} />}
                {copiedLink === getPlayerProfileUrl(shareModalPlayer) ? '¡Copiado!' : 'Copiar Enlace'}
              </button>
            </div>
          </div>

          {/* Grid de Formatos Oficiales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '14px' }}>
            
            {/* DOSSIER TÉCNICO Y EXPEDIENTE METODOLÓGICO */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="badge badge-blue" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                    EXPEDIENTE METODOLÓGICO
                  </span>
                  <Award size={18} color="#38BDF8" />
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 900, color: '#F8FAFC' }}>
                  📋 Dossier Técnico Oficial
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.5 }}>
                  Ficha completa con <strong>mapa posicional en cancha táctica</strong>, lateralidad, filiación deportiva, biometría y dictamen técnico integral.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                  onClick={() => {
                    const p = shareModalPlayer;
                    setShareModalPlayer(null);
                    handlePrintProfile(p);
                  }}
                >
                  <Printer size={15} /> Descargar / Imprimir Dossier PDF
                </button>

                <button
                  type="button"
                  style={{
                    width: '100%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#34D399',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onClick={() => {
                    handleShareProfileWhatsApp(shareModalPlayer);
                  }}
                >
                  <Share2 size={15} /> Compartir por WhatsApp (con enlace)
                </button>
              </div>
            </div>

            {/* INFORME MENSUAL DE RENDIMIENTO & ASISTENCIAS */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '14px',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="badge badge-gold" style={{ fontSize: '0.7rem', fontWeight: 800 }}>
                    AUDITORÍA DE DESEMPEÑO
                  </span>
                  <BarChart3 size={18} color="#FBBF24" />
                </div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 900, color: '#F8FAFC' }}>
                  📊 Informe de Rendimiento
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.5 }}>
                  Desglose mensual de microciclos, horas efectivas de cancha, porcentaje de asistencia y bitácora de observaciones del cuerpo técnico.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}
                  onClick={() => {
                    const p = shareModalPlayer;
                    setShareModalPlayer(null);
                    setReportPlayer(p);
                  }}
                >
                  <Printer size={15} color="#60A5FA" /> Ver e Imprimir Reporte PDF
                </button>

                <button
                  type="button"
                  style={{
                    width: '100%',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#34D399',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onClick={() => {
                    handleShareReportWhatsApp(shareModalPlayer);
                  }}
                >
                  <Share2 size={15} /> Compartir Asistencias por WhatsApp
                </button>
              </div>
            </div>

          </div>
        </div>
      </Modal>
    )}

    {/* ═══════════════════════════════════════════════════════════════
        HOJA OFICIAL DE IMPRESIÓN / PDF DEL PERFIL (PORTAL DIRECTO A BODY)
        ═══════════════════════════════════════════════════════════════ */}
    {typeof document !== 'undefined' && createPortal(
      (printingProfilePlayer || (isDetailModalOpen && selectedPlayer)) ? (
        <div id="printable-profile" className="printable-profile-portal">
          {(() => {
            const playerToPrint = printingProfilePlayer || selectedPlayer;
            if (!playerToPrint) return null;
            const birthYear = getPlayerBirthYear(playerToPrint);
            const playerPositions = playerToPrint.posicionesCampo || getInitialPositions(playerToPrint);
            const sessionNotes = getPlayerSessionObservations(playerToPrint);
            const subCategory = getPlayerSubCategory(birthYear);
            const folioNumber = `EXP-${birthYear || '2026'}-${String(playerToPrint.id || '001').slice(-4).toUpperCase()}`;

            return (
              <div style={{
                width: '100%',
                maxWidth: '790px',
                margin: '0 auto',
                background: '#FFFFFF',
                color: '#0F172A',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                boxSizing: 'border-box',
                border: '2.5px solid #0B1736',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
              }}>
                {/* ─── ENCABEZADO INSTITUCIONAL MEMBRETADO AZUL MARINO ─── */}
                <div style={{
                  background: 'linear-gradient(135deg, #030712 0%, #08132B 42%, #0C1E47 100%)',
                  color: '#FFFFFF',
                  padding: '20px 24px',
                  borderBottom: '4px solid #D4AF37',
                  boxShadow: '0 3px 12px rgba(212, 175, 55, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {/* Destellos y líneas deportivas de fondo */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: '360px',
                    backgroundImage: 'radial-gradient(ellipse at 85% 50%, rgba(212, 175, 55, 0.22) 0%, rgba(56, 189, 248, 0.14) 45%, transparent 75%)',
                    pointerEvents: 'none'
                  }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1 }}>
                    {/* Caja estilizada con marco de oro para el logo de letras blancas */}
                    <div style={{
                      width: '66px',
                      height: '66px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 100%)',
                      border: '2px solid rgba(212, 175, 55, 0.9)',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5), inset 0 0 12px rgba(212, 175, 55, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '5px',
                      flexShrink: 0
                    }}>
                      <img
                        src="/logo.png"
                        alt="Parla Sport"
                        style={{ width: '56px', height: '56px', objectFit: 'contain' }}
                      />
                    </div>

                    <div>
                      <div style={{
                        fontSize: '1.6rem',
                        fontWeight: 900,
                        color: '#FFFFFF',
                        letterSpacing: '0.04em',
                        lineHeight: 1.1,
                        textShadow: '0 2px 8px rgba(0, 0, 0, 0.8)'
                      }}>
                        PARLA SPORT
                      </div>
                      <div style={{
                        fontSize: '0.78rem',
                        color: '#FBBF24',
                        fontWeight: 800,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        marginTop: '3px'
                      }}>
                        TRAINING ACADEMY
                      </div>
                      <div style={{
                        fontSize: '0.72rem',
                        color: '#38BDF8',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        marginTop: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>DEPARTAMENTO DE METODOLOGÍA & DESARROLLO DEPORTIVO</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', position: 'relative', zIndex: 1 }}>
                    <div style={{
                      background: 'rgba(212, 175, 55, 0.18)',
                      border: '1.5px solid #D4AF37',
                      color: '#FDE68A',
                      padding: '4px 14px',
                      borderRadius: '20px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      display: 'inline-block',
                      marginBottom: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}>
                      ⭐ EXPEDIENTE TÉCNICO OFICIAL
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#CBD5E1', fontWeight: 600 }}>
                      FOLIO: <strong style={{ color: '#F8FAFC', letterSpacing: '0.05em' }}>{folioNumber}</strong>
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#94A3B8', marginTop: '2px' }}>
                      Emisión: <strong style={{ color: '#FFFFFF' }}>{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                    </div>
                  </div>
                </div>

                {/* ─── CUERPO DEL DOSSIER TÉCNICO ─── */}
                <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                  {/* 1. FICHA BIOMÉTRICA Y DE IDENTIDAD DEL ATLETA */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '18px',
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}>
                    {playerToPrint.foto ? (
                      <img
                        src={playerToPrint.foto}
                        alt={playerToPrint.nombre}
                        style={{
                          width: '92px',
                          height: '92px',
                          borderRadius: '14px',
                          objectFit: 'cover',
                          border: '2.5px solid #D4AF37',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                          flexShrink: 0
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '92px',
                        height: '92px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #070F1E 0%, #0F172A 100%)',
                        border: '2.5px solid #D4AF37',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        flexShrink: 0
                      }}>
                        <img src="/logo.png" alt="Parla Sport" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        color: '#64748B',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: '2px'
                      }}>
                        DEPORTISTA EVALUADO
                      </div>
                      <h2 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        {playerToPrint.nombre}{birthYear ? ` - ${birthYear}` : ''}
                      </h2>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          background: '#FEF3C7',
                          border: '1.5px solid #F59E0B',
                          color: '#92400E',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          letterSpacing: '0.02em'
                        }}>
                          CATEGORÍA {subCategory} • AÑO {birthYear || 'N/D'} {playerToPrint.edad ? `(${playerToPrint.edad} años)` : ''}
                        </span>

                        <span style={{
                          background: '#E0F2FE',
                          border: '1.5px solid #0284C7',
                          color: '#0369A1',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          letterSpacing: '0.02em'
                        }}>
                          DEMARCACIÓN: {playerToPrint.posicion?.toUpperCase() || 'JUGADOR'}
                        </span>

                        <span style={{
                          background: '#DCFCE7',
                          border: '1.5px solid #16A34A',
                          color: '#15803D',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 800
                        }}>
                          ESTADO: EN SEGUIMIENTO FORMATIVO
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. MATRIZ TÁCTICA Y PARÁMETROS TÉCNICOS (2 Columnas) */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.15fr 1fr',
                    gap: '16px',
                    alignItems: 'stretch'
                  }}>
                    {/* Columna Izquierda: Diagrama de Cancha Táctica */}
                    <div style={{
                      background: '#F8FAFC',
                      border: '1.5px solid #CBD5E1',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          color: '#0284C7',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          ⚽ MAPA POSICIONAL Y ZONA DE INFLUENCIA:
                        </div>
                        {Array.isArray(playerPositions) && playerPositions.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {playerPositions.map(pCode => (
                              <span
                                key={pCode}
                                style={{
                                  background: '#0F172A',
                                  color: '#F8FAFC',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  padding: '1px 6px',
                                  borderRadius: '4px'
                                }}
                              >
                                {pCode}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ transform: 'scale(0.95)', transformOrigin: 'top center' }}>
                        <FieldPositionSelector
                          selectedPositions={playerPositions}
                          readOnly={true}
                          compact={true}
                        />
                      </div>
                    </div>

                    {/* Columna Derecha: Tarjetas de Parámetros Deportivos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                      {/* Lateralidad */}
                      <div style={{
                        background: '#F8FAFC',
                        border: '1.5px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
                          background: '#DBEAFE',
                          border: '1px solid #93C5FD',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.15rem',
                          flexShrink: 0
                        }}>
                          🦶
                        </div>
                        <div>
                          <div style={{ fontSize: '0.66rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                            LATERALIDAD Y PIE DOMINANTE
                          </div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
                            {playerToPrint.piernaHabil || 'Derecha'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#0284C7', fontWeight: 600 }}>
                            {getLateralidadLabel(playerToPrint.piernaHabil)}
                          </div>
                        </div>
                      </div>

                      {/* Club / Afiliación */}
                      <div style={{
                        background: '#F8FAFC',
                        border: '1.5px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
                          background: '#FEF3C7',
                          border: '1px solid #FCD34D',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.15rem',
                          flexShrink: 0
                        }}>
                          🛡️
                        </div>
                        <div>
                          <div style={{ fontSize: '0.66rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                            CLUB DE ADSCRIPCIÓN FORMATIVA
                          </div>
                          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
                            {playerToPrint.club || playerToPrint.equipo || 'Parla Sport Academy'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#B45309', fontWeight: 600 }}>
                            Entidad Deportiva de Pertenencia Activa
                          </div>
                        </div>
                      </div>

                      {/* Tutor / Representante */}
                      <div style={{
                        background: '#F8FAFC',
                        border: '1.5px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
                          background: '#D1FAE5',
                          border: '1px solid #6EE7B7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.15rem',
                          flexShrink: 0
                        }}>
                          📞
                        </div>
                        <div>
                          <div style={{ fontSize: '0.66rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                            REPRESENTACIÓN / TUTOR LEGAL
                          </div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
                            {playerToPrint.contactoTutor || 'No registrado'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>
                            Canal Oficial de Enlace Deportivo
                          </div>
                        </div>
                      </div>

                      {/* Programa Metodológico */}
                      <div style={{
                        background: '#F8FAFC',
                        border: '1.5px solid #E2E8F0',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
                          background: '#F3E8FF',
                          border: '1px solid #D8B4FE',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.15rem',
                          flexShrink: 0
                        }}>
                          ⭐
                        </div>
                        <div>
                          <div style={{ fontSize: '0.66rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                            PROGRAMA METODOLÓGICO
                          </div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
                            Tecnificación & Alto Rendimiento
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#7E22CE', fontWeight: 600 }}>
                            Seguimiento Cualitativo Continuo
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. DIAGNÓSTICO TÉCNICO-TÁCTICO GENERAL */}
                  <div style={{
                    background: '#F8FAFC',
                    border: '1.5px solid #E2E8F0',
                    borderLeft: '4px solid #D4AF37',
                    borderRadius: '10px',
                    padding: '14px 18px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        📋 DIAGNÓSTICO TÉCNICO-TÁCTICO INTEGRAL
                      </div>
                      <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>
                        Dictamen General Metodológico
                      </span>
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#1E293B', lineHeight: 1.55, fontStyle: playerToPrint.observacionesTecnicas ? 'normal' : 'italic' }}>
                      {playerToPrint.observacionesTecnicas || 'Sin observaciones técnicas generales registradas en el expediente del jugador.'}
                    </div>
                  </div>

                  {/* 4. BITÁCORA DE CAMPO: EVALUACIONES EN SESIÓN */}
                  {sessionNotes.length > 0 && (
                    <div style={{
                      background: '#F8FAFC',
                      border: '1.5px solid #E2E8F0',
                      borderRadius: '10px',
                      padding: '14px 18px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          💬 BITÁCORA DE CAMPO: DEVOLUCIONES DEL CUERPO TÉCNICO EN SESIÓN
                        </div>
                        <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>
                          {sessionNotes.length} Registro(s) de Seguimiento
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {sessionNotes.slice(0, 3).map((obs) => (
                          <div
                            key={obs.id}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderLeft: '4px solid #10B981',
                              padding: '10px 14px',
                              borderRadius: '0 8px 8px 0',
                              fontSize: '0.82rem'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 800, marginBottom: '3px', fontSize: '0.75rem' }}>
                              <span>👤 PROF. {String(obs.autorNombre || 'Entrenador').toUpperCase()} {obs.modalidad ? `• SESIÓN ${obs.modalidad}` : ''}</span>
                              <span style={{ color: '#64748B' }}>📅 {obs.fecha}</span>
                            </div>
                            <div style={{ color: '#0F172A', fontStyle: 'italic', lineHeight: 1.45 }}>
                              "{obs.texto}"
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. VALIDACIÓN OFICIAL Y RÚBRICAS METODOLÓGICAS */}
                  <div style={{
                    marginTop: '4px',
                    padding: '12px 16px',
                    background: '#FFFFFF',
                    border: '1px dashed #CBD5E1',
                    borderRadius: '10px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '20px'
                  }}>
                    <div style={{ borderTop: '1.5px solid #94A3B8', paddingTop: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em' }}>
                        DIRECCIÓN METODOLÓGICA Y RENDIMIENTO
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#64748B', marginTop: '2px' }}>
                        Parla Sport Training Academy • Certificación Oficial
                      </div>
                    </div>

                    <div style={{ borderTop: '1.5px solid #94A3B8', paddingTop: '6px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#0F172A', letterSpacing: '0.04em' }}>
                        COORDINACIÓN TÉCNICA DE CAMPO
                      </div>
                      <div style={{ fontSize: '0.66rem', color: '#64748B', marginTop: '2px' }}>
                        Firma y Aval del Cuerpo de Entrenadores
                      </div>
                    </div>
                  </div>

                </div>

                {/* ─── PIE DE PÁGINA MEMBRETADO OFICIAL AZUL MARINO ─── */}
                <div style={{
                  background: 'linear-gradient(135deg, #030712 0%, #08132B 50%, #0C1E47 100%)',
                  color: '#94A3B8',
                  padding: '12px 24px',
                  borderTop: '3px solid #D4AF37',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.72rem'
                }}>
                  <span style={{ color: '#E2E8F0', fontWeight: 600 }}>
                    🏆 <strong>Parla Sport Training Academy</strong> • Sistema de Evaluación y Desarrollo Deportivo
                  </span>
                  <span style={{ color: '#FBBF24', fontWeight: 800, letterSpacing: '0.06em' }}>
                    DOCUMENTO OFICIAL AUDITADO
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      ) : null,
      document.body
    )}

    {/* Estilos para Vista de Impresión del Perfil */}
    <style>{`
      @media screen {
        .printable-profile-portal {
          display: none !important;
        }
      }

      @media print {
        html, body {
          overflow: visible !important;
          height: auto !important;
          min-height: 100% !important;
          background: #FFFFFF !important;
        }

        body * {
          visibility: hidden;
        }

        .no-print, .modal-overlay-wrapper, .glass-modal, #root {
          display: none !important;
        }

        .printable-profile-portal, .printable-profile-portal * {
          visibility: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        .printable-profile-portal {
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #FFFFFF !important;
        }

        @page {
          size: A4 portrait;
          margin: 8mm;
        }
      }
    `}</style>

    </div>
  );
};

export default PlayerManager;
