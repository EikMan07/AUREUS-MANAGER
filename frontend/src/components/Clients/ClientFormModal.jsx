import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Image,
  Loader2,
  UserCheck,
  Check,
  Globe,
  ChevronDown,
  Search,
  History,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { dbService } from '../../services/db';
import { ConfirmActionStage } from '../Modals/ConfirmActionStage';
import {
  cleanCedulaDigits,
  formatCedulaCR,
  formatFullName,
  normalizeName,
  namesMatchSamePerson
} from '../../utils/formatters';
import { lookupCedula, scanCedulaFromImageFile } from '../../services/cedulaLookup';
import {
  PHONE_COUNTRIES,
  DEFAULT_COUNTRY,
  CountryFlagSvg,
  formatDigitsByGroups,
  parseStoredPhone,
  buildStoredPhone,
  normalizePhoneKey
} from '../../utils/phoneCountries.jsx';

const INITIAL_FIELD_ERRORS = {
  cedula: false,
  nombre: false,
  telefono: false,
  telefonoSecundario: false,
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
  const { isDark } = useTheme();
  const isEditing = Boolean(client && client.id);
  const fileInputRef = useRef(null);
  const countryMenuRef = useRef(null);
  const secondaryCountryMenuRef = useRef(null);

  // Modalidad de cliente: Costarricense o Extranjero
  const [tipoCliente, setTipoCliente] = useState('COSTARRICENSE');

  // Estados de campos del formulario
  const [cedula, setCedula] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [detalles, setDetalles] = useState('');

  // Estados del selector territorial del teléfono principal
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Estados del teléfono secundario (opcional)
  const [secondaryPhoneDigits, setSecondaryPhoneDigits] = useState('');
  const [selectedSecondaryCountry, setSelectedSecondaryCountry] = useState(DEFAULT_COUNTRY);
  const [showSecondaryCountryMenu, setShowSecondaryCountryMenu] = useState(false);
  const [secondaryCountrySearch, setSecondaryCountrySearch] = useState('');

  // Estado de resaltado visual en rojo para los recuadros
  const [fieldErrors, setFieldErrors] = useState(INITIAL_FIELD_ERRORS);

  // Estados de consulta y escaneo
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'confirm_edit'
  const [confirmPhase, setConfirmPhase] = useState('idle'); // 'idle' | 'animating' | 'exiting'
  const [stageVariant, setStageVariant] = useState('editar_cliente'); // 'nuevo_cliente' | 'editar_cliente'
  const [matchedClient, setMatchedClient] = useState(null);

  // Información fiscal
  const [haciendaInfo, setHaciendaInfo] = useState({
    status: 'idle',
    esMoroso: false,
    omiso: false,
    estadoHacienda: '',
    nombreOficial: ''
  });
  const [isMorosidadOpen, setIsMorosidadOpen] = useState(false);

  // Detector Visual de Historial Permanente (100% informativo, no bloqueante)
  const [historialInfo, setHistorialInfo] = useState(null);
  const [isHistorialExpanded, setIsHistorialExpanded] = useState(false);
  const [checkingHistorial, setCheckingHistorial] = useState(false);

  // Cierre de menús flotantes al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (countryMenuRef.current && !countryMenuRef.current.contains(event.target)) {
        setShowCountryMenu(false);
        setCountrySearch('');
      }
      if (secondaryCountryMenuRef.current && !secondaryCountryMenuRef.current.contains(event.target)) {
        setShowSecondaryCountryMenu(false);
        setSecondaryCountrySearch('');
      }
    }
    if (showCountryMenu || showSecondaryCountryMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCountryMenu, showSecondaryCountryMenu]);

  // Cargar datos en edición o resetear al abrir
  useEffect(() => {
    if (client) {
      const cleanDigits = (client.cedula || '').toString().replace(/\D/g, '').slice(0, 9);
      const rawNombre = client.nombre && client.nombre !== 'null' ? client.nombre : '';
      const rawApellidos = client.apellidos && client.apellidos !== 'null' ? client.apellidos : '';
      const parsedPhone = parseStoredPhone(client.telefono);
      const parsedSecPhone = parseStoredPhone(client.telefono_secundario || client.cliente_telefono_secundario);

      const clientTipo = cleanDigits.length === 9 ? 'COSTARRICENSE' : (isEditing && !client.cedula ? 'EXTRANJERO' : 'COSTARRICENSE');
      setTipoCliente(clientTipo);
      setCedula(cleanDigits);
      setNombre(rawNombre);
      setApellidos(rawApellidos);
      setUbicacion(client.ubicacion || '');
      setDetalles(client.detalles || '');

      if (clientTipo === 'COSTARRICENSE') {
        setSelectedCountry(DEFAULT_COUNTRY);
        setTelefono(parsedPhone.digits ? formatDigitsByGroups(parsedPhone.digits.slice(0, DEFAULT_COUNTRY.digits), DEFAULT_COUNTRY.groups, DEFAULT_COUNTRY.digits) : '');
        setSelectedSecondaryCountry(DEFAULT_COUNTRY);
        setSecondaryPhoneDigits(parsedSecPhone.digits ? formatDigitsByGroups(parsedSecPhone.digits.slice(0, DEFAULT_COUNTRY.digits), DEFAULT_COUNTRY.groups, DEFAULT_COUNTRY.digits) : '');
      } else {
        const foreignCountry = parsedPhone.country.id !== 'CR' ? parsedPhone.country : (PHONE_COUNTRIES.find((c) => c.id !== 'CR') || DEFAULT_COUNTRY);
        setSelectedCountry(foreignCountry);
        setTelefono(parsedPhone.digits ? formatDigitsByGroups(parsedPhone.digits.slice(0, foreignCountry.digits), foreignCountry.groups, foreignCountry.digits) : '');

        const foreignSecCountry = parsedSecPhone.country.id !== 'CR' ? parsedSecPhone.country : (PHONE_COUNTRIES.find((c) => c.id !== 'CR') || DEFAULT_COUNTRY);
        setSelectedSecondaryCountry(foreignSecCountry);
        setSecondaryPhoneDigits(parsedSecPhone.digits ? formatDigitsByGroups(parsedSecPhone.digits.slice(0, foreignSecCountry.digits), foreignSecCountry.groups, foreignSecCountry.digits) : '');
      }
    } else {
      setTipoCliente('COSTARRICENSE');
      setCedula('');
      setNombre('');
      setApellidos('');
      setTelefono('');
      setSecondaryPhoneDigits('');
      setSelectedCountry(DEFAULT_COUNTRY);
      setSelectedSecondaryCountry(DEFAULT_COUNTRY);
      setUbicacion('');
      setDetalles('');
      setHaciendaInfo({ status: 'idle', esMoroso: false, omiso: false, estadoHacienda: '', nombreOficial: '' });
      setIsMorosidadOpen(false);
      setMatchedClient(null);
    }

    setHistorialInfo(null);
    setIsHistorialExpanded(false);
    setCheckingHistorial(false);
    setFieldErrors(INITIAL_FIELD_ERRORS);
    setShowCountryMenu(false);
    setShowSecondaryCountryMenu(false);
    setCountrySearch('');
    setSecondaryCountrySearch('');
    setStep('form');
    setConfirmPhase('idle');
    setStageVariant(isEditing ? 'editar_cliente' : 'nuevo_cliente');
    setIsSubmitting(false);
  }, [client, isOpen, isEditing]);

  useEffect(() => {
    if (!isOpen || isEditing) {
      setHistorialInfo(null);
      setIsHistorialExpanded(false);
      setCheckingHistorial(false);
      return;
    }

    const cedClean = cleanCedulaDigits(cedula);
    const telDigits = String(telefono || '').replace(/\D+/g, '');
    const telSecDigits = String(secondaryPhoneDigits || '').replace(/\D+/g, '');
    const nomClean = String(nombre || '').trim();
    const apeClean = String(apellidos || '').trim();

    const shouldQuery =
      (tipoCliente === 'COSTARRICENSE' && cedClean.length >= 9) ||
      telDigits.length >= 8 ||
      telSecDigits.length >= 8 ||
      (nomClean.length >= 3 && (tipoCliente === 'EXTRANJERO' || apeClean.length >= 2));

    if (!shouldQuery) {
      setHistorialInfo(null);
      setIsHistorialExpanded(false);
      setCheckingHistorial(false);
      return;
    }

    let cancelled = false;
    setCheckingHistorial(true);

    const timer = setTimeout(async () => {
      try {
        const storedTel =
          telDigits.length >= 8
            ? tipoCliente === 'EXTRANJERO'
              ? buildStoredPhone(selectedCountry, telDigits)
              : telDigits
            : '';
        const storedTelSec =
          telSecDigits.length >= 8
            ? tipoCliente === 'EXTRANJERO'
              ? buildStoredPhone(selectedSecondaryCountry, telSecDigits)
              : telSecDigits
            : '';

        const res = await dbService.consultarHistorialArchivoCliente({
          cedula: tipoCliente === 'COSTARRICENSE' && cedClean.length >= 9 ? cedClean : '',
          telefono: storedTel,
          telefono_secundario: storedTelSec,
          nombre: nomClean,
          apellidos: apeClean,
          tipo_cliente: tipoCliente
        });

        if (cancelled) return;
        if (res?.encontrado && res?.cliente_historico) {
          setHistorialInfo((prev) => {
            if (prev?.cliente_historico?.id !== res.cliente_historico.id) {
              setIsHistorialExpanded(false);
            }
            return res;
          });
        } else {
          setHistorialInfo(null);
          setIsHistorialExpanded(false);
        }
      } catch {
        if (!cancelled) {
          setHistorialInfo(null);
        }
      } finally {
        if (!cancelled) {
          setCheckingHistorial(false);
        }
      }
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    isOpen,
    isEditing,
    tipoCliente,
    cedula,
    telefono,
    selectedCountry,
    secondaryPhoneDigits,
    selectedSecondaryCountry,
    nombre,
    apellidos
  ]);

  if (!isOpen) return null;

  const nombreCompletoLimpio = formatFullName(nombre, apellidos);
  const cleanDigitsCurrent = cedula.trim().replace(/\D/g, '').slice(0, 9);
  const cedulaResumen = cleanDigitsCurrent.length === 9
    ? (formatCedulaCR(cleanDigitsCurrent) || cleanDigitsCurrent)
    : 'Sin cédula';

  // Manejo de cambio de cédula con consulta automática a los 9 dígitos
  const handleCedulaChange = async (e) => {
    const rawVal = e.target.value;
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
          if (result.haciendaInfo) {
            setHaciendaInfo(result.haciendaInfo);
          }
        }
      } catch {
        // Fallback silencioso sin alertas técnicas
      } finally {
        setIsLookingUp(false);
      }
    } else {
      setHaciendaInfo({ status: 'idle', esMoroso: false, omiso: false, estadoHacienda: '', nombreOficial: '' });
      setIsMorosidadOpen(false);
      setMatchedClient(null);
    }
  };

  // Escáner fotográfico
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
        if (scanned.haciendaInfo) setHaciendaInfo(scanned.haciendaInfo);
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

  // Formato de teléfono principal
  const handleTelefonoChange = (e) => {
    const rawVal = e.target.value;
    const digits = rawVal.replace(/\D/g, '').slice(0, selectedCountry.digits);
    const formatted = formatDigitsByGroups(digits, selectedCountry.groups, selectedCountry.digits);
    setTelefono(formatted);
    if (fieldErrors.telefono && digits.length === selectedCountry.digits) {
      setFieldErrors((prev) => ({ ...prev, telefono: false }));
    }
  };

  // Formato de teléfono secundario
  const handleSecondaryTelefonoChange = (e) => {
    const rawVal = e.target.value;
    const digits = rawVal.replace(/\D/g, '').slice(0, selectedSecondaryCountry.digits);
    const formatted = formatDigitsByGroups(digits, selectedSecondaryCountry.groups, selectedSecondaryCountry.digits);
    setSecondaryPhoneDigits(formatted);
    if (fieldErrors.telefonoSecundario && (digits.length === 0 || digits.length === selectedSecondaryCountry.digits)) {
      setFieldErrors((prev) => ({ ...prev, telefonoSecundario: false }));
    }
  };

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    setShowCountryMenu(false);
    setCountrySearch('');
    const raw = telefono.replace(/\D/g, '').slice(0, country.digits);
    setTelefono(formatDigitsByGroups(raw, country.groups, country.digits));
  };

  const handleSelectSecondaryCountry = (country) => {
    setSelectedSecondaryCountry(country);
    setShowSecondaryCountryMenu(false);
    setSecondaryCountrySearch('');
    const raw = secondaryPhoneDigits.replace(/\D/g, '').slice(0, country.digits);
    setSecondaryPhoneDigits(formatDigitsByGroups(raw, country.groups, country.digits));
  };

  // Guardado real
  const executeSaveClient = async () => {
    const rawCedula = String(cedula || '').replace(/\D/g, '');
    const cleanDigits = rawCedula.slice(0, 9);
    const cleanNombre = String(nombre || '').trim();
    const cleanApellidos = String(apellidos || '').trim();
    const cleanUbicacion = String(ubicacion || '').trim();
    const cleanDetalles = String(detalles || '').trim();

    const rawPhoneDigits = String(telefono || '').replace(/\D/g, '');
    const cleanPhoneDigits = rawPhoneDigits;
    const rawSecondaryDigits = String(secondaryPhoneDigits || '').replace(/\D/g, '');
    const cleanSecDigits = rawSecondaryDigits;

    const finalPhone = buildStoredPhone(selectedCountry, cleanPhoneDigits || telefono) || String(telefono || '').trim();
    const finalSecondaryPhone =
      cleanSecDigits.length > 0
        ? (buildStoredPhone(selectedSecondaryCountry, cleanSecDigits) || String(secondaryPhoneDigits || '').trim())
        : null;

    setIsSubmitting(true);
    try {
      const res = await onSaveClient({
        id: client?.id,
        tipoCliente,
        cedula: tipoCliente === 'COSTARRICENSE' && cleanDigits.length === 9 ? cleanDigits : null,
        nombre: cleanNombre,
        apellidos: cleanApellidos || null,
        telefono: finalPhone,
        telefono_secundario: finalSecondaryPhone,
        telefonoSecundario: finalSecondaryPhone,
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

        setFieldErrors((prev) => ({
          ...prev,
          cedula: Boolean(isCedulaDup),
          telefono: Boolean(isPhoneDup)
        }));
        setConfirmPhase('idle');
        setStep('form');
        return;
      }

      onClose();
    } catch (err) {
      console.warn('Error guardando cliente:', err);
      setConfirmPhase('idle');
      setStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Declaración unificada de todas las variables limpias en el nivel superior de handleSubmit
    const rawCedula = String(cedula || '').replace(/\D/g, '');
    const cleanDigits = rawCedula.slice(0, 9);
    const cleanNombre = String(nombre || '').trim();
    const cleanApellidos = String(apellidos || '').trim();
    const cleanUbicacion = String(ubicacion || '').trim();
    const cleanDetalles = String(detalles || '').trim();

    const rawPhoneDigits = String(telefono || '').replace(/\D/g, '');
    const cleanPhoneDigits = rawPhoneDigits;
    const reqPrimaryDigits = tipoCliente === 'COSTARRICENSE' ? 8 : selectedCountry.digits;

    const rawSecondaryDigits = String(secondaryPhoneDigits || '').replace(/\D/g, '');
    const cleanSecDigits = rawSecondaryDigits;
    const reqSecondaryDigits = tipoCliente === 'COSTARRICENSE' ? 8 : selectedSecondaryCountry.digits;

    const finalPhone = buildStoredPhone(selectedCountry, cleanPhoneDigits || telefono) || String(telefono || '').trim();
    const primaryPhoneKey = normalizePhoneKey(finalPhone);

    const finalSecondaryPhone =
      cleanSecDigits.length > 0
        ? (buildStoredPhone(selectedSecondaryCountry, cleanSecDigits) || String(secondaryPhoneDigits || '').trim())
        : null;
    const secPhoneKey = finalSecondaryPhone ? normalizePhoneKey(finalSecondaryPhone) : null;

    // Validación de obligatoriedad según pestaña activa
    const missingCedula = tipoCliente === 'COSTARRICENSE' && cleanDigits.length !== 9;
    const missingNombre = !cleanNombre;
    const missingTelefono = cleanPhoneDigits.length !== reqPrimaryDigits;
    const missingUbicacion = !cleanUbicacion;

    if (missingCedula || missingNombre || missingTelefono || missingUbicacion) {
      setFieldErrors({
        cedula: missingCedula,
        nombre: missingNombre,
        telefono: missingTelefono,
        telefonoSecundario: false,
        ubicacion: missingUbicacion
      });

      if (missingCedula && !missingNombre && !missingTelefono && !missingUbicacion) {
        if (onShowAlert) {
          onShowAlert({
            title: 'Cédula incompleta',
            message: 'El número de cédula debe tener exactamente 9 dígitos numéricos.',
            buttonText: 'Entendido',
            iconType: 'incomplete'
          });
        }
        return;
      }

      if (onShowAlert) {
        onShowAlert({
          title: 'Datos incompletos',
          message: isEditing
            ? 'No has completado los datos necesarios para guardar los cambios del cliente.'
            : 'No has completado los datos necesarios para registrar un nuevo cliente.',
          buttonText: 'Entendido',
          iconType: 'incomplete'
        });
      }
      return;
    }

    // Validación condicional del teléfono secundario (si tiene dígitos)
    if (cleanSecDigits.length > 0 && cleanSecDigits.length !== reqSecondaryDigits) {
      setFieldErrors((prev) => ({ ...prev, telefonoSecundario: true }));
      if (onShowAlert) {
        onShowAlert({
          title: 'Teléfono secundario incompleto',
          message: `El teléfono secundario debe tener exactamente ${reqSecondaryDigits} dígitos o dejarse en blanco.`,
          buttonText: 'Entendido',
          iconType: 'incomplete'
        });
      }
      return;
    }

    // Identificar si corresponde a la misma persona registrada previamente (Idempotencia)
    let samePersonMatch = null;
    if (!isEditing) {
      const normNom = normalizeName(cleanNombre);
      const normApe = normalizeName(cleanApellidos);

      if (tipoCliente === 'COSTARRICENSE' && cleanDigits.length === 9) {
        samePersonMatch = existingClients.find((c) => {
          if (cleanCedulaDigits(c?.cedula) !== cleanDigits) return false;
          return namesMatchSamePerson(cleanNombre, cleanApellidos, c?.nombre, c?.apellidos);
        }) || null;
      } else if (tipoCliente === 'EXTRANJERO' || !cleanDigits) {
        samePersonMatch = existingClients.find((c) => {
          const otherCed = cleanCedulaDigits(c?.cedula);
          if (otherCed) return false;
          const otherNom = normalizeName(c?.nombre);
          const otherApe = normalizeName(c?.apellidos);
          return normNom === otherNom && normApe === otherApe;
        }) || null;
      }
    }

    // Filtrar clientes para verificar conflicto real con terceros (personas distintas)
    const conflictClients = existingClients.filter((c) => {
      if (isEditing && client && c.id === client.id) return false;
      if (samePersonMatch && c.id === samePersonMatch.id) return false;
      return true;
    });

    if (cleanSecDigits.length > 0 && secPhoneKey) {
      // No puede ser igual al teléfono principal
      if (secPhoneKey === primaryPhoneKey) {
        setFieldErrors((prev) => ({ ...prev, telefonoSecundario: true }));
        if (onShowAlert) {
          onShowAlert({
            title: 'Teléfono duplicado',
            message: 'El teléfono secundario no puede ser igual al teléfono principal.',
            buttonText: 'Entendido',
            iconType: 'user-x'
          });
        }
        return;
      }

      // No puede repetirse con otros clientes registrados distintos
      const isSecDuplicate = conflictClients.some((c) => {
        const otherPrim = normalizePhoneKey(c?.telefono || c?.cliente_telefono || '');
        const otherSec = normalizePhoneKey(c?.telefono_secundario || c?.cliente_telefono_secundario || '');
        return (otherPrim && otherPrim === secPhoneKey) || (otherSec && otherSec === secPhoneKey);
      });

      if (isSecDuplicate) {
        setFieldErrors((prev) => ({ ...prev, telefonoSecundario: true }));
        if (onShowAlert) {
          onShowAlert({
            title: 'Teléfono secundario duplicado',
            message: 'Este teléfono secundario ya se encuentra registrado en otro cliente.',
            buttonText: 'Entendido',
            iconType: 'user-x'
          });
        }
        return;
      }
    }

    // Validar duplicidad de teléfono principal con clientes distintos
    const isDuplicatePhone = conflictClients.some((c) => {
      const otherPrim = normalizePhoneKey(c?.telefono || c?.cliente_telefono || '');
      const otherSec = normalizePhoneKey(c?.telefono_secundario || c?.cliente_telefono_secundario || '');
      return (otherPrim && otherPrim === primaryPhoneKey) || (otherSec && otherSec === primaryPhoneKey);
    });

    if (isDuplicatePhone) {
      setFieldErrors((prev) => ({ ...prev, telefono: true }));
      if (onShowAlert) {
        onShowAlert({
          title: 'Teléfono duplicado',
          message: 'Este número de teléfono ya pertenece a otro cliente registrado.',
          buttonText: 'Entendido',
          iconType: 'user-x'
        });
      }
      return;
    }

    // Validar duplicidad de cédula con clientes distintos en modo Costarricense
    if (tipoCliente === 'COSTARRICENSE' && cleanDigits.length === 9) {
      const isDuplicateCedula = conflictClients.some((c) => {
        return cleanCedulaDigits(c?.cedula) === cleanDigits;
      });

      if (isDuplicateCedula) {
        setFieldErrors((prev) => ({ ...prev, cedula: true }));
        if (onShowAlert) {
          onShowAlert({
            title: 'Cédula duplicada',
            message: 'Este número de cédula ya se encuentra registrado.',
            buttonText: 'Entendido',
            iconType: 'user-x'
          });
        }
        return;
      }
    }

    // Modo edición: Doble verificación antes de guardar
    if (isEditing) {
      setStageVariant('editar_cliente');
      setStep('confirm_edit');
      return;
    }

    // Modo nuevo cliente con coincidencia de misma persona (Idempotencia)
    if (samePersonMatch) {
      const matchPhoneKey = normalizePhoneKey(samePersonMatch.telefono || samePersonMatch.cliente_telefono || '');
      const matchSecKey = samePersonMatch.telefono_secundario || samePersonMatch.cliente_telefono_secundario
        ? normalizePhoneKey(samePersonMatch.telefono_secundario || samePersonMatch.cliente_telefono_secundario)
        : null;

      const phoneChanged = primaryPhoneKey !== matchPhoneKey;
      const secPhoneChanged = secPhoneKey !== matchSecKey;
      const ubicacionChanged = cleanUbicacion !== (samePersonMatch.ubicacion || '').trim();
      const detallesChanged = (cleanDetalles || '') !== (samePersonMatch.detalles || '').trim();
      const nombreChanged = cleanNombre !== (samePersonMatch.nombre || '').trim();
      const apellidosChanged = (cleanApellidos || '') !== (samePersonMatch.apellidos || '').trim();

      const hasChanges = phoneChanged || secPhoneChanged || ubicacionChanged || detallesChanged || nombreChanged || apellidosChanged;

      if (!hasChanges) {
        // Subcaso 1: 100% idéntico -> no tocar BD ni version, cerrar limpiamente
        await executeSaveClient();
        return;
      } else {
        // Subcaso 2: Misma persona pero con campos actualizados -> confirmar y actualizar
        setMatchedClient(samePersonMatch);
        setStageVariant('editar_cliente');
        setStep('confirm_edit');
        return;
      }
    }

    // Cliente nuevo: reproducir cápsula escénica 'nuevo_cliente' (1480ms) y guardar
    setStageVariant('nuevo_cliente');
    triggerStageSave();
  };

  const triggerStageSave = () => {
    if (confirmPhase !== 'idle') return;
    setConfirmPhase('animating');

    setTimeout(() => {
      setConfirmPhase('exiting');
    }, 1200);

    setTimeout(async () => {
      await executeSaveClient();
    }, 1480);
  };

  const handleConfirmEdit = () => {
    triggerStageSave();
  };

  // Cápsula vectorial de confirmación
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
          variant={stageVariant}
          phase={confirmPhase}
          clientName={nombreCompletoLimpio}
        />
      </div>
    );
  }

  const redInputClasses = 'border-red-500 bg-red-50/50 focus:border-red-600 ring-2 ring-red-500/15 form-input-error';

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="client-form-title"
      style={{
        padding: '16px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto'
      }}
    >
      <div
        className="modal-container client-form-modal"
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: 'calc(100dvh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '22px',
          backgroundColor: 'var(--aureus-bg-surface)',
          border: '1px solid var(--aureus-border-subtle)',
          boxSizing: 'border-box',
          margin: 'auto'
        }}
      >
        {/* Encabezado del Modal */}
        <div
          className="modal-header"
          style={{
            flexShrink: 0,
            padding: '18px 22px 14px 22px',
            borderBottom: '1px solid var(--aureus-border-subtle)',
            backgroundColor: 'var(--aureus-bg-surface)',
            position: 'relative',
            zIndex: 5
          }}
        >
          <div className="modal-title-group">
            <h3 id="client-form-title" className="modal-title">
              {step === 'confirm_edit'
                ? 'Confirmar cambios del cliente'
                : isEditing
                ? 'Editar Cliente'
                : 'Nuevo Cliente'}
            </h3>
          </div>
          <button
            type="button"
            onClick={step === 'confirm_edit' ? () => setStep('form') : onClose}
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

        {step === 'confirm_edit' ? (
          /* PASO 2: Doble Verificación en Edición */
          <>
            <div className="modal-body" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div className="confirmation-prompt-box">
                <div
                  className="prompt-icon-wrapper w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--aureus-gold-light)',
                    color: 'var(--aureus-gold-text)',
                    border: '1px solid var(--aureus-border-gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <UserCheck size={26} strokeWidth={2.2} />
                </div>

                <p className="prompt-text" style={{ marginTop: '4px' }}>
                  ¿Estás seguro de que deseas guardar las modificaciones realizadas a{' '}
                  <strong className="client-highlight">{nombreCompletoLimpio}</strong>?
                </p>

                {/* Recuadro resumen con los datos confirmados */}
                <div
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    border: '1px solid var(--aureus-border-subtle)',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    marginTop: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    textAlign: 'left',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--aureus-text-muted)', fontWeight: 700 }}>Nombre:</span>
                    <strong style={{ color: 'var(--aureus-text-primary)', fontWeight: 800, textAlign: 'right' }}>{nombreCompletoLimpio}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--aureus-text-muted)', fontWeight: 700 }}>Cédula:</span>
                    <strong style={{ color: 'var(--aureus-text-primary)', fontWeight: 800, textAlign: 'right' }}>{cedulaResumen}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--aureus-text-muted)', fontWeight: 700 }}>Teléfono:</span>
                    <strong style={{ color: 'var(--aureus-text-primary)', fontWeight: 800, textAlign: 'right' }}>
                      {buildStoredPhone(selectedCountry, telefono) || telefono.trim()}
                    </strong>
                  </div>
                  {secondaryPhoneDigits.trim() && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', fontSize: '13px' }}>
                      <span style={{ color: 'var(--aureus-text-muted)', fontWeight: 700 }}>Teléfono secundario:</span>
                      <strong style={{ color: 'var(--aureus-text-primary)', fontWeight: 800, textAlign: 'right' }}>
                        {buildStoredPhone(selectedSecondaryCountry, secondaryPhoneDigits) || secondaryPhoneDigits.trim()}
                      </strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--aureus-text-muted)', fontWeight: 700 }}>Ubicación:</span>
                    <strong style={{ color: 'var(--aureus-text-primary)', fontWeight: 800, textAlign: 'right' }}>{ubicacion.trim()}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="modal-btn-cancel"
              >
                Volver
              </button>

              <button
                type="button"
                disabled={isSubmitting || confirmPhase !== 'idle'}
                onClick={handleConfirmEdit}
                className="modal-btn-confirm"
                style={{
                  backgroundColor: '#B69A55',
                  color: '#FFFFFF',
                  borderColor: '#9E8342',
                  fontWeight: 800
                }}
              >
                <Check size={18} strokeWidth={2.2} className="inline-btn-icon" />
                <span>Confirmar cambios</span>
              </button>
            </div>
          </>
        ) : (
          /* PASO 1: Formulario de Registro / Edición */
          <form
            onSubmit={handleSubmit}
            noValidate
            className="modal-body client-form-body"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '16px 22px 22px 22px'
            }}
          >
            {/* Selector de Pestañas: Costarricense / Extranjero */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                marginBottom: '18px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setTipoCliente('COSTARRICENSE');
                  setShowCountryMenu(false);
                  setShowSecondaryCountryMenu(false);
                  setCountrySearch('');
                  setSecondaryCountrySearch('');
                  setSelectedCountry(DEFAULT_COUNTRY);
                  setSelectedSecondaryCountry(DEFAULT_COUNTRY);

                  const rawPhone = telefono.replace(/\D/g, '').slice(0, DEFAULT_COUNTRY.digits);
                  setTelefono(formatDigitsByGroups(rawPhone, DEFAULT_COUNTRY.groups, DEFAULT_COUNTRY.digits));

                  const rawSecPhone = secondaryPhoneDigits.replace(/\D/g, '').slice(0, DEFAULT_COUNTRY.digits);
                  setSecondaryPhoneDigits(formatDigitsByGroups(rawSecPhone, DEFAULT_COUNTRY.groups, DEFAULT_COUNTRY.digits));

                  setFieldErrors((prev) => ({
                    ...prev,
                    telefono: false,
                    telefonoSecundario: false
                  }));
                }}
                style={{
                  height: '42px',
                  borderRadius: '12px',
                  border: tipoCliente === 'COSTARRICENSE' ? '1.5px solid #B69A55' : '1px solid var(--aureus-border-subtle)',
                  backgroundColor: tipoCliente === 'COSTARRICENSE' ? '#B69A55' : 'var(--aureus-bg-elevated)',
                  color: tipoCliente === 'COSTARRICENSE' ? '#FFFFFF' : 'var(--aureus-text-secondary)',
                  fontSize: '13.5px',
                  fontWeight: tipoCliente === 'COSTARRICENSE' ? 800 : 600,
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: tipoCliente === 'COSTARRICENSE' ? '0 2px 6px rgba(182, 154, 85, 0.25)' : 'none',
                  userSelect: 'none'
                }}
              >
                Costarricense
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoCliente('EXTRANJERO');
                  setCedula('');
                  setHaciendaInfo({ status: 'idle', esMoroso: false, omiso: false, estadoHacienda: '', nombreOficial: '' });
                  setIsMorosidadOpen(false);
                  setShowCountryMenu(false);
                  setShowSecondaryCountryMenu(false);
                  setCountrySearch('');
                  setSecondaryCountrySearch('');

                  const foreignCountry = selectedCountry.id === 'CR'
                    ? (PHONE_COUNTRIES.find((c) => c.id !== 'CR') || DEFAULT_COUNTRY)
                    : selectedCountry;
                  setSelectedCountry(foreignCountry);
                  const rawPhone = telefono.replace(/\D/g, '').slice(0, foreignCountry.digits);
                  setTelefono(formatDigitsByGroups(rawPhone, foreignCountry.groups, foreignCountry.digits));

                  const foreignSecCountry = selectedSecondaryCountry.id === 'CR'
                    ? (PHONE_COUNTRIES.find((c) => c.id !== 'CR') || DEFAULT_COUNTRY)
                    : selectedSecondaryCountry;
                  setSelectedSecondaryCountry(foreignSecCountry);
                  const rawSecPhone = secondaryPhoneDigits.replace(/\D/g, '').slice(0, foreignSecCountry.digits);
                  setSecondaryPhoneDigits(formatDigitsByGroups(rawSecPhone, foreignSecCountry.groups, foreignSecCountry.digits));

                  setFieldErrors((prev) => ({
                    ...prev,
                    cedula: false,
                    telefono: false,
                    telefonoSecundario: false
                  }));
                }}
                style={{
                  height: '42px',
                  borderRadius: '12px',
                  border: tipoCliente === 'EXTRANJERO' ? '1.5px solid #B69A55' : '1px solid var(--aureus-border-subtle)',
                  backgroundColor: tipoCliente === 'EXTRANJERO' ? '#B69A55' : 'var(--aureus-bg-elevated)',
                  color: tipoCliente === 'EXTRANJERO' ? '#FFFFFF' : 'var(--aureus-text-secondary)',
                  fontSize: '13.5px',
                  fontWeight: tipoCliente === 'EXTRANJERO' ? 800 : 600,
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: tipoCliente === 'EXTRANJERO' ? '0 2px 6px rgba(182, 154, 85, 0.25)' : 'none',
                  userSelect: 'none'
                }}
              >
                Extranjero
              </button>
            </div>

            {/* 1. Campo Número de Cédula (Obligatorio en Costarricense) */}
            {tipoCliente === 'COSTARRICENSE' && (
              <div className="form-field-group w-full">
                <label htmlFor="input-cedula" className="form-field-label">
                  Número de Cédula <span className="text-red-500 font-bold" style={{ color: '#ef4444', fontWeight: 800 }}>*</span>
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
                      style={{
                        border: fieldErrors.cedula ? '1.5px solid #ef4444' : '1px solid var(--aureus-border-subtle)',
                        backgroundColor: fieldErrors.cedula ? 'var(--aureus-red-light)' : 'var(--aureus-bg-elevated)',
                        color: 'var(--aureus-text-primary)',
                        boxShadow: fieldErrors.cedula ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      autoComplete="off"
                    />
                    {isLookingUp && (
                      <div className="input-loader-badge" title="Consultando identificación">
                        <Loader2 size={16} className="animate-spin text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Botón Foto con ancho fijo controlado */}
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

                {/* Acordeón opcional de información fiscal */}
                {haciendaInfo.status === 'ok' && (
                  <div
                    style={{
                      marginTop: '8px',
                      borderRadius: '10px',
                      border: '1px solid var(--aureus-border-subtle)',
                      backgroundColor: 'var(--aureus-bg-elevated)',
                      overflow: 'hidden'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setIsMorosidadOpen((prev) => !prev)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--aureus-text-primary)'
                      }}
                    >
                      <span>Situación Tributaria: {haciendaInfo.estadoHacienda || 'Consultada'}</span>
                      <ChevronDown
                        size={14}
                        style={{
                          transform: isMorosidadOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.15s ease'
                        }}
                      />
                    </button>
                    {isMorosidadOpen && (
                      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--aureus-border-subtle)', fontSize: '11.5px', color: 'var(--aureus-text-secondary)' }}>
                        <div><strong>Oficial:</strong> {haciendaInfo.nombreOficial}</div>
                        <div><strong>Moroso:</strong> {haciendaInfo.esMoroso ? 'Sí' : 'No'} | <strong>Omiso:</strong> {haciendaInfo.omiso ? 'Sí' : 'No'}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isEditing && historialInfo?.encontrado && (() => {
              const cliHist = historialInfo.cliente_historico || {};
              const resumenHist = historialInfo.resumen || {};
              const prestamosHist = Array.isArray(historialInfo.prestamos) ? historialInfo.prestamos : [];
              const clasificacion = resumenHist.clasificacion || 'SIN_PRESTAMOS';

              const palette =
                clasificacion === 'DEUDA_PENDIENTE'
                  ? {
                      bg: isDark ? 'rgba(198, 93, 88, 0.16)' : '#FCEEE9',
                      border: isDark ? 'rgba(248, 113, 113, 0.36)' : 'rgba(198, 93, 88, 0.32)',
                      accent: isDark ? '#F87171' : '#C65D58',
                      title: 'Antecedente registrado · Dejó saldo pendiente',
                      Icon: AlertCircle
                    }
                  : clasificacion === 'BUEN_PAGADOR'
                    ? {
                        bg: isDark ? 'rgba(57, 125, 103, 0.18)' : '#E6F2EE',
                        border: isDark ? 'rgba(52, 211, 153, 0.34)' : 'rgba(57, 125, 103, 0.32)',
                        accent: isDark ? '#34D399' : '#397D67',
                        title: 'Antecedente registrado · Pagos completados',
                        Icon: UserCheck
                      }
                    : {
                        bg: isDark ? 'rgba(182, 154, 85, 0.16)' : '#F7F2E4',
                        border: isDark ? 'rgba(212, 181, 106, 0.36)' : 'rgba(158, 131, 66, 0.36)',
                        accent: isDark ? '#D4B56A' : '#9E8342',
                        title: 'Antecedente registrado · Estuvo registrado antes',
                        Icon: History
                      };

              const StatusIcon = palette.Icon;
              const formatColonesLocal = (val) => {
                const n = Number(val);
                const safe = Number.isFinite(n) ? n : 0;
                return `₡${safe.toLocaleString('es-CR', { maximumFractionDigits: 0 })}`;
              };
              const canAutocomplete = Boolean(
                cliHist.nombre || cliHist.telefono || cliHist.ubicacion || cliHist.detalles
              );

              const handleAutocompletarHistorial = () => {
                const targetTipo = cliHist.tipo_cliente === 'EXTRANJERO' ? 'EXTRANJERO' : 'COSTARRICENSE';
                setTipoCliente(targetTipo);

                if (targetTipo === 'COSTARRICENSE' && cliHist.cedula) {
                  setCedula(formatCedulaCR(cliHist.cedula));
                }
                if (cliHist.nombre) setNombre(cliHist.nombre);
                if (cliHist.apellidos !== undefined && cliHist.apellidos !== null) {
                  setApellidos(cliHist.apellidos);
                }

                if (cliHist.telefono) {
                  const parsedMain = parseStoredPhone(cliHist.telefono);
                  if (targetTipo === 'EXTRANJERO' && parsedMain.country?.id === 'CR') {
                    const fallbackExt = PHONE_COUNTRIES.find((c) => c.id !== 'CR') || DEFAULT_COUNTRY;
                    setSelectedCountry(fallbackExt);
                  } else {
                    setSelectedCountry(parsedMain.country || DEFAULT_COUNTRY);
                  }
                  setTelefono(parsedMain.formatted || '');
                }

                if (cliHist.telefono_secundario) {
                  const parsedSec = parseStoredPhone(cliHist.telefono_secundario);
                  if (targetTipo === 'EXTRANJERO' && parsedSec.country?.id === 'CR') {
                    const fallbackExt = PHONE_COUNTRIES.find((c) => c.id !== 'CR') || DEFAULT_COUNTRY;
                    setSelectedSecondaryCountry(fallbackExt);
                  } else {
                    setSelectedSecondaryCountry(parsedSec.country || DEFAULT_COUNTRY);
                  }
                  setSecondaryPhoneDigits(parsedSec.formatted || '');
                }

                if (cliHist.ubicacion) setUbicacion(cliHist.ubicacion);
                if (cliHist.detalles) setDetalles(cliHist.detalles);

                setFieldErrors((prev) => ({
                  ...prev,
                  cedula: false,
                  nombre: false,
                  telefono: false,
                  telefonoSecundario: false,
                  ubicacion: false
                }));
              };

              return (
                <div
                  data-testid="historial-permanente-detector"
                  style={{
                    flexShrink: 0,
                    borderRadius: '14px',
                    border: `1px solid ${palette.border}`,
                    backgroundColor: palette.bg,
                    overflow: 'hidden',
                    marginBottom: '4px'
                  }}
                >
                  <button
                    type="button"
                    data-testid="historial-permanente-pill"
                    onClick={() => setIsHistorialExpanded((prev) => !prev)}
                    aria-expanded={isHistorialExpanded}
                    style={{
                      width: '100%',
                      flexShrink: 0,
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: palette.accent
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <StatusIcon size={16} strokeWidth={2.3} style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 800,
                          lineHeight: 1.3,
                          color: palette.accent,
                          overflowWrap: 'anywhere'
                        }}
                      >
                        {palette.title}
                      </span>
                    </div>
                    <ChevronDown
                      size={16}
                      strokeWidth={2.4}
                      style={{
                        flexShrink: 0,
                        transform: isHistorialExpanded ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.16s ease'
                      }}
                    />
                  </button>

                  {isHistorialExpanded && (
                    <div
                      data-testid="historial-permanente-detalle"
                      style={{
                        flexShrink: 0,
                        padding: '12px',
                        borderTop: `1px solid ${palette.border}`,
                        backgroundColor: isDark ? 'rgba(13, 21, 32, 0.72)' : 'rgba(255, 255, 255, 0.72)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: 'var(--aureus-text-primary)',
                            overflowWrap: 'anywhere'
                          }}
                        >
                          {cliHist.nombre_completo ||
                            [cliHist.nombre, cliHist.apellidos].filter(Boolean).join(' ').trim() ||
                            'Registro anterior'}
                        </span>
                        {(cliHist.ubicacion || cliHist.telefono) && (
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: 'var(--aureus-text-secondary)',
                              overflowWrap: 'anywhere'
                            }}
                          >
                            {[cliHist.telefono, cliHist.ubicacion].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                          gap: '8px'
                        }}
                      >
                        <div
                          style={{
                            padding: '8px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            border: '1px solid var(--aureus-border-subtle)',
                            minWidth: 0
                          }}
                        >
                          <div
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                              color: 'var(--aureus-text-muted)'
                            }}
                          >
                            PRÉSTAMOS
                          </div>
                          <div
                            style={{
                              marginTop: '2px',
                              fontSize: '13.5px',
                              fontWeight: 800,
                              color: 'var(--aureus-text-primary)'
                            }}
                          >
                            {Number(resumenHist.total_prestamos ?? 0)}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: '8px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            border: '1px solid var(--aureus-border-subtle)',
                            minWidth: 0
                          }}
                        >
                          <div
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                              color: 'var(--aureus-text-muted)'
                            }}
                          >
                            TOTAL ABONADO
                          </div>
                          <div
                            style={{
                              marginTop: '2px',
                              fontSize: '13.5px',
                              fontWeight: 800,
                              color: isDark ? '#34D399' : '#397D67',
                              overflowWrap: 'anywhere'
                            }}
                          >
                            {formatColonesLocal(resumenHist.total_abonado ?? 0)}
                          </div>
                        </div>

                        <div
                          style={{
                            padding: '8px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            border: '1px solid var(--aureus-border-subtle)',
                            minWidth: 0
                          }}
                        >
                          <div
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                              color: 'var(--aureus-text-muted)'
                            }}
                          >
                            DEJÓ SIN PAGAR
                          </div>
                          <div
                            style={{
                              marginTop: '2px',
                              fontSize: '13.5px',
                              fontWeight: 800,
                              color:
                                Number(resumenHist.saldo_impago_total ?? 0) > 0
                                  ? isDark
                                    ? '#F87171'
                                    : '#C65D58'
                                  : 'var(--aureus-text-primary)',
                              overflowWrap: 'anywhere'
                            }}
                          >
                            {formatColonesLocal(resumenHist.saldo_impago_total ?? 0)}
                          </div>
                        </div>
                      </div>

                      {Number(resumenHist.atrasos_totales ?? 0) > 0 && (
                        <div
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            color: palette.accent
                          }}
                        >
                          Atrasos acumulados: {Number(resumenHist.atrasos_totales)}
                        </div>
                      )}

                      {prestamosHist.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {prestamosHist.slice(0, 3).map((pr, idx) => (
                            <div
                              key={pr.id || idx}
                              style={{
                                padding: '7px 9px',
                                borderRadius: '9px',
                                backgroundColor: 'var(--aureus-bg-elevated)',
                                border: '1px solid var(--aureus-border-subtle)',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                color: 'var(--aureus-text-secondary)',
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '6px',
                                justifyContent: 'space-between'
                              }}
                            >
                              <span>
                                Monto {formatColonesLocal(pr.monto_prestado ?? 0)} · Abonado{' '}
                                {formatColonesLocal(pr.monto_pagado_acumulado ?? 0)}
                              </span>
                              <span
                                style={{
                                  fontWeight: 800,
                                  color:
                                    Number(pr.saldo_por_pagar ?? 0) > 0
                                      ? isDark
                                        ? '#F87171'
                                        : '#C65D58'
                                      : isDark
                                        ? '#34D399'
                                        : '#397D67'
                                }}
                              >
                                Saldo {formatColonesLocal(pr.saldo_por_pagar ?? 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {canAutocomplete && (
                        <button
                          type="button"
                          data-testid="btn-autocompletar-historial"
                          onClick={handleAutocompletarHistorial}
                          style={{
                            alignSelf: 'flex-start',
                            padding: '7px 12px',
                            borderRadius: '10px',
                            border: `1px solid ${palette.border}`,
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            color: 'var(--aureus-text-primary)',
                            fontSize: '12px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <RotateCcw size={13} strokeWidth={2.3} />
                          <span>Autocompletar datos anteriores</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 2. Campos Nombre (Obligatorio) y Apellidos (Opcional) */}
            <div className="form-grid-two-cols">
              <div className="form-field-group">
                <label htmlFor="input-nombre" className="form-field-label">
                  Nombre <span className="text-red-500 font-bold" style={{ color: '#ef4444', fontWeight: 800 }}>*</span>
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
            <div className="form-field-group w-full" style={{ position: 'relative' }} ref={countryMenuRef}>
              <label htmlFor="input-telefono" className="form-field-label">
                Teléfono <span className="text-red-500 font-bold" style={{ color: '#ef4444', fontWeight: 800 }}>*</span>
              </label>

              {tipoCliente === 'COSTARRICENSE' ? (
                /* Modalidad Costarricense: Único input directo sin botón País ni prefijo */
                <input
                  id="input-telefono"
                  type="tel"
                  inputMode="numeric"
                  placeholder="XXXX-XXXX"
                  value={telefono}
                  onChange={handleTelefonoChange}
                  className={`form-input ${fieldErrors.telefono ? redInputClasses : ''}`}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '12px',
                    padding: '0 14px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--aureus-text-primary)',
                    boxSizing: 'border-box',
                    border: fieldErrors.telefono ? '1.5px solid #ef4444' : '1px solid var(--aureus-border-subtle)',
                    backgroundColor: fieldErrors.telefono ? 'var(--aureus-red-light)' : 'var(--aureus-bg-elevated)',
                    boxShadow: fieldErrors.telefono ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                />
              ) : (
                /* Modalidad Extranjero: Input compuesto con bandera SVG + código a la izquierda y botón País */
                <>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div
                      className={`cf-phone-field-wrapper ${fieldErrors.telefono ? 'has-error' : ''}`}
                      style={{
                        flex: 1,
                        height: '46px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        border: fieldErrors.telefono ? '1.5px solid #ef4444' : '1px solid var(--aureus-border-subtle)',
                        backgroundColor: fieldErrors.telefono ? 'var(--aureus-red-light)' : 'var(--aureus-bg-elevated)',
                        boxShadow: fieldErrors.telefono ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          padding: '0 11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: fieldErrors.telefono ? 'var(--aureus-red-light)' : 'var(--aureus-bg-muted)',
                          borderRight: fieldErrors.telefono ? '1px solid var(--aureus-red-border)' : '1px solid var(--aureus-border-subtle)',
                          fontWeight: 800,
                          fontSize: '13.5px',
                          color: 'var(--aureus-text-primary)',
                          flexShrink: 0,
                          userSelect: 'none'
                        }}
                        title={`País activo: ${selectedCountry.name} (${selectedCountry.code})`}
                      >
                        <CountryFlagSvg countryId={selectedCountry.id} size={18} />
                        <span>{selectedCountry.code}</span>
                      </div>

                      <input
                        id="input-telefono"
                        type="tel"
                        inputMode="numeric"
                        placeholder={selectedCountry.placeholder}
                        value={telefono}
                        onChange={handleTelefonoChange}
                        style={{
                          flex: 1,
                          height: '100%',
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          padding: '0 12px',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'var(--aureus-text-primary)',
                          width: '100%'
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowCountryMenu((prev) => {
                          if (prev) setCountrySearch('');
                          return !prev;
                        })
                      }
                      title="Cambiar país del teléfono"
                      style={{
                        height: '46px',
                        padding: '0 13px',
                        borderRadius: '12px',
                        border: showCountryMenu ? '1.5px solid #B69A55' : '1px solid var(--aureus-border-subtle)',
                        backgroundColor: showCountryMenu ? 'var(--aureus-gold-light)' : 'var(--aureus-bg-elevated)',
                        color: showCountryMenu ? 'var(--aureus-gold-text)' : 'var(--aureus-text-primary)',
                        fontWeight: 800,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Globe size={16} strokeWidth={2} />
                      <span>País</span>
                      <ChevronDown
                        size={14}
                        strokeWidth={2.4}
                        style={{
                          transform: showCountryMenu ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.18s ease'
                        }}
                      />
                    </button>
                  </div>

                  {/* Menú flotante de países (filtrando CR) */}
                  {showCountryMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '72px',
                        left: 0,
                        right: 0,
                        maxHeight: '260px',
                        backgroundColor: 'var(--aureus-bg-surface)',
                        borderRadius: '16px',
                        border: '1px solid var(--aureus-border-subtle)',
                        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.3)',
                        zIndex: 60,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          padding: '6px 6px 8px 6px',
                          borderBottom: '1px solid var(--aureus-border-subtle)',
                          position: 'sticky',
                          top: 0,
                          backgroundColor: 'var(--aureus-bg-surface)',
                          zIndex: 2
                        }}
                      >
                        <div
                          className="cf-search-pill"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            height: '38px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            border: '1px solid var(--aureus-border-subtle)'
                          }}
                        >
                          <Search size={15} color="var(--aureus-text-muted)" style={{ flexShrink: 0 }} />
                          <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Buscar país..."
                            autoFocus
                            style={{
                              flex: 1,
                              minWidth: 0,
                              border: 'none',
                              outline: 'none',
                              boxShadow: 'none',
                              backgroundColor: 'transparent',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--aureus-text-primary)'
                            }}
                          />
                          {countrySearch && (
                            <button
                              type="button"
                              onClick={() => setCountrySearch('')}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                color: 'var(--aureus-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                              title="Limpiar búsqueda"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          maxHeight: '190px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          padding: '4px 6px 6px 6px'
                        }}
                      >
                        {PHONE_COUNTRIES.filter((c) => c.id !== 'CR').filter((c) =>
                          String(c.name || '')
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase()
                            .trim()
                            .includes(
                              String(countrySearch || '')
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .toLowerCase()
                                .trim()
                            )
                        ).map((c) => {
                          const isSelected = c.id === selectedCountry.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectCountry(c)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 12px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: isSelected ? 'var(--aureus-gold-light)' : 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                transition: 'background-color 0.12s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CountryFlagSvg countryId={c.id} size={22} />
                                <span style={{ fontSize: '13.5px', fontWeight: 700, color: isSelected ? 'var(--aureus-gold-text)' : 'var(--aureus-text-primary)' }}>
                                  {c.name}
                                </span>
                              </div>
                              {isSelected && <Check size={16} strokeWidth={2.4} color="#B69A55" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 4. Campo TELÉFONO SECUNDARIO (100% Opcional) */}
            <div className="form-field-group w-full" style={{ position: 'relative' }} ref={secondaryCountryMenuRef}>
              <label htmlFor="input-telefono-secundario" className="form-field-label">
                TELÉFONO SECUNDARIO
              </label>

              {tipoCliente === 'COSTARRICENSE' ? (
                /* Modalidad Costarricense: Único input directo sin botón País ni prefijo */
                <input
                  id="input-telefono-secundario"
                  type="tel"
                  inputMode="numeric"
                  placeholder="XXXX-XXXX"
                  value={secondaryPhoneDigits}
                  onChange={handleSecondaryTelefonoChange}
                  className={`form-input ${fieldErrors.telefonoSecundario ? redInputClasses : ''}`}
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '12px',
                    padding: '0 14px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--aureus-text-primary)',
                    boxSizing: 'border-box',
                    border: fieldErrors.telefonoSecundario ? '1.5px solid #ef4444' : '1px solid var(--aureus-border-subtle)',
                    backgroundColor: fieldErrors.telefonoSecundario ? 'var(--aureus-red-light)' : 'var(--aureus-bg-elevated)',
                    boxShadow: fieldErrors.telefonoSecundario ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                />
              ) : (
                /* Modalidad Extranjero: Input compuesto con bandera SVG + código a la izquierda y botón País */
                <>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div
                      className={`cf-phone-field-wrapper ${fieldErrors.telefonoSecundario ? 'has-error' : ''}`}
                      style={{
                        flex: 1,
                        height: '46px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        border: fieldErrors.telefonoSecundario ? '1.5px solid #ef4444' : '1px solid var(--aureus-border-subtle)',
                        backgroundColor: fieldErrors.telefonoSecundario ? 'var(--aureus-red-light)' : 'var(--aureus-bg-elevated)',
                        boxShadow: fieldErrors.telefonoSecundario ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          padding: '0 11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: fieldErrors.telefonoSecundario ? 'var(--aureus-red-light)' : 'var(--aureus-bg-muted)',
                          borderRight: fieldErrors.telefonoSecundario ? '1px solid var(--aureus-red-border)' : '1px solid var(--aureus-border-subtle)',
                          fontWeight: 800,
                          fontSize: '13.5px',
                          color: 'var(--aureus-text-primary)',
                          flexShrink: 0,
                          userSelect: 'none'
                        }}
                        title={`País activo: ${selectedSecondaryCountry.name} (${selectedSecondaryCountry.code})`}
                      >
                        <CountryFlagSvg countryId={selectedSecondaryCountry.id} size={18} />
                        <span>{selectedSecondaryCountry.code}</span>
                      </div>

                      <input
                        id="input-telefono-secundario"
                        type="tel"
                        inputMode="numeric"
                        placeholder={selectedSecondaryCountry.placeholder}
                        value={secondaryPhoneDigits}
                        onChange={handleSecondaryTelefonoChange}
                        style={{
                          flex: 1,
                          height: '100%',
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          padding: '0 12px',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'var(--aureus-text-primary)',
                          width: '100%'
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setShowSecondaryCountryMenu((prev) => {
                          if (prev) setSecondaryCountrySearch('');
                          return !prev;
                        })
                      }
                      title="Cambiar país del teléfono secundario"
                      style={{
                        height: '46px',
                        padding: '0 13px',
                        borderRadius: '12px',
                        border: showSecondaryCountryMenu ? '1.5px solid #B69A55' : '1px solid var(--aureus-border-subtle)',
                        backgroundColor: showSecondaryCountryMenu ? 'var(--aureus-gold-light)' : 'var(--aureus-bg-elevated)',
                        color: showSecondaryCountryMenu ? 'var(--aureus-gold-text)' : 'var(--aureus-text-primary)',
                        fontWeight: 800,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Globe size={16} strokeWidth={2} />
                      <span>País</span>
                      <ChevronDown
                        size={14}
                        strokeWidth={2.4}
                        style={{
                          transform: showSecondaryCountryMenu ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.18s ease'
                        }}
                      />
                    </button>
                  </div>

                  {/* Menú flotante de países para teléfono secundario (filtrando CR) */}
                  {showSecondaryCountryMenu && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '72px',
                        left: 0,
                        right: 0,
                        maxHeight: '260px',
                        backgroundColor: 'var(--aureus-bg-surface)',
                        borderRadius: '16px',
                        border: '1px solid var(--aureus-border-subtle)',
                        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.3)',
                        zIndex: 60,
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          padding: '6px 6px 8px 6px',
                          borderBottom: '1px solid var(--aureus-border-subtle)',
                          position: 'sticky',
                          top: 0,
                          backgroundColor: 'var(--aureus-bg-surface)',
                          zIndex: 2
                        }}
                      >
                        <div
                          className="cf-search-pill"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            height: '38px',
                            padding: '0 12px',
                            borderRadius: '9999px',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            border: '1px solid var(--aureus-border-subtle)'
                          }}
                        >
                          <Search size={15} color="var(--aureus-text-muted)" style={{ flexShrink: 0 }} />
                          <input
                            type="text"
                            value={secondaryCountrySearch}
                            onChange={(e) => setSecondaryCountrySearch(e.target.value)}
                            placeholder="Buscar país..."
                            autoFocus
                            style={{
                              flex: 1,
                              minWidth: 0,
                              border: 'none',
                              outline: 'none',
                              boxShadow: 'none',
                              backgroundColor: 'transparent',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: 'var(--aureus-text-primary)'
                            }}
                          />
                          {secondaryCountrySearch && (
                            <button
                              type="button"
                              onClick={() => setSecondaryCountrySearch('')}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                color: 'var(--aureus-text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}
                              title="Limpiar búsqueda"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          maxHeight: '190px',
                          overflowY: 'auto',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          padding: '4px 6px 6px 6px'
                        }}
                      >
                        {PHONE_COUNTRIES.filter((c) => c.id !== 'CR').filter((c) =>
                          String(c.name || '')
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .toLowerCase()
                            .trim()
                            .includes(
                              String(secondaryCountrySearch || '')
                                .normalize('NFD')
                                .replace(/[\u0300-\u036f]/g, '')
                                .toLowerCase()
                                .trim()
                            )
                        ).map((c) => {
                          const isSelected = c.id === selectedSecondaryCountry.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectSecondaryCountry(c)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 12px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: isSelected ? 'var(--aureus-gold-light)' : 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left',
                                width: '100%',
                                transition: 'background-color 0.12s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <CountryFlagSvg countryId={c.id} size={22} />
                                <span style={{ fontSize: '13.5px', fontWeight: 700, color: isSelected ? 'var(--aureus-gold-text)' : 'var(--aureus-text-primary)' }}>
                                  {c.name}
                                </span>
                              </div>
                              {isSelected && <Check size={16} strokeWidth={2.4} color="#B69A55" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 5. Campo Ubicación (Obligatorio) */}
            <div className="form-field-group w-full">
              <label htmlFor="input-ubicacion" className="form-field-label">
                Ubicación <span className="text-red-500 font-bold" style={{ color: '#ef4444', fontWeight: 800 }}>*</span>
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

            {/* 6. Campo Detalles (Opcional) */}
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

            {/* Botón de Guardado: Ancho completo */}
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
        )}
      </div>
    </div>
  );
}
