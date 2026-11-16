import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Eye,
  Settings,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAccessibility } from '../../context/AccessibilityContext.jsx';
import { ImperialCornerAccents } from '../Common/ClassicalAppArchitecture.jsx';

function getInitials(name, username) {
  const source = String(name || username || 'AU').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function UserAccountMenu({ isOpen, onClose, onOpenSection }) {
  // Todos los Hooks declarados al inicio del componente antes de cualquier retorno condicional
  const navigate = useNavigate();
  const { usuario, logout } = useAuth();
  const { isDark } = useTheme();
  const { t } = useAccessibility();

  const menuRef = useRef(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (e) => {
      const target = e.target;
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      if (target && typeof target.closest === 'function' && target.closest('[data-testid="btn-profile-header"]')) {
        return;
      }
      onClose?.();
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const initials = useMemo(
    () => getInitials(usuario?.nombre_completo, usuario?.username),
    [usuario]
  );

  const handleSelectSection = useCallback(
    (sec) => {
      onClose?.();
      onOpenSection?.(sec);
    },
    [onClose, onOpenSection]
  );

  const handleOpenLogoutConfirm = useCallback(() => {
    onClose?.();
    setShowLogoutConfirm(true);
  }, [onClose]);

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

  if (!isOpen && !showLogoutConfirm) return null;
  if (typeof document === 'undefined') return null;

  const rowButtonStyle = {
    width: '100%',
    padding: '10px 18px',
    border: 'none',
    background: 'transparent',
    color: 'var(--aureus-text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    fontSize: '13.5px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.15s ease'
  };

  const iconColor = isDark ? '#D4B46A' : '#8C6D23';

  return createPortal(
    <>
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t('profile.menu.ariaLabel')}
          data-testid="user-account-menu"
          className="aureus-user-account-dropdown"
          style={{
            position: 'fixed',
            top: '74px',
            right: '18px',
            width: '320px',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: 'calc(100dvh - 90px)',
            overflowY: 'auto',
            borderRadius: '18px',
            backgroundColor: isDark ? '#162436' : '#FFFFFF',
            border: isDark ? '1px solid rgba(212, 180, 106, 0.28)' : '1px solid #E5E0D5',
            boxShadow: isDark
              ? '0 20px 50px rgba(0, 0, 0, 0.55)'
              : '0 18px 42px rgba(16, 28, 44, 0.16)',
            zIndex: 100000,
            animation: 'cfCardFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <ImperialCornerAccents isDark={isDark} />
          <div>
            {/* Cabecera del Usuario */}
            <div
              style={{
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                borderBottom: isDark
                  ? '1px solid rgba(212, 180, 106, 0.22)'
                  : '1px solid rgba(182, 154, 85, 0.25)',
                background: isDark
                  ? 'linear-gradient(180deg, rgba(212, 180, 106, 0.05) 0%, transparent 100%)'
                  : 'linear-gradient(180deg, rgba(182, 154, 85, 0.06) 0%, transparent 100%)'
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                  color: '#101C2C',
                  fontWeight: 900,
                  fontSize: '15px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                  border: isDark ? '1.5px solid #F5E1A4' : '1.5px solid #9E8342',
                  boxShadow: isDark
                    ? '0 0 0 3px rgba(212, 180, 106, 0.18), 0 4px 12px rgba(0, 0, 0, 0.35)'
                    : '0 0 0 3px rgba(182, 154, 85, 0.18), 0 4px 12px rgba(182, 154, 85, 0.22)'
                }}
              >
                {usuario?.foto_url ? (
                  <img
                    src={usuario.foto_url}
                    alt={usuario?.nombre_completo || 'Avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: '15.5px',
                    fontWeight: 800,
                    color: 'var(--aureus-text-primary)',
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {usuario?.nombre_completo || t('profile.menu.defaultAdmin')}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--aureus-text-secondary)',
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  @{usuario?.username || 'admin'}
                </div>
                <button
                  type="button"
                  data-testid="menu-link-ver-perfil"
                  onClick={() => handleSelectSection('perfil')}
                  style={{
                    marginTop: '6px',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: isDark ? '#D4B46A' : '#9E7B2F',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer'
                  }}
                >
                  {t('profile.menu.viewProfile')}
                </button>
              </div>
            </div>

            {/* Opciones del Menú (Accesibilidad y Configuración) */}
            <div
              style={{
                padding: '6px 0',
                borderBottom: '1px solid var(--aureus-border-subtle)'
              }}
            >
              <button
                type="button"
                role="menuitem"
                data-testid="menu-item-accesibilidad"
                className="aureus-account-menu-row"
                onClick={() => handleSelectSection('accesibilidad')}
                style={rowButtonStyle}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                  <Eye size={18} color={iconColor} />
                  <span>{t('profile.tabs.accesibilidad')}</span>
                </span>
                <ChevronRight size={16} color="var(--aureus-text-muted)" />
              </button>

              <button
                type="button"
                role="menuitem"
                data-testid="menu-item-configuracion"
                className="aureus-account-menu-row"
                onClick={() => handleSelectSection('configuracion')}
                style={rowButtonStyle}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                  <Settings size={18} color={iconColor} />
                  <span>{t('profile.tabs.configuracion')}</span>
                </span>
                <ChevronRight size={16} color="var(--aureus-text-muted)" />
              </button>
            </div>

            {/* Sección 3 (Salida) */}
            <div style={{ padding: '6px 0' }}>
              <button
                type="button"
                role="menuitem"
                data-testid="menu-item-cerrar-sesion"
                className="aureus-account-menu-row"
                onClick={handleOpenLogoutConfirm}
                style={rowButtonStyle}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
                  <LogOut size={18} color="#C65D58" />
                  <span>{t('profile.settings.logoutBtn')}</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Cierre de Sesión */}
      {showLogoutConfirm && (
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
            zIndex: 100005
          }}
          onClick={() => !isLoggingOut && setShowLogoutConfirm(false)}
          data-testid="logout-confirm-overlay"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title-menu"
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
              id="logout-confirm-title-menu"
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
        </div>
      )}
    </>,
    document.body
  );
}

export default UserAccountMenu;
