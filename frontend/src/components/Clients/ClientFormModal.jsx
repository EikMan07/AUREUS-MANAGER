import React, { useState, useEffect, useRef } from 'react';
import { X, Image, Loader2 } from 'lucide-react';
import { cleanCedulaDigits, formatTelefonoCR } from '../../utils/formatters';
import { lookupCedula, scanCedulaFromImageFile } from '../../services/cedulaLookup';

const INITIAL_FIELD_ERRORS = {
  cedula: false,
  nombre: false,
  telefono: false,
  ubicacion: false
};

export function ClientFormModal({
  isOpen,
  client,
  existingClients = [],
  onClose,
  onSaveClient,
  onShowAlert
}) {
  const isEditing = Boolean(client && client.id);
  const fileInputRef = useRef(null);

  // Estados de campos del formulario
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [detalles, setDetalles] = useState('');

  // Estado de resaltado visual en rojo para los recuadros (100% visual, cero texto extra)
  const [fieldErrors, setFieldErrors] = useState(INITIAL_FIELD_ERRORS);

  // Estados de interacción
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar datos si estamos en modo edición y limpiar cualquier estado rojo
  useEffect(() => {
    if (client) {
      const cleanDigits = (client.cedula || '').toString().replace(/\D/g, '').slice(0, 9);
      setCedula(cleanDigits);
      setNombre(client.nombre || '');
      setApellidos(client.apellidos || '');
      setTelefono(formatTelefonoCR(client.telefono) || client.telefono || '');
      setUbicacion(client.ubicacion || '');
      setDetalles(client.detalles || '');
    } else {
      setCedula('');
      setNombre('');
      setApellidos('');
      setTelefono('');
      setUbicacion('');
      setDetalles('');
    }
    setFieldErrors(INITIAL_FIELD_ERRORS);
  }, [client, isOpen]);

  if (!isOpen) return null;

  // Automatización A: Consulta automática al completar los 9 dígitos de cédula
  const handleCedulaChange = async (e) => {
    const rawVal = e.target.value;
    // Estrictamente 9 dígitos numéricos puros con ceros y SIN guiones
    const clean = rawVal.replace(/\D/g, '').slice(0, 9);
    setCedula(clean);
    if (fieldErrors.cedula) {
      setFieldErrors((prev) => ({ ...prev, cedula: false }));
    }

    if (clean.length === 9) {
      setIsLookingUp(true);
      try {
        const result = await lookupCedula(clean);
        if (result) {
          if (result.nombre) {
            setNombre(result.nombre);
            setFieldErrors((prev) => ({ ...prev, nombre: false }));
          }
          if (result.apellidos) {
            setApellidos(result.apellidos);
          }
        }
      } catch {
        // Fallback silencioso sin textos técnicos
      } finally {
        setIsLookingUp(false);
      }
    }
  };

  // Automatización B: Escáner desde galería de fotos del celular
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
        setCedula(cleanDigits);
        setFieldErrors((prev) => ({ ...prev, cedula: false }));
        if (scanned.nombre) {
          setNombre(scanned.nombre);
          setFieldErrors((prev) => ({ ...prev, nombre: false }));
        }
        if (scanned.apellidos) setApellidos(scanned.apellidos);
      } else if (onShowAlert) {
        onShowAlert({
          title: 'Lectura de imagen',
          message: 'No se detectó un número de cédula en la foto. Por favor verifica que la imagen esté bien iluminada o escribe el número manualmente.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } catch (err) {
      console.warn('Error leyendo foto de cédula:', err);
      if (onShowAlert) {
        onShowAlert({
          title: 'Lectura de imagen',
          message: 'Ocurrió un inconveniente al procesar la imagen. Por favor escribe el número manualmente.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
    } finally {
      setIsScanningPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Formato asistido para teléfono costarricense (XXXX-XXXX)
  const handleTelefonoChange = (e) => {
    const raw = e.target.value;
    setTelefono(formatTelefonoCR(raw));
    if (fieldErrors.telefono) {
      setFieldErrors((prev) => ({ ...prev, telefono: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanDigits = cedula.trim().replace(/\D/g, '').slice(0, 9);
    const cleanNombre = nombre.trim();
    const cleanApellidos = apellidos.trim();
    const cleanTelefono = telefono.trim();
    const cleanUbicacion = ubicacion.trim();
    const cleanDetalles = detalles.trim();

    // 1. Validar los 3 campos obligatorios (Nombre, Teléfono y Ubicación)
    const missingNombre = !cleanNombre;
    const missingTelefono = !cleanTelefono;
    const missingUbicacion = !cleanUbicacion;

    if (missingNombre || missingTelefono || missingUbicacion) {
      setFieldErrors({
        cedula: false,
        nombre: missingNombre,
        telefono: missingTelefono,
        ubicacion: missingUbicacion
      });

      if (onShowAlert) {
        onShowAlert({
          title: 'Datos incompletos',
          message: isEditing
            ? 'No has completado los datos necesarios para guardar los cambios del cliente.'
            : 'No has completado los datos necesarios para registrar un nuevo cliente.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
      return;
    }

    // 2. Validar formato de Número de Cédula si el usuario ingresó algún dígito
    if (cleanDigits.length > 0 && cleanDigits.length !== 9) {
      setFieldErrors({
        cedula: true,
        nombre: false,
        telefono: false,
        ubicacion: false
      });

      if (onShowAlert) {
        onShowAlert({
          title: 'Datos incompletos',
          message: 'El Número de Cédula debe contener exactamente 9 dígitos numéricos.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
      return;
    }

    // 3. Validar NO repetición de número de teléfono contra los clientes registrados
    const phoneDigits = cleanTelefono.replace(/\D/g, '');
    const isDuplicatePhone = existingClients.some((c) => {
      if (isEditing && client && c.id === client.id) return false;
      const existingPhoneDigits = String(c?.telefono || '').replace(/\D/g, '');
      return existingPhoneDigits.length > 0 && existingPhoneDigits === phoneDigits;
    });

    if (isDuplicatePhone) {
      setFieldErrors({
        cedula: false,
        nombre: false,
        telefono: true,
        ubicacion: false
      });

      if (onShowAlert) {
        onShowAlert({
          title: 'Teléfono duplicado',
          message: 'Este número de teléfono ya se encuentra registrado.',
          buttonText: 'Entendido',
          iconType: 'alert'
        });
      }
      return;
    }

    // 4. Validar NO repetición de número de cédula (cuando se ingresan los 9 dígitos)
    if (cleanDigits.length === 9) {
      const isDuplicateCedula = existingClients.some((c) => {
        if (isEditing && client && c.id === client.id) return false;
        return cleanCedulaDigits(c?.cedula) === cleanDigits;
      });

      if (isDuplicateCedula) {
        setFieldErrors({
          cedula: true,
          nombre: false,
          telefono: false,
          ubicacion: false
        });

        if (onShowAlert) {
          onShowAlert({
            title: 'Cédula duplicada',
            message: 'Este número de cédula ya se encuentra registrado.',
            buttonText: 'Entendido',
            iconType: 'alert'
          });
        }
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await onSaveClient({
        id: client?.id,
        cedula: cleanDigits.length === 9 ? cleanDigits : null,
        nombre: cleanNombre,
        apellidos: cleanApellidos || null,
        telefono: cleanTelefono,
        ubicacion: cleanUbicacion,
        detalles: cleanDetalles || null
      });

      if (res && res.success === false) {
        const isPhoneDup =
          res.field === 'telefono' ||
          res.error?.toLowerCase().includes('teléfono') ||
          res.error?.toLowerCase().includes('telefono');
        const isCedulaDup =
          res.field === 'cedula' ||
          res.error?.toLowerCase().includes('cédula') ||
          res.error?.toLowerCase().includes('cedula');

        setFieldErrors({
          cedula: Boolean(isCedulaDup),
          nombre: false,
          telefono: Boolean(isPhoneDup),
          ubicacion: false
        });
        return;
      }

      onClose();
    } catch (err) {
      const isPhoneDup =
        err?.field === 'telefono' ||
        err?.message?.toLowerCase().includes('teléfono') ||
        err?.message?.toLowerCase().includes('telefono');
      const isCedulaDup =
        err?.field === 'cedula' ||
        err?.message?.toLowerCase().includes('cédula') ||
        err?.message?.toLowerCase().includes('cedula');

      setFieldErrors({
        cedula: Boolean(isCedulaDup),
        nombre: false,
        telefono: Boolean(isPhoneDup),
        ubicacion: false
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const redInputClasses = 'border-red-500 bg-red-50/50 focus:border-red-600 ring-2 ring-red-500/15 form-input-error';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="client-form-title">
      <div className="modal-container client-form-modal">
        {/* Encabezado del Modal */}
        <div className="modal-header">
          <div className="modal-title-group">
            <h3 id="client-form-title" className="modal-title">
              {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h3>
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

        {/* Input file invisible para galería de fotos */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden-file-input"
          onChange={handleFileChange}
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* Cuerpo del formulario (sin textos ni banners de error debajo de los inputs) */}
        <form onSubmit={handleSubmit} noValidate className="modal-body client-form-body">
          {/* 1. Campo Número de Cédula (Opcional) + Botón Foto de Ancho Fijo */}
          <div className="form-field-group w-full">
            <label htmlFor="input-cedula" className="form-field-label">
              Número de Cédula
            </label>
            <div className="cedula-input-row">
              <div className="cedula-input-wrapper">
                <input
                  id="input-cedula"
                  type="text"
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="XXXXXXXXX"
                  value={cedula}
                  onChange={handleCedulaChange}
                  className={`form-input ${fieldErrors.cedula ? redInputClasses : ''}`}
                  autoComplete="off"
                />
                {isLookingUp && (
                  <div className="input-loader-badge" title="Consultando identificación">
                    <Loader2 size={16} className="animate-spin text-slate-400" />
                  </div>
                )}
              </div>

              {/* Botón Foto con ancho fijo controlado (no empuja el input en móvil) */}
              <button
                type="button"
                onClick={handleFotoClick}
                disabled={isScanningPhoto}
                className="btn-foto-scanner"
                title="Escanear cédula desde foto de la galería"
              >
                {isScanningPhoto ? (
                  <>
                    <Loader2 size={16} strokeWidth={2.2} className="animate-spin text-slate-600" />
                    <span className="btn-foto-label-reading">Leyendo...</span>
                  </>
                ) : (
                  <>
                    <Image size={17} strokeWidth={1.75} className="text-slate-700" />
                    <span className="btn-foto-label">Foto</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2. Campos Nombre (Obligatorio) y Apellidos (Opcional) */}
          <div className="form-grid-two-cols">
            <div className="form-field-group">
              <label htmlFor="input-nombre" className="form-field-label">
                Nombre <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                id="input-nombre"
                type="text"
                placeholder="Nombre"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (fieldErrors.nombre) {
                    setFieldErrors((prev) => ({ ...prev, nombre: false }));
                  }
                }}
                className={`form-input ${fieldErrors.nombre ? redInputClasses : ''}`}
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="input-apellidos" className="form-field-label">
                Apellidos
              </label>
              <input
                id="input-apellidos"
                type="text"
                placeholder="Apellidos"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* 3. Campo Teléfono (Obligatorio) */}
          <div className="form-field-group w-full">
            <label htmlFor="input-telefono" className="form-field-label">
              Teléfono <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              id="input-telefono"
              type="tel"
              inputMode="tel"
              placeholder="XXXX-XXXX"
              value={telefono}
              onChange={handleTelefonoChange}
              className={`form-input ${fieldErrors.telefono ? redInputClasses : ''}`}
            />
          </div>

          {/* 4. Campo Ubicación (100% Manual, Libre y Obligatorio - NO select) */}
          <div className="form-field-group w-full">
            <label htmlFor="input-ubicacion" className="form-field-label">
              Ubicación <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              id="input-ubicacion"
              type="text"
              placeholder="Ubicación o señas"
              value={ubicacion}
              onChange={(e) => {
                setUbicacion(e.target.value);
                if (fieldErrors.ubicacion) {
                  setFieldErrors((prev) => ({ ...prev, ubicacion: false }));
                }
              }}
              className={`form-input ${fieldErrors.ubicacion ? redInputClasses : ''}`}
            />
          </div>

          {/* 5. Campo Detalles (Opcional) */}
          <div className="form-field-group w-full">
            <label htmlFor="input-detalles" className="form-field-label">
              Detalles
            </label>
            <textarea
              id="input-detalles"
              rows={3}
              placeholder=""
              value={detalles}
              onChange={(e) => setDetalles(e.target.value)}
              className="form-textarea"
            />
          </div>

          {/* Botón de Guardado: Ancho completo en la parte inferior */}
          <div className="form-submit-container">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-save-client"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} strokeWidth={2.5} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                'Guardar Cliente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
