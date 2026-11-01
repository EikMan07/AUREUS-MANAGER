import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  RotateCcw
} from 'lucide-react';
import {
  SPANISH_MONTHS,
  formatColones,
  formatAmountWithCommas,
  parseFormattedAmount,
  getCostaRicaNow,
  formatDateToISO,
  parseISODate,
  isSameDay,
  formatISODateToFullSpanish,
  calculateLoanSchedulePreview,
  getInitials,
  matchesClientSearch
} from '../../utils/formatters';

const DIA_SEMANA_OPTIONS = [
  { value: 'LUNES', label: 'Lunes' },
  { value: 'MARTES', label: 'Martes' },
  { value: 'MIERCOLES', label: 'Miércoles' },
  { value: 'JUEVES', label: 'Jueves' },
  { value: 'VIERNES', label: 'Viernes' },
  { value: 'SABADO', label: 'Sábado' },
  { value: 'DOMINGO', label: 'Domingo' }
];

const CALENDAR_WEEK_HEADERS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

const INITIAL_LOAN_FIELD_ERRORS = {
  cliente: false,
  monto: false,
  interes: false,
  cuotas: false,
  diaFijo: false
};

export function NewLoanModal({
  isOpen,
  clients = [],
  onClose,
  onSaveLoan,
  onShowAlert
}) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientSearchBoxRef = useRef(null);

  const [montoPrestado, setMontoPrestado] = useState('');
  const [porcentajeInteres, setPorcentajeInteres] = useState('');
  const [totalPeriodos, setTotalPeriodos] = useState('');

  const [modalidad, setModalidad] = useState('SEMANAL'); // 'SEMANAL' | 'QUINCENAL'
  const [quincenalTipo, setQuincenalTipo] = useState('DIAS_MES'); // 'DIAS_MES' | 'CADA_2_SEMANAS'
  const [diaFijoSemanal, setDiaFijoSemanal] = useState('');

  const [fechaInicio, setFechaInicio] = useState(() => formatDateToISO(getCostaRicaNow()));
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => getCostaRicaNow().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => getCostaRicaNow().getMonth());
  const [slideAnim, setSlideAnim] = useState('');
  const [fieldErrors, setFieldErrors] = useState(INITIAL_LOAN_FIELD_ERRORS);

  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchEndRef = useRef({ x: 0, y: 0 });
  const modalBodyScrollRef = useRef(null);

  // Reinicio completo del estado al abrir o cerrar el modal (en cero y Ninguno, salvo fecha de inicio en hoy)
  useEffect(() => {
    const todayNow = getCostaRicaNow();
    const todayISO = formatDateToISO(todayNow);
    setFechaInicio(todayISO);
    setIsDatePickerOpen(false);
    setViewYear(todayNow.getFullYear());
    setViewMonth(todayNow.getMonth());
    setSlideAnim('');
    setSelectedClientId('');
    setClientSearchTerm('');
    setIsClientDropdownOpen(false);
    setMontoPrestado('');
    setPorcentajeInteres('');
    setTotalPeriodos('');
    setModalidad('SEMANAL');
    setQuincenalTipo('DIAS_MES');
    setDiaFijoSemanal('');
    setFieldErrors(INITIAL_LOAN_FIELD_ERRORS);
  }, [isOpen]);

  // Bloquear el scroll del contenedor trasero mientras el calendario esté abierto
  useEffect(() => {
    if (!isDatePickerOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const formEl = modalBodyScrollRef.current;
    const prevFormOverflow = formEl ? formEl.style.overflowY : '';

    document.body.style.overflow = 'hidden';
    if (formEl) {
      formEl.style.overflowY = 'hidden';
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      if (formEl) {
        formEl.style.overflowY = prevFormOverflow;
      }
    };
  }, [isDatePickerOpen]);

  // Cerrar el desplegable al hacer clic o tocar fuera del buscador de cliente
  useEffect(() => {
    if (!isOpen || !isClientDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (clientSearchBoxRef.current && !clientSearchBoxRef.current.contains(event.target)) {
        setIsClientDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, isClientDropdownOpen]);

  const handleCloseModal = () => {
    setSelectedClientId('');
    setClientSearchTerm('');
    setIsClientDropdownOpen(false);
    setIsDatePickerOpen(false);
    setFieldErrors(INITIAL_LOAN_FIELD_ERRORS);
    onClose();
  };

  // Funciones del calendario propio de Fecha de Inicio
  const todayDateObj = useMemo(() => getCostaRicaNow(), [isOpen]);
  const selectedStartDateObj = useMemo(() => parseISODate(fechaInicio), [fechaInicio]);

  const handleOpenDatePicker = () => {
    const currentObj = parseISODate(fechaInicio);
    setViewYear(currentObj.getFullYear());
    setViewMonth(currentObj.getMonth());
    setSlideAnim('');
    setIsDatePickerOpen(true);
  };

  const triggerSlideAnim = (dir) => {
    setSlideAnim(dir === 'next' ? 'cal-slide-next' : 'cal-slide-prev');
  };

  const handlePrevMonth = () => {
    triggerSlideAnim('prev');
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    triggerSlideAnim('next');
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleCalendarTouchStart = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchEndRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleCalendarTouchMove = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    touchEndRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleCalendarTouchEnd = (e) => {
    const touch = e.changedTouches?.[0] || touchEndRef.current;
    const endX = touch.clientX ?? touch.x ?? touchStartRef.current.x;
    const endY = touch.clientY ?? touch.y ?? touchStartRef.current.y;
    const deltaX = endX - touchStartRef.current.x;
    const deltaY = endY - touchStartRef.current.y;

    // Validar movimiento predominantemente horizontal y umbral mínimo de 45px
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 45) {
      if (deltaX < -45) {
        handleNextMonth();
      } else if (deltaX > 45) {
        handlePrevMonth();
      }
    }
  };

  const handleSelectCalendarDate = (dateObj) => {
    setFechaInicio(formatDateToISO(dateObj));
    setIsDatePickerOpen(false);
  };

  const handleSelectTodayDate = () => {
    const crToday = getCostaRicaNow();
    setFechaInicio(formatDateToISO(crToday));
    setViewYear(crToday.getFullYear());
    setViewMonth(crToday.getMonth());
    setIsDatePickerOpen(false);
  };

  const calendarCells = useMemo(() => {
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();
    const firstDayRaw = new Date(viewYear, viewMonth, 1).getDay();
    const firstDayOffset = firstDayRaw === 0 ? 6 : firstDayRaw - 1; // Lunes = 0, Domingo = 6

    const cells = [];

    for (let i = firstDayOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(viewMonth === 0 ? viewYear - 1 : viewYear, viewMonth === 0 ? 11 : viewMonth - 1, dayNum);
      cells.push({
        dayNum,
        isCurrentMonth: false,
        dateObj: d,
        isToday: isSameDay(d, todayDateObj),
        isSelected: isSameDay(d, selectedStartDateObj)
      });
    }

    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const d = new Date(viewYear, viewMonth, dayNum);
      cells.push({
        dayNum,
        isCurrentMonth: true,
        dateObj: d,
        isToday: isSameDay(d, todayDateObj),
        isSelected: isSameDay(d, selectedStartDateObj)
      });
    }

    const remaining = (7 - (cells.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(viewMonth === 11 ? viewYear + 1 : viewYear, viewMonth === 11 ? 0 : viewMonth + 1, dayNum);
      cells.push({
        dayNum,
        isCurrentMonth: false,
        dateObj: d,
        isToday: isSameDay(d, todayDateObj),
        isSelected: isSameDay(d, selectedStartDateObj)
      });
    }

    return cells;
  }, [viewYear, viewMonth, todayDateObj, selectedStartDateObj]);

  // Alternar modalidad manteniendo limpio el selector de día fijo en "Ninguno"
  const handleModalidadChange = (newMod) => {
    setModalidad(newMod);
    setDiaFijoSemanal('');
  };

  // Clientes filtrados por búsqueda multi-campo (nombre, apellidos, cédula, teléfono, ubicación o detalles)
  const filteredClients = useMemo(() => {
    const term = clientSearchTerm.trim();
    if (!term) return [];
    return clients.filter((c) => matchesClientSearch(c, term));
  }, [clients, clientSearchTerm]);

  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const shouldShowDropdown =
    isClientDropdownOpen &&
    !selectedClient &&
    clientSearchTerm.trim().length >= 1;

  // Cálculos automáticos en vivo
  const prestadoNum = parseFormattedAmount(montoPrestado);
  const interesNum = parseFloat(porcentajeInteres) || 0;
  const periodosNum = parseInt(totalPeriodos, 10) || 0;

  const montoTotalFinanciar = useMemo(() => {
    if (prestadoNum <= 0) return 0;
    return Math.round(prestadoNum * (1 + interesNum / 100));
  }, [prestadoNum, interesNum]);

  const cuotaCalculada = useMemo(() => {
    if (montoTotalFinanciar <= 0 || periodosNum <= 0) return 0;
    return Math.round(montoTotalFinanciar / periodosNum);
  }, [montoTotalFinanciar, periodosNum]);

  const usaDiaSemana = modalidad === 'SEMANAL' || (modalidad === 'QUINCENAL' && quincenalTipo === 'CADA_2_SEMANAS');
  const isSchedulePreviewReady = periodosNum > 0 && (!usaDiaSemana || Boolean(diaFijoSemanal));

  // Vista previa en vivo de la fecha del Primer cobro y del Último cobro (solo cuando hay cuotas > 0 y día elegido)
  const schedulePreview = useMemo(() => {
    if (!isSchedulePreviewReady) {
      return {
        primerCobroTexto: '—',
        ultimoCobroTexto: '—'
      };
    }
    return calculateLoanSchedulePreview({
      fechaInicio,
      modalidad,
      quincenalTipo,
      diaFijoSemanal,
      totalPeriodos: periodosNum
    });
  }, [isSchedulePreviewReady, fechaInicio, modalidad, quincenalTipo, diaFijoSemanal, periodosNum]);

  // Validación formal y resaltado visual en rojo (sin banners de texto ni globos nativos)
  const handleSubmit = (e) => {
    e.preventDefault();

    const noClient = !selectedClientId;
    const noMonto = prestadoNum <= 0 || cuotaCalculada <= 0;
    const noInteres = porcentajeInteres.trim() === '' || interesNum < 0;
    const noCuotas = periodosNum <= 0;
    const noDiaFijo = usaDiaSemana && !diaFijoSemanal;

    if (noClient || noMonto || noInteres || noCuotas || noDiaFijo) {
      setFieldErrors({
        cliente: noClient,
        monto: prestadoNum <= 0,
        interes: noInteres,
        cuotas: noCuotas,
        diaFijo: noDiaFijo
      });

      if (onShowAlert) {
        onShowAlert({
          title: 'Datos incompletos',
          message: 'No has completado los datos necesarios para registrar un nuevo préstamo.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
      return;
    }

    // Datos listos para la doble verificación soportando ambas formas quincenales
    const loanPayload = {
      cliente_id: selectedClientId,
      cliente_nombre: [selectedClient.nombre, selectedClient.apellidos].filter(Boolean).join(' ').trim(),
      monto_prestado: prestadoNum,
      porcentaje_interes: interesNum,
      monto_total_financiar: montoTotalFinanciar,
      cuota: cuotaCalculada,
      modalidad,
      dia_fijo_original: usaDiaSemana ? diaFijoSemanal : null,
      dia_mes_1: !usaDiaSemana ? 15 : null,
      dia_mes_2: !usaDiaSemana ? 31 : null,
      fecha_inicio: fechaInicio,
      total_periodos: periodosNum
    };

    onSaveLoan(loanPayload);
  };

  if (!isOpen) return null;

  const normalInputClasses = 'bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400';
  const redInputClasses = 'border border-red-500 bg-red-50/50 focus:border-red-600 ring-2 ring-red-500/15 form-input-error';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="new-loan-modal-title">
      <div className="modal-container new-loan-modal-container">
        {/* Encabezado */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="new-loan-modal-title" className="modal-title">
              Nuevo Préstamo
            </h3>
            <p className="modal-subtitle">
              Configura las condiciones del préstamo
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="modal-close-btn"
            aria-label="Cerrar modal"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Formulario (sin banners rojos duplicados; solo resaltado visual en los recuadros) */}
        <form ref={modalBodyScrollRef} onSubmit={handleSubmit} noValidate className="modal-body new-loan-form-body">
          {/* 1. SELECTOR BUSCABLE DE CLIENTE */}
          <div className="form-field-group">
            <label className="form-field-label">
              CLIENTE <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="client-search-select-box" ref={clientSearchBoxRef}>
              {selectedClient ? (
                /* Tarjeta limpia de cliente seleccionado con botón X para cambiar */
                <div className="selected-client-card">
                  <div className="selected-client-left">
                    <div className="selected-client-avatar" aria-hidden="true">
                      {getInitials(selectedClient.nombre, selectedClient.apellidos)}
                    </div>
                    <div className="selected-client-info">
                      <span className="selected-client-name">
                        {[selectedClient.nombre, selectedClient.apellidos].filter(Boolean).join(' ')}
                      </span>
                      <span className="selected-client-cedula">
                        {selectedClient.cedula ? `Cédula ${selectedClient.cedula}` : 'Sin cédula'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientId('');
                      setClientSearchTerm('');
                      setIsClientDropdownOpen(false);
                    }}
                    className="btn-clear-selected-client"
                    title="Cambiar cliente seleccionado"
                    aria-label="Cambiar cliente seleccionado"
                  >
                    <X size={16} strokeWidth={2.2} />
                  </button>
                </div>
              ) : (
                /* Input buscador sin placeholder: solo despliega resultados al escribir >= 1 carácter */
                <>
                  <div className={`client-select-input-wrapper ${fieldErrors.cliente ? redInputClasses : ''}`}>
                    <Search size={16} strokeWidth={2} className="select-search-icon" />
                    <input
                      type="text"
                      placeholder=""
                      value={clientSearchTerm}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClientSearchTerm(val);
                        setIsClientDropdownOpen(val.trim().length >= 1);
                        if (fieldErrors.cliente) {
                          setFieldErrors((prev) => ({ ...prev, cliente: false }));
                        }
                      }}
                      onFocus={() => {
                        if (clientSearchTerm.trim().length >= 1) {
                          setIsClientDropdownOpen(true);
                        }
                      }}
                      className="client-select-native-input"
                      autoComplete="off"
                      aria-label="Buscar cliente"
                    />
                    {clientSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setClientSearchTerm('');
                          setIsClientDropdownOpen(false);
                        }}
                        className="btn-clear-selected-client"
                        aria-label="Limpiar búsqueda"
                      >
                        <X size={15} strokeWidth={2} />
                      </button>
                    )}
                  </div>

                  {shouldShowDropdown && (
                    <div className="client-dropdown-menu" role="listbox" aria-label="Coincidencias de clientes">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((c) => (
                          <div
                            key={c.id}
                            role="option"
                            aria-selected={selectedClientId === c.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedClientId(c.id);
                              setClientSearchTerm('');
                              setIsClientDropdownOpen(false);
                              setFieldErrors((prev) => ({ ...prev, cliente: false }));
                            }}
                            onClick={() => {
                              setSelectedClientId(c.id);
                              setClientSearchTerm('');
                              setIsClientDropdownOpen(false);
                              setFieldErrors((prev) => ({ ...prev, cliente: false }));
                            }}
                            className="client-dropdown-item"
                          >
                            <div className="dropdown-item-info">
                              <span className="dropdown-item-name">
                                {[c.nombre, c.apellidos].filter(Boolean).join(' ')}
                              </span>
                              <span className="dropdown-item-cedula">
                                {c.cedula ? `Cédula ${c.cedula}` : 'Sin cédula'}
                                {c.telefono ? ` · ${c.telefono}` : ''}
                                {c.ubicacion ? ` · ${c.ubicacion}` : ''}
                              </span>
                            </div>
                            <Check size={16} strokeWidth={2.5} className="dropdown-item-check" />
                          </div>
                        ))
                      ) : (
                        <div className="client-dropdown-empty">
                          No se encontraron clientes coincidentes
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* 2. MONTO PRESTADO */}
          <div className="form-field-group">
            <label className="form-field-label">
              MONTO PRESTADO <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="currency-input-wrapper relative flex items-center w-full">
              <span className="currency-symbol-inside absolute left-4 text-slate-500 font-bold text-base pointer-events-none select-none">₡</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={montoPrestado}
                onChange={(e) => {
                  setMontoPrestado(formatAmountWithCommas(e.target.value));
                  if (fieldErrors.monto) {
                    setFieldErrors((prev) => ({ ...prev, monto: false }));
                  }
                }}
                className={`currency-input-field no-spinners pl-9 pr-4 h-12 w-full rounded-xl text-slate-900 font-bold text-base focus:outline-none transition-colors ${
                  fieldErrors.monto ? redInputClasses : normalInputClasses
                }`}
              />
            </div>
          </div>

          {/* 3. PORCENTAJE DE INTERÉS Y CANTIDAD DE CUOTAS */}
          <div className="form-grid-two-cols grid grid-cols-2 gap-3">
            <div className="form-field-group">
              <label className="form-field-label">
                PORCENTAJE DE INTERÉS <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={porcentajeInteres}
                onChange={(e) => {
                  setPorcentajeInteres(e.target.value.replace(/\D/g, '').slice(0, 3));
                  if (fieldErrors.interes) {
                    setFieldErrors((prev) => ({ ...prev, interes: false }));
                  }
                }}
                className={`form-input no-spinners w-full h-12 px-4 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none transition-colors ${
                  fieldErrors.interes ? redInputClasses : normalInputClasses
                }`}
              />
            </div>

            <div className="form-field-group">
              <label className="form-field-label">
                CANTIDAD DE CUOTAS <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={totalPeriodos}
                onChange={(e) => {
                  setTotalPeriodos(e.target.value.replace(/\D/g, '').slice(0, 3));
                  if (fieldErrors.cuotas) {
                    setFieldErrors((prev) => ({ ...prev, cuotas: false }));
                  }
                }}
                className={`form-input no-spinners w-full h-12 px-4 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none transition-colors ${
                  fieldErrors.cuotas ? redInputClasses : normalInputClasses
                }`}
              />
            </div>
          </div>

          {/* Bloque de Resumen Financiero (Total a Pagar y Cuota Automática de Solo Lectura) */}
          <div className="loan-calculation-summary-card bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="calc-summary-row">
              <span className="calc-label">TOTAL A PAGAR</span>
              <span className="calc-val-highlight text-lg font-extrabold text-slate-900">
                {formatColones(montoTotalFinanciar)}
              </span>
            </div>
            <div className="calc-summary-divider border-t border-slate-200/80" />
            <div className="calc-summary-row">
              <span className="calc-label">
                {modalidad === 'SEMANAL' ? 'CUOTA SEMANAL' : 'CUOTA QUINCENAL'}
              </span>
              <span className="calc-cuota-readonly-pill bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-xl text-emerald-700 font-extrabold text-base">
                {formatColones(cuotaCalculada)}
              </span>
            </div>
          </div>

          {/* 4. MODALIDAD: SEMANAL O QUINCENAL */}
          <div className="form-field-group">
            <label className="form-field-label">MODALIDAD DE COBRO</label>
            <div className="segmented-control-two">
              <button
                type="button"
                onClick={() => {
                  handleModalidadChange('SEMANAL');
                  setFieldErrors((prev) => ({ ...prev, diaFijo: false }));
                }}
                className={`segment-btn ${modalidad === 'SEMANAL' ? 'active' : ''}`}
              >
                Semanal
              </button>
              <button
                type="button"
                onClick={() => {
                  handleModalidadChange('QUINCENAL');
                  setFieldErrors((prev) => ({ ...prev, diaFijo: false }));
                }}
                className={`segment-btn ${modalidad === 'QUINCENAL' ? 'active' : ''}`}
              >
                Quincenal
              </button>
            </div>
          </div>

          {/* 5. CONFIGURACIÓN DE DÍAS SEGÚN MODALIDAD */}
          {modalidad === 'SEMANAL' ? (
            <div className="form-field-group">
              <label className="form-field-label">
                DÍA FIJO DE COBRO <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="select-field-wrapper relative w-full">
                <select
                  value={diaFijoSemanal}
                  onChange={(e) => {
                    setDiaFijoSemanal(e.target.value);
                    if (fieldErrors.diaFijo) {
                      setFieldErrors((prev) => ({ ...prev, diaFijo: false }));
                    }
                  }}
                  className={`form-select-custom appearance-none w-full h-12 pl-4 pr-10 rounded-xl text-slate-900 font-semibold text-sm focus:outline-none transition-colors cursor-pointer ${
                    fieldErrors.diaFijo ? redInputClasses : normalInputClasses
                  }`}
                >
                  <option value="">Ninguno</option>
                  {DIA_SEMANA_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  strokeWidth={2.2}
                  className="select-chevron-icon w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
            </div>
          ) : (
            <div className="quincenal-options-wrapper space-y-3">
              {/* Sub-selector de las 2 formas de cobro Quincenal */}
              <div className="form-field-group">
                <label className="form-field-label">ESQUEMA QUINCENAL</label>
                <div className="segmented-control-two">
                  <button
                    type="button"
                    onClick={() => {
                      setQuincenalTipo('DIAS_MES');
                      setDiaFijoSemanal('');
                      setFieldErrors((prev) => ({ ...prev, diaFijo: false }));
                    }}
                    className={`segment-btn ${quincenalTipo === 'DIAS_MES' ? 'active' : ''}`}
                  >
                    Día 15 y fin de mes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuincenalTipo('CADA_2_SEMANAS');
                      setDiaFijoSemanal('');
                      setFieldErrors((prev) => ({ ...prev, diaFijo: false }));
                    }}
                    className={`segment-btn ${quincenalTipo === 'CADA_2_SEMANAS' ? 'active' : ''}`}
                  >
                    Cada 2 semanas
                  </button>
                </div>
              </div>

              {quincenalTipo === 'DIAS_MES' ? (
                <div className="quincenal-info-block bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
                  <Calendar size={20} strokeWidth={2} className="quincenal-info-icon w-5 h-5 text-slate-700 shrink-0" />
                  <div className="quincenal-info-text">
                    <span className="quincenal-info-title">FECHAS DE COBRO QUINCENAL</span>
                    <p className="quincenal-info-desc text-xs text-slate-600">
                      Se cobrará automáticamente el día 15 y el último día de cada mes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="form-field-group">
                  <label className="form-field-label">
                    DÍA FIJO DE COBRO <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="select-field-wrapper relative w-full">
                    <select
                      value={diaFijoSemanal}
                      onChange={(e) => {
                        setDiaFijoSemanal(e.target.value);
                        if (fieldErrors.diaFijo) {
                          setFieldErrors((prev) => ({ ...prev, diaFijo: false }));
                        }
                      }}
                      className={`form-select-custom appearance-none w-full h-12 pl-4 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-sm focus:bg-white focus:border-slate-400 focus:outline-none transition-colors cursor-pointer ${
                        fieldErrors.diaFijo ? redInputClasses : ''
                      }`}
                    >
                      <option value="">Ninguno</option>
                      {DIA_SEMANA_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      strokeWidth={2.2}
                      className="select-chevron-icon w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. FECHA DE INICIO (Botón selector propio sin truncar el año en móvil) */}
          <div className="form-field-group">
            <label className="form-field-label">FECHA DE INICIO</label>
            <button
              type="button"
              onClick={handleOpenDatePicker}
              className="loan-date-picker-trigger w-full h-12 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between gap-2 transition-colors cursor-pointer"
            >
              <div className="loan-date-trigger-left flex items-center gap-2 min-w-0">
                <Calendar size={16} strokeWidth={2.2} className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="loan-date-trigger-text text-xs sm:text-sm font-bold text-slate-900 whitespace-nowrap">
                  {formatISODateToFullSpanish(fechaInicio)}
                </span>
              </div>
              <ChevronDown size={16} strokeWidth={2.2} className="w-4 h-4 text-slate-500 shrink-0" />
            </button>
          </div>

          {/* 7. VISTA PREVIA DE COBROS: Sin paréntesis y vacía mientras no se ingresen cuotas y día */}
          <div className="loan-schedule-preview-card bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div className="schedule-preview-header flex items-center gap-1.5 mb-2">
              <CalendarDays size={14} strokeWidth={2.2} className="text-slate-600 shrink-0" />
              <span className="schedule-preview-heading text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                VISTA PREVIA DE COBROS
              </span>
            </div>
            <div className="schedule-preview-grid grid grid-cols-2 gap-2.5">
              <div className="schedule-preview-box bg-white border border-slate-200/90 rounded-lg p-2.5">
                <span className="schedule-preview-label">PRIMER COBRO</span>
                <span className="schedule-preview-date">{schedulePreview.primerCobroTexto}</span>
              </div>
              <div className="schedule-preview-box bg-white border border-slate-200/90 rounded-lg p-2.5">
                <span className="schedule-preview-label">ÚLTIMO COBRO</span>
                <span className="schedule-preview-date">{schedulePreview.ultimoCobroTexto}</span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="modal-actions-grid grid grid-cols-2 gap-3 pt-3 mt-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn-modal-cancel-full w-full h-12 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm flex items-center justify-center transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-modal-primary-full w-full h-12 rounded-xl bg-[#131629] hover:bg-slate-800 text-white font-semibold text-sm shadow-xs flex items-center justify-center transition-colors whitespace-nowrap cursor-pointer"
            >
              Guardar Préstamo
            </button>
          </div>
        </form>

        {/* Calendario mensual propio renderizado en document.body (fixed inset-0 100% pantalla completa sin cortarse jamás) */}
        {isDatePickerOpen && createPortal(
          <div
            className="loan-datepicker-overlay calendar-fullscreen-backdrop fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsDatePickerOpen(false);
            }}
          >
            <div
              className="loan-datepicker-card"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleCalendarTouchStart}
              onTouchMove={handleCalendarTouchMove}
              onTouchEnd={handleCalendarTouchEnd}
            >
              <div className="loan-datepicker-top-bar">
                <div className="loan-datepicker-title-group">
                  <Calendar size={16} strokeWidth={2.2} className="text-slate-700 shrink-0" />
                  <span className="loan-datepicker-label">Seleccionar Fecha de Inicio</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen(false)}
                  className="loan-datepicker-close-btn"
                  aria-label="Cerrar calendario"
                >
                  <X size={16} strokeWidth={2.3} />
                </button>
              </div>

              {/* Cabecera con Mes y Año (ej. Octubre 2026) y botones < y > */}
              <div className="calendar-month-nav-row">
                <button
                  type="button"
                  className="cal-month-nav-btn"
                  onClick={handlePrevMonth}
                  aria-label="Mes anterior"
                >
                  <ChevronLeft size={18} strokeWidth={2.3} />
                </button>

                <span className="cal-month-name">
                  {SPANISH_MONTHS[viewMonth]} {viewYear}
                </span>

                <button
                  type="button"
                  className="cal-month-nav-btn"
                  onClick={handleNextMonth}
                  aria-label="Mes siguiente"
                >
                  <ChevronRight size={18} strokeWidth={2.3} />
                </button>
              </div>

              {/* Encabezados LUN a DOM */}
              <div className="calendar-grid-week-headers">
                {CALENDAR_WEEK_HEADERS.map((wd) => (
                  <span key={wd} className="cal-week-header-cell">
                    {wd}
                  </span>
                ))}
              </div>

              {/* Cuadrícula de días con soporte de swipe horizontal y transición suave */}
              <div
                key={`${viewYear}-${viewMonth}`}
                className={`calendar-days-grid ${slideAnim}`}
              >
                {calendarCells.map((cell, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectCalendarDate(cell.dateObj)}
                    className={`cal-day-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${
                      cell.isToday ? 'is-today' : ''
                    } ${cell.isSelected ? 'selected' : ''}`}
                  >
                    <span className="cal-day-num">{cell.dayNum}</span>
                    {cell.isToday && <span className="cal-today-dot" />}
                  </button>
                ))}
              </div>

              {/* Botón rápido inferior: Seleccionar hoy */}
              <div className="calendar-modal-footer">
                <button
                  type="button"
                  className="cal-btn-go-today"
                  onClick={handleSelectTodayDate}
                >
                  <RotateCcw size={14} strokeWidth={2.4} />
                  <span>Seleccionar hoy</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </div>
  );
}
