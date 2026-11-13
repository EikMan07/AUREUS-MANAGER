import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

export function CookieConsentBanner({ highlighted = false }) {
  // Todos los Hooks al inicio del componente antes de cualquier retorno condicional
  const { cookiesAceptadas, aceptarCookiesSeguridad } = useAuth();
  const { isDark } = useTheme();
  const [isHovering, setIsHovering] = useState(false);

  if (cookiesAceptadas === true) {
    return null;
  }

  const goldAccent = isDark ? '#D4B46A' : '#B69A55';
  const surfaceBg = isDark ? '#162436' : '#FFFFFF';
  const textPrimary = isDark ? '#F5F3ED' : '#252A31';
  const textSecondary = isDark ? '#CBD5E1' : '#4A5058';

  return (
    <aside
      data-testid="cookie-consent-banner"
      role="dialog"
      aria-label="Protección y cookies de seguridad"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        right: '20px',
        maxWidth: '680px',
        margin: '0 auto',
        zIndex: 100000,
        borderRadius: '20px',
        padding: '20px 22px',
        backgroundColor: surfaceBg,
        border: highlighted
          ? `2px solid ${goldAccent}`
          : `1px solid ${goldAccent}`,
        boxShadow: isDark
          ? '0 22px 48px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(212, 180, 106, 0.25)'
          : '0 20px 44px rgba(16, 28, 44, 0.18), 0 0 0 1px rgba(182, 154, 85, 0.2)',
        color: textPrimary,
        boxSizing: 'border-box',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            backgroundColor: isDark ? '#1D2E44' : '#F7F2E4',
            border: `1px solid ${isDark ? 'rgba(212, 180, 106, 0.45)' : '#D5C295'}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={26} color={goldAccent} strokeWidth={2.2} />
        </div>

        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <h2
            style={{
              margin: '0 0 6px 0',
              fontSize: '16px',
              fontWeight: 800,
              lineHeight: 1.25,
              color: textPrimary,
            }}
          >
            Protección y cookies de seguridad
          </h2>

          <p
            style={{
              margin: '0 0 14px 0',
              fontSize: '13.5px',
              lineHeight: 1.55,
              color: textSecondary,
            }}
          >
            Al ingresar por primera vez a Aureus Manager, debes aceptar el uso de cookies esenciales de seguridad. Estas cookies se utilizan únicamente para cifrar tu sesión, verificar tu identidad al iniciar sesión y proteger tu cuenta contra accesos no autorizados.
          </p>

          <button
            type="button"
            data-testid="btn-aceptar-cookies"
            onClick={aceptarCookiesSeguridad}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            style={{
              height: '44px',
              padding: '0 22px',
              borderRadius: '12px',
              backgroundColor: goldAccent,
              border: `1px solid ${isDark ? '#F5E1A4' : '#9E8342'}`,
              color: '#101C2C',
              fontWeight: 900,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isHovering ? 'translateY(-1px)' : 'none',
              boxShadow: '0 4px 12px rgba(182, 154, 85, 0.25)',
              transition: 'transform 0.16s ease, box-shadow 0.16s ease',
              maxWidth: '100%',
            }}
          >
            Aceptar cookies por seguridad
          </button>
        </div>
      </div>
    </aside>
  );
}

export default CookieConsentBanner;

