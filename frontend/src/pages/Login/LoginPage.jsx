import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
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

export function LoginPage() {
  // Todos los Hooks declarados al inicio antes de cualquier retorno condicional
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();
  const {
    autenticado,
    cargando,
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

  useEffect(() => {
    if (cookiesAceptadas) {
      setCookieWarning(false);
    }
  }, [cookiesAceptadas]);

  useEffect(() => {
    if (mensajeSesion) {
      setSessionNotice(mensajeSesion);
      limpiarMensajeSesion?.();
    }
    try {
      sessionStorage.removeItem('aureus_entered_app');
      sessionStorage.removeItem('aureus_session_expired_notice');
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {
      // Ignorar restricciones de historial o almacenamiento
    }
  }, [mensajeSesion, limpiarMensajeSesion]);

  if (!cargando && autenticado) {
    const destino = location.state?.from?.pathname;
    const safeTarget =
      destino && destino !== '/login' && destino !== '/bienvenida' && destino !== '/informacion'
        ? destino
        : '/dashboard';
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

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSessionNotice('');
    setCookieWarning(false);
  };

  const handleAcceptCookiesInline = () => {
    aceptarCookiesSeguridad();
    setCookieWarning(false);
    setError('');
  };

  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!cookiesAceptadas) {
      setCookieWarning(true);
      return;
    }

    const cleanId = identificador.trim();
    if (!cleanId || !passwordLogin) {
      setError('Ingresa tu usuario o correo electrónico y tu contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      await login({
        identificador: cleanId,
        password: passwordLogin,
        cookiesAceptadas: true,
      });
      navigate('/dashboard', { replace: true });
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

    if (cleanNombre.length < 3) {
      setError('El nombre completo debe tener al menos 3 caracteres.');
      return;
    }

    if (cleanUser.length < 3 || /\s/.test(cleanUser)) {
      setError('El nombre de usuario debe tener al menos 3 caracteres y sin espacios.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanCorreo)) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }

    if (passwordReg.length < 8) {
      setError('La contraseña debe tener mínimo 8 caracteres.');
      return;
    }

    if (passwordReg !== confirmPasswordReg) {
      setError('Las contraseñas no coinciden. Verifícalas para continuar.');
      return;
    }

    setSubmitting(true);
    try {
      await registrar({
        nombre_completo: cleanNombre,
        username: cleanUser,
        correo: cleanCorreo,
        password: passwordReg,
        cookiesAceptadas: true,
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
        minHeight: '100dvh',
        width: '100%',
        backgroundColor: pageBg,
        color: textPrimary,
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        paddingBottom: cookiesAceptadas ? '32px' : '220px',
        boxSizing: 'border-box',
        transition: 'background-color 0.22s ease, color 0.22s ease',
      }}
    >
      {/* Barra superior limpia */}
      <header
        style={{
          width: '100%',
          maxWidth: '1080px',
          margin: '0 auto 16px auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <button
          type="button"
          data-testid="btn-volver-inicio"
          onClick={() => navigate('/bienvenida')}
          style={{
            height: '40px',
            padding: '0 14px',
            borderRadius: '12px',
            border: `1px solid ${borderSubtle}`,
            backgroundColor: surfaceBg,
            color: textPrimary,
            fontSize: '13px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            cursor: 'pointer',
            boxShadow: isDark
              ? '0 2px 10px rgba(0, 0, 0, 0.3)'
              : '0 2px 8px rgba(37, 42, 49, 0.05)',
          }}
        >
          <ArrowLeft size={16} strokeWidth={2.3} />
          <span>Volver a inicio</span>
        </button>
      </header>

      {/* Tarjeta central ejecutiva */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        <section
          style={{
            width: '100%',
            maxWidth: '460px',
            margin: 'auto',
            padding: '32px 26px',
            borderRadius: '24px',
            backgroundColor: surfaceBg,
            border: `1px solid ${borderSubtle}`,
            boxShadow: isDark
              ? '0 18px 42px rgba(0, 0, 0, 0.48)'
              : '0 14px 36px rgba(37, 42, 49, 0.08)',
            boxSizing: 'border-box',
          }}
        >
          {/* Cabecera centrada */}
          <div style={{ textAlign: 'center', marginBottom: '22px' }}>
            <div style={{ display: 'inline-flex', marginBottom: '12px' }}>
              <AureusLogo size={46} />
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 900,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              <span style={{ color: goldText }}>AUREUS</span>{' '}
              <span style={{ color: textPrimary }}>MANAGER</span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: '13.5px',
                lineHeight: 1.5,
                color: textMuted,
              }}
            >
              {mode === 'login'
                ? 'Ingresa tus credenciales para acceder a tus operaciones'
                : 'Crea tu cuenta personal para administrar tus préstamos y cobros'}
            </p>
          </div>

          {/* Selector segmentado de 2 pestañas */}
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
              border: `1px solid ${borderSubtle}`,
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
                border: 'none',
                backgroundColor: mode === 'login' ? goldBg : 'transparent',
                color: mode === 'login' ? '#101C2C' : textSecondary,
                fontWeight: mode === 'login' ? 900 : 700,
                fontSize: '13.5px',
                cursor: 'pointer',
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
                border: 'none',
                backgroundColor: mode === 'register' ? goldBg : 'transparent',
                color: mode === 'register' ? '#101C2C' : textSecondary,
                fontWeight: mode === 'register' ? 900 : 700,
                fontSize: '13.5px',
                cursor: 'pointer',
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
            <form onSubmit={handleSubmitLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label htmlFor="login-identificador" style={labelStyle}>
                  USUARIO O CORREO ELECTRÓNICO *
                </label>
                <div className="aureus-auth-field-wrapper" style={inputRowStyle}>
                  <User size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="login-identificador"
                    name="identificador"
                    type="text"
                    autoComplete="username"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
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
                <div className="aureus-auth-field-wrapper" style={inputRowStyle}>
                  <Lock size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="login-password"
                    name="password"
                    type={showLoginPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={passwordLogin}
                    onChange={(e) => setPasswordLogin(e.target.value)}
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
                style={{
                  height: '48px',
                  width: '100%',
                  borderRadius: '14px',
                  backgroundColor: goldBg,
                  border: `1px solid ${goldBorder}`,
                  color: '#101C2C',
                  fontWeight: 900,
                  fontSize: '14.5px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.78 : 1,
                  marginTop: '4px',
                  boxShadow: '0 6px 16px rgba(182, 154, 85, 0.24)',
                }}
              >
                {submitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="reg-nombre" style={labelStyle}>
                  NOMBRE COMPLETO *
                </label>
                <div className="aureus-auth-field-wrapper" style={inputRowStyle}>
                  <UserCheck size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="reg-nombre"
                    name="nombre_completo"
                    type="text"
                    autoComplete="name"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
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
                <div className="aureus-auth-field-wrapper" style={inputRowStyle}>
                  <User size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="reg-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                <div className="aureus-auth-field-wrapper" style={inputRowStyle}>
                  <Mail size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="reg-correo"
                    name="correo"
                    type="email"
                    autoComplete="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
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
                <div className="aureus-auth-field-wrapper" style={inputRowStyle}>
                  <Lock size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="reg-password"
                    name="password"
                    type={showRegPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={passwordReg}
                    onChange={(e) => setPasswordReg(e.target.value)}
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
                <div className="aureus-auth-field-wrapper" style={inputRowStyle}>
                  <Lock size={16} color={textMuted} style={{ flexShrink: 0 }} />
                  <input
                    id="reg-confirm"
                    name="confirm_password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPasswordReg}
                    onChange={(e) => setConfirmPasswordReg(e.target.value)}
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

              <button
                type="submit"
                data-testid="btn-submit-register"
                disabled={submitting}
                style={{
                  height: '48px',
                  width: '100%',
                  borderRadius: '14px',
                  backgroundColor: goldBg,
                  border: `1px solid ${goldBorder}`,
                  color: '#101C2C',
                  fontWeight: 900,
                  fontSize: '14.5px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.78 : 1,
                  marginTop: '6px',
                  boxShadow: '0 6px 16px rgba(182, 154, 85, 0.24)',
                }}
              >
                {submitting ? 'Creando cuenta...' : 'Crear cuenta e ingresar'}
              </button>
            </form>
          )}
        </section>
      </main>

      <CookieConsentBanner highlighted={cookieWarning} />
    </div>
  );
}

export default LoginPage;
