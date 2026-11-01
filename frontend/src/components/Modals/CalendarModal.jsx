import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import {
  SPANISH_MONTHS,
  getCostaRicaNow,
  isSameDay,
  formatDateToFullSpanish
} from '../../utils/formatters';

export function CalendarModal({ isOpen, selectedDate, onClose, onSelectDate }) {
  const today = useMemo(() => getCostaRicaNow(), []);
  const baseSelected = selectedDate instanceof Date ? selectedDate : today;

  // Estados de navegación del calendario (mes y año en vista)
  const [viewYear, setViewYear] = useState(() => baseSelected.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => baseSelected.getMonth());
  const [slideAnim, setSlideAnim] = useState('');

  // Referencia para gestos táctiles (swipe horizontal)
  const touchStartRef = useRef({ x: 0, y: 0 });
  const touchEndRef = useRef({ x: 0, y: 0 });

  // Sincronizar vista si se abre con una fecha diferente y bloquear scroll trasero
  useEffect(() => {
    if (!isOpen) return;
    if (selectedDate instanceof Date) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedDate, isOpen]);

  const triggerSlideAnim = (dir) => {
    setSlideAnim(dir === 'next' ? 'cal-slide-next' : 'cal-slide-prev');
  };

  const handlePrevMonth = () => {
    triggerSlideAnim('prev');
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    triggerSlideAnim('next');
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const handleTouchStart = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchEndRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    touchEndRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches?.[0] || touchEndRef.current;
    const endX = touch.clientX ?? touch.x ?? touchStartRef.current.x;
    const endY = touch.clientY ?? touch.y ?? touchStartRef.current.y;
    const deltaX = endX - touchStartRef.current.x;
    const deltaY = endY - touchStartRef.current.y;

    // Validar movimiento predominantemente horizontal y umbral mínimo de 45px
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 45) {
      if (deltaX < -45) {
        // Deslizar hacia la izquierda -> avanzar al mes siguiente
        handleNextMonth();
      } else if (deltaX > 45) {
        // Deslizar hacia la derecha -> retroceder al mes anterior
        handlePrevMonth();
      }
    }
  };

  const handlePrevYear = () => {
    setViewYear(y => y - 1);
  };

  const handleNextYear = () => {
    setViewYear(y => y + 1);
  };

  const handleSelectDay = (dayNum, isCurrentMonth = true, monthOffset = 0) => {
    let targetYear = viewYear;
    let targetMonth = viewMonth + monthOffset;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear -= 1;
    } else if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
    const chosen = new Date(targetYear, targetMonth, dayNum);
    onSelectDate(chosen);
    onClose();
  };

  const handleSelectToday = () => {
    const crToday = getCostaRicaNow();
    setViewYear(crToday.getFullYear());
    setViewMonth(crToday.getMonth());
    onSelectDate(crToday);
    onClose();
  };

  // Cálculo de la cuadrícula de días para el mes visible
  // En Costa Rica y estándar empresarial, la semana inicia en Lunes (0=Lun, 6=Dom)
  const calendarCells = useMemo(() => {
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    // Primer día del mes (0=Dom, 1=Lun, ..., 6=Sáb)
    const firstDayRaw = new Date(viewYear, viewMonth, 1).getDay();
    // Ajustar para Lunes=0, Domingo=6
    const firstDayOffset = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

    const cells = [];

    // 1. Días del mes anterior (relleno al inicio)
    for (let i = firstDayOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(viewMonth === 0 ? viewYear - 1 : viewYear, viewMonth === 0 ? 11 : viewMonth - 1, dayNum);
      cells.push({
        dayNum,
        isCurrentMonth: false,
        monthOffset: -1,
        dateObj: d,
        isToday: isSameDay(d, today),
        isSelected: isSameDay(d, baseSelected)
      });
    }

    // 2. Días del mes actual
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const d = new Date(viewYear, viewMonth, dayNum);
      cells.push({
        dayNum,
        isCurrentMonth: true,
        monthOffset: 0,
        dateObj: d,
        isToday: isSameDay(d, today),
        isSelected: isSameDay(d, baseSelected)
      });
    }

    // 3. Días del mes siguiente (relleno para completar múltiplos de 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(viewMonth === 11 ? viewYear + 1 : viewYear, viewMonth === 11 ? 0 : viewMonth + 1, dayNum);
      cells.push({
        dayNum,
        isCurrentMonth: false,
        monthOffset: 1,
        dateObj: d,
        isToday: isSameDay(d, today),
        isSelected: isSameDay(d, baseSelected)
      });
    }

    return cells;
  }, [viewYear, viewMonth, today, baseSelected]);

  if (!isOpen) return null;

  const weekHeaders = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  return createPortal(
    <div
      className="modal-overlay calendar-fullscreen-backdrop fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-modal-title"
      onClick={onClose}
    >
      <div
        className="modal-container calendar-modal-container"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Encabezado */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="calendar-modal-title" className="modal-title">
              Seleccionar Fecha de Cobro
            </h3>
            <span className="calendar-modal-sub">
              Desliza hacia los lados o usa las flechas para cambiar de mes
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="modal-close-btn"
            aria-label="Cerrar modal"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        {/* Barra de navegación de mes y año */}
        <div className="calendar-month-nav-row">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="cal-month-nav-btn"
            title="Mes anterior"
            aria-label="Mes anterior"
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>

          <div className="cal-month-title-wrap">
            <span className="cal-month-name">{SPANISH_MONTHS[viewMonth]}</span>
            <div className="cal-year-nav-wrap">
              <button
                type="button"
                onClick={handlePrevYear}
                className="cal-year-nav-btn"
                title="Año anterior"
              >
                ‹
              </button>
              <span className="cal-year-text">{viewYear}</span>
              <button
                type="button"
                onClick={handleNextYear}
                className="cal-year-nav-btn"
                title="Año siguiente"
              >
                ›
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="cal-month-nav-btn"
            title="Mes siguiente"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Encabezados de días de la semana */}
        <div className="calendar-grid-week-headers">
          {weekHeaders.map((header) => (
            <div key={header} className="cal-week-header-cell">
              {header}
            </div>
          ))}
        </div>

        {/* Cuadrícula de 7 columnas con soporte de swipe horizontal y transición */}
        <div
          key={`${viewYear}-${viewMonth}`}
          className={`calendar-days-grid ${slideAnim}`}
          role="grid"
        >
          {calendarCells.map((cell, idx) => (
            <button
              key={idx}
              type="button"
              role="gridcell"
              onClick={() => handleSelectDay(cell.dayNum, cell.isCurrentMonth, cell.monthOffset)}
              className={`cal-day-cell ${cell.isCurrentMonth ? 'current-month' : 'other-month'} ${cell.isSelected ? 'selected' : ''} ${cell.isToday ? 'is-today' : ''}`}
              title={formatDateToFullSpanish(cell.dateObj.getFullYear(), cell.dateObj.getMonth(), cell.dateObj.getDate())}
            >
              <span className="cal-day-num">{cell.dayNum}</span>
              {cell.isToday && (
                <span className="cal-today-dot" />
              )}
            </button>
          ))}
        </div>

        {/* Pie de modal con botón directo a Hoy */}
        <div className="calendar-modal-footer">
          <button
            type="button"
            onClick={handleSelectToday}
            className="cal-btn-go-today"
            title="Seleccionar la fecha de hoy y cerrar el calendario"
          >
            <RotateCcw size={14} strokeWidth={2.2} />
            <span>Ir a hoy</span>
            <span className="cal-today-pill">· {today.getDate()} de {SPANISH_MONTHS[today.getMonth()]}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
