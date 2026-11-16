import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { AureusLogo } from './Common/AureusLogo.jsx';
import { SenecaRomanIcon } from './Common/SenecaRomanIcon.jsx';
import { UserAccountMenu } from './Profile/UserAccountMenu.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useAccessibility } from '../context/AccessibilityContext.jsx';

function getProfileInitials(name, username) {
  const source = String(name || username || 'AU').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

const MODULE_ROMAN_NUMERALS = {
  cobros: 'I',
  clientes: 'II',
  prestamos: 'III',
  resumen: 'IV',
  'lista-negra': 'V',
  papelera: 'VI'
};

export function Header({
  title = 'Cobros',
  activeModuleKey = 'cobros',
  hasNotifications = false,
  notificationCount = 0,
  onOpenNotifications,
  onOpenSeneca,
  onOpenProfile
}) {
  // Todos los Hooks al inicio del componente antes de cualquier retorno condicional
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { usuario } = useAuth();
  const { t } = useAccessibility();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const showBadge = notificationCount > 0 || hasNotifications;

  const firstName =
    String(usuario?.nombre_completo || '')
      .trim()
      .split(/\s+/)[0] ||
    usuario?.username ||
    'Perfil';
  const profileInitials = getProfileInitials(usuario?.nombre_completo, usuario?.username);

  const handleOpenLandingInfo = () => {
    navigate('/bienvenida');
  };

  return (
    <header
      className="header-dark-compact"
      style={{
        position: 'relative',
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
        transition: 'background-color 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease',
        boxSizing: 'border-box'
      }}
    >
      <div
        className="header-top-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap',
          width: '100%'
        }}
      >
        {/* Grupo Izquierdo: Logo + AUREUS MANAGER + Divisor Vertical + Cápsula del Módulo Activo */}
        <div
          className="header-left-aligned-group"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            minWidth: 0
          }}
        >
          {/* 1. Bloque de marca clicable */}
          <div
            className="brand-group"
            role="button"
            tabIndex={0}
            onClick={handleOpenLandingInfo}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenLandingInfo();
              }
            }}
            title="Ver página informativa de Aureus Manager"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: 0,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <AureusLogo size={42} />
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minWidth: 0
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  color: isDark ? '#D4B46A' : '#B69A55',
                  lineHeight: 1.05,
                  whiteSpace: 'nowrap'
                }}
              >
                AUREUS
              </span>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  letterSpacing: '0.18em',
                  color: 'var(--aureus-text-secondary)',
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap'
                }}
              >
                MANAGER
              </span>
            </div>
          </div>

          {/* 2. Divisor vertical ejecutivo */}
          <span
            aria-hidden="true"
            className="header-brand-divider"
            style={{
              width: '1px',
              height: '32px',
              backgroundColor: isDark ? 'rgba(212, 180, 106, 0.25)' : '#E5E0D5',
              flexShrink: 0
            }}
          />

          {/* 3. Cápsula indicadora del módulo activo */}
          <div
            className="header-active-module-pill"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '38px',
              padding: '0 14px',
              borderRadius: '12px',
              backgroundColor: isDark ? 'rgba(22, 36, 54, 0.9)' : '#F7F2E4',
              border: isDark ? '1px solid rgba(212, 180, 106, 0.32)' : '1px solid #D5C295',
              minWidth: 0
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '9999px',
                backgroundColor: isDark ? '#D4B46A' : '#B69A55',
                boxShadow: '0 0 8px rgba(212, 180, 106, 0.6)',
                flexShrink: 0
              }}
            />
            <span
              className="aureus-roman-numeral-badge"
              style={{
                fontSize: '12.5px',
                fontWeight: 800,
                color: isDark ? '#E5C97B' : '#9A7B38',
                flexShrink: 0
              }}
            >
              {MODULE_ROMAN_NUMERALS[activeModuleKey] || 'I'} ·
            </span>
            <h1
              className="main-title aureus-imperial-title"
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: 'var(--aureus-text-primary)',
                margin: 0,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {title}
            </h1>
          </div>
        </div>

        {/* Grupo Derecho: Cápsula Séneca IA + Notificaciones + Perfil */}
        <div
          className="header-actions-group"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0
          }}
        >
          {typeof onOpenSeneca === 'function' && (
            <button
              type="button"
              className="header-seneca-btn rb-halo-ring"
              onClick={onOpenSeneca}
              aria-label={t('header.senecaTitle')}
              title={t('header.senecaTitle')}
              style={{
                height: '40px',
                padding: '0 12px',
                borderRadius: '12px',
                border: isDark ? '1px solid rgba(212, 180, 106, 0.48)' : '1px solid #D5C295',
                backgroundColor: isDark ? '#1B2B40' : '#F7F2E4',
                color: isDark ? '#D4B46A' : '#B69A55',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '7px',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: isDark
                  ? '0 2px 12px rgba(212, 180, 106, 0.18)'
                  : '0 2px 8px rgba(182, 154, 85, 0.16)',
                transition: 'all 0.22s ease',
                flexShrink: 0
              }}
            >
              <SenecaRomanIcon size={21} color={isDark ? '#D4B46A' : '#B69A55'} />
              <span
                className="header-seneca-label"
                style={{
                  fontSize: '11.5px',
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  color: isDark ? '#E5C97B' : '#876B2D',
                  whiteSpace: 'nowrap'
                }}
              >
                SÉNECA IA
              </span>
            </button>
          )}

          <button
            type="button"
            className="notification-btn header-icon-action"
            aria-label={t('header.notificationsTitle')}
            title={
              notificationCount > 0
                ? `${notificationCount} ${t('header.notificationsTitle')}`
                : t('header.notificationsTitle')
            }
            onClick={onOpenNotifications}
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: isDark ? '#1B2B40' : '#F7F2E4',
              border: isDark ? '1px solid rgba(182, 154, 85, 0.45)' : '1px solid #D5C295',
              color: isDark ? '#E5C97B' : '#252A31',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: isDark
                ? '0 2px 10px rgba(0, 0, 0, 0.35)'
                : '0 2px 6px rgba(182, 154, 85, 0.14)',
              transition: 'all 0.22s ease'
            }}
          >
            <Bell size={19} strokeWidth={2} color={isDark ? '#E5C97B' : '#B69A55'} />
            {showBadge && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  minWidth: notificationCount > 0 ? '19px' : '10px',
                  height: notificationCount > 0 ? '19px' : '10px',
                  padding: notificationCount > 0 ? '0 5px' : '0',
                  borderRadius: '9999px',
                  backgroundColor: '#C65D58',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(198, 93, 88, 0.4)',
                  border: isDark ? '1.5px solid #101C2C' : '1.5px solid #FFFFFF',
                  pointerEvents: 'none',
                  lineHeight: 1
                }}
              >
                {notificationCount > 9 ? '9+' : notificationCount > 0 ? notificationCount : ''}
              </span>
            )}
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
            onOpenSection={(sectionKey) => {
              setIsAccountMenuOpen(false);
              onOpenProfile?.(sectionKey);
            }}
          />
        </div>
      </div>
      <div className="header-imperial-greca-trim" aria-hidden="true" />
    </header>
  );
}

export default Header;
