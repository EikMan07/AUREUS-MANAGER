import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, HelpCircle, Check } from 'lucide-react';
import {
  SPANISH_MONTHS,
  SPANISH_WEEKDAYS,
  SPANISH_DAY_KEYS,
  formatDateToFullSpanish,
  getDayNameFromKey,
  getCostaRicaNow
} from '../../utils/formatters';

export function PassDayModal({ client, isOpen, onClose, onConfirmPass }) {
  // Fecha seleccionada por defecto: día siguiente a la fecha actual real de Costa Rica
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

  // Paso de Doble Verificación
  const [isVerifying, setIsVerifying] = useState(false);

  // Al abrir el modal, resetear al día siguiente de hoy
  useEffect(() => {
    if (isOpen) {
      const tmrw = getCostaRicaNow();
      tmrw.setDate(tmrw.getDate() + 1);
      setSelectedYear(tmrw.getFullYear());
      setSelectedMonth(tmrw.getMonth());
      setSelectedDay(tmrw.getDate());
      setViewYear(tmrw.getFullYear());
      setViewMonth(tmrw.getMonth());
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen || !client) return null;

  const fullName = `${client.nombre} ${client.apellidos}`;

  // Días de la semana en orden español (Lunes a Domingo)
  const weekDayHeaders = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  // Calcular días del mes actual visible
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Primer día del mes (0=Dom, 1=Lun, ..., 6=Sáb) ajustado para Lunes=0
  const firstDayIndexRaw = new Date(viewYear, viewMonth, 1).getDay();
  const firstDayOffset = firstDayIndexRaw === 0 ? 6 : firstDayIndexRaw - 1; // Lunes = 0, Domingo = 6

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

  const handleInitialSubmit = () => {
    setIsVerifying(true);
  };

  const handleFinalConfirm = () => {
    onConfirmPass(client.id, selectedDayKey, selectedDateISO, selectedDateFullText);
    handleClose();
  };

  const handleClose = () => {
    setIsVerifying(false);
    onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pass-modal-title">
      <div className="modal-container pass-modal-wide">
        {/* Encabezado del Modal */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="pass-modal-title" className="modal-title">
              Pasar Cliente de Día
            </h3>
            <p className="modal-subtitle">
              Reprogramar fecha de cobro para {fullName}
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

              {/* Resumen único y claro de la fecha elegida (Sin textos duplicados) */}
              <div className="selected-date-preview-card">
                <div className="preview-card-icon-box">
                  <CalendarIcon size={18} strokeWidth={1.75} />
                </div>
                <div className="preview-card-text-group">
                  <span className="preview-card-label">FECHA DE REPROGRAMACIÓN ELEGIDA</span>
                  <strong className="preview-card-date">{selectedDateFullText}</strong>
                </div>
              </div>
            </div>
          ) : (
            /* Doble Verificación Paso 2 */
            <div className="confirmation-prompt-box">
              <div className="prompt-icon-wrapper amber">
                <HelpCircle size={28} strokeWidth={1.75} className="prompt-icon amber" />
              </div>
              <p className="prompt-text">
                ¿Seguro que deseas pasar el cobro de <strong className="client-highlight">{fullName}</strong> para el <strong className="amount-highlight">{selectedDateFullText}</strong>?
              </p>
              <div className="return-day-notice">
                El cliente desaparecerá de hoy y se mostrará únicamente en esa fecha. Su día habitual seguirá registrado como <strong>{getDayNameFromKey(client.diaFijoOriginal)}</strong>.
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
              onClick={handleFinalConfirm}
              className="modal-btn-dark-primary"
            >
              <span>Sí, confirmar reprogramación</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
