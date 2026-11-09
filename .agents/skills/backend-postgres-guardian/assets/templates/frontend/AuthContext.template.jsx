// src/context/AuthContext.jsx
// Información privada de sesión (token y usuario) SOLO en memoria con React Context.
// NUNCA en localStorage / sessionStorage / cookies legibles desde JS: así no se ve en las herramientas del navegador.
// Consecuencia consciente: al recargar la página (F5) la sesión se cierra y se vuelve al login.
//
// Inactividad: 25 min sin interacción (mouse, teclado, scroll, toque) => se cierra la sesión y se redirige al login.
// El backend también expira el token a los 25 min sin peticiones; mientras hay interacción, este contexto
// llama a /auth/renovar de vez en cuando para que el token no caduque con el usuario activo.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, configurarAuth } from '../services/apiClient';

const INACTIVIDAD_MS = 25 * 60 * 1000;      // 25 minutos
const RENOVAR_CADA_MS = 5 * 60 * 1000;      // renueva el token como máximo cada 5 min de actividad
const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [mensajeSesion, setMensajeSesion] = useState('');

  const tokenRef = useRef(null);       // lectura síncrona para apiClient
  const timerRef = useRef(null);
  const ultimaRenovacion = useRef(0);

  const setToken = useCallback((nuevo) => {
    tokenRef.current = nuevo;
    ultimaRenovacion.current = Date.now();
    setTokenState(nuevo);
  }, []);

  const logout = useCallback((motivo) => {
    clearTimeout(timerRef.current);
    tokenRef.current = null;
    setTokenState(null);
    setUsuario(null);
    setMensajeSesion(motivo === 'expirada' ? 'Tu sesión expiró por inactividad. Inicia sesión de nuevo.' : '');
  }, []);

  // Conecta el cliente HTTP con este contexto.
  useEffect(() => {
    configurarAuth({
      getToken: () => tokenRef.current,
      setToken,
      onUnauthorized: () => logout('expirada'),
    });
  }, [setToken, logout]);

  const autenticado = Boolean(token);

  // Temporizador de inactividad: solo mientras hay sesión.
  useEffect(() => {
    if (!autenticado) return undefined;

    const reiniciar = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => logout('expirada'), INACTIVIDAD_MS);
      // Mantiene vivo el token del backend mientras el usuario interactúa.
      if (Date.now() - ultimaRenovacion.current > RENOVAR_CADA_MS) {
        ultimaRenovacion.current = Date.now(); // evita llamadas repetidas mientras responde
        apiFetch('/auth/renovar').catch(() => {});
      }
    };

    EVENTOS.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
    reiniciar();
    return () => {
      EVENTOS.forEach((e) => window.removeEventListener(e, reiniciar));
      clearTimeout(timerRef.current);
    };
  }, [autenticado, logout]);

  const login = useCallback(async (email, password) => {
    const datos = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    setToken(datos.token);
    setUsuario(datos.usuario);
    setMensajeSesion('');
    return datos.usuario;
  }, [setToken]);

  const registro = useCallback(
    (nombre, email, password) => apiFetch('/auth/registro', { method: 'POST', body: { nombre, email, password } }),
    []
  );

  const valor = useMemo(
    () => ({ usuario, token, autenticado, mensajeSesion, login, registro, logout: () => logout() }),
    [usuario, token, autenticado, mensajeSesion, login, registro, logout]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
