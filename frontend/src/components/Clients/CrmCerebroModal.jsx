import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, SlidersHorizontal, Loader2, Check, AlertCircle, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { obtenerCerebroCrm, actualizarCerebroCrm } from '../../services/apiClient';

const TONOS_OPCIONES = [
  {
    value: 'EJECUTIVO_CERCANO',
    label: 'Ejecutivo cercano',
    descripcion: 'Cordial, profesional y accesible en cada mensaje',
  },
  {
    value: 'FORMAL_INSTITUCIONAL',
    label: 'Formal institucional',
    descripcion: 'Serio, estructurado y protocolario para seguimiento',
  },
  {
    value: 'DIRECTO_Y_BREVE',
    label: 'Directo y breve',
    descripcion: 'Conciso, claro y orientado a respuesta rápida',
  },
];

const DATOS_INSERTABLES = [
  { label: 'Nombre', token: '[Nombre]' },
  { label: 'Etapa', token: '[Etapa]' },
  { label: 'Ubicación', token: '[Ubicación]' },
  { label: 'Monto estimado', token: '[Monto estimado]' },
  { label: 'Días sin avance', token: '[Días sin avance]' },
];

const DEFAULT_INSTRUCCION =
  'Hola [Nombre], le saludamos cordialmente sobre su solicitud en [Ubicación]. Su monto estimado es [Monto estimado]. Quedamos a su disposición.';

function normalizarMarcadoresVisibles(texto = '') {
  if (!texto || typeof texto !== 'string') return DEFAULT_INSTRUCCION;
  return texto
    .replace(/\{\{\s*nombre\s*\}\}/gi, '[Nombre]')
    .replace(/\{\{\s*etapa\s*\}\}/gi, '[Etapa]')
    .replace(/\{\{\s*ubicacion\s*\}\}/gi, '[Ubicación]')
    .replace(/\{\{\s*monto_estimado\s*\}\}/gi, '[Monto estimado]')
    .replace(/\{\{\s*dias_sin_avance\s*\}\}/gi, '[Días sin avance]');
}

export function CrmCerebroModal({ isOpen, onClose, onSaved }) {
  const { isDark } = useTheme();
  const textareaRef = useRef(null);
  const backdropMouseDownRef = useRef(false);

  const [tono, setTono] = useState('EJECUTIVO_CERCANO');
  const [instruccionBase, setInstruccionBase] = useState(DEFAULT_INSTRUCCION);
  const [reglasAdicionales, setReglasAdicionales] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldError, setFieldError] = useState(false);
  const [insertedChip, setInsertedChip] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setIsLoading(true);
    setErrorMessage('');
    setFieldError(false);
    setInsertedChip('');

    obtenerCerebroCrm()
      .then((res) => {
        if (cancelled) return;
        const cerebro = res?.cerebro || {};
        setTono(cerebro.tono || 'EJECUTIVO_CERCANO');
        setInstruccionBase(
          normalizarMarcadoresVisibles(cerebro.instruccion_base || DEFAULT_INSTRUCCION)
        );
        setReglasAdicionales(cerebro.reglas_adicionales || '');
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(
            err?.userMessage || 'No fue posible cargar la configuración actual en este momento.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (event) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const surfaceBg = isDark ? '#162436' : '#FFFFFF';
  const elevatedBg = isDark ? '#101C2C' : '#F5F3ED';
  const textPrimary = isDark ? '#F5F3ED' : '#252A31';
  const textSecondary = isDark ? '#A9B4C2' : '#5A626E';
  const borderSubtle = isDark ? 'rgba(212, 180, 106, 0.25)' : 'rgba(182, 154, 85, 0.30)';
  const inputBg = isDark ? '#0F1A2A' : '#FAF8F4';

  const handleInsertDato = (tokenTexto) => {
    const el = textareaRef.current;
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const nextText =
        instruccionBase.slice(0, start) + tokenTexto + instruccionBase.slice(end);
      setInstruccionBase(nextText);
      requestAnimationFrame(() => {
        el.focus();
        const cursorPos = start + tokenTexto.length;
        el.setSelectionRange(cursorPos, cursorPos);
      });
    } else {
      setInstruccionBase((prev) => `${prev}${prev.endsWith(' ') || prev === '' ? '' : ' '}${tokenTexto}`);
    }
    if (fieldError) setFieldError(false);
    setInsertedChip(tokenTexto);
    setTimeout(() => {
      setInsertedChip((current) => (current === tokenTexto ? '' : current));
    }, 1400);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedInstruccion = instruccionBase.trim();
    if (!trimmedInstruccion) {
      setFieldError(true);
      setErrorMessage('El mensaje guía es obligatorio para redactar mensajes con Séneca.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    setFieldError(false);

    try {
      const response = await actualizarCerebroCrm({
        tono,
        instruccion_base: trimmedInstruccion,
        reglas_adicionales: reglasAdicionales.trim(),
      });
      if (typeof onSaved === 'function') {
        onSaved(response?.cerebro || null);
      }
      onClose();
    } catch (err) {
      setErrorMessage(
        err?.userMessage || 'No fue posible guardar la configuración en este momento.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Configurar tono de Séneca"
      onPointerDown={(e) => {
        backdropMouseDownRef.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (backdropMouseDownRef.current && e.target === e.currentTarget && !isSaving) {
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
              <SlidersHorizontal size={18} strokeWidth={2.3} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h3
                className="aureus-imperial-title"
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 800,
                  color: textPrimary,
                  lineHeight: 1.2,
                }}
              >
                Configurar tono
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: textSecondary }}>
                Define el estilo e instrucciones de Séneca para redactar borradores
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
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
              cursor: isSaving ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={17} strokeWidth={2.2} />
          </button>
        </div>

        {/* 2. Cuerpo desplazable */}
        <form
          id="crm-cerebro-form"
          onSubmit={handleSubmit}
          noValidate
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {isLoading ? (
            <div
              style={{
                padding: '32px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                color: textSecondary,
              }}
            >
              <Loader2 size={24} className="animate-spin" style={{ color: '#B69A55' }} />
              <span style={{ fontSize: '13.5px', fontWeight: 600 }}>Cargando configuración...</span>
            </div>
          ) : (
            <>
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
                <span
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: textSecondary,
                    marginBottom: '8px',
                  }}
                >
                  Tono de redacción
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {TONOS_OPCIONES.map((opt) => {
                    const isSelected = tono === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTono(opt.value)}
                        style={{
                          textAlign: 'left',
                          padding: '11px 14px',
                          borderRadius: '12px',
                          border: isSelected
                            ? '1.5px solid #B69A55'
                            : `1px solid ${borderSubtle}`,
                          background: isSelected
                            ? isDark
                              ? 'rgba(182, 154, 85, 0.18)'
                              : 'rgba(182, 154, 85, 0.14)'
                            : elevatedBg,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: textPrimary }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: '12px', color: textSecondary, marginTop: '2px' }}>
                            {opt.descripcion}
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '9999px',
                              background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                              color: '#101C2C',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Check size={13} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                  }}
                >
                  <label
                    htmlFor="crm-cerebro-instruccion"
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: fieldError ? '#C65D58' : textSecondary,
                    }}
                  >
                    Mensaje guía *
                  </label>
                  <span style={{ fontSize: '11.5px', color: '#B69A55', fontWeight: 700 }}>
                    Toca un dato para agregarlo al mensaje
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                    marginBottom: '8px',
                  }}
                >
                  {DATOS_INSERTABLES.map((item) => {
                    const wasInserted = insertedChip === item.token;
                    return (
                      <button
                        key={item.token}
                        type="button"
                        onClick={() => handleInsertDato(item.token)}
                        style={{
                          padding: '5px 11px',
                          borderRadius: '9999px',
                          border: wasInserted
                            ? '1px solid #397D67'
                            : `1px solid ${borderSubtle}`,
                          backgroundColor: wasInserted
                            ? 'rgba(57, 125, 103, 0.16)'
                            : elevatedBg,
                          color: wasInserted ? '#397D67' : isDark ? '#E5C97B' : '#7C6429',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {wasInserted && <Check size={12} strokeWidth={2.8} />}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                <textarea
                  ref={textareaRef}
                  id="crm-cerebro-instruccion"
                  rows={4}
                  value={instruccionBase}
                  onChange={(e) => {
                    setInstruccionBase(e.target.value);
                    if (fieldError) setFieldError(false);
                  }}
                  placeholder="Escribe el mensaje guía que Séneca usará al redactar cada borrador"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: fieldError ? '1.5px solid #C65D58' : `1px solid ${borderSubtle}`,
                    backgroundColor: inputBg,
                    color: textPrimary,
                    fontSize: '13.5px',
                    lineHeight: 1.5,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="crm-cerebro-reglas"
                  style={{
                    display: 'block',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: textSecondary,
                    marginBottom: '6px',
                  }}
                >
                  Indicaciones adicionales
                </label>
                <textarea
                  id="crm-cerebro-reglas"
                  rows={2}
                  value={reglasAdicionales}
                  onChange={(e) => setReglasAdicionales(e.target.value)}
                  placeholder="Ej. Mencionar horario de atención de lunes a sábado"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '11px 13px',
                    borderRadius: '12px',
                    border: `1px solid ${borderSubtle}`,
                    backgroundColor: inputBg,
                    color: textPrimary,
                    fontSize: '13.5px',
                    lineHeight: 1.5,
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </>
          )}
        </form>

        {/* 3. Pie fijo siempre visible */}
        <div
          style={{
            flexShrink: 0,
            padding: '14px 20px',
            borderTop: `1px solid ${borderSubtle}`,
            backgroundColor: surfaceBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: `1px solid ${borderSubtle}`,
              backgroundColor: elevatedBg,
              color: textPrimary,
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="crm-cerebro-form"
            disabled={isSaving || isLoading}
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
              gap: '8px',
              cursor: isSaving || isLoading ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(182, 154, 85, 0.30)',
            }}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>{isSaving ? 'Guardando...' : 'Guardar configuración'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CrmCerebroModal;
