import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, CalendarClock, Check } from 'lucide-react';
import { ConfirmActionStage } from './ConfirmActionStage';
import {
  SPANISH_MONTHS,
  SPANISH_DAY_KEYS,
  formatDateToFullSpanish,
  getDayNameFromKey,
  getCostaRicaNow
} from '../../utils/formatters';

export function PassDayModal({ client, isOpen, onClose, onConfirmPass, currentDateISO }) {
  // Todos los Hooks al inicio del componente antes de cualquier return condicional
  const [selectedYear, setSelectedYear] = useState(() => {
    const tmrw = getCostaRicaNow();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const tmrw = getCostaRicaNow();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.getMonth();
  });
  const [selectedDay, setSelectedDay] = useState(() => {
    const tmrw = getCostaRicaNow();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.getDate();
  });

  // Navegación del mes en el calendario visual
  const [viewYear, setViewYear] = useState(selectedYear);
  const [viewMonth, setViewMonth] = useState(selectedMonth);

  // Opción cuando se pasa a una semana futura: 'ACUMULAR' (por defecto) | 'CORRER'
  const [modoAcumulacion, setModoAcumulacion] = useState('ACUMULAR');

  // Paso de Doble Verificación
  const [isVerifying, setIsVerifying] = useState(false);
  // Fase de confirmación central: 'idle' | 'animating' | 'exiting'
  const [confirmPhase, setConfirmPhase] = useState('idle');

  // Al abrir el modal, iniciar en el día siguiente de la fecha del cobro o de hoy
  useEffect(() => {
    if (isOpen) {
      const baseDate = getCostaRicaNow();
      const rawCobroDate = client?.fechaCobroActual || client?.fecha_cobro_actual || currentDateISO;
      if (rawCobroDate) {
        const parts = String(rawCobroDate).slice(0, 10).split('-').map(Number);
        if (parts.length === 3 && !parts.some(isNaN)) {
          const cobroDateObj = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
          if (cobroDateObj.getTime() > baseDate.getTime()) {
            baseDate.setFullYear(cobroDateObj.getFullYear(), cobroDateObj.getMonth(), cobroDateObj.getDate());
          }
        }
      }
      baseDate.setDate(baseDate.getDate() + 1);
      setSelectedYear(baseDate.getFullYear());
      setSelectedMonth(baseDate.getMonth());
      setSelectedDay(baseDate.getDate());
      setViewYear(baseDate.getFullYear());
      setViewMonth(baseDate.getMonth());
      setModoAcumulacion('ACUMULAR');
      setIsVerifying(false);
      setConfirmPhase('idle');
    }
  }, [isOpen, client, currentDateISO]);

  if (!isOpen || !client) return null;

  // Limpieza estricta del nombre del cliente para jamás mostrar "null" o "undefined"
  const cleanPart = (val) => {
    if (!val || val === 'null' || val === 'undefined') return '';
    return String(val).replace(/\bnull\b/gi, '').replace(/\bundefined\b/gi, '').trim();
  };
  const nombreCliente = [
    cleanPart(client?.nombre || client?.cliente_nombre || client?.name),
    cleanPart(client?.apellidos || client?.cliente_apellidos)
  ].filter(Boolean).join(' ') || 'Cliente';

  // Días de la semana en orden español (Lunes a Domingo)
  const weekDayHeaders = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  // Calcular días del mes actual visible
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Primer día del mes (0=Dom, 1=Lun, ..., 6=Sáb) ajustado para Lunes=0
  const firstDayIndexRaw = new Date(viewYear, viewMonth, 1).getDay();
  const firstDayOffset = firstDayIndexRaw === 0 ? 6 : firstDayIndexRaw - 1;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleSelectDate = (dayNum) => {
    setSelectedDay(dayNum);
    setSelectedMonth(viewMonth);
    setSelectedYear(viewYear);
  };

  // Texto de la fecha seleccionada: ej. "Jueves, 19 de Noviembre de 2026"
  const selectedDateFullText = formatDateToFullSpanish(selectedYear, selectedMonth, selectedDay);

  // Clave de día (LUN, MAR, etc.) y formato ISO (YYYY-MM-DD)
  const selectedDateObj = new Date(selectedYear, selectedMonth, selectedDay);
  const selectedDayKey = SPANISH_DAY_KEYS[selectedDateObj.getDay()];
  const monthISO = String(selectedMonth + 1).padStart(2, '0');
  const dayISO = String(selectedDay).padStart(2, '0');
  const selectedDateISO = `${selectedYear}-${monthISO}-${dayISO}`;

  // Calcular lunes de la semana ISO para detectar si la fecha elegida cae en otra semana futura
  const getMondayISO = (dateStr) => {
    if (!dateStr) return '';
    const clean = String(dateStr).slice(0, 10);
    const parts = clean.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return '';
    const [y, m, d] = parts;
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const day = dt.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    dt.setUTCDate(dt.getUTCDate() + diff);
    return dt.toISOString().slice(0, 10);
  };

  const todayCR = getCostaRicaNow();
  const todayISO = `${todayCR.getFullYear()}-${String(todayCR.getMonth() + 1).padStart(2, '0')}-${String(todayCR.getDate()).padStart(2, '0')}`;
  const fechaBaseCobro = client?.fechaCobroActual || client?.fecha_cobro_actual || currentDateISO || todayISO;
  const mondayOriginal = getMondayISO(fechaBaseCobro);
  const mondaySeleccionado = getMondayISO(selectedDateISO);
  const esOtraSemana = Boolean(mondayOriginal && mondaySeleccionado && mondaySeleccionado > mondayOriginal);

  const handleInitialSubmit = () => {
    setIsVerifying(true);
  };

  const handleClose = () => {
    setIsVerifying(false);
    setConfirmPhase('idle');
    onClose();
  };

  const handleFinalConfirm = () => {
    if (confirmPhase !== 'idle') return;
    setConfirmPhase('animating');

    // Mantener visible 1200ms para apreciar el trazado del reloj y leer la fecha con claridad
    setTimeout(() => {
      setConfirmPhase('exiting');
    }, 1200);

    // Ejecutar la acción de reprogramación y cerrar tras completar el desvanecimiento (1480ms)
    const modoSeleccionado = esOtraSemana ? modoAcumulacion : 'MISMA_SEMANA';
    setTimeout(async () => {
      try {
        await onConfirmPass(client.id, selectedDayKey, selectedDateISO, selectedDateFullText, modoSeleccionado);
      } finally {
        handleClose();
      }
    }, 1480);
  };

  // Renderizado exclusivo de la cápsula de confirmación (desmonta por completo la caja blanca del modal)
  if (confirmPhase !== 'idle') {
    return (
      <div
        className="modal-overlay"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)'
        }}
      >
        <ConfirmActionStage
          variant="pasar"
          phase={confirmPhase}
          clientName={nombreCliente}
          subtitle={selectedDateFullText}
        />
      </div>
    );
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pass-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div className="modal-container pass-modal-wide">
        {/* Encabezado del Modal */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="pass-modal-title" className="modal-title">
              Pasar Cliente de Día
            </h3>
            <p className="modal-subtitle">
              Reprogramar fecha de cobro para {nombreCliente}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="modal-close-btn"
            aria-label="Cerrar modal"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* CONTENIDO DEL MODAL */}
        <div className="modal-body">
          {!isVerifying ? (
            <div className="calendar-picker-wrapper">
              {/* Información del cliente */}
              <div className="client-pass-info-bar">
                <span>Día fijo habitual pactado: <strong>{getDayNameFromKey(client.diaFijoOriginal)}</strong></span>
              </div>

              {/* Selector de Mes y Año con navegación libre */}
              <div className="calendar-nav-bar">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="calendar-nav-arrow-btn"
                  aria-label="Mes anterior"
                >
                  <ChevronLeft size={18} strokeWidth={2} />
                </button>

                <div className="calendar-current-month-year">
                  <span className="calendar-month-name">{SPANISH_MONTHS[viewMonth]}</span>
                  <span className="calendar-year-number">{viewYear}</span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="calendar-nav-arrow-btn"
                  aria-label="Mes siguiente"
                >
                  <ChevronRight size={18} strokeWidth={2} />
                </button>
              </div>

              {/* Encabezados de días de la semana */}
              <div className="calendar-weekdays-row">
                {weekDayHeaders.map((dh, idx) => (
                  <span key={idx} className="calendar-weekday-label">{dh}</span>
                ))}
              </div>

              {/* Rejilla de días del mes */}
              <div className="calendar-days-matrix">
                {/* Días vacíos previos */}
                {Array.from({ length: firstDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="calendar-empty-cell" />
                ))}

                {/* Días del mes actual */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isSelected =
                    selectedDay === dayNum &&
                    selectedMonth === viewMonth &&
                    selectedYear === viewYear;

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      onClick={() => handleSelectDate(dayNum)}
                      className={`calendar-day-btn ${isSelected ? 'selected' : ''}`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Resumen único y claro de la fecha elegida */}
              <div className="selected-date-preview-card">
                <div className="preview-card-icon-box">
                  <CalendarIcon size={18} strokeWidth={1.75} />
                </div>
                <div className="preview-card-text-group">
                  <span className="preview-card-label">FECHA DE REPROGRAMACIÓN ELEGIDA</span>
                  <strong className="preview-card-date">{selectedDateFullText}</strong>
                </div>
              </div>

              {/* Opciones cuando la fecha seleccionada cae en una semana posterior */}
              {esOtraSemana && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    border: '1px solid var(--aureus-border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: 'var(--aureus-text-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    OPCIONES PARA LA SEMANA SIGUIENTE
                  </span>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setModoAcumulacion('ACUMULAR')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border:
                          modoAcumulacion === 'ACUMULAR'
                            ? '1.5px solid #B69A55'
                            : '1px solid var(--aureus-border-subtle)',
                        backgroundColor:
                          modoAcumulacion === 'ACUMULAR' ? '#B69A55' : 'var(--aureus-bg-surface)',
                        color: modoAcumulacion === 'ACUMULAR' ? '#FFFFFF' : 'var(--aureus-text-primary)',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Acumular cuotas
                    </button>

                    <button
                      type="button"
                      onClick={() => setModoAcumulacion('CORRER')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border:
                          modoAcumulacion === 'CORRER'
                            ? '1.5px solid #B69A55'
                            : '1px solid var(--aureus-border-subtle)',
                        backgroundColor:
                          modoAcumulacion === 'CORRER' ? '#B69A55' : 'var(--aureus-bg-surface)',
                        color: modoAcumulacion === 'CORRER' ? '#FFFFFF' : 'var(--aureus-text-primary)',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      No acumular
                    </button>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: 'var(--aureus-text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {modoAcumulacion === 'ACUMULAR'
                      ? 'Ese día se cobrará lo de esta semana más la semana siguiente. No volverá a salir en su día fijo de esa semana.'
                      : 'Ese día solo se cobrará una cuota y las demás fechas se correrán una semana hacia adelante.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Doble Verificación Paso 2 */
            <div className="confirmation-prompt-box">
              <div
                className="prompt-icon-wrapper w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--aureus-gold-light)',
                  color: 'var(--aureus-gold-text)',
                  borderColor: 'var(--aureus-border-gold)',
                  borderWidth: '1px',
                  borderStyle: 'solid'
                }}
              >
                <CalendarClock size={28} strokeWidth={2} />
              </div>
              <p className="prompt-text">
                ¿Seguro que deseas pasar el cobro de <strong className="client-highlight">{nombreCliente}</strong> para el <strong className="amount-highlight">{selectedDateFullText}</strong>?
              </p>
              <div className="return-day-notice">
                {esOtraSemana && modoAcumulacion === 'ACUMULAR' ? (
                  <>
                    El cliente aparecerá únicamente el <strong>{selectedDateFullText}</strong> con la cuota acumulada, no volverá a salir en su día fijo de esa semana y retomará su día habitual <strong>{getDayNameFromKey(client.diaFijoOriginal)}</strong> en la semana subsiguiente.
                  </>
                ) : esOtraSemana && modoAcumulacion === 'CORRER' ? (
                  <>
                    El cliente aparecerá el <strong>{selectedDateFullText}</strong> por una sola cuota y las demás fechas pendientes se correrán una semana hacia adelante en su día habitual <strong>{getDayNameFromKey(client.diaFijoOriginal)}</strong>.
                  </>
                ) : (
                  <>
                    El cliente desaparecerá de hoy y se mostrará únicamente en esa fecha. Su día habitual seguirá registrado como <strong>{getDayNameFromKey(client.diaFijoOriginal)}</strong>.
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ACCIONES DEL MODAL */}
        <div className="modal-actions">
          <button
            type="button"
            onClick={isVerifying ? () => setIsVerifying(false) : handleClose}
            className="modal-btn-cancel"
          >
            {isVerifying ? 'Atrás' : 'Cancelar'}
          </button>

          {!isVerifying ? (
            <button
              type="button"
              onClick={handleInitialSubmit}
              className="modal-btn-dark-primary"
            >
              <Check size={18} strokeWidth={1.75} className="inline-btn-icon" />
              <span>Confirmar cambio</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={confirmPhase !== 'idle'}
              onClick={handleFinalConfirm}
              className="modal-btn-dark-primary"
            >
              <span>{confirmPhase !== 'idle' ? 'Reprogramación confirmada' : 'Sí, confirmar reprogramación'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
