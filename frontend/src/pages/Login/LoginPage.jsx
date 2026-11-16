import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { AureusLogo } from '../../components/Common/AureusLogo.jsx';
import { CookieConsentBanner } from '../../components/Common/CookieConsentBanner.jsx';
import { LegalGovernanceModal } from '../../components/Legal/LegalGovernanceModal.jsx';
import {
  ClassicalArchitecturalBackdrop,
  FlutedPilasters,
  ClassicalLaurelDivider,
  ImperialCornerAccents,
  handleSpotlightMouseMove,
} from '../../components/Common/ClassicalAppArchitecture.jsx';

const LOGIN_PILLARS = [
  {
    roman: 'I',
    text: 'Control diario de cobros, préstamos y agenda semanal de Lunes a Domingo.',
  },
  {
    roman: 'II',
    text: 'Asesor financiero Séneca IA con análisis en vivo por zonas y deudores.',
  },
  {
    roman: 'III',
    text: 'Bóveda de datos con respaldo de 30 días y delegación segura en ruta.',
  },
];

function LoginImperialMedallion({ isDark }) {
  const ringStroke = isDark ? '#D4B46A' : '#B69A55';
  const numeralColor = isDark ? 'rgba(229, 201, 123, 0.85)' : 'rgba(139, 105, 20, 0.82)';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        width: '128px',
        height: '128px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 14px auto',
        userSelect: 'none',
      }}
    >
      {/* Capa Exterior: Anillo astrolabio giratorio con números romanos */}
      <svg
        viewBox="0 0 128 128"
        width="128"
        height="128"
        className="aureus-roman-astrolabe-ring"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        <defs>
          <path
            id="aureusLoginRomanCirclePath"
            d="M 64, 64 m -55, 0 a 55,55 0 1,1 110,0 a 55,55 0 1,1 -110,0"
          />
        </defs>
        <circle
          cx="64"
          cy="64"
          r="62"
          stroke={ringStroke}
          strokeOpacity={isDark ? '0.45' : '0.52'}
          strokeWidth="1.2"
          fill="none"
        />
        <circle
          cx="64"
          cy="64"
          r="58"
          stroke={ringStroke}
          strokeOpacity={isDark ? '0.32' : '0.4'}
          strokeWidth="0.9"
          strokeDasharray="3 3"
          fill="none"
        />
        <text
          fill={numeralColor}
          fontSize="6.4"
          fontWeight="800"
          letterSpacing="2.3px"
          style={{ fontFamily: "'Cinzel', Georgia, serif" }}
        >
          <textPath href="#aureusLoginRomanCirclePath" startOffset="2%">
            I · II · III · IV · V · VI · VII · VIII · IX · X · XI · XII ·
          </textPath>
        </text>
      </svg>

      {/* Capa Media: Halo dorado + Corona de laurel */}
      <div
        className="rb-halo-ring"
        style={{
          position: 'relative',
          width: '102px',
          height: '102px',
          borderRadius: '9999px',
          border: isDark ? '2.2px solid #D4B46A' : '2.2px solid #B69A55',
          background: isDark
            ? 'radial-gradient(circle, rgba(212, 180, 106, 0.22) 0%, rgba(16, 28, 44, 0.94) 76%)'
            : 'radial-gradient(circle, rgba(182, 154, 85, 0.24) 0%, #FFFFFF 78%)',
          boxShadow: isDark
            ? '0 0 28px rgba(212, 180, 106, 0.4), inset 0 0 16px rgba(212, 180, 106, 0.24)'
            : '0 8px 24px rgba(182, 154, 85, 0.26), inset 0 0 14px rgba(182, 154, 85, 0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <svg
          viewBox="0 0 102 102"
          fill="none"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          <path
            d="M51 94 C31 92 14 76 11 55"
            stroke={ringStroke}
            strokeWidth="1.4"
            strokeOpacity="0.72"
            strokeLinecap="round"
          />
          <path
            d="M51 94 C71 92 88 76 91 55"
            stroke={ringStroke}
            strokeWidth="1.4"
            strokeOpacity="0.72"
            strokeLinecap="round"
          />
          <path
            d="M19 74 C14 70 13 64 17 61 C20 64 21 69 19 74 Z M28 84 C23 81 21 75 25 72 C28 75 30 80 28 84 Z M38 91 C33 88 31 83 34 80 C38 82 39 87 38 91 Z"
            fill={ringStroke}
            fillOpacity="0.55"
          />
          <path
            d="M83 74 C88 70 89 64 85 61 C82 64 81 69 83 74 Z M74 84 C79 81 81 75 77 72 C74 75 72 80 74 84 Z M64 91 C69 88 71 83 68 80 C64 82 63 87 64 91 Z"
            fill={ringStroke}
            fillOpacity="0.55"
          />
        </svg>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <AureusLogo size={64} />
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  // Todos los Hooks declarados al inicio antes de cualquier retorno condicional
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const {
    autenticado,
    cargando,
    usuario,
    cookiesAceptadas,
    aceptarCookiesSeguridad,
    mensajeSesion,
    limpiarMensajeSesion,
    login,
    registrar,
  } = useAuth();

  const [mode, setMode] = useState('login');
  const [identificador, setIdentificador] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [nombreCompleto, setNombreCompleto] = useState('');
  const [username, setUsername] = useState('');
  const [correo, setCorreo] = useState('');
  const [passwordReg, setPasswordReg] = useState('');
  const [confirmPasswordReg, setConfirmPasswordReg] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cookieWarning, setCookieWarning] = useState(false);
  const [sessionNotice, setSessionNotice] = useState('');
  const [unlockedFields, setUnlockedFields] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [terminosAceptados, setTerminosAceptados] = useState(true);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);

  useEffect(() => {
    if (cookiesAceptadas) {
      setCookieWarning(false);
    }
  }, [cookiesAceptadas]);

  useEffect(() => {
    try {
      const expiredByInactivity = sessionStorage.getItem('aureus_inactivity_expired') === '1';
      if (expiredByInactivity) {
        setSessionNotice(
          'Tu sesión se cerró automáticamente porque transcurrieron 25 minutos sin actividad en la página.'
        );
        sessionStorage.removeItem('aureus_inactivity_expired');
      } else if (mensajeSesion) {
        setSessionNotice(mensajeSesion);
      }
      if (mensajeSesion) {
        limpiarMensajeSesion?.();
      }
      sessionStorage.removeItem('aureus_entered_app');
      sessionStorage.removeItem('aureus_session_expired_notice');
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {
      if (mensajeSesion) {
        setSessionNotice(mensajeSesion);
        limpiarMensajeSesion?.();
      }
    }
  }, [mensajeSesion, limpiarMensajeSesion]);

  if (!cargando && autenticado) {
    const defaultRoleTarget = usuario?.rol === 'ADMINISTRADOR' ? '/admin' : '/dashboard';
    const destino = location.state?.from?.pathname;
    const safeTarget =
      usuario?.rol === 'ADMINISTRADOR'
        ? '/admin'
        : destino &&
            destino !== '/login' &&
            destino !== '/bienvenida' &&
            destino !== '/informacion' &&
            destino !== '/admin'
          ? destino
          : defaultRoleTarget;
    return <Navigate to={safeTarget} replace />;
  }

  const goldBg = isDark ? '#D4B46A' : '#B69A55';
  const goldBorder = isDark ? '#F5E1A4' : '#9E8342';
  const goldText = isDark ? '#D4B46A' : '#B69A55';
  const pageBg = isDark ? '#101C2C' : '#F5F3ED';
  const surfaceBg = isDark ? '#162436' : '#FFFFFF';
  const inputBg = isDark ? '#1D2E44' : '#F5F3ED';
  const borderSubtle = isDark ? '#283B54' : '#E5E0D5';
  const textPrimary = isDark ? '#F5F3ED' : '#252A31';
  const textSecondary = isDark ? '#CBD5E1' : '#4A5058';
  const textMuted = isDark ? '#94A3B8' : '#6E757F';

  const unlockField = (fieldKey) => {
    setUnlockedFields((prev) => (prev[fieldKey] ? prev : { ...prev, [fieldKey]: true }));
  };

  const clearFieldError = (fieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSessionNotice('');
    setCookieWarning(false);
    setUnlockedFields({});
    setFieldErrors({});
  };

  const handleAcceptCookiesInline = () => {
    aceptarCookiesSeguridad();
    setCookieWarning(false);
    setError('');
  };

  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    if (!cookiesAceptadas) {
      setCookieWarning(true);
      return;
    }

    const cleanId = identificador.trim();
    if (!cleanId || !passwordLogin) {
      setFieldErrors({
        identificador: !cleanId,
        passwordLogin: !passwordLogin,
      });
      setError('Ingresa tu usuario o correo electrónico y tu contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login({
        identificador: cleanId,
        password: passwordLogin,
        cookiesAceptadas: true,
      });
      const loggedUser = res?.usuario || res;
      const targetPath = loggedUser?.rol === 'ADMINISTRADOR' ? '/admin' : '/dashboard';
      navigate(targetPath, { replace: true });
    } catch (err) {
      setError(
        err?.userMessage ||
          err?.message ||
          'El usuario o la contraseña ingresados no son correctos.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!cookiesAceptadas) {
      setCookieWarning(true);
      return;
    }

    const cleanNombre = nombreCompleto.trim();
    const cleanUser = username.trim();
    const cleanCorreo = correo.trim();

    const nextErrors = {};
    let firstMessage = '';

    if (cleanNombre.length < 3) {
      nextErrors.nombre = true;
      if (!firstMessage) firstMessage = 'El nombre completo debe tener al menos 3 caracteres.';
    }

    if (cleanUser.length < 3 || /\s/.test(cleanUser)) {
      nextErrors.username = true;
      if (!firstMessage) firstMessage = 'El nombre de usuario debe tener al menos 3 caracteres y sin espacios.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanCorreo)) {
      nextErrors.correo = true;
      if (!firstMessage) firstMessage = 'Ingresa un correo electrónico válido.';
    }

    if (passwordReg.length < 8) {
      nextErrors.passwordReg = true;
      if (!firstMessage) firstMessage = 'La contraseña debe tener mínimo 8 caracteres.';
    }

    if (!confirmPasswordReg || passwordReg !== confirmPasswordReg) {
      nextErrors.confirmPasswordReg = true;
      if (!firstMessage) firstMessage = 'Las contraseñas no coinciden. Verifícalas para continuar.';
    }

    if (!terminosAceptados) {
      nextErrors.terminos = true;
      if (!firstMessage) {
        firstMessage =
          'Debes aceptar los Términos de Uso y la Política de Privacidad Ley 8968 para crear tu cuenta.';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError(firstMessage);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      await registrar({
        nombre_completo: cleanNombre,
        username: cleanUser,
        correo: cleanCorreo,
        password: passwordReg,
        cookiesAceptadas: true,
        terminosAceptados: true,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err?.userMessage || err?.message || 'No fue posible crear tu cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    height: '48px',
    padding: '0 14px',
    borderRadius: '14px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    backgroundColor: isDark ? '#132032' : '#F8F6F0',
    border: '1px solid var(--aureus-border-subtle)',
  };

  const inputStyle = {
    flex: 1,
    minWidth: 0,
    width: '100%',
    height: '100%',
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    backgroundColor: 'transparent',
    color: isDark ? '#F5F3ED' : '#252A31',
    fontSize: '14.5px',
    fontWeight: 600,
    padding: 0,
    margin: 0,
    borderRadius: 0,
  };

  const eyeToggleBtnStyle = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    padding: '4px',
    color: 'var(--aureus-text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11.5px',
    fontWeight: 800,
    letterSpacing: '0.05em',
    color: textSecondary,
    marginBottom: '6px',
  };

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100dvh',
        width: '100%',
        backgroundColor: pageBg,
        color: textPrimary,
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 16px',
        paddingBottom: cookiesAceptadas ? '36px' : '220px',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        transition: 'background-color 0.22s ease, color 0.22s ease',
      }}
    >
      {/* Escenario Arquitectónico Grecorromano de Fondo */}
      <ClassicalArchitecturalBackdrop scene="inicio" isDark={isDark} />
      <FlutedPilasters isDark={isDark} />

      {/* Barra Superior Flotante de Acceso */}
      <header
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '980px',
          margin: '0 auto 20px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          data-testid="btn-volver-inicio"
          onClick={() => navigate('/bienvenida')}
          style={{
            height: '42px',
            padding: '0 16px',
            borderRadius: '14px',
            border: isDark ? '1px solid rgba(212, 180, 106, 0.35)' : '1px solid #D5C295',
            backgroundColor: isDark ? 'rgba(22, 36, 54, 0.86)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: textPrimary,
            fontSize: '13px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: isDark
              ? '0 4px 16px rgba(0, 0, 0, 0.34)'
              : '0 4px 14px rgba(182, 154, 85, 0.14)',
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.3} color={goldText} />
          <span>Volver a Inicio</span>
        </button>
      </header>

      {/* Composición Monumental Bento Split en 2 Columnas */}
      <main
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <div className="aureus-login-grid">
          {/* Columna Izquierda: Panel Imperial de Bienvenida */}
          <aside
            className="rb-spotlight-card"
            onMouseMove={handleSpotlightMouseMove}
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '38px 34px',
              borderRadius: '26px',
              background: isDark
                ? 'radial-gradient(circle at 50% 24%, #1A2C42 0%, #162436 72%)'
                : 'radial-gradient(circle at 50% 24%, #FFFDF9 0%, #FAF8F3 100%)',
              backgroundColor: surfaceBg,
              border: isDark ? '1.5px solid rgba(212, 180, 106, 0.36)' : '1.5px solid #D5C295',
              boxShadow: isDark
                ? '0 22px 54px rgba(0, 0, 0, 0.45)'
                : '0 18px 44px rgba(182, 154, 85, 0.14)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            <ImperialCornerAccents isDark={isDark} />

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <LoginImperialMedallion isDark={isDark} />

              <div
                className="aureus-imperial-title"
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  color: goldText,
                  marginBottom: '6px',
                }}
              >
                PLATAFORMA DE GESTIÓN FINANCIERA
              </div>

              <h1
                className="aureus-imperial-title"
                style={{
                  margin: '0 0 10px 0',
                  fontSize: 'clamp(24px, 2.8vw, 31px)',
                  fontWeight: 900,
                  lineHeight: 1.15,
                  color: textPrimary,
                }}
              >
                AUREUS <span className="aureus-shiny-gold-text">MANAGER</span>
              </h1>

              <p
                style={{
                  margin: '0 auto',
                  maxWidth: '380px',
                  fontSize: '14.5px',
                  lineHeight: 1.55,
                  fontWeight: 600,
                  color: textSecondary,
                }}
              >
                Tu dinero, tus préstamos y tus operaciones bajo control.
              </p>
            </div>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <ClassicalLaurelDivider compact isDark={isDark} />
            </div>

            <div
              style={{
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {LOGIN_PILLARS.map((pillar) => (
                <div
                  key={pillar.roman}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    backgroundColor: isDark ? 'rgba(16, 28, 44, 0.72)' : '#FFFFFF',
                    border: isDark ? '1px solid rgba(212, 180, 106, 0.24)' : '1px solid #E5E0D5',
                  }}
                >
                  <span
                    className="aureus-imperial-title"
                    style={{
                      minWidth: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: isDark ? 'rgba(212, 180, 106, 0.16)' : '#F7F2E4',
                      border: isDark ? '1px solid rgba(212, 180, 106, 0.38)' : '1px solid #D5C295',
                      color: goldText,
                      fontSize: '12px',
                      fontWeight: 900,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {pillar.roman}
                  </span>
                  <span
                    style={{
                      fontSize: '13.5px',
                      lineHeight: 1.5,
                      fontWeight: 600,
                      color: textSecondary,
                    }}
                  >
                    {pillar.text}
                  </span>
                </div>
              ))}
            </div>
          </aside>

          {/* Columna Derecha: Tarjeta de Autenticación Neoclásica-Futurista */}
          <section
            className="rb-spotlight-card"
            onMouseMove={handleSpotlightMouseMove}
            style={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              padding: '36px 34px',
              borderRadius: '26px',
              backgroundColor: surfaceBg,
              border: isDark ? '1.5px solid rgba(212, 180, 106, 0.36)' : '1.5px solid #D5C295',
              boxShadow: isDark
                ? '0 22px 54px rgba(0, 0, 0, 0.48)'
                : '0 18px 44px rgba(182, 154, 85, 0.14)',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <ImperialCornerAccents isDark={isDark} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Cabecera centrada */}
              <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <div style={{ display: 'inline-flex', marginBottom: '10px' }}>
                  <AureusLogo size={42} />
                </div>
                <h2
                  className="aureus-imperial-title"
                  style={{
                    margin: '0 0 6px 0',
                    fontSize: '20px',
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    color: goldText,
                  }}
                >
                  {mode === 'login' ? 'BÓVEDA DE ACCESO' : 'REGISTRO EJECUTIVO'}
                </h2>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13.5px',
                    lineHeight: 1.5,
                    color: textMuted,
                    fontWeight: 600,
                  }}
                >
                  {mode === 'login'
                    ? 'Ingresa tus credenciales para acceder a tus operaciones'
                    : 'Crea tu cuenta personal para administrar tus préstamos y cobros'}
                </p>
              </div>

              <ClassicalLaurelDivider compact isDark={isDark} style={{ margin: '10px auto 18px' }} />

              {/* Selector segmentado de 2 pestañas tipo cápsula */}
              <div
                role="tablist"
                aria-label="Opciones de acceso"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '6px',
                  padding: '5px',
                  borderRadius: '14px',
                  backgroundColor: inputBg,
                  border: isDark ? '1px solid rgba(212, 180, 106, 0.25)' : '1px solid #E5E0D5',
                  marginBottom: '20px',
                }}
              >
                <button
                  type="button"
                  role="tab"
                  data-testid="tab-iniciar-sesion"
                  aria-selected={mode === 'login'}
                  onClick={() => switchMode('login')}
                  style={{
                    height: '40px',
                    borderRadius: '10px',
                    border: mode === 'login' ? `1px solid ${goldBorder}` : '1px solid transparent',
                    background:
                      mode === 'login'
                        ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                        : 'transparent',
                    color: mode === 'login' ? '#101C2C' : textSecondary,
                    fontWeight: mode === 'login' ? 800 : 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    boxShadow:
                      mode === 'login' ? '0 4px 14px rgba(182, 154, 85, 0.28)' : 'none',
                    transition: 'all 0.16s ease',
                  }}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  role="tab"
                  data-testid="tab-crear-cuenta"
                  aria-selected={mode === 'register'}
                  onClick={() => switchMode('register')}
                  style={{
                    height: '40px',
                    borderRadius: '10px',
                    border: mode === 'register' ? `1px solid ${goldBorder}` : '1px solid transparent',
                    background:
                      mode === 'register'
                        ? 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)'
                        : 'transparent',
                    color: mode === 'register' ? '#101C2C' : textSecondary,
                    fontWeight: mode === 'register' ? 800 : 700,
                    fontSize: '13.5px',
                    cursor: 'pointer',
                    boxShadow:
                      mode === 'register' ? '0 4px 14px rgba(182, 154, 85, 0.28)' : 'none',
                    transition: 'all 0.16s ease',
                  }}
                >
                  Crear cuenta
                </button>
              </div>

          {sessionNotice && (
            <div
              role="status"
              data-testid="login-session-notice"
              style={{
                backgroundColor: isDark ? '#2C3542' : '#F7F2E4',
                border: isDark ? '1px solid rgba(212, 180, 106, 0.45)' : '1px solid #D5C295',
                borderRadius: '12px',
                padding: '10px 12px',
                marginBottom: '16px',
                color: textPrimary,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} color={goldText} style={{ flexShrink: 0 }} />
              <span>{sessionNotice}</span>
            </div>
          )}

          {cookieWarning && !cookiesAceptadas && (
            <div
              data-testid="cookie-inline-warning"
              role="alert"
              style={{
                backgroundColor: isDark ? '#2C3542' : '#F7F2E4',
                border: `1.5px solid ${goldText}`,
                borderRadius: '14px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: textPrimary }}>
                <ShieldCheck size={18} color={goldText} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  Debes aceptar las cookies esenciales de seguridad para proteger tu acceso antes de continuar.
                </span>
              </div>
              <button
                type="button"
                data-testid="btn-aceptar-cookies-inline"
                onClick={handleAcceptCookiesInline}
                style={{
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  backgroundColor: goldBg,
                  border: `1px solid ${goldBorder}`,
                  color: '#101C2C',
                  fontWeight: 900,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  alignSelf: 'flex-start',
                }}
              >
                Aceptar cookies y continuar
              </button>
            </div>
          )}

          {error && (
            <div
              data-testid="login-error-alert"
              role="alert"
              style={{
                backgroundColor: isDark ? '#351C24' : '#FCEEE9',
                border: isDark ? '1px solid #6E3237' : '1px solid #E6ABA8',
                borderRadius: '12px',
                padding: '10px 12px',
                marginBottom: '16px',
                color: isDark ? '#F0807A' : '#C65D58',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form
              key="login"
              onSubmit={handleSubmitLogin}
              noValidate
              autoComplete="off"
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div>
                <label htmlFor="login-identificador" style={labelStyle}>
                  USUARIO O CORREO ELECTRÓNICO *
                </label>
                <div
                  className={`aureus-auth-field-wrapper${fieldErrors.identificador ? ' is-invalid' : ''}`}
                  style={inputRowStyle}
                >
                  <User size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="login-identificador"
                    name="identificador"
                    type="text"
                    autoComplete="username"
                    value={identificador}
                    onChange={(e) => {
                      setIdentificador(e.target.value);
                      clearFieldError('identificador');
                    }}
                    placeholder="Ingresa tu usuario o correo"
                    required
                    className="aureus-auth-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" style={labelStyle}>
                  CONTRASEÑA *
                </label>
                <div
                  className={`aureus-auth-field-wrapper${fieldErrors.passwordLogin ? ' is-invalid' : ''}`}
                  style={inputRowStyle}
                >
                  <Lock size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="login-password"
                    name="password"
                    type={showLoginPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={passwordLogin}
                    onChange={(e) => {
                      setPasswordLogin(e.target.value);
                      clearFieldError('passwordLogin');
                    }}
                    placeholder="Ingresa tu contraseña"
                    required
                    className="aureus-auth-input"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    style={eyeToggleBtnStyle}
                  >
                    {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                data-testid="btn-submit-login"
                disabled={submitting}
                className="aureus-landing-enter-btn"
                style={{
                  height: '48px',
                  width: '100%',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                  border: `1px solid ${goldBorder}`,
                  color: '#101C2C',
                  fontWeight: 900,
                  fontSize: '14.5px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.78 : 1,
                  marginTop: '4px',
                  boxShadow: '0 8px 22px rgba(182, 154, 85, 0.28)',
                }}
              >
                {submitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </form>
          ) : (
            <form
              key="register"
              onSubmit={handleSubmitRegister}
              noValidate
              autoComplete="off"
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div>
                <label htmlFor="reg-nombre" style={labelStyle}>
                  NOMBRE COMPLETO *
                </label>
                <div
                  className={`aureus-auth-field-wrapper${fieldErrors.nombre ? ' is-invalid' : ''}`}
                  style={inputRowStyle}
                >
                  <UserCheck size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="reg-nombre"
                    name="aureus_reg_fullname"
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    spellCheck={false}
                    readOnly={!unlockedFields.nombre}
                    onPointerDown={() => unlockField('nombre')}
                    onFocus={() => unlockField('nombre')}
                    value={nombreCompleto}
                    onChange={(e) => {
                      setNombreCompleto(e.target.value);
                      clearFieldError('nombre');
                    }}
                    placeholder="Ingresa tu nombre y apellidos"
                    required
                    className="aureus-auth-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-username" style={labelStyle}>
                  NOMBRE DE USUARIO *
                </label>
                <div
                  className={`aureus-auth-field-wrapper${fieldErrors.username ? ' is-invalid' : ''}`}
                  style={inputRowStyle}
                >
                  <User size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="reg-username"
                    name="aureus_reg_username"
                    type="text"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    spellCheck={false}
                    readOnly={!unlockedFields.username}
                    onPointerDown={() => unlockField('username')}
                    onFocus={() => unlockField('username')}
                    value={username}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\s+/g, '');
                      setUsername(cleaned);
                      clearFieldError('username');
                    }}
                    placeholder="Ingresa un nombre de usuario"
                    required
                    className="aureus-auth-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-correo" style={labelStyle}>
                  CORREO ELECTRÓNICO *
                </label>
                <div
                  className={`aureus-auth-field-wrapper${fieldErrors.correo ? ' is-invalid' : ''}`}
                  style={inputRowStyle}
                >
                  <Mail size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="reg-correo"
                    name="aureus_reg_email"
                    type="email"
                    autoComplete="off"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    spellCheck={false}
                    readOnly={!unlockedFields.correo}
                    onPointerDown={() => unlockField('correo')}
                    onFocus={() => unlockField('correo')}
                    value={correo}
                    onChange={(e) => {
                      setCorreo(e.target.value.trim());
                      clearFieldError('correo');
                    }}
                    placeholder="correo@dominio.com"
                    required
                    className="aureus-auth-input"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-password" style={labelStyle}>
                  CONTRASEÑA *
                </label>
                <div
                  className={`aureus-auth-field-wrapper${fieldErrors.passwordReg ? ' is-invalid' : ''}`}
                  style={inputRowStyle}
                >
                  <Lock size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="reg-password"
                    name="aureus_reg_new_pass"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    value={passwordReg}
                    onChange={(e) => {
                      setPasswordReg(e.target.value);
                      clearFieldError('passwordReg');
                    }}
                    placeholder="Mínimo 8 caracteres"
                    required
                    className="aureus-auth-input"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword((prev) => !prev)}
                    aria-label={showRegPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    style={eyeToggleBtnStyle}
                  >
                    {showRegPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="reg-confirm" style={labelStyle}>
                  CONFIRMAR CONTRASEÑA *
                </label>
                <div
                  className={`aureus-auth-field-wrapper${fieldErrors.confirmPasswordReg ? ' is-invalid' : ''}`}
                  style={inputRowStyle}
                >
                  <Lock size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="reg-confirm"
                    name="aureus_reg_confirm_pass"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    value={confirmPasswordReg}
                    onChange={(e) => {
                      setConfirmPasswordReg(e.target.value);
                      clearFieldError('confirmPasswordReg');
                    }}
                    placeholder="Repite tu contraseña"
                    required
                    className="aureus-auth-input"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    style={eyeToggleBtnStyle}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  backgroundColor: isDark ? 'rgba(212, 180, 106, 0.08)' : '#FBF8F1',
                  border: `1px solid ${terminosAceptados ? goldBorder : borderSubtle}`,
                }}
              >
                <label
                  data-testid="label-register-terms"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '9px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    data-testid="checkbox-register-terms"
                    checked={terminosAceptados}
                    onChange={(e) => {
                      setTerminosAceptados(e.target.checked);
                      clearFieldError('terminos');
                    }}
                    style={{ display: 'none' }}
                  />
                  <span
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '5px',
                      border: `1.5px solid ${goldText}`,
                      backgroundColor: terminosAceptados ? goldBg : 'transparent',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                  >
                    {terminosAceptados && <Check size={13} strokeWidth={3} color="#101C2C" />}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.4, color: textPrimary }}>
                    Acepto los Términos de Uso, la Política de Privacidad Ley 8968 y el uso responsable de la plataforma
                  </span>
                </label>

                <button
                  type="button"
                  data-testid="btn-consultar-marco-legal-reg"
                  onClick={() => setIsLegalModalOpen(true)}
                  style={{
                    alignSelf: 'flex-start',
                    marginLeft: '27px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '12px',
                    fontWeight: 800,
                    color: goldText,
                    cursor: 'pointer',
                  }}
                >
                  Consultar marco legal
                </button>
              </div>

              <button
                type="submit"
                data-testid="btn-submit-register"
                disabled={submitting}
                className="aureus-landing-enter-btn"
                style={{
                  height: '48px',
                  width: '100%',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #E5C97B 0%, #B69A55 100%)',
                  border: `1px solid ${goldBorder}`,
                  color: '#101C2C',
                  fontWeight: 900,
                  fontSize: '14.5px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.78 : 1,
                  marginTop: '6px',
                  boxShadow: '0 8px 22px rgba(182, 154, 85, 0.28)',
                }}
              >
                {submitting ? 'Creando cuenta...' : 'Crear cuenta e ingresar'}
              </button>
            </form>
          )}

              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                <button
                  type="button"
                  data-testid="btn-open-legal-login"
                  onClick={() => setIsLegalModalOpen(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: goldText,
                    cursor: 'pointer',
                  }}
                >
                  Centro Legal, Privacidad Ley 8968 y Gobernanza de IA
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <CookieConsentBanner highlighted={cookieWarning} />

      <LegalGovernanceModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        onAccept={() => setTerminosAceptados(true)}
      />
    </div>
  );
}

export default LoginPage;
