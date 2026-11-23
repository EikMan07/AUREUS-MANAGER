import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Edit3, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { crearProspectoCrm, actualizarProspectoCrm } from '../../services/apiClient';

const CANALES_ORIGEN = [
  { value: 'REFERIDO', label: 'Referido' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'REDES_SOCIALES', label: 'Redes sociales' },
  { value: 'DIRECTO', label: 'Directo' },
];

const INITIAL_ERRORS = {
  nombre: false,
  telefono: false,
  ubicacion: false,
};

function formatPhone8Digits(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return digits;
}

function sanearSoloLetras(raw) {
  return String(raw || '').replace(/[0-9]/g, '');
}

function formatAmountCommas(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 12);
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

export function CrmProspectoModal({ isOpen, initialProspecto = null, onClose, onSaved }) {
  const { isDark } = useTheme();
  const backdropMouseDownRef = useRef(false);
  const isEditing = Boolean(initialProspecto && initialProspecto.id);

  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [canalOrigen, setCanalOrigen] = useState('REFERIDO');
  const [montoEstimadoDisplay, setMontoEstimadoDisplay] = useState('');
  const [notas, setNotas] = useState('');

  const [fieldErrors, setFieldErrors] = useState(INITIAL_ERRORS);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialProspecto && initialProspecto.id) {
      setNombre(sanearSoloLetras(initialProspecto.nombre || ''));
      setApellidos(sanearSoloLetras(initialProspecto.apellidos || ''));
      setTelefono(formatPhone8Digits(initialProspecto.telefono || ''));
      setUbicacion(initialProspecto.ubicacion || '');
      setCanalOrigen(initialProspecto.canal_origen || 'REFERIDO');
      const montoVal =
        initialProspecto.monto_estimado !== undefined && initialProspecto.monto_estimado !== null
          ? Math.round(Number(initialProspecto.monto_estimado))
          : 0;
      setMontoEstimadoDisplay(
        Number.isFinite(montoVal) && montoVal > 0 ? montoVal.toLocaleString('en-US') : ''
      );
      setNotas(initialProspecto.notas || '');
    } else {
      setNombre('');
      setApellidos('');
      setTelefono('');
      setUbicacion('');
      setCanalOrigen('REFERIDO');
      setMontoEstimadoDisplay('');
      setNotas('');
    }
    setFieldErrors(INITIAL_ERRORS);
    setErrorMessage('');
    setIsSubmitting(false);
  }, [isOpen, initialProspecto]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleEsc = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
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
    transition: 'border-color 0.16s ease',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedNombre = sanearSoloLetras(nombre).trim();
    const trimmedApellidos = sanearSoloLetras(apellidos).trim();
    const phoneDigits = telefono.replace(/\D/g, '');
    const trimmedUbicacion = ubicacion.trim();

    const telefonoInvalido = phoneDigits.length !== 8;
    const nextErrors = {
      nombre: !trimmedNombre,
      telefono: telefonoInvalido,
      ubicacion: !trimmedUbicacion,
    };

    if (nextErrors.nombre || nextErrors.telefono || nextErrors.ubicacion) {
      setFieldErrors(nextErrors);
      if (telefonoInvalido && trimmedNombre && trimmedUbicacion) {
        setErrorMessage('Ingresa un teléfono válido de 8 dígitos.');
      } else {
        setErrorMessage('Completa los campos obligatorios marcados en rojo para continuar.');
      }
      return;
    }

    const montoDigits = montoEstimadoDisplay.replace(/\D/g, '');
    const parsedMonto = montoDigits === '' ? 0 : Number(montoDigits);
    const montoFinal = Number.isFinite(parsedMonto) && parsedMonto >= 0 ? parsedMonto : 0;

    const payload = {
      nombre: trimmedNombre,
      apellidos: trimmedApellidos !== '' ? trimmedApellidos : null,
      telefono: formatPhone8Digits(phoneDigits),
      ubicacion: trimmedUbicacion,
      canal_origen: canalOrigen,
      monto_estimado: montoFinal,
      notas: notas.trim() !== '' ? notas.trim() : null,
    };

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = isEditing
        ? await actualizarProspectoCrm(initialProspecto.id, payload)
        : await crearProspectoCrm(payload);
      if (typeof onSaved === 'function') {
        onSaved(response?.prospecto || null, isEditing);
      }
      onClose();
    } catch (err) {
      setErrorMessage(
        err?.userMessage || 'No fue posible guardar el prospecto en este momento. Inténtalo de nuevo.'
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
      aria-label={isEditing ? 'Editar prospecto' : 'Registrar nuevo prospecto'}
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
          maxWidth: '500px',
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
              {isEditing ? <Edit3 size={18} strokeWidth={2.3} /> : <UserPlus size={19} strokeWidth={2.3} />}
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
                {isEditing ? 'Editar prospecto' : 'Nuevo prospecto'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: textSecondary }}>
                {isEditing
                  ? 'Actualiza los datos de contacto y monto estimado'
                  : 'Registra un contacto interesado en seguimiento comercial'}
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
          id="crm-prospecto-form"
          onSubmit={handleSubmit}
          autoComplete="off"
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label
                htmlFor="crm-prospecto-nombre"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: fieldErrors.nombre ? '#C65D58' : textSecondary,
                  marginBottom: '6px',
                }}
              >
                Nombre *
              </label>
              <input
                id="crm-prospecto-nombre"
                name="aureus_crm_prospecto_nombre"
                type="text"
                value={nombre}
                onChange={(e) => {
                  setNombre(sanearSoloLetras(e.target.value));
                  if (fieldErrors.nombre) setFieldErrors((prev) => ({ ...prev, nombre: false }));
                }}
                placeholder="Ingresa el nombre"
                style={getInputStyle(fieldErrors.nombre)}
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor="crm-prospecto-apellidos"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: textSecondary,
                  marginBottom: '6px',
                }}
              >
                Apellidos
              </label>
              <input
                id="crm-prospecto-apellidos"
                name="aureus_crm_prospecto_apellidos"
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(sanearSoloLetras(e.target.value))}
                placeholder="Ingresa los apellidos"
                style={getInputStyle(false)}
                autoComplete="off"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label
                htmlFor="crm-prospecto-telefono"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: fieldErrors.telefono ? '#C65D58' : textSecondary,
                  marginBottom: '6px',
                }}
              >
                Teléfono *
              </label>
              <input
                id="crm-prospecto-telefono"
                name="aureus_crm_prospecto_telefono"
                type="tel"
                inputMode="numeric"
                maxLength={9}
                value={telefono}
                onChange={(e) => {
                  setTelefono(formatPhone8Digits(e.target.value));
                  if (fieldErrors.telefono) setFieldErrors((prev) => ({ ...prev, telefono: false }));
                }}
                placeholder="8888-1234"
                style={{
                  ...getInputStyle(fieldErrors.telefono),
                  fontVariantNumeric: 'tabular-nums',
                }}
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor="crm-prospecto-canal"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: textSecondary,
                  marginBottom: '6px',
                }}
              >
                Canal de origen
              </label>
              <select
                id="crm-prospecto-canal"
                name="aureus_crm_prospecto_canal"
                value={canalOrigen}
                onChange={(e) => setCanalOrigen(e.target.value)}
                style={getInputStyle(false)}
              >
                {CANALES_ORIGEN.map((canal) => (
                  <option key={canal.value} value={canal.value}>
                    {canal.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="crm-prospecto-ubicacion"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: fieldErrors.ubicacion ? '#C65D58' : textSecondary,
                marginBottom: '6px',
              }}
            >
              Ubicación *
            </label>
            <input
              id="crm-prospecto-ubicacion"
              name="aureus_crm_prospecto_ubicacion"
              type="text"
              value={ubicacion}
              onChange={(e) => {
                setUbicacion(e.target.value);
                if (fieldErrors.ubicacion) setFieldErrors((prev) => ({ ...prev, ubicacion: false }));
              }}
              placeholder="Ej. Localidad o zona"
              style={getInputStyle(fieldErrors.ubicacion)}
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="crm-prospecto-monto"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: textSecondary,
                marginBottom: '6px',
              }}
            >
              Monto estimado en colones
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '13px',
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
                id="crm-prospecto-monto"
                name="aureus_crm_prospecto_monto"
                type="text"
                inputMode="numeric"
                value={montoEstimadoDisplay}
                onChange={(e) => setMontoEstimadoDisplay(formatAmountCommas(e.target.value))}
                placeholder="0"
                style={{
                  ...getInputStyle(false),
                  paddingLeft: '28px',
                  fontVariantNumeric: 'tabular-nums',
                }}
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="crm-prospecto-notas"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: textSecondary,
                marginBottom: '6px',
              }}
            >
              Notas de seguimiento
            </label>
            <textarea
              id="crm-prospecto-notas"
              name="aureus_crm_prospecto_notas"
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones útiles sobre la necesidad o disponibilidad"
              style={{
                ...getInputStyle(false),
                resize: 'vertical',
                minHeight: '78px',
                fontFamily: 'inherit',
              }}
              autoComplete="off"
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
            alignItems: 'center',
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
            form="crm-prospecto-form"
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
              gap: '8px',
              cursor: isSubmitting ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(182, 154, 85, 0.30)',
            }}
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isEditing ? (
              <Edit3 size={15} />
            ) : (
              <UserPlus size={16} />
            )}
            <span>
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar prospecto'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default CrmProspectoModal;
