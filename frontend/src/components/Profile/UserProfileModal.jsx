import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  LogOut,
  Moon,
  Palette,
  RotateCcw,
  Scale,
  Settings,
  ShieldCheck,
  Sun,
  Trash2,
  Type,
  User,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  ClassicalLaurelDivider,
  ImperialCornerAccents,
  handleSpotlightMouseMove
} from '../Common/ClassicalAppArchitecture.jsx';
import {
  COLORBLIND_MODES,
  FONT_SIZE_SCALES,
  LANGUAGES,
  useAccessibility
} from '../../context/AccessibilityContext.jsx';
import {
  cambiarPasswordUsuario,
  exportarDatosPersonalesUsuario
} from '../../services/apiClient.js';
import { LegalGovernanceModal } from '../Legal/LegalGovernanceModal.jsx';
import { playConfirmationChime } from '../../utils/confirmationSound.js';

const COLORBLIND_SWATCHES = {
  ninguno: ['#B69A55', '#16A34A', '#DC2626'],
  protanopia: ['#9C8D58', '#6B8E23', '#8B8000'],
  deuteranopia: ['#A88D56', '#7F7F3F', '#B8860B'],
  tritanopia: ['#C08475', '#2E8B57', '#DC2626'],
  protanomalia: ['#AF9656', '#4E9A4E', '#B84A39'],
  deuteranomalia: ['#B19455', '#4D9459', '#CA3A2F'],
  tritanomalia: ['#B99364', '#229B6B', '#DC2626'],
  acromatopsia: ['#9CA3AF', '#6B7280', '#374151']
};

function resizeImageSquareToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error leyendo imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagen no soportada'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 240;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas no disponible'));
            return;
          }

          const minSide = Math.min(img.width, img.height);
          const sx = Math.max(0, Math.floor((img.width - minSide) / 2));
          const sy = Math.max(0, Math.floor((img.height - minSide) / 2));

          ctx.clearRect(0, 0, size, size);
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

          let dataUrl = canvas.toDataURL('image/webp', 0.84);
          if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.84);
          }
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

function getInitials(name, username) {
  const source = String(name || username || 'AU').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatReadableDate(isoValue, language, fallbackText) {
  if (!isoValue) return fallbackText;
  try {
    const localeMap = {
      es: 'es-MX',
      en: 'en-US',
      pt: 'pt-BR',
      fr: 'fr-FR'
    };
    const dt = new Date(isoValue);
    if (Number.isNaN(dt.getTime())) return fallbackText;
    return dt.toLocaleDateString(localeMap[language] || 'es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return fallbackText;
  }
}

export function UserProfileModal({ isOpen, onClose, section, initialSection, initialTab }) {
  // Todos los Hooks declarados al inicio del componente antes de cualquier retorno condicional
  const navigate = useNavigate();
  const { usuario, actualizarPerfil, logout } = useAuth();
  const { isDark, setTheme } = useTheme();
  const {
    fontSize,
    setFontSize,
    language,
    setLanguage,
    colorblindMode,
    setColorblindMode,
    soundEnabled,
    setSoundEnabled,
    resetAccessibility,
    t
  } = useAccessibility();

  const fileInputRef = useRef(null);
  const modalWindowRef = useRef(null);
  const dragOffsetRef = useRef({ offsetX: 0, offsetY: 0 });
  const [windowPos, setWindowPos] = useState({ x: null, y: null });
  const [isDragging, setIsDragging] = useState(false);

  const normalizedSection = useMemo(() => {
    const rawSec = section || initialSection || initialTab || 'perfil';
    if (rawSec === 'accesibilidad' || rawSec === 'accessibility') {
      return 'accesibilidad';
    }
    if (rawSec === 'configuracion' || rawSec === 'settings') {
      return 'configuracion';
    }
    return 'perfil';
  }, [section, initialSection, initialTab]);

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [username, setUsername] = useState('');
  const [correo, setCorreo] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState({ type: '', text: '' });
  const [copiedCode, setCopiedCode] = useState(false);

  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState({ type: '', text: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);

  const clampPosition = useCallback((x, y) => {
    if (typeof window === 'undefined') return { x, y };
    const rect = modalWindowRef.current
      ? modalWindowRef.current.getBoundingClientRect()
      : { width: Math.min(540, window.innerWidth - 28), height: Math.min(620, window.innerHeight - 108) };
    const minX = 8;
    const maxX = Math.max(8, window.innerWidth - rect.width - 8);
    const minY = 8;
    const maxY = Math.max(8, window.innerHeight - rect.height - 8);
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY)
    };
  }, []);

  const handleHeaderPointerDown = useCallback((e) => {
    if (e.target && typeof e.target.closest === 'function' && e.target.closest('button')) {
      return;
    }
    if (!modalWindowRef.current) return;
    const rect = modalWindowRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };
    setWindowPos({ x: rect.left, y: rect.top });
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return undefined;

    const handlePointerMove = (e) => {
      const nextX = e.clientX - dragOffsetRef.current.offsetX;
      const nextY = e.clientY - dragOffsetRef.current.offsetY;
      const { x: clampedX, y: clampedY } = clampPosition(nextX, nextY);
      setWindowPos({ x: clampedX, y: clampedY });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isDragging, clampPosition]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setWindowPos((prev) => {
        if (prev.x === null || prev.y === null) return prev;
        return clampPosition(prev.x, prev.y);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);

  useEffect(() => {
    setShowLogoutConfirm(false);
    setIsLoggingOut(false);
    setIsDragging(false);
    setWindowPos({ x: null, y: null });
    if (!isOpen) return;
    setProfileFeedback({ type: '', text: '' });
    setPasswordFeedback({ type: '', text: '' });
    setPasswordActual('');
    setPasswordNueva('');
    setConfirmarPassword('');
    setCopiedCode(false);
  }, [isOpen, normalizedSection]);

  useEffect(() => {
    if (!isOpen) return;
    setNombreCompleto(usuario?.nombre_completo || '');
    setUsername(usuario?.username || usuario?.usuario || '');
    setCorreo(usuario?.correo || '');
    setFotoUrl(usuario?.foto_url || '');
  }, [isOpen, usuario]);

  const initials = useMemo(
    () => getInitials(nombreCompleto || usuario?.nombre_completo, username || usuario?.username),
    [nombreCompleto, username, usuario]
  );

  const codigoPersonal = useMemo(
    () =>
      usuario?.codigo_vinculacion ||
      `CF-${String(usuario?.id || '00000000').slice(0, 8).toUpperCase()}`,
    [usuario]
  );

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codigoPersonal);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } catch {
      setCopiedCode(false);
    }
  }, [codigoPersonal]);

  const handlePhotoSelect = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      if (!file.type?.startsWith('image/')) {
        setProfileFeedback({
          type: 'error',
          text: t('profile.photo.invalidFile')
        });
        return;
      }

      try {
        const resizedDataUrl = await resizeImageSquareToDataUrl(file);
        setFotoUrl(resizedDataUrl);
        setIsSavingProfile(true);
        setProfileFeedback({ type: '', text: '' });
        await actualizarPerfil({ foto_url: resizedDataUrl });
        playConfirmationChime();
        setProfileFeedback({
          type: 'success',
          text: t('profile.fields.savedOk')
        });
      } catch (err) {
        setProfileFeedback({
          type: 'error',
          text: err?.userMessage || t('profile.photo.processError')
        });
      } finally {
        setIsSavingProfile(false);
      }
    },
    [actualizarPerfil, t]
  );

  const handleRemovePhoto = useCallback(async () => {
    try {
      setIsSavingProfile(true);
      setProfileFeedback({ type: '', text: '' });
      setFotoUrl('');
      await actualizarPerfil({ foto_url: null });
      setProfileFeedback({
        type: 'success',
        text: t('profile.fields.savedOk')
      });
    } catch (err) {
      setProfileFeedback({
        type: 'error',
        text: err?.userMessage || t('profile.fields.saveError')
      });
    } finally {
      setIsSavingProfile(false);
    }
  }, [actualizarPerfil, t]);

  const handleSaveProfile = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        setIsSavingProfile(true);
        setProfileFeedback({ type: '', text: '' });
        await actualizarPerfil({
          nombre_completo: nombreCompleto.trim(),
          username: username.trim(),
          correo: correo.trim().toLowerCase(),
          foto_url: fotoUrl || null
        });
        playConfirmationChime();
        setProfileFeedback({
          type: 'success',
          text: t('profile.fields.savedOk')
        });
      } catch (err) {
        setProfileFeedback({
          type: 'error',
          text: err?.userMessage || t('profile.fields.saveError')
        });
      } finally {
        setIsSavingProfile(false);
      }
    },
    [actualizarPerfil, correo, fotoUrl, nombreCompleto, t, username]
  );

  const handleUpdatePassword = useCallback(
    async (e) => {
      e.preventDefault();
      if (!passwordActual || !passwordNueva || !confirmarPassword) {
        setPasswordFeedback({
          type: 'error',
          text: t('profile.settings.passwordFieldsRequired')
        });
        return;
      }
      if (passwordNueva.length < 8) {
        setPasswordFeedback({
          type: 'error',
          text: t('profile.settings.passwordTooShort')
        });
        return;
      }
      if (passwordNueva !== confirmarPassword) {
        setPasswordFeedback({
          type: 'error',
          text: t('profile.settings.passwordMismatch')
        });
        return;
      }

      try {
        setIsUpdatingPassword(true);
        setPasswordFeedback({ type: '', text: '' });
        await cambiarPasswordUsuario({
          password_actual: passwordActual,
          password_nueva: passwordNueva
        });
        playConfirmationChime();
        setPasswordActual('');
        setPasswordNueva('');
        setConfirmarPassword('');
        setPasswordFeedback({
          type: 'success',
          text: t('profile.settings.passwordUpdated')
        });
      } catch (err) {
        setPasswordFeedback({
          type: 'error',
          text: err?.userMessage || t('profile.settings.passwordError')
        });
      } finally {
        setIsUpdatingPassword(false);
      }
    },
    [confirmarPassword, passwordActual, passwordNueva, t]
  );

  const handleRequestLogout = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const handleConfirmLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
      onClose?.();
      navigate('/login', { replace: true });
    }
  }, [isLoggingOut, logout, navigate, onClose]);

  const headerConfig = useMemo(() => {
    if (normalizedSection === 'accesibilidad') {
      return { title: t('profile.tabs.accesibilidad'), Icon: Eye };
    }
    if (normalizedSection === 'configuracion') {
      return { title: t('profile.tabs.configuracion'), Icon: Settings };
    }
    return { title: t('profile.menu.myProfile'), Icon: User };
  }, [normalizedSection, t]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const HeaderIcon = headerConfig.Icon;
  const accountStatusText =
    String(usuario?.estado || usuario?.estado_cuenta || 'ACTIVA').toUpperCase() === 'SUSPENDIDA'
      ? t('profile.fields.suspendedStatus')
      : t('profile.fields.activeStatus');

  const hasCustomPos = windowPos.x !== null && windowPos.y !== null;

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={headerConfig.title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100020,
        padding: '16px 14px 88px 14px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        ref={modalWindowRef}
        className="modal-container profile-modal-container"
        data-testid={`user-modal-${normalizedSection}`}
        style={{
          position: hasCustomPos ? 'fixed' : 'relative',
          ...(hasCustomPos
            ? {
                top: `${windowPos.y}px`,
                left: `${windowPos.x}px`,
                margin: 0,
                animation: 'none'
              }
            : {}),
          width: 'min(540px, calc(100vw - 28px))',
          maxHeight: 'min(620px, calc(100dvh - 108px))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: isDragging
            ? '0 28px 68px rgba(0, 0, 0, 0.55), 0 0 0 1.5px rgba(212, 180, 106, 0.55)'
            : undefined,
          transition: isDragging ? 'none' : undefined
        }}
      >
        <ImperialCornerAccents isDark={isDark} />
        <div
          className="modal-header"
          data-testid="profile-modal-drag-header"
          onPointerDown={handleHeaderPointerDown}
          style={{
            borderBottom: '1px solid var(--aureus-border-subtle)',
            paddingTop: '10px',
            paddingBottom: '14px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
            touchAction: 'none'
          }}
        >
          {/* Píldora dorada de agarre para arrastrar con el mouse */}
          <div
            aria-hidden="true"
            style={{
              width: '36px',
              height: '4px',
              borderRadius: '9999px',
              backgroundColor: isDark ? 'rgba(212, 180, 106, 0.35)' : 'rgba(182, 154, 85, 0.45)',
              margin: '0 auto 2px auto'
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <HeaderIcon size={20} style={{ color: '#B69A55' }} />
              <h2
                className="modal-title aureus-imperial-title"
                data-testid="modal-section-title"
                style={{ margin: 0 }}
              >
                {headerConfig.title}
              </h2>
            </div>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label={t('profile.closeAria')}
              data-testid="btn-close-profile-modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div
          className="profile-modal-scroll"
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            padding: '20px 24px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}
        >
          <ClassicalLaurelDivider compact isDark={isDark} style={{ flexShrink: 0, margin: '0 auto 2px auto' }} />
          {/* ==============================================================
              VENTANA 1: MI PERFIL (Exclusivo para datos personales y código)
              ============================================================== */}
          {normalizedSection === 'perfil' && (
            <>
              <div
                className="profile-hero-card rb-spotlight-card"
                onMouseMove={handleSpotlightMouseMove}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0,
                  minHeight: 'fit-content'
                }}
              >
                <ImperialCornerAccents isDark={isDark} />
                <div className="profile-avatar-large" data-testid="profile-modal-avatar">
                  {fotoUrl ? (
                    <img src={fotoUrl} alt={nombreCompleto || username || 'Avatar'} />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div>
                    <div className="profile-user-name" style={{ fontWeight: 800 }}>
                      {usuario?.nombre_completo || username}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                      @{usuario?.username || username}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      alignItems: 'center'
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      style={{ display: 'none' }}
                      data-testid="profile-photo-input"
                    />
                    <button
                      type="button"
                      className="profile-btn-secondary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        fontSize: '12px',
                        fontWeight: 700
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSavingProfile}
                      data-testid="btn-change-photo"
                    >
                      <Camera size={14} />
                      <span>{t('profile.photo.change')}</span>
                    </button>

                    {fotoUrl && (
                      <button
                        type="button"
                        className="profile-btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#DC2626',
                          borderColor: 'rgba(220, 38, 38, 0.35)'
                        }}
                        onClick={handleRemovePhoto}
                        disabled={isSavingProfile}
                        data-testid="btn-remove-photo"
                      >
                        <Trash2 size={14} />
                        <span>{t('profile.photo.remove')}</span>
                      </button>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: '#6B7280' }}>
                    {t('profile.photo.hint')}
                  </span>
                </div>
              </div>

              <div
                className="profile-section-card"
                style={{ flexShrink: 0, minHeight: 'fit-content' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#6B7280',
                        textTransform: 'uppercase'
                      }}
                    >
                      {t('profile.codeLabel')}
                    </div>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        color: '#B69A55',
                        marginTop: '2px'
                      }}
                      data-testid="profile-code-badge"
                    >
                      {codigoPersonal}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="profile-btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                    onClick={handleCopyCode}
                    data-testid="btn-copy-code"
                  >
                    {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedCode ? t('profile.copiedCode') : t('profile.copyCode')}</span>
                  </button>
                </div>

                <div className="profile-option-grid-2" style={{ marginTop: '4px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{t('profile.fields.role')}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>
                      {!usuario?.rol || String(usuario.rol).toUpperCase() === 'ADMINISTRADOR'
                        ? t('profile.fields.defaultRole')
                        : usuario.rol}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{t('profile.fields.status')}</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#16A34A' }}>
                      {accountStatusText}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{t('profile.fields.createdAt')}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {formatReadableDate(
                        usuario?.creado_en,
                        language,
                        t('profile.fields.noRecord')
                      )}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>{t('profile.fields.lastAccess')}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {formatReadableDate(
                        usuario?.ultimo_acceso,
                        language,
                        t('profile.fields.noRecord')
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleSaveProfile}
                className="profile-section-card"
                style={{ flexShrink: 0, minHeight: 'fit-content' }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('profile.fields.fullName')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    required
                    minLength={3}
                    data-testid="input-profile-nombre"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('profile.fields.username')}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    data-testid="input-profile-username"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('profile.fields.email')}</label>
                  <input
                    type="email"
                    className="form-input"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    data-testid="input-profile-correo"
                  />
                </div>

                {profileFeedback.text && (
                  <div
                    role="status"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      backgroundColor:
                        profileFeedback.type === 'success'
                          ? 'rgba(22, 163, 74, 0.14)'
                          : 'rgba(220, 38, 38, 0.14)',
                      color: profileFeedback.type === 'success' ? '#15803D' : '#DC2626'
                    }}
                    data-testid="profile-feedback-banner"
                  >
                    {profileFeedback.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="profile-btn-primary"
                  disabled={isSavingProfile}
                  data-testid="btn-save-profile"
                >
                  {isSavingProfile ? t('profile.fields.saving') : t('profile.fields.save')}
                </button>
              </form>

              <div
                className="profile-section-card"
                data-testid="profile-legal-arco-card"
                style={{ flexShrink: 0, minHeight: 'fit-content' }}
              >
                <h3
                  className="profile-section-title"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <ShieldCheck size={14} />
                  <span>PRIVACIDAD Y DERECHOS ARCO — LEY 8968</span>
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '8px',
                    marginTop: '4px'
                  }}
                >
                  <button
                    type="button"
                    data-testid="btn-profile-open-legal"
                    className="profile-btn-secondary"
                    onClick={() => setIsLegalModalOpen(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px 12px',
                      fontSize: '12.5px',
                      fontWeight: 800
                    }}
                  >
                    <Scale size={14} />
                    <span>Consultar Marco Legal</span>
                  </button>

                  <button
                    type="button"
                    data-testid="btn-profile-export-data"
                    className="profile-btn-secondary"
                    disabled={isExportingData}
                    onClick={async () => {
                      if (isExportingData) return;
                      setIsExportingData(true);
                      try {
                        const data = await exportarDatosPersonalesUsuario();
                        const blob = new Blob([JSON.stringify(data, null, 2)], {
                          type: 'application/json;charset=utf-8'
                        });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'aureus-manager-datos-personales.json';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        setProfileFeedback({
                          type: 'error',
                          text: err?.userMessage || 'No fue posible exportar tus datos en este momento.'
                        });
                      } finally {
                        setIsExportingData(false);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px 12px',
                      fontSize: '12.5px',
                      fontWeight: 800
                    }}
                  >
                    <Download size={14} />
                    <span>{isExportingData ? 'Exportando...' : 'Exportar mis datos'}</span>
                  </button>
                </div>
              </div>

              <LegalGovernanceModal
                isOpen={isLegalModalOpen}
                onClose={() => setIsLegalModalOpen(false)}
              />
            </>
          )}

          {/* ==============================================================
              VENTANA 2: ACCESIBILIDAD (Exclusivo para apariencia, letra, idioma y daltonismo)
              ============================================================== */}
          {normalizedSection === 'accesibilidad' && (
            <>
              <div
                className="profile-section-card"
                style={{ flexShrink: 0, minHeight: 'fit-content' }}
              >
                <h3 className="profile-section-title">{t('profile.accessibility.themeSection')}</h3>
                <div className="profile-option-grid-2">
                  <button
                    type="button"
                    className={`profile-choice-btn ${!isDark ? 'active' : ''}`}
                    onClick={() => setTheme('light')}
                    data-testid="btn-theme-light"
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 700
                      }}
                    >
                      <Sun size={16} style={{ color: '#B69A55' }} />
                      <span>{t('profile.accessibility.themeLight')}</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`profile-choice-btn ${isDark ? 'active' : ''}`}
                    onClick={() => setTheme('dark')}
                    data-testid="btn-theme-dark"
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 700
                      }}
                    >
                      <Moon size={16} style={{ color: '#D4B46A' }} />
                      <span>{t('profile.accessibility.themeDark')}</span>
                    </div>
                  </button>
                </div>
              </div>

              <div
                className="profile-section-card"
                style={{ flexShrink: 0, minHeight: 'fit-content' }}
              >
                <h3
                  className="profile-section-title"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Type size={14} />
                  <span>{t('profile.accessibility.fontSection')}</span>
                </h3>
                <div className="profile-option-grid-4">
                  {Object.keys(FONT_SIZE_SCALES).map((sizeKey) => (
                    <button
                      key={sizeKey}
                      type="button"
                      className={`profile-choice-btn ${fontSize === sizeKey ? 'active' : ''}`}
                      onClick={() => setFontSize(sizeKey)}
                      data-testid={`btn-font-${sizeKey}`}
                    >
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>
                        {t(`profile.accessibility.fonts.${sizeKey}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="profile-section-card"
                style={{ flexShrink: 0, minHeight: 'fit-content' }}
              >
                <h3
                  className="profile-section-title"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Globe size={14} />
                  <span>{t('profile.accessibility.languageSection')}</span>
                </h3>
                <div className="profile-option-grid-2">
                  {LANGUAGES.map((langCode) => (
                    <button
                      key={langCode}
                      type="button"
                      className={`profile-choice-btn ${language === langCode ? 'active' : ''}`}
                      onClick={() => setLanguage(langCode)}
                      data-testid={`btn-lang-${langCode}`}
                    >
                      <span style={{ fontWeight: 700, fontSize: '13px' }}>
                        {t(`profile.accessibility.languages.${langCode}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="profile-section-card"
                style={{ flexShrink: 0, minHeight: 'fit-content' }}
              >
                <h3
                  className="profile-section-title"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Palette size={14} />
                  <span>{t('profile.accessibility.colorblindSection')}</span>
                </h3>
                <div className="profile-option-grid-2">
                  {COLORBLIND_MODES.map((mode) => {
                    const swatches = COLORBLIND_SWATCHES[mode] || COLORBLIND_SWATCHES.ninguno;
                    return (
                      <button
                        key={mode}
                        type="button"
                        className={`profile-choice-btn ${colorblindMode === mode ? 'active' : ''}`}
                        onClick={() => setColorblindMode(mode)}
                        data-testid={`btn-cb-${mode}`}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            gap: '8px'
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '13px' }}>
                            {t(`profile.accessibility.colorblindModes.${mode}.title`)}
                          </span>
                          <span style={{ display: 'inline-flex', gap: '4px' }}>
                            {swatches.map((hex) => (
                              <span
                                key={hex}
                                style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '9999px',
                                  backgroundColor: hex
                                }}
                              />
                            ))}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', opacity: 0.78, lineHeight: 1.3 }}>
                          {t(`profile.accessibility.colorblindModes.${mode}.desc`)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  className="profile-btn-secondary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '9px 14px',
                    fontSize: '13px',
                    fontWeight: 700,
                    marginTop: '4px'
                  }}
                  onClick={resetAccessibility}
                  data-testid="btn-reset-accessibility"
                >
                  <RotateCcw size={14} />
                  <span>{t('profile.accessibility.reset')}</span>
                </button>
              </div>
            </>
          )}

          {/* ==============================================================
              VENTANA 3: CONFIGURACIÓN (Exclusivo para operación, sonido y contraseña)
              ============================================================== */}
          {normalizedSection === 'configuracion' && (
            <>
              <div
                className="profile-section-card"
                style={{ flexShrink: 0, minHeight: 'fit-content' }}
              >
                <h3 className="profile-section-title">{t('profile.settings.operationSection')}</h3>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.85 }}>
                  {t('profile.settings.soundDesc')}
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}
                >
                  <button
                    type="button"
                    className={`profile-choice-btn ${soundEnabled ? 'active' : ''}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    data-testid="btn-toggle-sound"
                  >
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    <span style={{ fontWeight: 700, fontSize: '13px' }}>
                      {soundEnabled
                        ? t('profile.settings.soundActive')
                        : t('profile.settings.soundMuted')}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="profile-btn-secondary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                    onClick={() => playConfirmationChime()}
                    disabled={!soundEnabled}
                    data-testid="btn-test-sound"
                  >
                    <Volume2 size={14} />
                    <span>{t('profile.settings.testSound')}</span>
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleUpdatePassword}
                className="profile-section-card"
                style={{ flexShrink: 0, minHeight: 'fit-content' }}
              >
                <h3
                  className="profile-section-title"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <KeyRound size={14} />
                  <span>{t('profile.settings.securitySection')}</span>
                </h3>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('profile.settings.currentPassword')}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPwd ? 'text' : 'password'}
                      className="form-input"
                      value={passwordActual}
                      onChange={(e) => setPasswordActual(e.target.value)}
                      data-testid="input-current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6B7280'
                      }}
                    >
                      {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('profile.settings.newPassword')}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      className="form-input"
                      value={passwordNueva}
                      onChange={(e) => setPasswordNueva(e.target.value)}
                      data-testid="input-new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6B7280'
                      }}
                    >
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('profile.settings.confirmPassword')}</label>
                  <input
                    type="password"
                    className="form-input"
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                    data-testid="input-confirm-password"
                  />
                </div>

                {passwordFeedback.text && (
                  <div
                    role="status"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '13px',
                      fontWeight: 600,
                      backgroundColor:
                        passwordFeedback.type === 'success'
                          ? 'rgba(22, 163, 74, 0.14)'
                          : 'rgba(220, 38, 38, 0.14)',
                      color: passwordFeedback.type === 'success' ? '#15803D' : '#DC2626'
                    }}
                    data-testid="password-feedback-banner"
                  >
                    {passwordFeedback.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="profile-btn-primary"
                  disabled={isUpdatingPassword}
                  data-testid="btn-update-password"
                >
                  {isUpdatingPassword
                    ? t('profile.settings.updatingPassword')
                    : t('profile.settings.updatePassword')}
                </button>
              </form>

              <div
                className="profile-section-card"
                style={{ flexShrink: 0, minHeight: 'fit-content' }}
              >
                <h3 className="profile-section-title">{t('profile.settings.logoutSection')}</h3>
                <button
                  type="button"
                  className="profile-logout-btn"
                  onClick={handleRequestLogout}
                  data-testid="btn-logout-profile"
                >
                  <LogOut size={16} />
                  <span>{t('profile.settings.logoutBtn')}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showLogoutConfirm &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="cf-modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(9, 17, 29, 0.72)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              zIndex: 100030
            }}
            onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
            data-testid="logout-confirm-overlay"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-confirm-title"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '420px',
                backgroundColor: 'var(--aureus-bg-surface)',
                color: 'var(--aureus-text-primary)',
                border: '1px solid var(--aureus-border)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
                animation: 'cfModalIn 0.24s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '14px'
              }}
              data-testid="logout-confirm-modal"
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(198, 93, 88, 0.14)',
                  border: '1px solid rgba(198, 93, 88, 0.35)',
                  color: '#C65D58',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <LogOut size={26} />
              </div>

              <h3
                id="logout-confirm-title"
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--aureus-text-primary)'
                }}
              >
                {t('profile.settings.logoutConfirmTitle')}
              </h3>

              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: 'var(--aureus-text-muted)'
                }}
              >
                {t('profile.settings.logoutConfirmMessage')}
              </p>

              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  width: '100%',
                  marginTop: '6px'
                }}
              >
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => setShowLogoutConfirm(false)}
                  data-testid="btn-logout-cancel"
                  style={{
                    flex: 1,
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid var(--aureus-border)',
                    backgroundColor: 'transparent',
                    color: 'var(--aureus-text-primary)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isLoggingOut ? 'not-allowed' : 'pointer',
                    opacity: isLoggingOut ? 0.6 : 1
                  }}
                >
                  {t('profile.settings.logoutConfirmCancel')}
                </button>

                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleConfirmLogout}
                  data-testid="btn-logout-confirm"
                  style={{
                    flex: 1,
                    height: '42px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#C65D58',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isLoggingOut ? 'wait' : 'pointer',
                    opacity: isLoggingOut ? 0.8 : 1
                  }}
                >
                  {isLoggingOut
                    ? t('profile.settings.logoutConfirmWorking')
                    : t('profile.settings.logoutConfirmAction')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>,
    document.body
  );
}

export default UserProfileModal;
