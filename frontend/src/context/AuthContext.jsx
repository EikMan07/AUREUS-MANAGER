// src/context/AuthContext.jsx
// Manejo de sesión en memoria mediante cookie HttpOnly y token Anti-CSRF.
// Jamás almacena credenciales ni tokens en localStorage o sessionStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  configurarAuth,
  setCsrfToken as setApiClientCsrfToken,
  loginUsuario,
  registrarUsuario,
  obtenerSesionActual,
  cerrarSesionUsuario,
  actualizarPerfilUsuario,
} from '../services/apiClient.js';

const INACTIVIDAD_MS = 25 * 60 * 1000;
const COOKIE_CONSENT_STORAGE_KEY = 'aureus_cookie_consent_v1';
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'];

export const AuthContext = createContext(null);

function readInitialCookieConsent() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === 'accepted';
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  // Todos los Hooks declarados al inicio del proveedor
  const [usuario, setUsuario] = useState(null);
  const [csrfToken, setCsrfTokenState] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensajeSesion, setMensajeSesion] = useState('');
  const [cookiesAceptadas, setCookiesAceptadas] = useState(readInitialCookieConsent);

  const csrfTokenRef = useRef(null);
  const inactivityTimerRef = useRef(null);

  const updateCsrfToken = useCallback((nuevoCsrf) => {
    const val = nuevoCsrf || null;
    csrfTokenRef.current = val;
    setCsrfTokenState(val);
    setApiClientCsrfToken(val);
  }, []);

  const limpiarEstadoSesion = useCallback(
    (motivo = '') => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      csrfTokenRef.current = null;
      setCsrfTokenState(null);
      setApiClientCsrfToken(null);
      setUsuario(null);
      if (motivo === 'expirada') {
        setMensajeSesion('Tu sesión expiró por inactividad. Inicia sesión de nuevo.');
      } else {
        setMensajeSesion('');
      }
      try {
        sessionStorage.removeItem('aureus_entered_app');
      } catch {
        // Ignorar errores de storage
      }
    },
    []
  );

  const aceptarCookiesSeguridad = useCallback(() => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted');
    } catch {
      // Ignorar errores de storage
    }
    setCookiesAceptadas(true);
  }, []);

  const recargarPerfil = useCallback(async () => {
    try {
      const datos = await obtenerSesionActual();
      if (datos?.usuario) {
        setUsuario(datos.usuario);
        if (datos.csrfToken) {
          updateCsrfToken(datos.csrfToken);
        }
        setMensajeSesion('');
        return datos.usuario;
      }
      setUsuario(null);
      return null;
    } catch {
      setUsuario(null);
      updateCsrfToken(null);
      return null;
    }
  }, [updateCsrfToken]);

  const logout = useCallback(async () => {
    try {
      await cerrarSesionUsuario();
    } catch {
      // Garantizar limpieza local aunque la petición falle
    } finally {
      limpiarEstadoSesion('manual');
    }
  }, [limpiarEstadoSesion]);

  const login = useCallback(
    async (arg1, arg2, arg3) => {
      const payload =
        arg1 && typeof arg1 === 'object'
          ? {
              identificador: arg1.identificador ?? arg1.usuario ?? arg1.correo,
              password: arg1.password,
              cookiesAceptadas:
                arg1.cookiesAceptadas !== undefined ? Boolean(arg1.cookiesAceptadas) : cookiesAceptadas,
            }
          : {
              identificador: arg1,
              password: arg2,
              cookiesAceptadas: arg3 !== undefined ? Boolean(arg3) : cookiesAceptadas,
            };

      const datos = await loginUsuario(payload);
      if (datos?.csrfToken) {
        updateCsrfToken(datos.csrfToken);
      }
      setUsuario(datos?.usuario || null);
      setMensajeSesion('');
      try {
        sessionStorage.setItem('aureus_entered_app', 'true');
      } catch {
        // Ignorar errores de storage
      }
      return datos?.usuario || null;
    },
    [cookiesAceptadas, updateCsrfToken]
  );

  const registrar = useCallback(
    async (arg1, arg2, arg3, arg4, arg5) => {
      const payload =
        arg1 && typeof arg1 === 'object'
          ? {
              nombre_completo: arg1.nombre_completo,
              username: arg1.username ?? arg1.usuario,
              correo: arg1.correo,
              password: arg1.password,
              cookiesAceptadas:
                arg1.cookiesAceptadas !== undefined ? Boolean(arg1.cookiesAceptadas) : cookiesAceptadas,
            }
          : {
              nombre_completo: arg1,
              username: arg2,
              correo: arg3,
              password: arg4,
              cookiesAceptadas: arg5 !== undefined ? Boolean(arg5) : cookiesAceptadas,
            };

      const datos = await registrarUsuario(payload);
      if (datos?.csrfToken) {
        updateCsrfToken(datos.csrfToken);
      }
      setUsuario(datos?.usuario || null);
      setMensajeSesion('');
      try {
        sessionStorage.setItem('aureus_entered_app', 'true');
      } catch {
        // Ignorar errores de storage
      }
      return datos?.usuario || null;
    },
    [cookiesAceptadas, updateCsrfToken]
  );

  // Conectar apiClient y eventos globales de no autorización
  useEffect(() => {
    configurarAuth({
      getCsrfToken: () => csrfTokenRef.current,
      setCsrfToken: updateCsrfToken,
      onUnauthorized: () => limpiarEstadoSesion('expirada'),
    });

    const handleGlobalUnauthorized = () => {
      limpiarEstadoSesion('expirada');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('aureus:unauthorized', handleGlobalUnauthorized);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('aureus:unauthorized', handleGlobalUnauthorized);
      }
    };
  }, [updateCsrfToken, limpiarEstadoSesion]);

  // Restauración de sesión al montar el proveedor
  useEffect(() => {
    let activo = true;

    obtenerSesionActual()
      .then((datos) => {
        if (!activo) return;
        if (datos?.usuario) {
          setUsuario(datos.usuario);
          if (datos.csrfToken) {
            updateCsrfToken(datos.csrfToken);
          }
          setMensajeSesion('');
        } else {
          setUsuario(null);
        }
      })
      .catch(() => {
        if (!activo) return;
        setUsuario(null);
        updateCsrfToken(null);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [updateCsrfToken]);

  const actualizarPerfil = useCallback(async (payload) => {
    const res = await actualizarPerfilUsuario(payload);
    if (res?.usuario) {
      setUsuario(res.usuario);
    }
    return res;
  }, []);

  const limpiarMensajeSesion = useCallback(() => {
    setMensajeSesion('');
  }, []);

  const autenticado = Boolean(usuario);

  // Temporizador de inactividad de 25 minutos
  useEffect(() => {
    if (!autenticado || cargando) return undefined;

    const reiniciarTemporizador = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      inactivityTimerRef.current = setTimeout(() => {
        cerrarSesionUsuario().catch(() => {});
        limpiarEstadoSesion('expirada');
      }, INACTIVIDAD_MS);
    };

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, reiniciarTemporizador, { passive: true }));
    reiniciarTemporizador();

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, reiniciarTemporizador));
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [autenticado, cargando, limpiarEstadoSesion]);

  const valor = useMemo(
    () => ({
      usuario,
      csrfToken,
      autenticado,
      isAuthenticated: autenticado,
      cargando,
      loading: cargando,
      cookiesAceptadas,
      aceptarCookiesSeguridad,
      mensajeSesion,
      limpiarMensajeSesion,
      login,
      registrar,
      registro: registrar,
      logout,
      recargarPerfil,
      actualizarPerfil,
    }),
    [
      usuario,
      csrfToken,
      autenticado,
      cargando,
      cookiesAceptadas,
      aceptarCookiesSeguridad,
      mensajeSesion,
      limpiarMensajeSesion,
      login,
      registrar,
      logout,
      recargarPerfil,
      actualizarPerfil,
    ]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};

export default AuthContext;
