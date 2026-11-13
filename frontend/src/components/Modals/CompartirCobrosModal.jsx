import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Share2,
  Calendar,
  Users,
  UserPlus,
  FileDown,
  Check,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  RotateCcw
} from 'lucide-react';
import { dbService } from '../../services/db.js';
import {
  formatColones,
  formatISODateToFullSpanish,
  formatDateToISO,
  getCostaRicaNow
} from '../../utils/formatters.js';
import { generarPdfCobrosDia } from '../../utils/pdfCobrosGenerator.js';

export function CompartirCobrosModal({
  isOpen,
  onClose,
  initialDateISO,
  onCobrosCompartidos,
  onShowAlert
}) {
  // Helper para alertar al usuario tolerando tanto objetos como argumentos posicionales
  const triggerAlert = useCallback((titleOrObj, message, buttonText = 'Entendido', iconType = 'alert') => {
    if (!onShowAlert) return;
    if (typeof titleOrObj === 'object' && titleOrObj !== null) {
      onShowAlert(titleOrObj);
    } else {
      onShowAlert({
        title: titleOrObj || 'Aviso',
        message: message || '',
        buttonText,
        iconType
      });
    }
  }, [onShowAlert]);

  // 1. Fechas relativas en tiempo real (Hoy y Mañana)
  const todayISO = useMemo(() => {
    return formatDateToISO(getCostaRicaNow());
  }, []);

  const tomorrowISO = useMemo(() => {
    const d = getCostaRicaNow();
    d.setDate(d.getDate() + 1);
    return formatDateToISO(d);
  }, []);

  // 2. Estado de fecha seleccionada y Calendario Compacto
  const [fechaSeleccionada, setFechaSeleccionada] = useState(initialDateISO || todayISO);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef(null);

  // Fecha para navegar meses en el calendario compacto
  const [calendarViewDate, setCalendarViewDate] = useState(() => {
    const base = initialDateISO || todayISO;
    const parts = base.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
  });

  // Sincronizar fecha al abrir
  useEffect(() => {
    if (isOpen && initialDateISO) {
      setFechaSeleccionada(initialDateISO);
      const parts = initialDateISO.split('-');
      if (parts.length === 3) {
        setCalendarViewDate(new Date(Number(parts[0]), Number(parts[1]) - 1, 1));
      }
    }
  }, [isOpen, initialDateISO]);

  // Sincronizar mes visible al cambiar la fecha seleccionada
  useEffect(() => {
    if (fechaSeleccionada) {
      const parts = fechaSeleccionada.split('-');
      if (parts.length === 3) {
        setCalendarViewDate(new Date(Number(parts[0]), Number(parts[1]) - 1, 1));
      }
    }
  }, [fechaSeleccionada]);

  // Cerrar popover del calendario compacto al hacer clic fuera
  useEffect(() => {
    if (!isCalendarOpen) return;
    const handleClickOutside = (e) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarOpen]);

  // Formato numérico de fecha corta DD/MM/YYYY
  const fechaCortaDisplay = useMemo(() => {
    if (!fechaSeleccionada) return '';
    const parts = fechaSeleccionada.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return fechaSeleccionada;
  }, [fechaSeleccionada]);

  // Generar la matriz completa de días para el calendario compacto (Lunes a Domingo)
  const calendarDays = useMemo(() => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Domingo, 1 = Lunes
    const startingCol = (firstDayIndex + 6) % 7; // 0 = Lunes, ..., 6 = Domingo

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Días del mes anterior para rellenar la primera fila
    for (let i = startingCol - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      days.push({
        day: dayNum,
        iso: formatDateToISO(prevDate),
        isCurrentMonth: false
      });
    }

    // Días del mes en curso
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const iso = `${year}-${mm}-${dd}`;
      days.push({
        day,
        iso,
        isCurrentMonth: true
      });
    }

    // Días del mes siguiente para completar la cuadrícula de 7 columnas
    const totalSlots = Math.ceil(days.length / 7) * 7;
    const remaining = totalSlots - days.length;
    for (let day = 1; day <= remaining; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({
        day,
        iso: formatDateToISO(nextDate),
        isCurrentMonth: false
      });
    }

    return days;
  }, [calendarViewDate]);

  const calendarMonthTitle = useMemo(() => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${meses[calendarViewDate.getMonth()]} ${calendarViewDate.getFullYear()}`;
  }, [calendarViewDate]);

  // 3. Pestaña de acción activa: 'ENVIAR_PERSONA' | 'DESCARGAR_PDF'
  const [tabAccion, setTabAccion] = useState('ENVIAR_PERSONA');

  // 4. Estados de carga y datos de cobros para la fecha
  const [isLoadingCobros, setIsLoadingCobros] = useState(false);
  const [cobrosDelDia, setCobrosDelDia] = useState([]);
  const [selectedAgendaIds, setSelectedAgendaIds] = useState(new Set());
  const [isClientListExpanded, setIsClientListExpanded] = useState(false);

  // 5. Estados para contactos y búsqueda de personas
  const [misPersonas, setMisPersonas] = useState([]);
  const [personaSeleccionadaId, setPersonaSeleccionadaId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);

  // Toggle de selección y deselección de una persona vinculada
  const handleTogglePersona = (personaId) => {
    setPersonaSeleccionadaId((prevId) => (prevId === personaId ? null : personaId));
  };

  // 6. Formulario para agregar nueva persona
  const [isAddingNewPerson, setIsAddingNewPerson] = useState(false);
  const [newPersonNombre, setNewPersonNombre] = useState('');
  const [newPersonUsuario, setNewPersonUsuario] = useState('');
  const [isSavingPerson, setIsSavingPerson] = useState(false);

  // 7. Estado de envío o proceso
  const [isSharing, setIsSharing] = useState(false);
  const [isUnsharing, setIsUnsharing] = useState(false);

  // Cargar cobros de la fecha seleccionada
  const loadCobrosFecha = useCallback(async (fecha) => {
    setIsLoadingCobros(true);
    try {
      const res = await dbService.getResumenDiaCompartir(fecha);
      if (res && res.success && Array.isArray(res.cobros)) {
        setCobrosDelDia(res.cobros);
        // Por defecto todos los cobros seleccionados
        setSelectedAgendaIds(new Set(res.cobros.map((c) => c.id)));
      } else {
        setCobrosDelDia([]);
        setSelectedAgendaIds(new Set());
      }
    } catch (err) {
      console.error('Error cargando cobros para compartir:', err);
      setCobrosDelDia([]);
      setSelectedAgendaIds(new Set());
    } finally {
      setIsLoadingCobros(false);
    }
  }, []);

  // Cargar lista de contactos vinculados (sin forzar preselección automática)
  const loadPersonas = useCallback(async (queryStr = '') => {
    try {
      const res = await dbService.getPersonasCompartir(queryStr);
      if (res && res.success) {
        setMisPersonas(Array.isArray(res.misPersonas) ? res.misPersonas : []);
        setResultadosBusqueda(Array.isArray(res.resultadosBusqueda) ? res.resultadosBusqueda : []);
      }
    } catch (err) {
      console.error('Error cargando personas:', err);
    }
  }, []);

  // Efecto al abrir el modal o cambiar fecha
  useEffect(() => {
    if (!isOpen) return;
    loadCobrosFecha(fechaSeleccionada);
    loadPersonas('');
  }, [isOpen, fechaSeleccionada, loadCobrosFecha, loadPersonas]);

  // Búsqueda con debounce para personas
  useEffect(() => {
    if (!isOpen) return;
    if (!searchTerm.trim()) {
      setResultadosBusqueda([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await dbService.getPersonasCompartir(searchTerm.trim());
        if (res && res.success) {
          setResultadosBusqueda(res.resultadosBusqueda || []);
        }
      } catch (e) {
        console.error('Error buscando personas:', e);
      } finally {
        setIsSearching(false);
      }
    }, 280);
    return () => clearTimeout(timer);
  }, [isOpen, searchTerm]);

  // Manejo de tecla Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Alternar selección de un cobro específico
  const toggleSelectCobro = (id) => {
    setSelectedAgendaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Alternar todos los cobros
  const toggleSelectAll = () => {
    if (selectedAgendaIds.size === cobrosDelDia.length) {
      setSelectedAgendaIds(new Set());
    } else {
      setSelectedAgendaIds(new Set(cobrosDelDia.map((c) => c.id)));
    }
  };

  // Cobros efectivamente seleccionados
  const cobrosSeleccionados = useMemo(() => {
    return cobrosDelDia.filter((c) => selectedAgendaIds.has(c.id));
  }, [cobrosDelDia, selectedAgendaIds]);

  const montoTotalSeleccionado = useMemo(() => {
    return cobrosSeleccionados.reduce((sum, c) => sum + Number(c.monto_cuota || 0), 0);
  }, [cobrosSeleccionados]);

  // Persona actualmente seleccionada en el selector
  const personaSeleccionada = useMemo(() => {
    return (
      misPersonas.find((p) => p.usuario_id === personaSeleccionadaId) ||
      resultadosBusqueda.find((p) => p.usuario_id === personaSeleccionadaId) ||
      null
    );
  }, [misPersonas, resultadosBusqueda, personaSeleccionadaId]);

  // Verificar si para la fecha ya hay cobros asignados a la persona seleccionada
  const cobrosYaCompartidosConPersona = useMemo(() => {
    if (!personaSeleccionadaId) return [];
    return cobrosDelDia.filter((c) => c.compartido_con_usuario_id === personaSeleccionadaId);
  }, [cobrosDelDia, personaSeleccionadaId]);

  // Registrar nueva persona y vincularla
  const handleGuardarNuevaPersona = async (e) => {
    e.preventDefault();
    if (!newPersonNombre.trim() || !newPersonUsuario.trim()) {
      triggerAlert('Datos incompletos', 'Indica el nombre completo y el nombre de usuario de la persona.', 'Entendido', 'alert');
      return;
    }
    setIsSavingPerson(true);
    try {
      const res = await dbService.agregarPersonaCompartir({
        nombre_completo: newPersonNombre.trim(),
        usuario: newPersonUsuario.trim()
      });
      if (res && res.success && res.persona) {
        await loadPersonas('');
        setPersonaSeleccionadaId(res.persona.usuario_id);
        setIsAddingNewPerson(false);
        setNewPersonNombre('');
        setNewPersonUsuario('');
      } else {
        triggerAlert('Atención', res.userMessage || 'No se pudo vincular a la persona.', 'Entendido', 'alert');
      }
    } catch (err) {
      triggerAlert('Atención', err.userMessage || 'No se pudo vincular a la persona.', 'Entendido', 'alert');
    } finally {
      setIsSavingPerson(false);
    }
  };

  // Vincular persona de los resultados de búsqueda
  const handleVincularDesdeBusqueda = async (usuarioId) => {
    try {
      const res = await dbService.agregarPersonaCompartir({
        contacto_usuario_id: usuarioId
      });
      if (res && res.success) {
        await loadPersonas('');
        setPersonaSeleccionadaId(usuarioId);
        setSearchTerm('');
      }
    } catch (err) {
      triggerAlert('Atención', err.userMessage || 'No se pudo vincular a la persona.', 'Entendido', 'alert');
    }
  };

  // Acción principal: Compartir los cobros seleccionados
  const handleCompartirCobros = async () => {
    if (!personaSeleccionadaId) {
      triggerAlert('Selecciona una persona', 'Debes seleccionar a la persona que recibirá los cobros.', 'Entendido', 'alert');
      return;
    }
    if (selectedAgendaIds.size === 0) {
      triggerAlert('Sin cobros seleccionados', 'Selecciona al menos un cliente de la lista para compartir.', 'Entendido', 'alert');
      return;
    }

    setIsSharing(true);
    try {
      const idsArray = Array.from(selectedAgendaIds);
      const res = await dbService.compartirCobrosDia({
        destinatario_id: personaSeleccionadaId,
        fecha_cobro: fechaSeleccionada,
        agenda_ids: idsArray
      });

      if (res && res.success) {
        await loadCobrosFecha(fechaSeleccionada);
        if (onCobrosCompartidos) {
          onCobrosCompartidos(fechaSeleccionada, personaSeleccionadaId);
        }
        triggerAlert(
          'Cobros compartidos',
          `Se compartieron con éxito ${res.cantidad_cobros} cobros con ${res.destinatario?.nombre_completo || 'la persona seleccionada'}.`,
          'Listo',
          'success'
        );
        onClose();
      } else {
        triggerAlert('Atención', res.userMessage || 'No se pudieron compartir los cobros.', 'Entendido', 'alert');
      }
    } catch (err) {
      triggerAlert('Atención', err.userMessage || 'No se pudieron compartir los cobros.', 'Entendido', 'alert');
    } finally {
      setIsSharing(false);
    }
  };

  // Deshacer compartir de esta fecha
  const handleRetomarCobros = async () => {
    if (!personaSeleccionadaId) return;
    setIsUnsharing(true);
    try {
      const res = await dbService.dejarDeCompartirDia({
        fecha_cobro: fechaSeleccionada,
        destinatario_id: personaSeleccionadaId
      });
      if (res && res.success) {
        await loadCobrosFecha(fechaSeleccionada);
        if (onCobrosCompartidos) {
          onCobrosCompartidos(fechaSeleccionada);
        }
        triggerAlert('Cobros retomados', 'Has retomado los cobros de esta fecha exitosamente.', 'Listo', 'success');
      }
    } catch (err) {
      triggerAlert('Atención', err.userMessage || 'No se pudieron retomar los cobros.', 'Entendido', 'alert');
    } finally {
      setIsUnsharing(false);
    }
  };

  // Descargar PDF del día
  const handleDescargarPdf = () => {
    if (cobrosSeleccionados.length === 0) {
      triggerAlert('Sin cobros seleccionados', 'Selecciona al menos un cobro para generar el documento PDF.', 'Entendido', 'alert');
      return;
    }

    const fechaLegible = formatISODateToFullSpanish(fechaSeleccionada);
    generarPdfCobrosDia({
      fechaTexto: fechaLegible,
      fechaISO: fechaSeleccionada,
      cobros: cobrosSeleccionados,
      montoTotal: montoTotalSeleccionado,
      nombreCobrador: personaSeleccionada?.nombre_completo || 'Aureus Manager'
    });
  };

  if (!isOpen) return null;

  const fechaTextoActual = formatISODateToFullSpanish(fechaSeleccionada);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(10, 15, 30, 0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '16px 12px',
        overflowY: 'auto',
        fontFamily: 'inherit'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--aureus-bg-surface)',
          border: '1px solid var(--aureus-border-subtle)',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          marginTop: 'env(safe-area-inset-top, 10px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ENCABEZADO SUPERIOR AUREUS MANAGER */}
        <div
          style={{
            background: 'var(--aureus-bg-surface)',
            backgroundColor: 'var(--aureus-bg-surface)',
            padding: '18px 20px',
            color: 'var(--aureus-text-primary)',
            position: 'relative',
            borderBottom: '1px solid var(--aureus-border-subtle)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--aureus-gold-light)',
                  border: '1px solid var(--aureus-border-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--aureus-gold-text)'
                }}
              >
                <Share2 size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    margin: 0,
                    lineHeight: 1.2,
                    color: 'var(--aureus-text-primary)',
                    letterSpacing: '-0.3px'
                  }}
                >
                  Compartir cobros del día
                </h2>
                <p
                  style={{
                    fontSize: '12px',
                    margin: '3px 0 0 0',
                    color: 'var(--aureus-text-muted)',
                    fontWeight: 500
                  }}
                >
                  {fechaTextoActual}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                backgroundColor: 'var(--aureus-bg-elevated)',
                border: '1px solid var(--aureus-border-subtle)',
                color: 'var(--aureus-text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              aria-label="Cerrar ventana"
            >
              <X size={18} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* CONTENIDO DESPLAZABLE DEL MODAL */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: 'var(--aureus-bg-muted)'
          }}
        >
          {/* SECCIÓN 1: SELECTOR RÁPIDO DE FECHA */}
          <div
            style={{
              backgroundColor: 'var(--aureus-bg-surface)',
              borderRadius: '14px',
              padding: '12px 14px',
              border: '1px solid var(--aureus-border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--aureus-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Fecha a compartir
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Botón rápido: Hoy */}
              <button
                type="button"
                onClick={() => setFechaSeleccionada(todayISO)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: fechaSeleccionada === todayISO ? 800 : 600,
                  backgroundColor: fechaSeleccionada === todayISO ? '#B69A55' : 'var(--aureus-bg-elevated)',
                  color: fechaSeleccionada === todayISO ? '#FFFFFF' : 'var(--aureus-text-primary)',
                  border: fechaSeleccionada === todayISO ? '1px solid #B69A55' : '1px solid var(--aureus-border-subtle)',
                  boxShadow: fechaSeleccionada === todayISO ? '0 2px 6px rgba(182, 154, 85, 0.25)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Hoy
              </button>

              {/* Botón rápido: Mañana */}
              <button
                type="button"
                onClick={() => setFechaSeleccionada(tomorrowISO)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: fechaSeleccionada === tomorrowISO ? 800 : 600,
                  backgroundColor: fechaSeleccionada === tomorrowISO ? '#B69A55' : 'var(--aureus-bg-elevated)',
                  color: fechaSeleccionada === tomorrowISO ? '#FFFFFF' : 'var(--aureus-text-primary)',
                  border: fechaSeleccionada === tomorrowISO ? '1px solid #B69A55' : '1px solid var(--aureus-border-subtle)',
                  boxShadow: fechaSeleccionada === tomorrowISO ? '0 2px 6px rgba(182, 154, 85, 0.25)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Mañana
              </button>

              {/* Selector de Fecha con Calendario Compacto Propio */}
              <div ref={calendarRef} style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen((prev) => !prev)}
                  style={{
                    width: '100%',
                    height: '40px',
                    borderRadius: '12px',
                    border: '1px solid var(--aureus-border-subtle)',
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    outline: 'none',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    transition: 'border-color 0.15s ease'
                  }}
                  aria-label="Seleccionar fecha"
                >
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--aureus-text-primary)', letterSpacing: '0.02em' }}>
                    {fechaCortaDisplay}
                  </span>
                  <Calendar size={16} color="var(--aureus-text-primary)" />
                </button>

                {/* Popover de Calendario Compacto */}
                {isCalendarOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      zIndex: 50,
                      width: '260px',
                      backgroundColor: 'var(--aureus-bg-surface)',
                      borderRadius: '16px',
                      border: '1px solid var(--aureus-border-subtle)',
                      boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.35)',
                      padding: '12px',
                      userSelect: 'none'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Cabecera del calendario */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--aureus-text-primary)' }}>
                        {calendarMonthTitle}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            border: '1px solid var(--aureus-border-subtle)',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--aureus-text-secondary)'
                          }}
                          aria-label="Mes anterior"
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            border: '1px solid var(--aureus-border-subtle)',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--aureus-text-secondary)'
                          }}
                          aria-label="Mes siguiente"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Días de la semana */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '2px',
                        marginBottom: '4px'
                      }}
                    >
                      {['LU', 'MA', 'MI', 'JU', 'VI', 'SÁ', 'DO'].map((d) => (
                        <div
                          key={d}
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            color: 'var(--aureus-text-muted)',
                            textAlign: 'center',
                            padding: '4px 0'
                          }}
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                    {/* Matriz de días */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '3px'
                      }}
                    >
                      {calendarDays.map((d, idx) => {
                        const isSelected = d.iso === fechaSeleccionada;
                        const isToday = d.iso === todayISO;

                        let bg = 'transparent';
                        let textColor = d.isCurrentMonth ? 'var(--aureus-text-primary)' : 'var(--aureus-text-muted)';
                        let opacityVal = d.isCurrentMonth ? 1 : 0.45;
                        let border = 'none';

                        if (isSelected) {
                          bg = '#B69A55';
                          textColor = '#101C2C';
                          opacityVal = 1;
                          border = '1.5px solid #9E8342';
                        } else if (isToday) {
                          bg = 'var(--aureus-green-light)';
                          textColor = 'var(--aureus-green-text)';
                          opacityVal = 1;
                          border = '1px solid var(--aureus-green-border)';
                        }

                        return (
                          <button
                            key={`${d.iso}-${idx}`}
                            type="button"
                            onClick={() => {
                              setFechaSeleccionada(d.iso);
                              setIsCalendarOpen(false);
                            }}
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: isSelected ? 900 : isToday ? 800 : 700,
                              backgroundColor: bg,
                              color: textColor,
                              opacity: opacityVal,
                              border,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              margin: '0 auto',
                              transition: 'all 0.12s ease'
                            }}
                          >
                            {d.day}
                          </button>
                        );
                      })}
                    </div>

                    {/* Pie del calendario compacto */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid var(--aureus-border-subtle)'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setFechaSeleccionada(todayISO);
                          const parts = todayISO.split('-');
                          if (parts.length === 3) {
                            setCalendarViewDate(new Date(Number(parts[0]), Number(parts[1]) - 1, 1));
                          }
                          setIsCalendarOpen(false);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px 4px',
                          fontSize: '11px',
                          fontWeight: 800,
                          color: 'var(--aureus-gold-text)',
                          cursor: 'pointer'
                        }}
                      >
                        Hoy
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCalendarOpen(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '2px 4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--aureus-text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* TARJETAS RESUMEN DE COBROS DEL DÍA SELECCIONADO */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                marginTop: '4px'
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--aureus-bg-elevated)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--aureus-border-subtle)'
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--aureus-text-muted)', fontWeight: 600, display: 'block' }}>
                  Clientes pendientes
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--aureus-text-primary)', display: 'block', marginTop: '2px' }}>
                  {isLoadingCobros ? '...' : `${cobrosDelDia.length} clientes`}
                </span>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--aureus-bg-elevated)',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--aureus-border-subtle)'
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--aureus-text-muted)', fontWeight: 600, display: 'block' }}>
                  Total por cobrar
                </span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--aureus-green-text)', display: 'block', marginTop: '2px' }}>
                  {isLoadingCobros ? '...' : formatColones(montoTotalSeleccionado)}
                </span>
              </div>
            </div>

            {/* LISTA DESPLEGABLE / SELECCIONABLE DE CLIENTES */}
            {cobrosDelDia.length > 0 && (
              <div style={{ marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsClientListExpanded(!isClientListExpanded)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 4px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--aureus-gold-text)',
                    cursor: 'pointer'
                  }}
                >
                  <span>
                    {isClientListExpanded ? 'Ocultar lista de clientes' : `Ver los ${cobrosDelDia.length} clientes a cobrar`}
                  </span>
                  {isClientListExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>

                {isClientListExpanded && (
                  <div
                    style={{
                      maxHeight: '180px',
                      overflowY: 'auto',
                      padding: '8px 4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      borderTop: '1px solid var(--aureus-border-subtle)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--aureus-text-muted)' }}>
                        Seleccionados: {selectedAgendaIds.size} de {cobrosDelDia.length}
                      </span>
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--aureus-gold-text)',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        {selectedAgendaIds.size === cobrosDelDia.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </button>
                    </div>

                    {cobrosDelDia.map((c) => {
                      const isChecked = selectedAgendaIds.has(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleSelectCobro(c.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            backgroundColor: isChecked ? 'var(--aureus-green-light)' : 'var(--aureus-bg-elevated)',
                            border: isChecked ? '1px solid var(--aureus-green-border)' : '1px solid var(--aureus-border-subtle)',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isChecked ? (
                              <CheckSquare size={16} color="var(--aureus-green-text)" strokeWidth={2.4} />
                            ) : (
                              <Square size={16} color="var(--aureus-text-muted)" />
                            )}
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--aureus-text-primary)' }}>
                                {c.nombre_completo || c.nombre}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--aureus-text-muted)' }}>
                                {c.ubicacion || 'Sin ubicación'}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--aureus-green-text)' }}>
                            {formatColones(c.monto_cuota)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: PESTAÑAS DE ACCIÓN PRINCIPAL */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              borderBottom: '1px solid var(--aureus-border-subtle)',
              paddingBottom: '8px'
            }}
          >
            <button
              type="button"
              onClick={() => setTabAccion('ENVIAR_PERSONA')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: tabAccion === 'ENVIAR_PERSONA' ? 800 : 600,
                backgroundColor: tabAccion === 'ENVIAR_PERSONA' ? '#B69A55' : 'var(--aureus-bg-surface)',
                color: tabAccion === 'ENVIAR_PERSONA' ? '#FFFFFF' : 'var(--aureus-text-secondary)',
                border: tabAccion === 'ENVIAR_PERSONA' ? '1px solid #B69A55' : '1px solid var(--aureus-border-subtle)',
                boxShadow: tabAccion === 'ENVIAR_PERSONA' ? '0 2px 6px rgba(182, 154, 85, 0.25)' : 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={15} />
              <span>Enviar a persona</span>
            </button>

            <button
              type="button"
              onClick={() => setTabAccion('DESCARGAR_PDF')}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: tabAccion === 'DESCARGAR_PDF' ? 800 : 600,
                backgroundColor: tabAccion === 'DESCARGAR_PDF' ? '#B69A55' : 'var(--aureus-bg-surface)',
                color: tabAccion === 'DESCARGAR_PDF' ? '#FFFFFF' : 'var(--aureus-text-secondary)',
                border: tabAccion === 'DESCARGAR_PDF' ? '1px solid #B69A55' : '1px solid var(--aureus-border-subtle)',
                boxShadow: tabAccion === 'DESCARGAR_PDF' ? '0 2px 6px rgba(182, 154, 85, 0.25)' : 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <FileDown size={15} />
              <span>Descargar PDF</span>
            </button>
          </div>

          {/* ================================================================= */}
          {/* PESTAÑA 1: ENVIAR A PERSONA */}
          {/* ================================================================= */}
          {tabAccion === 'ENVIAR_PERSONA' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Barra superior de contactos: Buscador y Botón Agregar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  className="cf-search-pill"
                  style={{
                    position: 'relative',
                    flex: 1,
                    borderRadius: '10px',
                    border: '1px solid var(--aureus-border-subtle)',
                    backgroundColor: 'var(--aureus-bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.16s ease, box-shadow 0.16s ease'
                  }}
                >
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--aureus-text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, usuario o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 32px',
                      borderRadius: '10px',
                      border: 'none',
                      outline: 'none',
                      boxShadow: 'none',
                      fontSize: '12px',
                      color: 'var(--aureus-text-primary)',
                      backgroundColor: 'transparent'
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingNewPerson(!isAddingNewPerson)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    backgroundColor: isAddingNewPerson ? 'var(--aureus-bg-elevated)' : '#B69A55',
                    color: isAddingNewPerson ? 'var(--aureus-text-primary)' : '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 800,
                    border: isAddingNewPerson ? '1px solid var(--aureus-border-subtle)' : 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <UserPlus size={15} />
                  <span>{isAddingNewPerson ? 'Cancelar' : 'Agregar persona'}</span>
                </button>
              </div>

              {/* MINI FORMULARIO PARA AGREGAR NUEVA PERSONA */}
              {isAddingNewPerson && (
                <form
                  onSubmit={handleGuardarNuevaPersona}
                  style={{
                    backgroundColor: 'var(--aureus-bg-surface)',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--aureus-border-gold)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aureus-gold-text)', textTransform: 'uppercase' }}>
                    Registrar y vincular nueva persona
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--aureus-text-secondary)', display: 'block', marginBottom: '3px' }}>
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Mario Solís Gómez"
                        value={newPersonNombre}
                        onChange={(e) => setNewPersonNombre(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--aureus-border-subtle)',
                          backgroundColor: 'var(--aureus-bg-elevated)',
                          color: 'var(--aureus-text-primary)',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--aureus-text-secondary)', display: 'block', marginBottom: '3px' }}>
                        Nombre de usuario
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. mariosolis"
                        value={newPersonUsuario}
                        onChange={(e) => setNewPersonUsuario(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--aureus-border-subtle)',
                          backgroundColor: 'var(--aureus-bg-elevated)',
                          color: 'var(--aureus-text-primary)',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="submit"
                      disabled={isSavingPerson}
                      style={{
                        padding: '7px 14px',
                        backgroundColor: '#B69A55',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 800,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {isSavingPerson ? 'Guardando...' : 'Guardar y vincular'}
                    </button>
                  </div>
                </form>
              )}

              {/* LISTA DE RESULTADOS DE BÚSQUEDA */}
              {searchTerm.trim() && resultadosBusqueda.length > 0 && (
                <div
                  style={{
                    backgroundColor: 'var(--aureus-bg-surface)',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid var(--aureus-border-subtle)'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--aureus-text-muted)', display: 'block', marginBottom: '6px' }}>
                    Resultados de búsqueda
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                    {resultadosBusqueda.map((res) => {
                      const isSelected = personaSeleccionadaId === res.usuario_id;
                      return (
                        <div
                          key={res.usuario_id}
                          onClick={() => handleTogglePersona(res.usuario_id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? 'var(--aureus-gold-light)' : 'var(--aureus-bg-elevated)',
                            border: isSelected ? '1.5px solid #B69A55' : '1px solid var(--aureus-border-subtle)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--aureus-text-primary)' }}>
                              {res.nombre_completo}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--aureus-text-muted)' }}>
                              @{res.usuario} · {res.codigo_id}
                            </div>
                          </div>
                          {!res.ya_vinculado ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVincularDesdeBusqueda(res.usuario_id);
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--aureus-gold-soft)',
                                color: 'var(--aureus-gold-text)',
                                border: '1px solid var(--aureus-border-gold)',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Vincular
                            </button>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--aureus-green-text)', fontWeight: 700 }}>
                                Vinculado
                              </span>
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  border: isSelected ? '1.5px solid #B69A55' : '2px solid var(--aureus-border-subtle)',
                                  backgroundColor: isSelected ? '#B69A55' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {isSelected && <Check size={11} strokeWidth={3} color="#ffffff" />}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LISTA DE PERSONAS VINCULADAS */}
              <div
                style={{
                  backgroundColor: 'var(--aureus-bg-surface)',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--aureus-border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--aureus-text-muted)', textTransform: 'uppercase' }}>
                    Personas vinculadas para cobrar
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--aureus-text-muted)' }}>
                    {misPersonas.length} en la lista
                  </span>
                </div>

                {misPersonas.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--aureus-text-muted)', fontSize: '12.5px' }}>
                    Aún no has vinculado personas. Toca el botón <strong>Agregar persona</strong> para dar de alta a un cobrador o compañero.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {misPersonas.map((p) => {
                      const isSelected = personaSeleccionadaId === p.usuario_id;
                      const yaCompartidos = cobrosDelDia.filter((c) => c.compartido_con_usuario_id === p.usuario_id);

                      return (
                        <div
                          key={p.contacto_id || p.usuario_id}
                          onClick={() => handleTogglePersona(p.usuario_id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            backgroundColor: isSelected ? 'var(--aureus-gold-light)' : 'var(--aureus-bg-elevated)',
                            border: isSelected ? '1.5px solid #B69A55' : '1px solid var(--aureus-border-subtle)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: isSelected ? '#B69A55' : 'var(--aureus-bg-muted)',
                                color: isSelected ? '#FFFFFF' : 'var(--aureus-text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 800,
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {(p.nombre_completo || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontSize: '12.5px', fontWeight: 800, color: 'var(--aureus-text-primary)' }}>
                                {p.nombre_completo}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--aureus-text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span>@{p.usuario}</span>
                                <span>·</span>
                                <span style={{ fontWeight: 700, color: 'var(--aureus-gold-text)' }}>{p.codigo_id}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {yaCompartidos.length > 0 && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: 'var(--aureus-green-text)',
                                  backgroundColor: 'var(--aureus-green-light)',
                                  padding: '2px 7px',
                                  borderRadius: '6px'
                                }}
                              >
                                {yaCompartidos.length} cobros asignados
                              </span>
                            )}
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                border: isSelected ? '1.5px solid #B69A55' : '2px solid var(--aureus-border-subtle)',
                                backgroundColor: isSelected ? '#B69A55' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} color="#ffffff" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AVISO SI YA TIENE COBROS ASIGNADOS Y BOTÓN DE RETOMAR */}
              {cobrosYaCompartidosConPersona.length > 0 && (
                <div
                  style={{
                    backgroundColor: 'var(--aureus-gold-light)',
                    border: '1px solid var(--aureus-border-gold)',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} color="var(--aureus-gold-text)" />
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--aureus-gold-text)' }}>
                      {cobrosYaCompartidosConPersona.length} cobros de esta fecha ya están asignados a esta persona
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRetomarCobros}
                    disabled={isUnsharing}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--aureus-bg-surface)',
                      border: '1px solid var(--aureus-border-gold)',
                      color: 'var(--aureus-gold-text)',
                      fontSize: '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>{isUnsharing ? 'Retomando...' : 'Retomar cobros'}</span>
                  </button>
                </div>
              )}

              {/* BOTÓN PRINCIPAL: COMPARTIR X COBROS */}
              <button
                type="button"
                onClick={handleCompartirCobros}
                disabled={isSharing || !personaSeleccionadaId || selectedAgendaIds.size === 0}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  backgroundColor: !personaSeleccionadaId || selectedAgendaIds.size === 0 ? 'var(--aureus-text-muted)' : '#B69A55',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  border: !personaSeleccionadaId || selectedAgendaIds.size === 0 ? 'none' : '1px solid #B69A55',
                  cursor: !personaSeleccionadaId || selectedAgendaIds.size === 0 ? 'not-allowed' : 'pointer',
                  opacity: !personaSeleccionadaId || selectedAgendaIds.size === 0 ? 0.65 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: !personaSeleccionadaId || selectedAgendaIds.size === 0 ? 'none' : '0 4px 12px rgba(182, 154, 85, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Share2 size={16} strokeWidth={2.4} />
                <span>
                  {isSharing
                    ? 'Compartiendo cobros...'
                    : !personaSeleccionadaId
                    ? 'Selecciona una persona para compartir'
                    : selectedAgendaIds.size === 0
                    ? 'Selecciona al menos un cobro'
                    : `Compartir ${selectedAgendaIds.size} cobros con ${personaSeleccionada?.nombre_completo || 'persona'}`}
                </span>
              </button>
            </div>
          )}

          {/* ================================================================= */}
          {/* PESTAÑA 2: DESCARGAR ARCHIVO PDF */}
          {/* ================================================================= */}
          {tabAccion === 'DESCARGAR_PDF' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  backgroundColor: 'var(--aureus-bg-surface)',
                  padding: '16px',
                  borderRadius: '14px',
                  border: '1px solid var(--aureus-border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--aureus-gold-soft)',
                      color: 'var(--aureus-gold-text)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FileDown size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: 'var(--aureus-text-primary)' }}>
                      Vista previa del documento PDF
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--aureus-text-muted)' }}>
                      Hoja de cobros ejecutiva en formato horizontal para consultar o llevar en digital
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12px',
                    color: 'var(--aureus-text-secondary)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--aureus-text-muted)' }}>Fecha del documento:</span>
                    <strong style={{ color: 'var(--aureus-text-primary)' }}>{fechaTextoActual}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--aureus-text-muted)' }}>Clientes a incluir:</span>
                    <strong style={{ color: 'var(--aureus-text-primary)' }}>{cobrosSeleccionados.length} clientes</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--aureus-text-muted)' }}>Total a cobrar:</span>
                    <strong style={{ color: 'var(--aureus-green-text)' }}>{formatColones(montoTotalSeleccionado)}</strong>
                  </div>
                  <div style={{ borderTop: '1px dashed var(--aureus-border-subtle)', paddingTop: '6px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--aureus-text-muted)' }}>
                      Datos incluidos por cliente: N°, Nombre completo, Cédula, Teléfono, Ubicación, Detalles y Monto a cobrar en colones.
                    </span>
                  </div>
                </div>
              </div>

              {/* BOTÓN PRINCIPAL: DESCARGAR ARCHIVO PDF */}
              <button
                type="button"
                onClick={handleDescargarPdf}
                disabled={cobrosSeleccionados.length === 0}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: '12px',
                  backgroundColor: cobrosSeleccionados.length === 0 ? 'var(--aureus-text-muted)' : '#B69A55',
                  border: cobrosSeleccionados.length === 0 ? 'none' : '1px solid #B69A55',
                  opacity: cobrosSeleccionados.length === 0 ? 0.65 : 1,
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: cobrosSeleccionados.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: cobrosSeleccionados.length === 0 ? 'none' : '0 2px 8px rgba(182, 154, 85, 0.25)',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileDown size={18} strokeWidth={2.2} />
                <span>Descargar PDF del día</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CompartirCobrosModal;
