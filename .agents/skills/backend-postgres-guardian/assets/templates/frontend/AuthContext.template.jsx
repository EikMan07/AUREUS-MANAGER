// src/context/AuthContext.jsx
// Gestión de sesión en memoria con Cookie HttpOnly y Token Anti-CSRF.
// NUNCA guarda el token ni credenciales en localStorage / sessionStorage.
// Restaura la sesión automáticamente al recargar la página (F5) consultando /auth/yo.
// Inactividad: 25 min sin interacción => se cierra la sesión y se redirige al login.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, configurarAuth } from '../services/apiClient';

const INACTIVIDAD_MS = 25 * 60 * 1000; // 25 minutos
const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [csrfToken, setCsrfTokenState] = useState(null);
  const [cargando, setCargando] = useState(true); // Verificación inicial tras F5
  const [mensajeSesion, setMensajeSesion] = useState('');

  const csrfTokenRef = useRef(null);
  const timerRef = useRef(null);

  const setCsrfToken = useCallback((nuevoToken) => {
    csrfTokenRef.current = nuevoToken;
    setCsrfTokenState(nuevoToken);
  }, []);

  const logoutLocal = useCallback((motivo) => {
    clearTimeout(timerRef.current);
    csrfTokenRef.current = null;
    setCsrfTokenState(null);
    setUsuario(null);
    setMensajeSesion(
      motivo === 'expirada' ? 'Tu sesión expiró por inactividad. Inicia sesión de nuevo.' : ''
    );
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // Ignorar errores en logout para garantizar limpieza local
    } finally {
      logoutLocal('manual');
    }
  }, [logoutLocal]);

  // Conecta el cliente HTTP con este contexto para inyectar X-CSRF-Token y recibir 401
  useEffect(() => {
    configurarAuth({
      getCsrfToken: () => csrfTokenRef.current,
      setCsrfToken,
      onUnauthorized: () => logoutLocal('expirada'),
    });
  }, [setCsrfToken, logoutLocal]);

  // 1. Restauración de sesión al montar el componente (F5)
  useEffect(() => {
    let activo = true;

    apiFetch('/auth/yo')
      .then((datos) => {
        if (activo && datos?.usuario) {
          setUsuario(datos.usuario);
          setCsrfToken(datos.csrfToken || null);
          setMensajeSesion('');
        }
      })
      .catch(() => {
        // No hay sesión activa o la cookie expiró; queda como usuario no autenticado
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [setCsrfToken]);

  const autenticado = Boolean(usuario);

  // 2. Temporizador de inactividad de 25 minutos
  useEffect(() => {
    if (!autenticado || cargando) return undefined;

    const reiniciar = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => logoutLocal('expirada'), INACTIVIDAD_MS);
    };

    EVENTOS.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
    reiniciar();

    return () => {
      EVENTOS.forEach((e) => window.removeEventListener(e, reiniciar));
      clearTimeout(timerRef.current);
    };
  }, [autenticado, cargando, logoutLocal]);

  const login = useCallback(
    async (email, password) => {
      const datos = await apiFetch('/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      setUsuario(datos.usuario);
      setCsrfToken(datos.csrfToken);
      setMensajeSesion('');
      return datos.usuario;
    },
    [setCsrfToken]
  );

  const registro = useCallback(
    async (nombre, email, password) => {
      const datos = await apiFetch('/auth/registro', {
        method: 'POST',
        body: { nombre, email, password },
      });
      setUsuario(datos.usuario);
      setCsrfToken(datos.csrfToken);
      setMensajeSesion('');
      return datos.usuario;
    },
    [setCsrfToken]
  );

  const valor = useMemo(
    () => ({
      usuario,
      csrfToken,
      autenticado,
      cargando,
      mensajeSesion,
      login,
      registro,
      logout,
    }),
    [usuario, csrfToken, autenticado, cargando, mensajeSesion, login, registro, logout]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
