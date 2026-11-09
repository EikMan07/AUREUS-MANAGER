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
      nombreCobrador: personaSeleccionada?.nombre_completo || 'Cobro-Firme'
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
          backgroundColor: '#ffffff',
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
        {/* ENCABEZADO SUPERIOR VERDE DÓLAR EJECUTIVO */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0A3323 0%, #1B4D37 100%)',
            padding: '18px 20px',
            color: '#ffffff',
            position: 'relative',
            borderBottom: '1px solid rgba(143, 184, 154, 0.22)',
            boxShadow: '0 4px 16px rgba(10, 51, 35, 0.14)'
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
                  backgroundColor: 'rgba(214, 231, 214, 0.12)',
                  border: '1px solid rgba(143, 184, 154, 0.28)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D6E7D6'
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
                    color: '#ffffff',
                    letterSpacing: '-0.3px'
                  }}
                >
                  Compartir cobros del día
                </h2>
                <p
                  style={{
                    fontSize: '12px',
                    margin: '3px 0 0 0',
                    color: '#94a3b8',
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
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#e2e8f0',
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
            backgroundColor: '#f8fafc'
          }}
        >
          {/* SECCIÓN 1: SELECTOR RÁPIDO DE FECHA */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '12px 14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
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
                  backgroundColor: fechaSeleccionada === todayISO ? '#0A3323' : '#f1f5f9',
                  color: fechaSeleccionada === todayISO ? '#ffffff' : '#334155',
                  border: fechaSeleccionada === todayISO ? '1px solid #1B4D37' : '1px solid #cbd5e1',
                  boxShadow: fechaSeleccionada === todayISO ? '0 2px 6px rgba(10, 51, 35, 0.18)' : 'none',
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
                  backgroundColor: fechaSeleccionada === tomorrowISO ? '#0A3323' : '#f1f5f9',
                  color: fechaSeleccionada === tomorrowISO ? '#ffffff' : '#334155',
                  border: fechaSeleccionada === tomorrowISO ? '1px solid #1B4D37' : '1px solid #cbd5e1',
                  boxShadow: fechaSeleccionada === tomorrowISO ? '0 2px 6px rgba(10, 51, 35, 0.18)' : 'none',
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
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
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
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', letterSpacing: '0.02em' }}>
                    {fechaCortaDisplay}
                  </span>
                  <Calendar size={16} color="#0f172a" />
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
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.18)',
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
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
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
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#334155'
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
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#334155'
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
                            color: '#64748b',
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
                        let textColor = d.isCurrentMonth ? '#0f172a' : '#cbd5e1';
                        let border = 'none';

                        if (isSelected) {
                          bg = '#0A3323';
                          textColor = '#ffffff';
                          border = '1px solid #1B4D37';
                        } else if (isToday) {
                          bg = '#ecfdf5';
                          textColor = '#059669';
                          border = '1px solid #10b981';
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
                              fontWeight: isSelected || isToday ? 800 : 700,
                              backgroundColor: bg,
                              color: textColor,
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
                        borderTop: '1px solid #f1f5f9'
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
                          color: '#059669',
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
                          color: '#64748b',
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
                  backgroundColor: '#f8fafc',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                  Clientes pendientes
                </span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'block', marginTop: '2px' }}>
                  {isLoadingCobros ? '...' : `${cobrosDelDia.length} clientes`}
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                  Total por cobrar
                </span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#059669', display: 'block', marginTop: '2px' }}>
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
                    color: '#0284c7',
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
                      borderTop: '1px solid #f1f5f9'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                        Seleccionados: {selectedAgendaIds.size} de {cobrosDelDia.length}
                      </span>
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#2563eb',
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
                            backgroundColor: isChecked ? '#f0fdf4' : '#f8fafc',
                            border: isChecked ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isChecked ? (
                              <CheckSquare size={16} color="#059669" strokeWidth={2.4} />
                            ) : (
                              <Square size={16} color="#94a3b8" />
                            )}
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                                {c.nombre_completo || c.nombre}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {c.ubicacion || 'Sin ubicación'}
                              </div>
                            </div>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
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
              borderBottom: '1px solid #e2e8f0',
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
                backgroundColor: tabAccion === 'ENVIAR_PERSONA' ? '#0A3323' : '#ffffff',
                color: tabAccion === 'ENVIAR_PERSONA' ? '#ffffff' : '#64748b',
                border: tabAccion === 'ENVIAR_PERSONA' ? '1px solid #1B4D37' : '1px solid #cbd5e1',
                boxShadow: tabAccion === 'ENVIAR_PERSONA' ? '0 2px 6px rgba(10, 51, 35, 0.18)' : 'none',
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
                backgroundColor: tabAccion === 'DESCARGAR_PDF' ? '#0A3323' : '#ffffff',
                color: tabAccion === 'DESCARGAR_PDF' ? '#ffffff' : '#64748b',
                border: tabAccion === 'DESCARGAR_PDF' ? '1px solid #1B4D37' : '1px solid #cbd5e1',
                boxShadow: tabAccion === 'DESCARGAR_PDF' ? '0 2px 6px rgba(10, 51, 35, 0.18)' : 'none',
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
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, usuario o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px 8px 32px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      outline: 'none',
                      backgroundColor: '#ffffff'
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
                    backgroundColor: isAddingNewPerson ? '#f1f5f9' : '#10b981',
                    color: isAddingNewPerson ? '#334155' : '#064e3b',
                    fontSize: '12px',
                    fontWeight: 800,
                    border: 'none',
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
                    backgroundColor: '#ffffff',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid #10b981',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#065f46', textTransform: 'uppercase' }}>
                    Registrar y vincular nueva persona
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
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
                          border: '1px solid #cbd5e1',
                          fontSize: '12px',
                          outline: 'none'
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '3px' }}>
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
                          border: '1px solid #cbd5e1',
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
                        backgroundColor: '#10b981',
                        color: '#064e3b',
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
                    backgroundColor: '#ffffff',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '6px' }}>
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
                            backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                            border: isSelected ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                              {res.nombre_completo}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
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
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                border: 'none',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Vincular
                            </button>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                                Vinculado
                              </span>
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  border: isSelected ? '1.5px solid #10b981' : '2px solid #cbd5e1',
                                  backgroundColor: isSelected ? '#10b981' : 'transparent',
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
                  backgroundColor: '#ffffff',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Personas vinculadas para cobrar
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    {misPersonas.length} en la lista
                  </span>
                </div>

                {misPersonas.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
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
                            backgroundColor: isSelected ? '#ecfdf5' : '#ffffff',
                            border: isSelected ? '1.5px solid #10b981' : '1px solid #e2e8f0',
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
                                backgroundColor: isSelected ? '#10b981' : '#f1f5f9',
                                color: isSelected ? '#ffffff' : '#334155',
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
                              <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                                {p.nombre_completo}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span>@{p.usuario}</span>
                                <span>·</span>
                                <span style={{ fontWeight: 700, color: '#0284c7' }}>{p.codigo_id}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {yaCompartidos.length > 0 && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: '#059669',
                                  backgroundColor: '#d1fae5',
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
                                border: isSelected ? '1.5px solid #10b981' : '2px solid #cbd5e1',
                                backgroundColor: isSelected ? '#10b981' : 'transparent',
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
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fde68a',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} color="#d97706" />
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#92400e' }}>
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
                      backgroundColor: '#ffffff',
                      border: '1px solid #d97706',
                      color: '#92400e',
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
                  backgroundColor: !personaSeleccionadaId || selectedAgendaIds.size === 0 ? '#94a3b8' : '#10b981',
                  color: !personaSeleccionadaId || selectedAgendaIds.size === 0 ? '#ffffff' : '#064e3b',
                  fontSize: '13px',
                  fontWeight: 800,
                  border: 'none',
                  cursor: !personaSeleccionadaId || selectedAgendaIds.size === 0 ? 'not-allowed' : 'pointer',
                  opacity: !personaSeleccionadaId || selectedAgendaIds.size === 0 ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: !personaSeleccionadaId || selectedAgendaIds.size === 0 ? 'none' : '0 4px 12px rgba(16, 185, 129, 0.25)',
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
                  backgroundColor: '#ffffff',
                  padding: '16px',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
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
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FileDown size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                      Vista previa del documento PDF
                    </h4>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Hoja de cobros ejecutiva en formato horizontal para consultar o llevar en digital
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#334155'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Fecha del documento:</span>
                    <strong style={{ color: '#0f172a' }}>{fechaTextoActual}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Clientes a incluir:</span>
                    <strong style={{ color: '#0f172a' }}>{cobrosSeleccionados.length} clientes</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Total a cobrar:</span>
                    <strong style={{ color: '#059669' }}>{formatColones(montoTotalSeleccionado)}</strong>
                  </div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
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
                  backgroundColor: cobrosSeleccionados.length === 0 ? '#94a3b8' : '#0A3323',
                  border: cobrosSeleccionados.length === 0 ? 'none' : '1px solid #1B4D37',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: cobrosSeleccionados.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: cobrosSeleccionados.length === 0 ? 'none' : '0 2px 6px rgba(10, 51, 35, 0.18)',
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
