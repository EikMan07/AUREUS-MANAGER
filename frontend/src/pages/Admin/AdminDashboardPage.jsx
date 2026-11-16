import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ShieldCheck,
  Users,
  Database,
  FileCheck2,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  KeyRound,
  Trash2,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Lock,
  Copy,
  Check,
  X,
  Minimize2,
  Maximize2,
  GripHorizontal
} from 'lucide-react';
import { AureusLogo } from '../../components/Common/AureusLogo.jsx';
import { UserAccountMenu } from '../../components/Profile/UserAccountMenu.jsx';
import { UserProfileModal } from '../../components/Profile/UserProfileModal.jsx';
import { ConfirmActionStage } from '../../components/Modals/ConfirmActionStage.jsx';
import { AlertModal } from '../../components/Modals/AlertModal.jsx';
import {
  ClassicalArchitecturalBackdrop,
  FlutedPilasters,
  ImperialCornerAccents,
  handleSpotlightMouseMove
} from '../../components/Common/ClassicalAppArchitecture.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAccessibility } from '../../context/AccessibilityContext.jsx';
import { dbService } from '../../services/db.js';
import { formatColones } from '../../utils/formatters.js';
import { CountryFlagSvg } from '../../utils/phoneCountries.jsx';

const formatAdminCRPhoneInput = (rawValue) => {
  let digits = String(rawValue || '').replace(/\D/g, '');
  if (digits.startsWith('506') && digits.length > 8) {
    digits = digits.slice(3);
  }
  digits = digits.slice(0, 8);
  if (digits.length > 4) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return digits;
};

const ADMIN_MODULES = [
  {
    key: 'centro-mando',
    roman: 'I',
    label: 'Centro de Mando',
    shortLabel: 'Mando',
    icon: ShieldCheck
  },
  {
    key: 'prestamistas',
    roman: 'II',
    label: 'Prestamistas',
    shortLabel: 'Prestamistas',
    icon: Users
  },
  {
    key: 'depuracion',
    roman: 'III',
    label: 'Depuración y Operaciones',
    shortLabel: 'Depuración',
    icon: Database
  },
  {
    key: 'auditoria',
    roman: 'IV',
    label: 'Gobernanza y Auditoría',
    shortLabel: 'Auditoría',
    icon: FileCheck2
  }
];

function getProfileInitials(name, username) {
  const source = String(name || username || 'AD').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatDateTimeCR(iso) {
  if (!iso) return 'Sin registro';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return 'Sin registro';
    return d.toLocaleDateString('es-CR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (_err) {
    return 'Sin registro';
  }
}

export function AdminDashboardPage() {
  const { isDark } = useTheme();
  const { usuario } = useAuth();
  const { t } = useAccessibility();

  const [activeModule, setActiveModule] = useState('centro-mando');
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileModalSection, setProfileModalSection] = useState('perfil');

  const handleOpenAccountSection = useCallback((targetSection = 'perfil') => {
    const normalized =
      targetSection === 'accesibilidad' || targetSection === 'accessibility'
        ? 'accesibilidad'
        : targetSection === 'configuracion' || targetSection === 'settings'
          ? 'configuracion'
          : 'perfil';
    setProfileModalSection(normalized);
    setIsAccountMenuOpen(false);
    setIsProfileModalOpen(true);
  }, []);

  // Datos de API /api/admin
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [prestamistas, setPrestamistas] = useState([]);
  const [depuracionList, setDepuracionList] = useState([]);
  const [auditoriaList, setAuditoriaList] = useState([]);

  // Filtros en módulo II y IV
  const [searchPrestamista, setSearchPrestamista] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('TODOS');
  const [searchAuditoria, setSearchAuditoria] = useState('');

  // Modal de Crear / Editar Prestamista
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingPrestamista, setEditingPrestamista] = useState(null);
  const [formNombre, setFormNombre] = useState('');
  const [formCorreo, setFormCorreo] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formEstado, setFormEstado] = useState('ACTIVA');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formTelefonoError, setFormTelefonoError] = useState(false);

  // Modal Restablecer Contraseña
  const [passwordModalTarget, setPasswordModalTarget] = useState(null);
  const [customNewPassword, setCustomNewPassword] = useState('');
  const [generatedPasswordResult, setGeneratedPasswordResult] = useState('');
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordFormError, setPasswordFormError] = useState('');
  const [passwordFieldError, setPasswordFieldError] = useState(false);

  // Modal de Confirmación con doble verificación + Cápsula Escénica Centrada
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmPhase, setConfirmPhase] = useState('idle');
  const [activeStageConfig, setActiveStageConfig] = useState(null);
  const [isExecutingConfirm, setIsExecutingConfirm] = useState(false);

  // AlertModal global
  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    iconType: 'success'
  });

  // Dock flotante arrastrable y minimizable
  const [isDockMinimized, setIsDockMinimized] = useState(false);
  const [dockOffset, setDockOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef({ active: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const showAlert = useCallback((title, message, iconType = 'success') => {
    setAlertConfig({
      isOpen: true,
      title,
      message,
      iconType
    });
  }, []);

  const cargarTodoAdmin = useCallback(async () => {
    setLoading(true);
    try {
      const [rResumen, rPrestamistas, rDepuracion, rAuditoria] = await Promise.allSettled([
        dbService.obtenerResumenAdmin(),
        dbService.obtenerPrestamistasAdmin(),
        dbService.obtenerResumenDepuracionAdmin(),
        dbService.obtenerAuditoriaAdmin(80)
      ]);

      if (rResumen.status === 'fulfilled') {
        setResumen(rResumen.value || null);
      } else {
        setResumen(null);
      }

      if (rPrestamistas.status === 'fulfilled') {
        const list = rPrestamistas.value?.prestamistas || rPrestamistas.value?.data || [];
        setPrestamistas(Array.isArray(list) ? list : []);
      } else {
        setPrestamistas([]);
      }

      if (rDepuracion.status === 'fulfilled') {
        const depData =
          rDepuracion.value?.prestamistas ||
          rDepuracion.value?.resumen ||
          rDepuracion.value?.data ||
          [];
        setDepuracionList(Array.isArray(depData) ? depData : []);
      } else {
        setDepuracionList([]);
      }

      if (rAuditoria.status === 'fulfilled') {
        const evList = rAuditoria.value?.eventos || rAuditoria.value?.data || [];
        setAuditoriaList(Array.isArray(evList) ? evList : []);
      } else {
        setAuditoriaList([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTodoAdmin();
  }, [cargarTodoAdmin]);

  // Handlers de arrastre del Dock
  const handleDockPointerDown = (e) => {
    if (e.target.closest('button')) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: dockOffset.x,
      origY: dockOffset.y
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handleDockPointerMove = (e) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setDockOffset({
      x: Math.max(-220, Math.min(220, dragRef.current.origX + dx)),
      y: Math.max(-180, Math.min(40, dragRef.current.origY + dy))
    });
  };

  const handleDockPointerUp = () => {
    dragRef.current.active = false;
  };

  const currentModuleObj =
    ADMIN_MODULES.find((m) => m.key === activeModule) || ADMIN_MODULES[0];

  const firstName =
    String(usuario?.nombre_completo || '')
      .trim()
      .split(/\s+/)[0] ||
    usuario?.username ||
    'Administrador';
  const profileInitials = getProfileInitials(usuario?.nombre_completo, usuario?.username);

  const filteredPrestamistas = useMemo(() => {
    const term = searchPrestamista.trim().toLowerCase();
    return prestamistas.filter((p) => {
      if (estadoFilter !== 'TODOS' && p.estado_cuenta !== estadoFilter) {
        return false;
      }
      if (!term) return true;
      const nombre = String(p.nombre_completo || '').toLowerCase();
      const correo = String(p.correo || '').toLowerCase();
      const tel = String(p.telefono || '').toLowerCase();
      return nombre.includes(term) || correo.includes(term) || tel.includes(term);
    });
  }, [prestamistas, searchPrestamista, estadoFilter]);

  const filteredAuditoria = useMemo(() => {
    const term = searchAuditoria.trim().toLowerCase();
    if (!term) return auditoriaList;
    return auditoriaList.filter((ev) => {
      const actor = String(ev.actor_nombre || '').toLowerCase();
      const accion = String(ev.accion || '').toLowerCase();
      const entidad = String(ev.entidad || '').toLowerCase();
      const det = String(ev.detalle_sanitizado || '').toLowerCase();
      return (
        actor.includes(term) ||
        accion.includes(term) ||
        entidad.includes(term) ||
        det.includes(term)
      );
    });
  }, [auditoriaList, searchAuditoria]);

  const openCreatePrestamistaModal = () => {
    setEditingPrestamista(null);
    setFormNombre('');
    setFormCorreo('');
    setFormTelefono('');
    setFormPassword('');
    setFormEstado('ACTIVA');
    setFormError('');
    setFormTelefonoError(false);
    setFormModalOpen(true);
  };

  const openEditPrestamistaModal = (p) => {
    setEditingPrestamista(p);
    setFormNombre(p.nombre_completo || '');
    setFormCorreo(p.correo || '');
    setFormTelefono(formatAdminCRPhoneInput(p.telefono));
    setFormPassword('');
    setFormEstado(p.estado_cuenta || 'ACTIVA');
    setFormError('');
    setFormTelefonoError(false);
    setFormModalOpen(true);
  };

  const launchAdminStageAnimation = useCallback(async ({ variant, targetName, detailPill = '' }) => {
    setActiveStageConfig({
      variant,
      targetName: String(targetName || 'Prestamista').trim() || 'Prestamista',
      detailPill
    });
    setConfirmPhase('animating');
    await new Promise((r) => setTimeout(r, 1200));
    setConfirmPhase('exiting');
    await new Promise((r) => setTimeout(r, 280));
    setConfirmPhase('idle');
    setActiveStageConfig(null);
  }, []);

  const handleSavePrestamista = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormTelefonoError(false);
    if (String(formNombre || '').trim().length < 3) {
      setFormError('El nombre completo debe tener al menos 3 caracteres.');
      return;
    }
    if (!String(formCorreo || '').includes('@')) {
      setFormError('Ingresa un correo electrónico válido.');
      return;
    }
    const cleanPhoneDigits = String(formTelefono || '').replace(/\D/g, '');
    if (cleanPhoneDigits.length > 0 && cleanPhoneDigits.length !== 8) {
      setFormTelefonoError(true);
      setFormError('El teléfono debe contener exactamente 8 dígitos de Costa Rica.');
      return;
    }
    if (!editingPrestamista && String(formPassword || '').length < 6) {
      setFormError('La contraseña inicial debe tener mínimo 6 caracteres.');
      return;
    }

    const formattedPhoneToSend =
      cleanPhoneDigits.length === 8
        ? `+506 ${cleanPhoneDigits.slice(0, 4)}-${cleanPhoneDigits.slice(4)}`
        : '';

    const savedName = formNombre.trim();
    setFormSubmitting(true);
    try {
      if (editingPrestamista) {
        await dbService.editarPrestamistaAdmin(editingPrestamista.id, {
          nombre_completo: savedName,
          correo: formCorreo.trim(),
          telefono: formattedPhoneToSend
        });
        setFormModalOpen(false);
        cargarTodoAdmin();
        await launchAdminStageAnimation({
          variant: 'admin_editar_prestamista',
          targetName: savedName,
          detailPill: 'Datos de la cuenta guardados'
        });
      } else {
        await dbService.crearPrestamistaAdmin({
          nombre_completo: savedName,
          correo: formCorreo.trim(),
          telefono: formattedPhoneToSend,
          password: formPassword,
          estado_cuenta: formEstado
        });
        setFormModalOpen(false);
        cargarTodoAdmin();
        await launchAdminStageAnimation({
          variant: 'admin_nuevo_prestamista',
          targetName: savedName,
          detailPill: 'Cuenta habilitada en la plataforma'
        });
      }
    } catch (err) {
      setFormError(err?.userMessage || 'No se pudo guardar la cuenta del prestamista.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleExecuteResetPassword = async (e) => {
    e.preventDefault();
    if (!passwordModalTarget) return;
    setPasswordFormError('');
    setPasswordFieldError(false);

    const rawPass = String(customNewPassword || '').trim();
    if (rawPass.length > 0 && rawPass.length < 8) {
      setPasswordFieldError(true);
      setPasswordFormError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    const targetName = passwordModalTarget.nombre_completo || 'Prestamista';
    setPasswordSubmitting(true);
    try {
      const res = await dbService.restablecerPasswordPrestamistaAdmin(
        passwordModalTarget.id,
        rawPass
      );
      if (rawPass.length >= 8) {
        setPasswordModalTarget(null);
        cargarTodoAdmin();
        await launchAdminStageAnimation({
          variant: 'admin_clave_prestamista',
          targetName,
          detailPill: 'Credencial de acceso renovada'
        });
      } else {
        setGeneratedPasswordResult(res?.credencialTemporal || '');
        cargarTodoAdmin();
      }
    } catch (err) {
      setPasswordFormError(err?.userMessage || 'No se pudo restablecer la contraseña.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const triggerConfirmAction = (config) => {
    setConfirmAction(config);
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction || isExecutingConfirm) return;
    const action = confirmAction;
    setIsExecutingConfirm(true);

    try {
      if (action.type === 'toggle_estado') {
        await dbService.cambiarEstadoPrestamistaAdmin(action.target.id, action.nuevoEstado);
      } else if (action.type === 'eliminar_prestamista') {
        await dbService.eliminarPrestamistaAdmin(action.target.id);
      } else if (action.type === 'depurar_antecedentes') {
        await dbService.depurarRegistrosPrestamistaAdmin(
          action.target.prestamista_id,
          'antecedentes'
        );
      } else if (action.type === 'depurar_papelera') {
        await dbService.depurarRegistrosPrestamistaAdmin(
          action.target.prestamista_id,
          'papelera'
        );
      }

      setConfirmAction(null);
      setIsExecutingConfirm(false);
      cargarTodoAdmin();

      await launchAdminStageAnimation({
        variant: action.stageVariant,
        targetName: action.target?.nombre_completo || 'Prestamista',
        detailPill: action.detailPill || ''
      });
    } catch (err) {
      setConfirmAction(null);
      setIsExecutingConfirm(false);
      showAlert(
        'No se pudo completar la operación',
        err?.userMessage || 'Ocurrió un error al ejecutar la acción administrativa.',
        'alert'
      );
    }
  };

  const metricas = resumen?.metricas || {};

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--aureus-bg-app)',
        color: 'var(--aureus-text-primary)',
        position: 'relative',
        paddingBottom: '110px',
        boxSizing: 'border-box'
      }}
    >
      <div className="aureus-admin-backdrop" aria-hidden="true">
        <ClassicalArchitecturalBackdrop isDark={isDark} />
        <FlutedPilasters isDark={isDark} />
      </div>

      {/* CABECERA ADMINISTRATIVA EXCLUSIVA */}
      <header
        className="header-dark-compact"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          minHeight: '72px',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          background: isDark
            ? 'linear-gradient(135deg, #101C2C 0%, #162436 100%)'
            : '#FFFFFF',
          backgroundColor: isDark ? '#101C2C' : '#FFFFFF',
          color: isDark ? '#F5F3ED' : '#252A31',
          borderBottom: isDark
            ? '1px solid rgba(182, 154, 85, 0.28)'
            : '1px solid #E5E0D5',
          boxShadow: isDark
            ? '0 4px 18px rgba(0, 0, 0, 0.35)'
            : '0 4px 16px rgba(37, 42, 49, 0.05)',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          {/* Marca e Insignia Administrador Único */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AureusLogo size={38} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  className="aureus-imperial-title"
                  style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    color: isDark ? '#F5F3ED' : '#101C2C'
                  }}
                >
                  AUREUS MANAGER
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                    color: '#101C2C',
                    fontSize: '10px',
                    fontWeight: 900,
                    letterSpacing: '0.05em'
                  }}
                >
                  ADMINISTRADOR ÚNICO
                </span>
              </div>
              <div
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: isDark ? '#A3B1C6' : '#526071'
                }}
              >
                Consola de Gobernanza y Gestión de Prestamistas
              </div>
            </div>
          </div>

          {/* Título del módulo activo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '12px',
              backgroundColor: isDark ? 'rgba(27, 43, 64, 0.75)' : '#F7F2E4',
              border: '1px solid rgba(182, 154, 85, 0.35)'
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: 900,
                color: '#B69A55'
              }}
            >
              {currentModuleObj.roman}
            </span>
            <span
              className="aureus-imperial-title"
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: isDark ? '#F5F3ED' : '#101C2C'
              }}
            >
              {currentModuleObj.label}
            </span>
          </div>

          {/* Acciones Derecha: Refrescar y Menú Cuenta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
            <button
              type="button"
              onClick={cargarTodoAdmin}
              title="Sincronizar métricas administrativas"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: isDark ? '#1B2B40' : '#F7F2E4',
                border: isDark ? '1px solid rgba(182, 154, 85, 0.45)' : '1px solid #D5C295',
                color: isDark ? '#E5C97B' : '#252A31',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              data-testid="btn-profile-header"
              className="header-profile-btn"
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsAccountMenuOpen((prev) => !prev)}
              aria-label={t('header.profileAria')}
              title={t('header.profileAria')}
            >
              <span className="header-profile-avatar">
                {usuario?.foto_url ? (
                  <img src={usuario.foto_url} alt={firstName} />
                ) : (
                  profileInitials
                )}
              </span>
              <span className="header-profile-name">{firstName}</span>
            </button>

            <UserAccountMenu
              isOpen={isAccountMenuOpen}
              onClose={() => setIsAccountMenuOpen(false)}
              onOpenSection={handleOpenAccountSection}
              onOpenProfile={handleOpenAccountSection}
            />
          </div>
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL */}
      <main
        className="main-scrollable-content"
        style={{
          maxWidth: '1220px',
          margin: '0 auto',
          padding: '18px 16px 40px',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* MÓDULO I: CENTRO DE MANDO */}
        {activeModule === 'centro-mando' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Banner de Separación Legal y Rol Único */}
            <div
              className="rb-spotlight-card"
              onMouseMove={handleSpotlightMouseMove}
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '16px 18px',
                borderRadius: '16px',
                backgroundColor: 'var(--aureus-bg-surface)',
                border: '1px solid rgba(182, 154, 85, 0.45)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}
            >
              <ImperialCornerAccents isDark={isDark} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1 1 280px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                    color: '#101C2C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Lock size={22} strokeWidth={2.2} />
                </div>
                <div>
                  <h2
                    className="aureus-imperial-title"
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 900,
                      color: 'var(--aureus-text-primary)'
                    }}
                  >
                    Privacidad de Datos Garantizada · Ley N.° 8968
                  </h2>
                  <p
                    style={{
                      margin: '3px 0 0',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: 'var(--aureus-text-secondary)'
                    }}
                  >
                    Esta cuenta es el único Administrador de la plataforma y está desvinculada de cualquier operación de cobros. Gestiona el acceso de los prestamistas sin exponer datos privados de sus clientes.
                  </p>
                </div>
              </div>
            </div>

            {/* Tarjetas KPI Globales */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px'
              }}
            >
              <div
                className="rb-spotlight-card"
                onMouseMove={handleSpotlightMouseMove}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--aureus-bg-surface)',
                  border: '1px solid var(--aureus-border-subtle)'
                }}
              >
                <ImperialCornerAccents isDark={isDark} />
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aureus-text-muted)' }}>
                  PRESTAMISTAS REGISTRADOS
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 900,
                    color: 'var(--aureus-text-primary)',
                    marginTop: '4px'
                  }}
                >
                  {Number(metricas.total_prestamistas ?? 0)}
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--aureus-text-secondary)',
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}
                >
                  <span style={{ color: isDark ? '#34D399' : '#397D67' }}>
                    Activos: {Number(metricas.prestamistas_activos ?? 0)}
                  </span>
                  <span style={{ color: '#D97706' }}>
                    Suspendidos: {Number(metricas.prestamistas_suspendidos ?? 0)}
                  </span>
                  <span>Inactivos: {Number(metricas.prestamistas_inactivos ?? 0)}</span>
                </div>
              </div>

              <div
                className="rb-spotlight-card"
                onMouseMove={handleSpotlightMouseMove}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--aureus-bg-surface)',
                  border: '1px solid var(--aureus-border-subtle)'
                }}
              >
                <ImperialCornerAccents isDark={isDark} />
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aureus-text-muted)' }}>
                  VOLUMEN GLOBAL EN PLATAFORMA
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 900,
                    color: 'var(--aureus-text-primary)',
                    marginTop: '4px'
                  }}
                >
                  {Number(metricas.volumen_clientes_activos_global ?? 0)}
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--aureus-text-secondary)'
                  }}
                >
                  Clientes activos · {Number(metricas.volumen_prestamos_activos_global ?? 0)}{' '}
                  préstamos vigentes
                </div>
              </div>

              <div
                className="rb-spotlight-card"
                onMouseMove={handleSpotlightMouseMove}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--aureus-bg-surface)',
                  border: '1px solid var(--aureus-border-subtle)'
                }}
              >
                <ImperialCornerAccents isDark={isDark} />
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aureus-text-muted)' }}>
                  ANTECEDENTES Y PAPELERA GLOBAL
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 900,
                    color: '#B69A55',
                    marginTop: '4px'
                  }}
                >
                  {Number(metricas.volumen_antecedentes_archivados_global ?? 0)}
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--aureus-text-secondary)'
                  }}
                >
                  Antecedentes · {Number(metricas.volumen_prestamos_archivados_global ?? 0)}{' '}
                  préstamos archivados · {Number(metricas.volumen_clientes_papelera_global ?? 0)} en
                  papelera
                </div>
              </div>

              <div
                className="rb-spotlight-card"
                onMouseMove={handleSpotlightMouseMove}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--aureus-bg-surface)',
                  border: '1px solid var(--aureus-border-subtle)'
                }}
              >
                <ImperialCornerAccents isDark={isDark} />
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--aureus-text-muted)' }}>
                  EVENTOS DE AUDITORÍA INMUTABLE
                </div>
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 900,
                    color: 'var(--aureus-text-primary)',
                    marginTop: '4px'
                  }}
                >
                  {Number(metricas.total_eventos_auditoria ?? 0)}
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--aureus-text-secondary)'
                  }}
                >
                  Registros protegidos en bitácora
                </div>
              </div>
            </div>

            {/* Accesos Rápidos de Mando */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveModule('prestamistas')}
                style={{
                  textAlign: 'left',
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--aureus-bg-surface)',
                  border: '1px solid var(--aureus-border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="#B69A55" />
                  <span
                    className="aureus-imperial-title"
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: 'var(--aureus-text-primary)'
                    }}
                  >
                    Gestionar Cuentas de Prestamistas
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--aureus-text-secondary)' }}>
                  Dar de alta, editar, suspender, reactivar o restablecer credenciales de cobradores.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModule('depuracion')}
                style={{
                  textAlign: 'left',
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--aureus-bg-surface)',
                  border: '1px solid var(--aureus-border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={18} color="#B69A55" />
                  <span
                    className="aureus-imperial-title"
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: 'var(--aureus-text-primary)'
                    }}
                  >
                    Depuración de Antecedentes y Papelera
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--aureus-text-secondary)' }}>
                  Limpiar registros históricos archivados o vaciar papeleras por cuenta de prestamista.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModule('auditoria')}
                style={{
                  textAlign: 'left',
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--aureus-bg-surface)',
                  border: '1px solid var(--aureus-border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileCheck2 size={18} color="#B69A55" />
                  <span
                    className="aureus-imperial-title"
                    style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: 'var(--aureus-text-primary)'
                    }}
                  >
                    Bitácora de Gobernanza y Auditoría
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--aureus-text-secondary)' }}>
                  Inspeccionar eventos técnicos sanitizados bajo el estándar de privacidad Ley 8968.
                </span>
              </button>
            </div>
          </div>
        )}

        {/* MÓDULO II: PRESTAMISTAS */}
        {activeModule === 'prestamistas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Barra superior de búsqueda y botón de alta */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '16px',
                backgroundColor: 'var(--aureus-bg-surface)',
                border: '1px solid var(--aureus-border-subtle)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: '1 1 240px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--aureus-bg-elevated)',
                  border: '1px solid var(--aureus-border-subtle)'
                }}
              >
                <Search size={16} color="var(--aureus-text-muted)" />
                <input
                  type="text"
                  value={searchPrestamista}
                  onChange={(e) => setSearchPrestamista(e.target.value)}
                  placeholder="Buscar prestamista por nombre, correo o teléfono..."
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: 'var(--aureus-text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    width: '100%'
                  }}
                />
              </div>

              <button
                type="button"
                data-testid="btn-nuevo-prestamista-admin"
                onClick={openCreatePrestamistaModal}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  border: '1px solid #B69A55',
                  background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                  color: '#101C2C',
                  fontSize: '12.5px',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Registrar nuevo prestamista</span>
              </button>
            </div>

            {/* Pestañas de estado con contraste imperial */}
            <div
              role="tablist"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                padding: '5px',
                borderRadius: '14px',
                backgroundColor: 'var(--aureus-bg-surface)',
                border: '1px solid var(--aureus-border-subtle)'
              }}
            >
              {[
                { key: 'TODOS', label: 'Todos', count: prestamistas.length },
                {
                  key: 'ACTIVA',
                  label: 'Activos',
                  count: prestamistas.filter((p) => p.estado_cuenta === 'ACTIVA').length
                },
                {
                  key: 'SUSPENDIDA',
                  label: 'Suspendidos',
                  count: prestamistas.filter((p) => p.estado_cuenta === 'SUSPENDIDA').length
                },
                {
                  key: 'INACTIVA',
                  label: 'Inactivos',
                  count: prestamistas.filter((p) => p.estado_cuenta === 'INACTIVA').length
                }
              ].map((tab) => {
                const isActive = estadoFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setEstadoFilter(tab.key)}
                    style={{
                      flex: '1 1 110px',
                      minHeight: '36px',
                      padding: '6px 10px',
                      borderRadius: '10px',
                      border: isActive ? '1px solid #B69A55' : '1px solid transparent',
                      background: isActive
                        ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                        : 'transparent',
                      color: isActive ? '#101C2C' : isDark ? '#FFFFFF' : '#252A31',
                      fontSize: '12px',
                      fontWeight: isActive ? 900 : 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{tab.label}</span>
                    <span
                      style={{
                        minWidth: '20px',
                        height: '20px',
                        padding: '0 6px',
                        borderRadius: '999px',
                        backgroundColor: isActive
                          ? 'rgba(16, 28, 44, 0.18)'
                          : 'var(--aureus-bg-elevated)',
                        color: isActive ? '#101C2C' : isDark ? '#FFFFFF' : 'var(--aureus-text-primary)',
                        fontSize: '11px',
                        fontWeight: 900,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tarjetas de Prestamistas */}
            {filteredPrestamistas.length === 0 ? (
              <div
                style={{
                  padding: '44px 20px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--aureus-bg-surface)',
                  border: '1px solid var(--aureus-border-subtle)',
                  textAlign: 'center',
                  color: 'var(--aureus-text-muted)',
                  fontWeight: 700
                }}
              >
                No se encontraron cuentas de prestamistas con el filtro actual.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '12px'
                }}
              >
                {filteredPrestamistas.map((p) => {
                  const isSuspended = p.estado_cuenta === 'SUSPENDIDA';
                  const isActive = p.estado_cuenta === 'ACTIVA';
                  return (
                    <div
                      key={p.id}
                      className="rb-spotlight-card"
                      onMouseMove={handleSpotlightMouseMove}
                      style={{
                        position: 'relative',
                        overflow: 'hidden',
                        padding: '15px',
                        borderRadius: '16px',
                        backgroundColor: 'var(--aureus-bg-surface)',
                        border: isSuspended
                          ? '1px solid rgba(217, 119, 6, 0.45)'
                          : '1px solid var(--aureus-border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <ImperialCornerAccents isDark={isDark} />
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              backgroundColor: '#B69A55',
                              color: '#101C2C',
                              fontWeight: 900,
                              fontSize: '14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {getProfileInitials(p.nombre_completo, p.correo)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <h3
                              className="aureus-imperial-title"
                              style={{
                                margin: 0,
                                fontSize: '15px',
                                fontWeight: 800,
                                color: 'var(--aureus-text-primary)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {p.nombre_completo}
                            </h3>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: 'var(--aureus-text-secondary)'
                              }}
                            >
                              {p.correo}
                              {p.telefono ? ` · Tel ${p.telefono}` : ''}
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            padding: '4px 9px',
                            borderRadius: '999px',
                            fontSize: '10.5px',
                            fontWeight: 900,
                            backgroundColor: isActive
                              ? isDark
                                ? 'rgba(52, 211, 153, 0.16)'
                                : 'rgba(57, 125, 103, 0.12)'
                              : isSuspended
                                ? 'rgba(217, 119, 6, 0.16)'
                                : 'var(--aureus-bg-elevated)',
                            color: isActive
                              ? isDark
                                ? '#34D399'
                                : '#2D6A56'
                              : isSuspended
                                ? '#F59E0B'
                                : 'var(--aureus-text-muted)'
                          }}
                        >
                          {p.estado_cuenta}
                        </span>
                      </div>

                      {/* Métricas agregadas sin exponer PII de sus clientes */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                          gap: '6px'
                        }}
                      >
                        <div
                          style={{
                            padding: '7px 8px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--aureus-text-muted)' }}>
                            CLIENTES
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 900 }}>
                            {Number(p.total_clientes_activos || 0)}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: '7px 8px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--aureus-text-muted)' }}>
                            PRÉSTAMOS
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 900 }}>
                            {Number(p.total_prestamos_activos || 0)}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: '7px 8px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--aureus-text-muted)' }}>
                            PAPELERA
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 900 }}>
                            {Number(p.total_clientes_papelera || 0)}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: '7px 8px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--aureus-text-muted)' }}>
                            ARCHIVO
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 900 }}>
                            {Number(p.total_antecedentes_archivados || 0)}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--aureus-text-muted)'
                        }}
                      >
                        Alta registrada: {formatDateTimeCR(p.fecha_creacion)}
                      </div>

                      {/* Botonera de Acciones del Prestamista */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => openEditPrestamistaModal(p)}
                          style={{
                            flex: '1 1 110px',
                            padding: '7px 10px',
                            borderRadius: '9px',
                            border: '1px solid var(--aureus-border-subtle)',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            color: 'var(--aureus-text-primary)',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={13} />
                          <span>Editar cuenta</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPasswordModalTarget(p);
                            setCustomNewPassword('');
                            setGeneratedPasswordResult('');
                            setCopiedPassword(false);
                            setPasswordFormError('');
                            setPasswordFieldError(false);
                          }}
                          style={{
                            flex: '1 1 130px',
                            padding: '7px 10px',
                            borderRadius: '9px',
                            border: '1px solid rgba(182, 154, 85, 0.4)',
                            backgroundColor: 'var(--aureus-bg-elevated)',
                            color: isDark ? '#E5C97B' : '#8A6D2F',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          <KeyRound size={13} />
                          <span>Restablecer clave</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            triggerConfirmAction({
                              type: 'toggle_estado',
                              target: p,
                              nuevoEstado: isActive ? 'SUSPENDIDA' : 'ACTIVA',
                              title: isActive ? 'Suspender Prestamista' : 'Reactivar Prestamista',
                              question: isActive
                                ? `¿Deseas suspender temporalmente el acceso de ${p.nombre_completo}? Mientras esté suspendido no podrá iniciar sesión.`
                                : `¿Deseas reactivar el acceso de ${p.nombre_completo} a la plataforma?`,
                              confirmText: isActive ? 'Suspender cuenta' : 'Reactivar cuenta',
                              confirmTone: isActive ? 'amber' : 'green',
                              stageVariant: isActive
                                ? 'admin_suspender_prestamista'
                                : 'admin_reactivar_prestamista',
                              detailPill: isActive
                                ? 'Acceso temporalmente deshabilitado'
                                : 'Acceso restablecido correctamente'
                            })
                          }
                          style={{
                            flex: '1 1 120px',
                            padding: '7px 10px',
                            borderRadius: '9px',
                            border: isActive
                              ? '1px solid rgba(217, 119, 6, 0.45)'
                              : '1px solid rgba(52, 211, 153, 0.45)',
                            backgroundColor: isActive
                              ? 'rgba(217, 119, 6, 0.12)'
                              : 'rgba(52, 211, 153, 0.12)',
                            color: isActive ? '#F59E0B' : isDark ? '#34D399' : '#2D6A56',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          {isActive ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                          <span>{isActive ? 'Suspender cuenta' : 'Reactivar cuenta'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            triggerConfirmAction({
                              type: 'eliminar_prestamista',
                              target: p,
                              title: 'Eliminar Cuenta de Prestamista',
                              question: `¿Confirmas eliminar definitivamente la cuenta de ${p.nombre_completo} y todos sus registros asociados? Esta acción es irreversible.`,
                              confirmText: 'Eliminar definitivamente',
                              confirmTone: 'danger',
                              stageVariant: 'admin_eliminar_prestamista',
                              detailPill: 'Cuenta retirada permanentemente'
                            })
                          }
                          style={{
                            flex: '1 1 120px',
                            padding: '7px 10px',
                            borderRadius: '9px',
                            border: '1px solid var(--aureus-red-border)',
                            backgroundColor: 'var(--aureus-red-light)',
                            color: 'var(--aureus-red-text)',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Eliminar cuenta</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MÓDULO III: DEPURACIÓN Y OPERACIONES */}
        {activeModule === 'depuracion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '16px',
                backgroundColor: 'var(--aureus-bg-surface)',
                border: '1px solid var(--aureus-border-subtle)'
              }}
            >
              <h2
                className="aureus-imperial-title"
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 800,
                  color: 'var(--aureus-text-primary)'
                }}
              >
                Saneamiento de Antecedentes y Papeleras por Prestamista
              </h2>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: 'var(--aureus-text-secondary)'
                }}
              >
                Permite depurar antecedentes y préstamos no finiquitados en archivo histórico o vaciar papeleras acumuladas sin exponer la identidad privada de los deudores.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '12px'
              }}
            >
              {depuracionList.map((item) => {
                const cantAnt = Number(item.cantidad_antecedentes || 0);
                const cantLoansArch = Number(item.cantidad_prestamos_archivados || 0);
                const cantCliPap = Number(item.clientes_en_papelera || 0);
                const cantPrestPap = Number(item.prestamos_en_papelera || 0);
                const montoIncobrable = Number(item.monto_incobrable_acumulado || 0);

                return (
                  <div
                    key={item.prestamista_id}
                    className="rb-spotlight-card"
                    onMouseMove={handleSpotlightMouseMove}
                    style={{
                      position: 'relative',
                      overflow: 'hidden',
                      padding: '15px',
                      borderRadius: '16px',
                      backgroundColor: 'var(--aureus-bg-surface)',
                      border: '1px solid var(--aureus-border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <ImperialCornerAccents isDark={isDark} />
                    <div>
                      <h3
                        className="aureus-imperial-title"
                        style={{
                          margin: 0,
                          fontSize: '15px',
                          fontWeight: 800,
                          color: 'var(--aureus-text-primary)'
                        }}
                      >
                        {item.nombre_completo}
                      </h3>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--aureus-text-secondary)'
                        }}
                      >
                        {item.correo}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                        gap: '8px'
                      }}
                    >
                      <div
                        style={{
                          padding: '9px 10px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--aureus-bg-elevated)',
                          border: '1px solid var(--aureus-border-subtle)'
                        }}
                      >
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--aureus-text-muted)' }}>
                          ANTECEDENTES ARCHIVADOS
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 900, marginTop: '2px' }}>
                          {cantAnt} clientes · {cantLoansArch} préstamos
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: montoIncobrable > 0 ? '#F87171' : 'var(--aureus-text-muted)',
                            marginTop: '2px'
                          }}
                        >
                          Saldo sin pagar: {formatColones(montoIncobrable)}
                        </div>
                      </div>

                      <div
                        style={{
                          padding: '9px 10px',
                          borderRadius: '10px',
                          backgroundColor: 'var(--aureus-bg-elevated)',
                          border: '1px solid var(--aureus-border-subtle)'
                        }}
                      >
                        <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--aureus-text-muted)' }}>
                          REGISTROS EN PAPELERA
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 900, marginTop: '2px' }}>
                          {cantCliPap} clientes · {cantPrestPap} préstamos
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: 'var(--aureus-text-muted)',
                            marginTop: '2px'
                          }}
                        >
                          Retención temporal 30 días
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        type="button"
                        disabled={cantAnt === 0 && cantLoansArch === 0}
                        onClick={() =>
                          triggerConfirmAction({
                            type: 'depurar_antecedentes',
                            target: item,
                            title: 'Depurar Antecedentes Archivados',
                            question: `¿Confirmas purgar definitivamente los ${cantAnt} antecedentes y ${cantLoansArch} préstamos archivados de ${item.nombre_completo}?`,
                            confirmText: 'Purgar antecedentes',
                            confirmTone: 'danger',
                            stageVariant: 'admin_depurar_registros',
                            detailPill: 'Saneamiento completado'
                          })
                        }
                        style={{
                          flex: '1 1 140px',
                          padding: '8px 11px',
                          borderRadius: '10px',
                          border: '1px solid var(--aureus-red-border)',
                          backgroundColor:
                            cantAnt === 0 && cantLoansArch === 0
                              ? 'var(--aureus-bg-elevated)'
                              : 'var(--aureus-red-light)',
                          color:
                            cantAnt === 0 && cantLoansArch === 0
                              ? 'var(--aureus-text-muted)'
                              : 'var(--aureus-red-text)',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          cursor:
                            cantAnt === 0 && cantLoansArch === 0 ? 'not-allowed' : 'pointer',
                          opacity: cantAnt === 0 && cantLoansArch === 0 ? 0.55 : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Purgar antecedentes</span>
                      </button>

                      <button
                        type="button"
                        disabled={cantCliPap === 0 && cantPrestPap === 0}
                        onClick={() =>
                          triggerConfirmAction({
                            type: 'depurar_papelera',
                            target: item,
                            title: 'Vaciar Papelera del Prestamista',
                            question: `¿Confirmas eliminar definitivamente los ${cantCliPap} clientes y ${cantPrestPap} préstamos en papelera de ${item.nombre_completo}?`,
                            confirmText: 'Vaciar papelera',
                            confirmTone: 'danger',
                            stageVariant: 'admin_depurar_registros',
                            detailPill: 'Saneamiento completado'
                          })
                        }
                        style={{
                          flex: '1 1 140px',
                          padding: '8px 11px',
                          borderRadius: '10px',
                          border: '1px solid rgba(182, 154, 85, 0.45)',
                          backgroundColor: 'var(--aureus-bg-elevated)',
                          color:
                            cantCliPap === 0 && cantPrestPap === 0
                              ? 'var(--aureus-text-muted)'
                              : 'var(--aureus-text-primary)',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          cursor:
                            cantCliPap === 0 && cantPrestPap === 0 ? 'not-allowed' : 'pointer',
                          opacity: cantCliPap === 0 && cantPrestPap === 0 ? 0.55 : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Database size={13} />
                        <span>Vaciar papelera</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MÓDULO IV: GOBERNANZA Y AUDITORÍA */}
        {activeModule === 'auditoria' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '12px 14px',
                borderRadius: '16px',
                backgroundColor: 'var(--aureus-bg-surface)',
                border: '1px solid var(--aureus-border-subtle)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: '1 1 240px',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--aureus-bg-elevated)',
                  border: '1px solid var(--aureus-border-subtle)'
                }}
              >
                <Search size={16} color="var(--aureus-text-muted)" />
                <input
                  type="text"
                  value={searchAuditoria}
                  onChange={(e) => setSearchAuditoria(e.target.value)}
                  placeholder="Filtrar eventos por acción, entidad o actor..."
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    color: 'var(--aureus-text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    width: '100%'
                  }}
                />
              </div>

              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  color: '#B69A55'
                }}
              >
                PII Redactada Automáticamente · Ley N.° 8968
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredAuditoria.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--aureus-bg-surface)',
                    border: '1px solid var(--aureus-border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '7px',
                          backgroundColor: 'rgba(182, 154, 85, 0.16)',
                          color: isDark ? '#E5C97B' : '#8A6D2F',
                          fontSize: '11px',
                          fontWeight: 900
                        }}
                      >
                        {ev.accion}
                      </span>
                      <span style={{ fontSize: '12.5px', fontWeight: 800 }}>
                        {ev.actor_nombre}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--aureus-text-muted)'
                        }}
                      >
                        · Entidad: {ev.entidad}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--aureus-text-muted)'
                      }}
                    >
                      {formatDateTimeCR(ev.fecha_evento)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: 'var(--aureus-text-secondary)',
                      wordBreak: 'break-word'
                    }}
                  >
                    {ev.detalle_sanitizado}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* DOCK FLOTANTE ARRASTRABLE Y MINIMIZABLE DE 4 MÓDULOS */}
      <nav
        className="aureus-admin-dock"
        aria-label="Navegación administrativa"
        onPointerDown={handleDockPointerDown}
        onPointerMove={handleDockPointerMove}
        onPointerUp={handleDockPointerUp}
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '50%',
          transform: `translate(calc(-50% + ${dockOffset.x}px), ${dockOffset.y}px)`,
          zIndex: 45,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: isDockMinimized ? '6px 10px' : '7px 10px',
          borderRadius: '18px',
          backgroundColor: isDark ? 'rgba(16, 28, 44, 0.96)' : 'rgba(255, 255, 255, 0.96)',
          border: '1px solid rgba(182, 154, 85, 0.45)',
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(12px)',
          maxWidth: 'calc(100vw - 20px)',
          boxSizing: 'border-box'
        }}
      >
        <div
          title="Arrastrar barra de módulos"
          style={{
            padding: '4px',
            color: '#B69A55',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <GripHorizontal size={15} />
        </div>

        {!isDockMinimized &&
          ADMIN_MODULES.map((mod) => {
            const IconComp = mod.icon;
            const isActive = activeModule === mod.key;
            return (
              <button
                key={mod.key}
                type="button"
                data-testid={`admin-dock-${mod.key}`}
                onClick={() => setActiveModule(mod.key)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '12px',
                  border: isActive ? '1px solid #B69A55' : '1px solid transparent',
                  background: isActive
                    ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                    : 'transparent',
                  color: isActive ? '#101C2C' : isDark ? '#FFFFFF' : '#252A31',
                  fontSize: '12px',
                  fontWeight: isActive ? 900 : 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <IconComp size={15} strokeWidth={isActive ? 2.4 : 2} />
                <span>
                  {mod.roman} · {mod.shortLabel}
                </span>
              </button>
            );
          })}

        <button
          type="button"
          onClick={() => setIsDockMinimized((prev) => !prev)}
          title={isDockMinimized ? 'Expandir barra de módulos' : 'Minimizar barra de módulos'}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            border: '1px solid rgba(182, 154, 85, 0.35)',
            backgroundColor: 'var(--aureus-bg-elevated)',
            color: isDark ? '#E5C97B' : '#101C2C',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          {isDockMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
        </button>
      </nav>

      {/* MODAL CREAR / EDITAR PRESTAMISTA */}
      {formModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            backgroundColor: 'rgba(10, 18, 28, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="modal-container"
            style={{
              width: '100%',
              maxWidth: '460px',
              borderRadius: '18px',
              backgroundColor: 'var(--aureus-bg-surface)',
              border: '1px solid rgba(182, 154, 85, 0.45)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3
                className="aureus-imperial-title"
                style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}
              >
                {editingPrestamista ? 'Editar Cuenta de Prestamista' : 'Registrar Nuevo Prestamista'}
              </h3>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--aureus-text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--aureus-red-light)',
                  border: '1px solid var(--aureus-red-border)',
                  color: 'var(--aureus-red-text)',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSavePrestamista} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej. Carlos Andrés Mora"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--aureus-border-subtle)',
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    color: 'var(--aureus-text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={formCorreo}
                  onChange={(e) => setFormCorreo(e.target.value)}
                  placeholder="prestamista@dominio.cr"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--aureus-border-subtle)',
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    color: 'var(--aureus-text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>
                  Teléfono de Costa Rica
                </label>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: formTelefonoError
                      ? '1.5px solid #EF4444'
                      : '1px solid var(--aureus-border-subtle)',
                    backgroundColor: formTelefonoError
                      ? 'rgba(239, 68, 68, 0.08)'
                      : 'var(--aureus-bg-elevated)',
                    boxSizing: 'border-box'
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      paddingRight: '8px',
                      borderRight: '1px solid var(--aureus-border-subtle)',
                      color: 'var(--aureus-text-primary)',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      flexShrink: 0
                    }}
                  >
                    <CountryFlagSvg countryId="CR" size={18} />
                    <span>+506</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={9}
                    data-testid="input-admin-prestamista-telefono"
                    value={formTelefono}
                    onChange={(e) => {
                      setFormTelefonoError(false);
                      setFormTelefono(formatAdminCRPhoneInput(e.target.value));
                    }}
                    placeholder="8888-8888"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      padding: '9px 0',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      color: 'var(--aureus-text-primary)',
                      fontSize: '13px',
                      fontWeight: 700,
                      letterSpacing: '0.03em'
                    }}
                  />
                </div>
              </div>

              {!editingPrestamista && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>
                    Contraseña inicial
                  </label>
                  <input
                    type="password"
                    required
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--aureus-border-subtle)',
                      backgroundColor: 'var(--aureus-bg-elevated)',
                      color: 'var(--aureus-text-primary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--aureus-border-subtle)',
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    color: 'var(--aureus-text-primary)',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    border: '1px solid #B69A55',
                    background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                    color: '#101C2C',
                    fontSize: '12px',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  {formSubmitting ? 'Guardando...' : 'Guardar cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RESTABLECER CONTRASEÑA */}
      {passwordModalTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            backgroundColor: 'rgba(10, 18, 28, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="modal-container"
            style={{
              width: '100%',
              maxWidth: '430px',
              borderRadius: '18px',
              backgroundColor: 'var(--aureus-bg-surface)',
              border: '1px solid rgba(182, 154, 85, 0.45)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3
                className="aureus-imperial-title"
                style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}
              >
                Restablecer Clave de Prestamista
              </h3>
              <button
                type="button"
                onClick={() => setPasswordModalTarget(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--aureus-text-muted)',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--aureus-text-secondary)' }}>
              Cuenta: <strong>{passwordModalTarget.nombre_completo}</strong> · {passwordModalTarget.correo}
            </div>

            {passwordFormError && (
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--aureus-red-light)',
                  border: '1px solid var(--aureus-red-border)',
                  color: 'var(--aureus-red-text)',
                  fontSize: '12px',
                  fontWeight: 700
                }}
              >
                {passwordFormError}
              </div>
            )}

            {!generatedPasswordResult ? (
              <form
                onSubmit={handleExecuteResetPassword}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '11px',
                      fontWeight: 800,
                      marginBottom: '6px',
                      letterSpacing: '0.02em',
                      color: 'var(--aureus-text-muted)'
                    }}
                  >
                    NUEVA CONTRASEÑA · MÍNIMO 8 CARACTERES O DEJAR VACÍO PARA GENERAR CLAVE AUTOMÁTICA
                  </label>
                  <input
                    type="text"
                    value={customNewPassword}
                    onChange={(e) => {
                      setPasswordFieldError(false);
                      setPasswordFormError('');
                      setCustomNewPassword(e.target.value);
                    }}
                    placeholder="Ej. ClaveSegura2026"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: passwordFieldError
                        ? '1.5px solid #EF4444'
                        : '1px solid var(--aureus-border-subtle)',
                      backgroundColor: passwordFieldError
                        ? 'rgba(239, 68, 68, 0.08)'
                        : 'var(--aureus-bg-elevated)',
                      color: 'var(--aureus-text-primary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setPasswordModalTarget(null)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--aureus-border-subtle)',
                      backgroundColor: 'var(--aureus-bg-elevated)',
                      color: 'var(--aureus-text-primary)',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={passwordSubmitting}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1px solid #B69A55',
                      background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                      color: '#101C2C',
                      fontSize: '12px',
                      fontWeight: 900,
                      cursor: 'pointer'
                    }}
                  >
                    {passwordSubmitting ? 'Generando...' : 'Restablecer contraseña'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--aureus-bg-elevated)',
                    border: '1px solid rgba(52, 211, 153, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--aureus-text-muted)' }}>
                      CREDENCIAL TEMPORAL ACTIVA
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.04em' }}>
                      {generatedPasswordResult}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(generatedPasswordResult);
                      setCopiedPassword(true);
                    }}
                    style={{
                      padding: '7px 11px',
                      borderRadius: '9px',
                      border: '1px solid #B69A55',
                      backgroundColor: 'var(--aureus-bg-surface)',
                      color: 'var(--aureus-text-primary)',
                      fontSize: '11.5px',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    {copiedPassword ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedPassword ? 'Copiada' : 'Copiar'}</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const targetName = passwordModalTarget?.nombre_completo || 'Prestamista';
                    setPasswordModalTarget(null);
                    setGeneratedPasswordResult('');
                    await launchAdminStageAnimation({
                      variant: 'admin_clave_prestamista',
                      targetName,
                      detailPill: 'Credencial de acceso renovada'
                    });
                  }}
                  style={{
                    alignSelf: 'flex-end',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid #B69A55',
                    background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                    color: '#101C2C',
                    fontSize: '12px',
                    fontWeight: 900,
                    cursor: 'pointer'
                  }}
                >
                  Listo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE DOBLE VERIFICACIÓN SIN CAJA DE ANIMACIÓN DENTRO */}
      {confirmAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 85,
            backgroundColor: 'rgba(10, 18, 28, 0.74)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="modal-container"
            style={{
              width: '100%',
              maxWidth: '430px',
              borderRadius: '18px',
              backgroundColor: 'var(--aureus-bg-surface)',
              border: '1px solid rgba(182, 154, 85, 0.45)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <h3
              className="aureus-imperial-title"
              style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}
            >
              {confirmAction.title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--aureus-text-secondary)',
                lineHeight: 1.5
              }}
            >
              {confirmAction.question}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                disabled={isExecutingConfirm}
                onClick={() => setConfirmAction(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--aureus-border-subtle)',
                  backgroundColor: 'var(--aureus-bg-elevated)',
                  color: 'var(--aureus-text-primary)',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isExecutingConfirm}
                onClick={executeConfirmedAction}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border:
                    confirmAction.confirmTone === 'green'
                      ? '1px solid #2E6B4F'
                      : confirmAction.confirmTone === 'amber'
                        ? '1px solid #B45309'
                        : '1px solid #C65D58',
                  backgroundColor:
                    confirmAction.confirmTone === 'green'
                      ? '#397D67'
                      : confirmAction.confirmTone === 'amber'
                        ? '#D97706'
                        : '#C65D58',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 900,
                  cursor: 'pointer'
                }}
              >
                {isExecutingConfirm ? 'Procesando...' : confirmAction.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CÁPSULA ANIMADA 100% CENTRADA EN PANTALLA COMPLETA MEDIANTE PORTAL */}
      {confirmPhase !== 'idle' &&
        activeStageConfig &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100050,
              backgroundColor: 'rgba(10, 18, 30, 0.76)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              boxSizing: 'border-box'
            }}
          >
            <ConfirmActionStage
              variant={activeStageConfig.variant}
              phase={confirmPhase}
              clientName={activeStageConfig.targetName}
              subtitle={activeStageConfig.targetName}
              detailPill={activeStageConfig.detailPill}
            />
          </div>,
          document.body
        )}

      {/* MODAL DE PERFIL EJECUTIVO DEL ADMINISTRADOR */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        section={profileModalSection}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* MODAL DE ALERTA GLOBAL */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        buttonText="Entendido"
        iconType={alertConfig.iconType}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default AdminDashboardPage;
