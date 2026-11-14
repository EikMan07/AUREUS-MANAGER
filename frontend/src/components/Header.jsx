import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { AureusLogo } from './Common/AureusLogo.jsx';
import SenecaBalanceIcon from './Common/SenecaBalanceIcon.jsx';
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

export function Header({
  title = 'Cobros',
  hasNotifications = false,
  notificationCount = 0,
  onOpenNotifications,
  onOpenSeneca,
  onOpenProfile
}) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { usuario } = useAuth();
  const { t } = useAccessibility();
  const showBadge = notificationCount > 0 || hasNotifications;

  const firstName = String(usuario?.nombre_completo || '')
    .trim()
    .split(/\s+/)[0] || usuario?.username || 'Perfil';
  const profileInitials = getProfileInitials(usuario?.nombre_completo, usuario?.username);

  const handleOpenLandingInfo = () => {
    navigate('/bienvenida');
  };

  return (
    <header
      className="header-dark-compact"
      style={{
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
      }}
    >
      <div className="header-top-bar">
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
            gap: '12px',
            minWidth: 0,
            cursor: 'pointer'
          }}
        >
          <AureusLogo size={38} />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '2px',
              minWidth: 0,
            }}
          >
            <h1
              className="main-title"
              style={{
                margin: 0,
                fontSize: '18.5px',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
                color: isDark ? '#F5F3ED' : '#252A31',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </h1>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                lineHeight: 1.1,
                textTransform: 'uppercase',
              }}
            >
              <span style={{ color: isDark ? '#D4B46A' : '#B69A55' }}>AUREUS</span>
              <span style={{ color: isDark ? '#CBD5E1' : '#4A5058' }}>MANAGER</span>
            </div>
          </div>
        </div>

        <div className="header-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {typeof onOpenSeneca === 'function' && (
            <button
              type="button"
              className="header-seneca-btn"
              onClick={onOpenSeneca}
              aria-label={t('header.senecaTitle')}
              title={t('header.senecaTitle')}
              style={{
                width: '40px',
                height: '40px',
                padding: 0,
                borderRadius: '12px',
                border: isDark ? '1px solid rgba(182, 154, 85, 0.45)' : '1px solid #D5C295',
                backgroundColor: isDark ? '#1B2B40' : '#F7F2E4',
                color: isDark ? '#D4B46A' : '#B69A55',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: isDark
                  ? '0 2px 10px rgba(0, 0, 0, 0.35)'
                  : '0 2px 6px rgba(182, 154, 85, 0.14)',
                transition: 'all 0.22s ease',
                flexShrink: 0,
              }}
            >
              <SenecaBalanceIcon size={25} color={isDark ? '#D4B46A' : '#B69A55'} />
            </button>
          )}

          <button
            type="button"
            className="notification-btn header-icon-action"
            aria-label={t('header.notificationsTitle')}
            title={notificationCount > 0 ? `${notificationCount} ${t('header.notificationsTitle')}` : t('header.notificationsTitle')}
            onClick={onOpenNotifications}
            style={{
              position: 'relative',
              width: '42px',
              height: '42px',
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
              transition: 'all 0.22s ease',
            }}
          >
            <Bell size={20} strokeWidth={2} color={isDark ? '#E5C97B' : '#B69A55'} />
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
            onClick={onOpenProfile}
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
        </div>
      </div>
    </header>
  );
}

export default Header;
