import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Camera, X, Check } from 'lucide-react';
import { ConfirmActionStage } from '../Modals/ConfirmActionStage.jsx';
import { cleanCedulaDigits, formatCedulaCR, formatFullName } from '../../utils/formatters.js';
import { lookupCedula, scanCedulaFromImageFile } from '../../services/cedulaLookup.js';

export function NuevoRegistroModal({
  isOpen,
  onClose,
  onSave,
  initialCedula = '',
  initialNombre = '',
  initialApellidos = '',
  onShowAlert
}) {
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmPhase, setConfirmPhase] = useState('idle');
  const [hasNombreError, setHasNombreError] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCedula(initialCedula ? formatCedulaCR(initialCedula) : '');
      setNombre(initialNombre || '');
      setApellidos(initialApellidos || '');
      setIsConfirmOpen(false);
      setConfirmPhase('idle');
      setHasNombreError(false);
      setIsSaving(false);
    }
  }, [isOpen, initialCedula, initialNombre, initialApellidos]);

  if (!isOpen) return null;

  // Manejo de cambio en cédula con autocompletado
  const handleCedulaChange = async (e) => {
    const raw = e.target.value;
    const clean = cleanCedulaDigits(raw);
    setCedula(formatCedulaCR(clean));

    if (clean.length === 9) {
      setIsLookingUp(true);
      try {
        const result = await lookupCedula(clean);
        if (result && result.nombre) {
          setNombre(result.nombre);
          if (result.apellidos) setApellidos(result.apellidos);
          setHasNombreError(false);
        }
      } catch (err) {
        console.warn('Error al autocompletar cédula:', err);
      } finally {
        setIsLookingUp(false);
      }
    }
  };

  // Escáner OCR desde foto
  const handleFotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningPhoto(true);
    try {
      const scanned = await scanCedulaFromImageFile(file);
      if (scanned && (scanned.cedula || scanned.cleanCedula)) {
        const cleanDigits = (scanned.cleanCedula || scanned.cedula || '').replace(/\D/g, '').slice(0, 9);
        setCedula(formatCedulaCR(cleanDigits));

        if (scanned.nombre) {
          setNombre(scanned.nombre);
          setHasNombreError(false);
        }
        if (scanned.apellidos) setApellidos(scanned.apellidos);
      } else {
        if (onShowAlert) {
          onShowAlert({
            title: 'Foto no legible',
            message: 'No se detectó un número de cédula en la foto. Verifica que la imagen esté bien iluminada o digita el número manualmente.',
            buttonText: 'Entendido',
            iconType: 'warning'
          });
        }
      }
    } catch (err) {
      console.warn('Error leyendo foto de cédula:', err);
    } finally {
      setIsScanningPhoto(false);
    }
  };

  // Validar y abrir confirmación (doble verificación)
  const handlePreSubmit = (e) => {
    e.preventDefault();
    const cleanNombre = nombre.trim();
    if (!cleanNombre) {
      setHasNombreError(true);
      if (onShowAlert) {
        onShowAlert({
          title: 'Nombre requerido',
          message: 'Por favor ingresa el nombre de la persona para registrarla en la Lista Negra.',
          buttonText: 'Entendido',
          iconType: 'warning'
        });
      }
      return;
    }

    const cleanCed = cleanCedulaDigits(cedula);
    if (cleanCed && cleanCed.length !== 9) {
      if (onShowAlert) {
        onShowAlert({
          title: 'Cédula incompleta',
          message: 'El número de cédula debe contener exactamente 9 dígitos.',
          buttonText: 'Entendido',
          iconType: 'warning'
        });
      }
      return;
    }

    setIsConfirmOpen(true);
  };

  // Confirmar y guardar con animación escénica exclusiva de 1480ms
  const handleConfirmSave = async () => {
    if (isSaving || confirmPhase !== 'idle') return;
    setIsSaving(true);
    setConfirmPhase('animating');

    setTimeout(() => {
      setConfirmPhase('exiting');
    }, 1200);

    setTimeout(async () => {
      try {
        const cleanCed = cleanCedulaDigits(cedula);
        await onSave({
          cedula: cleanCed || null,
          nombre: nombre.trim(),
          apellidos: apellidos.trim() || null
        });
        setConfirmPhase('idle');
        setIsConfirmOpen(false);
        onClose();
      } catch (err) {
        console.error('[Diagnóstico técnico para desarrollador]: Error al guardar en Lista Negra:', err.debugError || err);
        setConfirmPhase('idle');
        if (onShowAlert) {
          onShowAlert({
            title: 'Error de registro',
            message: err.userMessage || 'No se pudo registrar a la persona en la Lista Negra.',
            buttonText: 'Entendido',
            iconType: 'alert'
          });
        }
      } finally {
        setIsSaving(false);
      }
    }, 1480);
  };

  const nombreCompleto = formatFullName(nombre, apellidos) || 'esta persona';

  // Renderizado exclusivo de la cápsula escénica (desmonta por completo las cajas blancas del modal)
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
          variant="lista_negra"
          phase={confirmPhase}
          clientName={nombreCompleto}
        />
      </div>
    );
  }

  return (
    <>
      {/* Input de archivo invisible para escáner */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box',
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: 'var(--modal-form-max-width, 480px)',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Cabecera del Modal */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 800,
                    color: '#0f172a',
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  Registrar en Lista Negra
                </h3>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  Bloqueo directo para nuevos préstamos
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '9999px',
                border: 'none',
                outline: 'none',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label="Cerrar modal"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handlePreSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Campo 1: Cédula + Botón Foto */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: '#475569',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: 'inherit',
                }}
              >
                Número de Cédula
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  value={cedula}
                  onChange={handleCedulaChange}
                  placeholder="XXXXXXXXX"
                  maxLength={11}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0f172a',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="button"
                  onClick={handleFotoClick}
                  disabled={isScanningPhoto}
                  style={{
                    height: '42px',
                    padding: '0 12px',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    backgroundColor: isScanningPhoto ? '#f1f5f9' : '#ffffff',
                    color: '#0f172a',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: isScanningPhoto ? 'default' : 'pointer',
                    flexShrink: 0,
                    fontFamily: 'inherit',
                  }}
                  title="Escanear cédula desde foto de la galería"
                >
                  <Camera size={16} strokeWidth={2.2} style={{ color: '#059669' }} />
                  <span style={{ fontFamily: 'inherit' }}>{isScanningPhoto ? 'Leyendo...' : 'Foto'}</span>
                </button>
              </div>
              {isLookingUp && (
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '4px', display: 'block', fontFamily: 'inherit' }}>
                  Consultando registro oficial...
                </span>
              )}
            </div>

            {/* Campo 2: Nombre (Obligatorio) */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: hasNombreError ? '#dc2626' : '#475569',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: 'inherit',
                }}
              >
                Nombre *
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (e.target.value.trim()) setHasNombreError(false);
                }}
                placeholder="Nombre"
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: '12px',
                  border: hasNombreError ? '2px solid #dc2626' : '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Campo 3: Apellidos */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: '#475569',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: 'inherit',
                }}
              >
                Apellidos
              </label>
              <input
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Apellidos"
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Aviso informativo */}
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#991b1b',
                lineHeight: 1.4,
                fontFamily: 'inherit',
              }}
            >
              Esta persona quedará marcada con impedimento y se suspenderán sus préstamos activos.
            </div>

            {/* Botones de acción */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '6px',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
                  textAlign: 'center',
                  fontFamily: 'inherit',
                }}
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Doble Verificación */}
      {isConfirmOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1050,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            boxSizing: 'border-box',
          }}
          onClick={() => setIsConfirmOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '380px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                className={isSaving ? 'cf-anim-shield-seal' : ''}
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '9999px',
                  backgroundColor: '#fee2e2',
                  border: '1.5px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                }}
              >
                <ShieldAlert size={28} strokeWidth={2.2} className={isSaving ? 'cf-anim-shield-seal' : ''} />
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                Confirmar Ingreso a Lista Negra
              </h4>
              <p style={{ fontSize: '13px', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                ¿Estás seguro de registrar a <strong style={{ color: '#0f172a' }}>{nombreCompleto}</strong> en la Lista Negra?
              </p>
              <p style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 600, marginTop: '8px' }}>
                La persona quedará bloqueada para nuevos préstamos.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: isSaving ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  outline: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: isSaving ? 'default' : 'pointer',
                  boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)',
                  fontFamily: 'inherit',
                }}
              >
                {isSaving ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

