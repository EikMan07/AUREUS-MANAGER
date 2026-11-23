import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Megaphone, Loader2, AlertCircle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { crearCampanaCrmAdmin, actualizarCampanaCrmAdmin } from '../../services/apiClient';
import {
  SPANISH_MONTHS,
  SPANISH_MONTHS_SHORT,
  getCostaRicaNow,
  formatDateToISO,
} from '../../utils/formatters';

const CANALES_CAMPANA = [
  'Facebook e Instagram',
  'Facebook',
  'Instagram',
  'WhatsApp',
];

const INITIAL_ERRORS = {
  nombre: false,
  objetivo: false,
};

function sanearEnteroSinCeroIzquierda(val, maxDigits = 10) {
  const digits = String(val || '').replace(/\D/g, '').slice(0, maxDigits);
  if (!digits) return '';
  return String(Number(digits));
}

function formatAmountCommas(raw) {
  const clean = sanearEnteroSinCeroIzquierda(raw, 12);
  if (!clean) return '';
  return Number(clean).toLocaleString('en-US');
}

function parseSafeNumericDigits(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return 0;
  const num = Number(digits);
  return Number.isFinite(num) && num >= 0 ? num : 0;
}

function formatDisplayDateShort(isoStr) {
  if (!isoStr || typeof isoStr !== 'string') return '';
  const match = isoStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  const y = Number(match[1]);
  const mIdx = Number(match[2]) - 1;
  const d = Number(match[3]);
  const monthShort = SPANISH_MONTHS_SHORT[mIdx] || '';
  if (!monthShort || !d) return '';
  return `${d} de ${monthShort}, ${y}`;
}

function AureusCompactDateField({
  id,
  label,
  value,
  onChange,
  isDark,
  surfaceBg,
  elevatedBg,
  textPrimary,
  textSecondary,
  borderSubtle,
  inputBg,
}) {
  const today = useMemo(() => getCostaRicaNow(), []);
  const todayISO = useMemo(() => formatDateToISO(today), [today]);

  const [isOpen, setIsOpen] = useState(false);
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0, width: 276 });
  const triggerRef = useRef(null);

  const initialRefDate = useMemo(() => {
    if (value && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [yy, mm] = value.split('-').map(Number);
      if (yy && mm) return { year: yy, month: mm - 1 };
    }
    return { year: today.getFullYear(), month: today.getMonth() };
  }, [value, today]);

  const [viewYear, setViewYear] = useState(initialRefDate.year);
  const [viewMonth, setViewMonth] = useState(initialRefDate.month);

  useEffect(() => {
    if (isOpen) {
      setViewYear(initialRefDate.year);
      setViewMonth(initialRefDate.month);
    }
  }, [isOpen, initialRefDate]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [isOpen]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const mondayOffset = (firstDayOfMonth + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];
    for (let i = mondayOffset - 1; i >= 0; i -= 1) {
      const d = daysInPrevMonth - i;
      const pm = viewMonth === 0 ? 11 : viewMonth - 1;
      const py = viewMonth === 0 ? viewYear - 1 : viewYear;
      const iso = `${py}-${String(pm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, iso, currentMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, iso, currentMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const d = cells.length - (mondayOffset + daysInMonth) + 1;
      const nm = viewMonth === 11 ? 0 : viewMonth + 1;
      const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
      const iso = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, iso, currentMonth: false });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const handleToggleOpen = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    const el = triggerRef.current;
    if (el && typeof window !== 'undefined') {
      const rect = el.getBoundingClientRect();
      const popW = Math.min(286, window.innerWidth - 24);
      const popH = 315;
      const spaceBelow = window.innerHeight - rect.bottom;
      const top =
        spaceBelow >= popH + 10
          ? rect.bottom + 6
          : Math.max(12, rect.top - popH - 6);
      const left = Math.max(
        12,
        Math.min(rect.left, window.innerWidth - popW - 12)
      );
      setPopoverCoords({ top, left, width: popW });
    }
    setIsOpen(true);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const formattedLabel = formatDisplayDateShort(value);

  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: '12.5px',
          fontWeight: 700,
          color: textSecondary,
          marginBottom: '6px',
        }}
      >
        {label}
      </label>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={isOpen}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '10px 12px',
          borderRadius: '12px',
          border: isOpen ? '1.5px solid #B69A55' : `1px solid ${borderSubtle}`,
          backgroundColor: inputBg,
          color: formattedLabel ? textPrimary : textSecondary,
          fontSize: '13.5px',
          fontWeight: formattedLabel ? 600 : 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          cursor: 'pointer',
          textAlign: 'left',
          outline: 'none',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {formattedLabel || 'Seleccionar fecha'}
        </span>
        <Calendar size={15} strokeWidth={2.2} style={{ color: '#B69A55', flexShrink: 0 }} />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100030,
              backgroundColor: 'transparent',
            }}
          >
            <div
              role="dialog"
              aria-label={label}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: `${popoverCoords.top}px`,
                left: `${popoverCoords.left}px`,
                width: `${popoverCoords.width}px`,
                borderRadius: '16px',
                backgroundColor: surfaceBg,
                border: '1px solid rgba(182, 154, 85, 0.45)',
                boxShadow: isDark
                  ? '0 18px 42px rgba(0, 0, 0, 0.55)'
                  : '0 16px 36px rgba(16, 28, 44, 0.18)',
                padding: '12px',
                color: textPrimary,
                boxSizing: 'border-box',
              }}
            >
              {/* Navegación mes/año */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Mes anterior"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    border: `1px solid ${borderSubtle}`,
                    backgroundColor: elevatedBg,
                    color: textPrimary,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft size={15} />
                </button>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: textPrimary,
                  }}
                >
                  {SPANISH_MONTHS[viewMonth]} {viewYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Mes siguiente"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    border: `1px solid ${borderSubtle}`,
                    backgroundColor: elevatedBg,
                    color: textPrimary,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Cabecera de días LU a DO */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: '2px',
                  marginBottom: '4px',
                  textAlign: 'center',
                }}
              >
                {['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'].map((dayLbl) => (
                  <span
                    key={dayLbl}
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: '#B69A55',
                      padding: '2px 0',
                    }}
                  >
                    {dayLbl}
                  </span>
                ))}
              </div>

              {/* Cuadrícula de días */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                  gap: '3px',
                }}
              >
                {calendarDays.map((cell) => {
                  const isSelected = value === cell.iso;
                  const isToday = todayISO === cell.iso;
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => {
                        onChange(cell.iso);
                        setIsOpen(false);
                      }}
                      style={{
                        height: '30px',
                        borderRadius: '8px',
                        border: isSelected
                          ? 'none'
                          : isToday
                            ? '1px solid #B69A55'
                            : '1px solid transparent',
                        background: isSelected
                          ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                          : 'transparent',
                        color: isSelected
                          ? '#101C2C'
                          : cell.currentMonth
                            ? textPrimary
                            : textSecondary,
                        opacity: cell.currentMonth || isSelected ? 1 : 0.45,
                        fontSize: '12px',
                        fontWeight: isSelected || isToday ? 900 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Acciones rápidas Hoy / Limpiar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: `1px solid ${borderSubtle}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange(todayISO);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(182, 154, 85, 0.45)',
                    backgroundColor: elevatedBg,
                    color: isDark ? '#E5C97B' : '#8A6D2F',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: `1px solid ${borderSubtle}`,
                    backgroundColor: 'transparent',
                    color: textSecondary,
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

export function AdminCrmCampanaModal({ isOpen, campana = null, onClose, onSaved }) {
  const { isDark } = useTheme();
  const backdropMouseDownRef = useRef(false);
  const isEditing = Boolean(campana && campana.id);

  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [publicoObjetivo, setPublicoObjetivo] = useState('');
  const [mensajeCentral, setMensajeCentral] = useState('');
  const [canales, setCanales] = useState('Facebook e Instagram');
  const [presupuestoDisplay, setPresupuestoDisplay] = useState('');
  const [inscritosLogrados, setInscritosLogrados] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  const [fieldErrors, setFieldErrors] = useState(INITIAL_ERRORS);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (campana && campana.id) {
      setNombre(campana.nombre || '');
      setObjetivo(campana.objetivo || '');
      setPublicoObjetivo(campana.publico_objetivo || '');
      setMensajeCentral(campana.mensaje_central || '');
      setCanales(campana.canales || 'Facebook e Instagram');
      const presNum =
        campana.presupuesto !== undefined && campana.presupuesto !== null
          ? Math.round(Number(campana.presupuesto))
          : 0;
      setPresupuestoDisplay(
        Number.isFinite(presNum) && presNum > 0 ? presNum.toLocaleString('en-US') : ''
      );
      const inscNum =
        campana.inscritos_logrados !== undefined && campana.inscritos_logrados !== null
          ? Math.round(Number(campana.inscritos_logrados))
          : 0;
      setInscritosLogrados(Number.isFinite(inscNum) && inscNum > 0 ? String(inscNum) : '');
      setFechaInicio(campana.fecha_inicio ? String(campana.fecha_inicio).slice(0, 10) : '');
      setFechaFin(campana.fecha_fin ? String(campana.fecha_fin).slice(0, 10) : '');
    } else {
      setNombre('');
      setObjetivo('');
      setPublicoObjetivo('');
      setMensajeCentral('');
      setCanales('Facebook e Instagram');
      setPresupuestoDisplay('');
      setInscritosLogrados('');
      setFechaInicio('');
      setFechaFin('');
    }
    setFieldErrors(INITIAL_ERRORS);
    setErrorMessage('');
    setIsSubmitting(false);
  }, [isOpen, campana]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (event) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const surfaceBg = isDark ? '#162436' : '#FFFFFF';
  const elevatedBg = isDark ? '#101C2C' : '#F5F3ED';
  const textPrimary = isDark ? '#F5F3ED' : '#252A31';
  const textSecondary = isDark ? '#A9B4C2' : '#5A626E';
  const borderSubtle = isDark ? 'rgba(212, 180, 106, 0.25)' : 'rgba(182, 154, 85, 0.30)';
  const inputBg = isDark ? '#0F1A2A' : '#FAF8F4';

  const getInputStyle = (hasError) => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 13px',
    borderRadius: '12px',
    border: hasError ? '1.5px solid #C65D58' : `1px solid ${borderSubtle}`,
    backgroundColor: inputBg,
    color: textPrimary,
    fontSize: '14px',
    fontWeight: 500,
    outline: 'none',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedNombre = nombre.trim();
    const trimmedObjetivo = objetivo.trim();

    const nextErrors = {
      nombre: !trimmedNombre,
      objetivo: !trimmedObjetivo,
    };

    if (nextErrors.nombre || nextErrors.objetivo) {
      setFieldErrors(nextErrors);
      setErrorMessage('Completa los campos obligatorios marcados en rojo para continuar.');
      return;
    }

    const payload = {
      nombre: trimmedNombre,
      objetivo: trimmedObjetivo,
      publico_objetivo: publicoObjetivo.trim() !== '' ? publicoObjetivo.trim() : null,
      mensaje_central: mensajeCentral.trim() !== '' ? mensajeCentral.trim() : null,
      canales,
      presupuesto: parseSafeNumericDigits(presupuestoDisplay),
      inscritos_logrados: parseSafeNumericDigits(inscritosLogrados),
      fecha_inicio: fechaInicio !== '' ? fechaInicio : null,
      fecha_fin: fechaFin !== '' ? fechaFin : null,
    };

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = isEditing
        ? await actualizarCampanaCrmAdmin(campana.id, payload)
        : await crearCampanaCrmAdmin(payload);
      if (typeof onSaved === 'function') {
        onSaved(response?.campana || null);
      }
      onClose();
    } catch (err) {
      setErrorMessage(
        err?.userMessage || 'No fue posible guardar la campaña en este momento.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Editar campaña comercial' : 'Nueva campaña comercial'}
      onPointerDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (backdropMouseDownRef.current && e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
        backdropMouseDownRef.current = false;
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100020,
        backgroundColor: 'rgba(8, 14, 24, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="modal-container"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: 'calc(100dvh - 32px)',
          backgroundColor: surfaceBg,
          color: textPrimary,
          borderRadius: '20px',
          border: `1px solid ${borderSubtle}`,
          boxShadow: '0 22px 60px rgba(0, 0, 0, 0.42)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* 1. Encabezado fijo */}
        <div
          style={{
            flexShrink: 0,
            padding: '18px 20px',
            borderBottom: `1px solid ${borderSubtle}`,
            background: isDark
              ? 'linear-gradient(135deg, #101C2C 0%, #162436 100%)'
              : 'linear-gradient(135deg, #F5F3ED 0%, #FFFFFF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                color: '#101C2C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Megaphone size={18} strokeWidth={2.3} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3
                className="aureus-imperial-title"
                style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: textPrimary }}
              >
                {isEditing ? 'Editar campaña' : 'Nueva campaña'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: textSecondary }}>
                Define la ficha comercial, presupuesto y fechas de ejecución
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar ventana"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9999px',
              border: `1px solid ${borderSubtle}`,
              backgroundColor: elevatedBg,
              color: textPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        {/* 2. Cuerpo desplazable */}
        <form
          id="admin-crm-campana-form"
          onSubmit={handleSubmit}
          noValidate
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {errorMessage && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '12px',
                backgroundColor: isDark ? 'rgba(198, 93, 88, 0.16)' : 'rgba(198, 93, 88, 0.10)',
                border: '1px solid rgba(198, 93, 88, 0.45)',
                color: isDark ? '#F5B5B2' : '#9B2F2B',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="admin-campana-nombre"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: fieldErrors.nombre ? '#C65D58' : textSecondary,
                marginBottom: '6px',
              }}
            >
              Nombre de campaña *
            </label>
            <input
              id="admin-campana-nombre"
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                if (fieldErrors.nombre) setFieldErrors((prev) => ({ ...prev, nombre: false }));
              }}
              placeholder="Ej. Impulso Pacífico Central"
              style={getInputStyle(fieldErrors.nombre)}
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="admin-campana-objetivo"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: fieldErrors.objetivo ? '#C65D58' : textSecondary,
                marginBottom: '6px',
              }}
            >
              Objetivo *
            </label>
            <textarea
              id="admin-campana-objetivo"
              rows={2}
              value={objetivo}
              onChange={(e) => {
                setObjetivo(e.target.value);
                if (fieldErrors.objetivo) setFieldErrors((prev) => ({ ...prev, objetivo: false }));
              }}
              placeholder="Ej. Incorporar 15 nuevos prestamistas activos este mes"
              style={{
                ...getInputStyle(fieldErrors.objetivo),
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="admin-campana-publico"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: textSecondary,
                marginBottom: '6px',
              }}
            >
              Público objetivo
            </label>
            <input
              id="admin-campana-publico"
              type="text"
              value={publicoObjetivo}
              onChange={(e) => setPublicoObjetivo(e.target.value)}
              placeholder="Ej. Prestamistas independientes en Costa Rica"
              style={getInputStyle(false)}
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="admin-campana-mensaje"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: textSecondary,
                marginBottom: '6px',
              }}
            >
              Mensaje central
            </label>
            <input
              id="admin-campana-mensaje"
              type="text"
              value={mensajeCentral}
              onChange={(e) => setMensajeCentral(e.target.value)}
              placeholder="Ej. Control diario de cobros y mora sin complicaciones"
              style={getInputStyle(false)}
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="admin-campana-canales"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: textSecondary,
                marginBottom: '6px',
              }}
            >
              Canales
            </label>
            <select
              id="admin-campana-canales"
              value={canales}
              onChange={(e) => setCanales(e.target.value)}
              style={{
                ...getInputStyle(false),
                width: '100%',
              }}
            >
              {CANALES_CAMPANA.map((canal) => (
                <option key={canal} value={canal}>
                  {canal}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <div>
              <label
                htmlFor="admin-campana-presupuesto"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: textSecondary,
                  marginBottom: '6px',
                }}
              >
                Presupuesto
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#B69A55',
                    fontWeight: 800,
                    fontSize: '14px',
                    pointerEvents: 'none',
                  }}
                >
                  ₡
                </span>
                <input
                  id="admin-campana-presupuesto"
                  type="text"
                  inputMode="numeric"
                  value={presupuestoDisplay}
                  onChange={(e) => setPresupuestoDisplay(formatAmountCommas(e.target.value))}
                  placeholder="0"
                  style={{
                    ...getInputStyle(false),
                    paddingLeft: '26px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-campana-inscritos"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: textSecondary,
                  marginBottom: '6px',
                }}
              >
                Inscritos logrados
              </label>
              <input
                id="admin-campana-inscritos"
                type="text"
                inputMode="numeric"
                value={inscritosLogrados}
                onChange={(e) =>
                  setInscritosLogrados(sanearEnteroSinCeroIzquierda(e.target.value, 8))
                }
                placeholder="0"
                style={{
                  ...getInputStyle(false),
                  fontVariantNumeric: 'tabular-nums',
                }}
                autoComplete="off"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
            <AureusCompactDateField
              id="admin-campana-inicio"
              label="Fecha de inicio"
              value={fechaInicio}
              onChange={setFechaInicio}
              isDark={isDark}
              surfaceBg={surfaceBg}
              elevatedBg={elevatedBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              borderSubtle={borderSubtle}
              inputBg={inputBg}
            />

            <AureusCompactDateField
              id="admin-campana-fin"
              label="Fecha de fin"
              value={fechaFin}
              onChange={setFechaFin}
              isDark={isDark}
              surfaceBg={surfaceBg}
              elevatedBg={elevatedBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              borderSubtle={borderSubtle}
              inputBg={inputBg}
            />
          </div>
        </form>

        {/* 3. Pie fijo siempre visible */}
        <div
          style={{
            flexShrink: 0,
            padding: '14px 20px',
            borderTop: `1px solid ${borderSubtle}`,
            backgroundColor: surfaceBg,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: `1px solid ${borderSubtle}`,
              backgroundColor: elevatedBg,
              color: textPrimary,
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="admin-crm-campana-form"
            disabled={isSubmitting}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
              color: '#101C2C',
              fontSize: '13.5px',
              fontWeight: 900,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              cursor: isSubmitting ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(182, 154, 85, 0.30)',
            }}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
            <span>{isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear campaña'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AdminCrmCampanaModal;
