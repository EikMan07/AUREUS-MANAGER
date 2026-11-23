import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, UserPlus, Edit3, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { crearProspectoCrmAdmin, actualizarProspectoCrmAdmin } from '../../services/apiClient';

const CANALES_ADMIN = [
  { value: 'LANDING_PAGE', label: 'Portada informativa' },
  { value: 'REDES_SOCIALES', label: 'Redes sociales' },
  { value: 'REFERIDO', label: 'Referido' },
  { value: 'DIRECTO', label: 'Directo' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatPhone8Digits(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return digits;
}

function sanearNombreSinNumeros(raw) {
  return String(raw || '').replace(/[0-9]/g, '');
}

export function AdminCrmProspectoModal({ isOpen, initialProspecto = null, onClose, onSaved }) {
  const { isDark } = useTheme();
  const backdropMouseDownRef = useRef(false);
  const isEditing = Boolean(initialProspecto && initialProspecto.id);

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [zona, setZona] = useState('');
  const [canalOrigen, setCanalOrigen] = useState('LANDING_PAGE');
  const [notas, setNotas] = useState('');

  const [nombreError, setNombreError] = useState(false);
  const [correoError, setCorreoError] = useState(false);
  const [telefonoError, setTelefonoError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correoDesbloqueado, setCorreoDesbloqueado] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCorreoDesbloqueado(false);
    if (initialProspecto && initialProspecto.id) {
      setNombre(sanearNombreSinNumeros(initialProspecto.nombre || ''));
      setCorreo(initialProspecto.correo || '');
      setTelefono(formatPhone8Digits(initialProspecto.telefono || ''));
      setZona(initialProspecto.zona || '');
      setCanalOrigen(initialProspecto.canal_origen || 'LANDING_PAGE');
      setNotas(initialProspecto.notas || '');
    } else {
      setNombre('');
      setCorreo('');
      setTelefono('');
      setZona('');
      setCanalOrigen('LANDING_PAGE');
      setNotas('');
    }
    setNombreError(false);
    setCorreoError(false);
    setTelefonoError(false);
    setErrorMessage('');
    setIsSubmitting(false);
  }, [isOpen, initialProspecto]);

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
    const trimmedNombre = sanearNombreSinNumeros(nombre).trim();
    const trimmedCorreo = correo.trim();
    const invalidCorreo = trimmedCorreo !== '' && !EMAIL_REGEX.test(trimmedCorreo);
    const phoneDigits = telefono.replace(/\D/g, '');
    const invalidPhone = phoneDigits.length > 0 && phoneDigits.length !== 8;

    if (!trimmedNombre || invalidCorreo || invalidPhone) {
      setNombreError(!trimmedNombre);
      setCorreoError(invalidCorreo);
      setTelefonoError(invalidPhone);
      if (!trimmedNombre) {
        setErrorMessage('Ingresa el nombre completo de la persona interesada para continuar.');
      } else if (invalidCorreo) {
        setErrorMessage('Ingresa un correo electrónico válido.');
      } else {
        setErrorMessage('Ingresa un teléfono válido de 8 dígitos.');
      }
      return;
    }

    const payload = {
      nombre: trimmedNombre,
      correo: trimmedCorreo !== '' ? trimmedCorreo : null,
      telefono: phoneDigits.length === 8 ? formatPhone8Digits(phoneDigits) : null,
      zona: zona.trim(),
      canal_origen: canalOrigen,
      notas: notas.trim() !== '' ? notas.trim() : null,
    };

    setIsSubmitting(true);
    setErrorMessage('');
    setNombreError(false);
    setCorreoError(false);
    setTelefonoError(false);

    try {
      const response = isEditing
        ? await actualizarProspectoCrmAdmin(initialProspecto.id, payload)
        : await crearProspectoCrmAdmin(payload);
      if (typeof onSaved === 'function') {
        onSaved(response?.prospecto || null, isEditing);
      }
      onClose();
    } catch (err) {
      setErrorMessage(
        err?.userMessage || 'No fue posible guardar el interesado en este momento.'
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
      aria-label={isEditing ? 'Editar interesado' : 'Registrar nuevo interesado'}
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
                style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: textPrimary }}
              >
                {isEditing ? 'Editar interesado' : 'Nuevo interesado'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: textSecondary }}>
                {isEditing
                  ? 'Actualiza la información comercial del interesado'
                  : 'Registra un futuro prestamista interesado en Aureus Manager'}
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
          id="admin-crm-prospecto-form"
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

          <div>
            <label
              htmlFor="admin-crm-nombre"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: nombreError ? '#C65D58' : textSecondary,
                marginBottom: '6px',
              }}
            >
              Nombre *
            </label>
            <input
              id="admin-crm-nombre"
              name="aureus_admin_crm_nombre"
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(sanearNombreSinNumeros(e.target.value));
                if (nombreError) setNombreError(false);
              }}
              placeholder="Ingresa el nombre completo"
              style={getInputStyle(nombreError)}
              autoComplete="off"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label
                htmlFor="admin-crm-correo"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: correoError ? '#C65D58' : textSecondary,
                  marginBottom: '6px',
                }}
              >
                Correo electrónico
              </label>
              <input
                id="admin-crm-correo"
                name="aureus_admin_crm_correo"
                type="email"
                value={correo}
                readOnly={!correoDesbloqueado}
                onPointerDown={() => setCorreoDesbloqueado(true)}
                onFocus={() => setCorreoDesbloqueado(true)}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  if (correoError) setCorreoError(false);
                }}
                placeholder="usuario@correo.com"
                style={getInputStyle(correoError)}
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
              />
            </div>

            <div>
              <label
                htmlFor="admin-crm-telefono"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: telefonoError ? '#C65D58' : textSecondary,
                  marginBottom: '6px',
                }}
              >
                Teléfono
              </label>
              <input
                id="admin-crm-telefono"
                name="aureus_admin_crm_telefono"
                type="tel"
                inputMode="numeric"
                maxLength={9}
                value={telefono}
                onChange={(e) => {
                  setTelefono(formatPhone8Digits(e.target.value));
                  if (telefonoError) setTelefonoError(false);
                }}
                placeholder="8888-1234"
                style={{
                  ...getInputStyle(telefonoError),
                  fontVariantNumeric: 'tabular-nums',
                }}
                autoComplete="off"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label
                htmlFor="admin-crm-zona"
                style={{
                  display: 'block',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: textSecondary,
                  marginBottom: '6px',
                }}
              >
                Zona
              </label>
              <input
                id="admin-crm-zona"
                name="aureus_admin_crm_zona"
                type="text"
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Ej. Localidad o zona"
                style={getInputStyle(false)}
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor="admin-crm-canal"
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
                id="admin-crm-canal"
                name="aureus_admin_crm_canal"
                value={canalOrigen}
                onChange={(e) => setCanalOrigen(e.target.value)}
                style={getInputStyle(false)}
              >
                {CANALES_ADMIN.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-crm-notas"
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: textSecondary,
                marginBottom: '6px',
              }}
            >
              Notas
            </label>
            <textarea
              id="admin-crm-notas"
              name="aureus_admin_crm_notas"
              rows={3}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Comentarios sobre el interés comercial o tamaño de operación"
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
            form="admin-crm-prospecto-form"
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
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isEditing ? (
              <Edit3 size={15} />
            ) : (
              <UserPlus size={16} />
            )}
            <span>
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar interesado'}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default AdminCrmProspectoModal;
