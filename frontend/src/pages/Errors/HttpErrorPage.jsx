import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileWarning,
  LockKeyhole,
  ShieldAlert,
  Compass,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { AureusLogo } from '../../components/Common/AureusLogo';
import { useTheme } from '../../context/ThemeContext';

const SUPPORTED_CODES = [400, 401, 403, 404];

function normalizeErrorCode(rawCode) {
  const num = Number(rawCode);
  return SUPPORTED_CODES.includes(num) ? num : 404;
}

function resolveCodeFromPath(pathname) {
  const cleanPath = String(pathname || '').toLowerCase();
  if (cleanPath === '/400' || cleanPath === '/error-400') return 400;
  if (cleanPath === '/401' || cleanPath === '/error-401') return 401;
  if (cleanPath === '/403' || cleanPath === '/error-403') return 403;
  if (cleanPath === '/404' || cleanPath === '/error-404') return 404;
  return 404;
}

const ERROR_CATALOG = {
  400: {
    badge: 'ERROR 400 · SOLICITUD INCORRECTA',
    Icon: FileWarning,
    title: 'No se pudo procesar la solicitud',
    description:
      'Los datos enviados están incompletos o tienen un formato que no se puede procesar en este momento. Revisa la información e inténtalo de nuevo.',
    causes: [
      'Datos escritos con un formato no válido',
      'Enlace incompleto o modificado manualmente',
      'Parámetros faltantes para completar la operación'
    ],
    tone: 'gold'
  },
  401: {
    badge: 'ERROR 401 · ACCESO NO AUTORIZADO',
    Icon: LockKeyhole,
    title: 'Se requiere iniciar sesión para continuar',
    description:
      'Tu sesión ha finalizado por seguridad tras permanecer inactiva o necesitas identificarte para entrar a esta sección.',
    causes: [
      'Tiempo de inactividad cumplido por seguridad',
      'Sesión cerrada desde este dispositivo',
      'Intento de ingreso directo sin identificación previa'
    ],
    tone: 'gold'
  },
  403: {
    badge: 'ERROR 403 · ACCESO RESTRINGIDO',
    Icon: ShieldAlert,
    title: 'No tienes permisos para esta sección',
    description:
      'La solicitud fue recibida correctamente, pero tu perfil actual no cuenta con los permisos necesarios para abrir este apartado o realizar esta acción.',
    causes: [
      'Sección reservada únicamente para el administrador',
      'Operación restringida en vistas de cobros compartidos',
      'Permisos insuficientes para modificar o borrar este registro'
    ],
    tone: 'red'
  },
  404: {
    badge: 'ERROR 404 · PÁGINA NO ENCONTRADA',
    Icon: Compass,
    title: 'No encontramos la página que buscas',
    description:
      'La dirección que escribiste no existe, fue cambiada de lugar o el registro que intentas consultar ya fue eliminado definitivamente.',
    causes: [
      'Dirección web escrita con algún error de ortografía',
      'Enlace antiguo que ya no se encuentra disponible',
      'Contenido o registro que fue borrado anteriormente'
    ],
    tone: 'gold'
  }
};

export function HttpErrorPage({ code, customTitle, customMessage, onRetry }) {
  // Todos los Hooks declarados al inicio del componente antes de cualquier retorno condicional
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();

  const resolvedCode = normalizeErrorCode(
    code !== undefined && code !== null ? code : resolveCodeFromPath(location.pathname)
  );
  const config = ERROR_CATALOG[resolvedCode] || ERROR_CATALOG[404];
  const ErrorIcon = config.Icon;

  const resolvedTitle = customTitle || config.title;
  const resolvedDescription = customMessage || config.description;

  const goldAccent = isDark ? '#D4B46A' : '#B69A55';
  const redAccent = isDark ? '#F0807A' : '#C65D58';
  const isRedTone = config.tone === 'red';
  const accentColor = isRedTone ? redAccent : goldAccent;

  const emblemSoftBg = isRedTone ? 'var(--aureus-red-light)' : 'var(--aureus-gold-light)';
  const emblemBorder = isRedTone ? 'var(--aureus-red-border)' : 'var(--aureus-border-gold)';
  const badgeTextColor = isRedTone ? 'var(--aureus-red-text)' : 'var(--aureus-gold-text)';

  const handleGoBack = () => {
    if (typeof onRetry === 'function') {
      onRetry();
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--aureus-bg-app)',
        color: 'var(--aureus-text-primary)',
        padding: '16px',
        fontFamily: 'inherit'
      }}
    >
      {/* BARRA SUPERIOR INSTITUCIONAL */}
      <header
        style={{
          width: '100%',
          maxWidth: '920px',
          margin: '0 auto 16px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: 0
          }}
        >
          <AureusLogo size={36} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: goldAccent
              }}
            >
              AUREUS
            </span>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.12em',
                color: 'var(--aureus-text-primary)'
              }}
            >
              MANAGER
            </span>
          </div>
        </div>
      </header>

      {/* TARJETA CENTRAL EJECUTIVA */}
      <main
        style={{
          flex: '1 1 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <section
          aria-labelledby="http-error-title"
          style={{
            maxWidth: '540px',
            width: '100%',
            margin: 'auto',
            padding: '32px 24px',
            borderRadius: '24px',
            backgroundColor: 'var(--aureus-bg-surface)',
            border: '1px solid var(--aureus-border-subtle)',
            boxShadow: 'var(--aureus-card-shadow)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '16px'
          }}
        >
          {/* Emblema circular doble + Número de error */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div
              style={{
                width: '86px',
                height: '86px',
                borderRadius: '50%',
                backgroundColor: emblemSoftBg,
                border: `1.5px solid ${emblemBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '7px',
                boxSizing: 'border-box'
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundColor: 'var(--aureus-bg-surface)',
                  border: `1.5px solid ${emblemBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: accentColor
                }}
              >
                <ErrorIcon size={38} strokeWidth={2} />
              </div>
            </div>

            <span
              style={{
                fontWeight: 900,
                fontSize: '44px',
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: accentColor
              }}
            >
              {resolvedCode}
            </span>
          </div>

          {/* Insignia superior */}
          <div
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              backgroundColor: emblemSoftBg,
              border: `1px solid ${emblemBorder}`,
              color: badgeTextColor,
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.06em'
            }}
          >
            {config.badge}
          </div>

          {/* Título y descripción */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '460px' }}>
            <h1
              id="http-error-title"
              style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: 800,
                lineHeight: 1.25,
                color: 'var(--aureus-text-primary)'
              }}
            >
              {resolvedTitle}
            </h1>

            <p
              style={{
                margin: 0,
                fontSize: '14.5px',
                fontWeight: 500,
                lineHeight: 1.6,
                color: 'var(--aureus-text-secondary)'
              }}
            >
              {resolvedDescription}
            </p>
          </div>

          {/* Recuadro interno CAUSAS COMUNES */}
          <div
            style={{
              width: '100%',
              borderRadius: '16px',
              padding: '16px',
              backgroundColor: 'var(--aureus-bg-elevated)',
              border: '1px solid var(--aureus-border-subtle)',
              textAlign: 'left',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.06em',
                color: 'var(--aureus-text-muted)',
                textTransform: 'uppercase'
              }}
            >
              CAUSAS COMUNES
            </span>

            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {config.causes.map((cause, idx) => (
                <li
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    lineHeight: 1.4,
                    color: 'var(--aureus-text-primary)'
                  }}
                >
                  <AlertCircle
                    size={15}
                    strokeWidth={2.2}
                    style={{ color: accentColor, flexShrink: 0, marginTop: '2px' }}
                  />
                  <span>{cause}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Botón único ejecutivo de salida */}
          <button
            type="button"
            onClick={handleGoBack}
            style={{
              width: '100%',
              height: '48px',
              marginTop: '4px',
              padding: '0 18px',
              borderRadius: '14px',
              backgroundColor: goldAccent,
              border: isDark ? '1px solid #F5E1A4' : '1px solid #9E8342',
              color: '#101C2C',
              fontFamily: 'inherit',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box'
            }}
          >
            <ArrowLeft size={18} strokeWidth={2.4} color="#101C2C" />
            <span>Regresar</span>
          </button>
        </section>
      </main>
    </div>
  );
}

export default HttpErrorPage;
