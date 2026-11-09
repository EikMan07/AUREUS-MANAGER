// src/context/AuthContext.jsx
// Manejo de sesión y autenticación en memoria con React Context.
// En esta etapa del proyecto, el Login no está activado y la sesión permanece SIEMPRE activa.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, configurarAuth } from '../services/apiClient.js';

// Usuario administrador por defecto permanente
const ADMIN_DEFAULT = {
  id: 'ca496c63-9976-4ec6-8360-58d0e180cce2',
  usuario: 'admin',
  rol: 'ADMINISTRADOR',
  nombre_completo: 'Administrador Cobro-Firme'
};

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Sesión permanente y activa en memoria
  const [token, setTokenState] = useState('demo-session-token');
  const [usuario, setUsuario] = useState(ADMIN_DEFAULT);
  const [mensajeSesion, setMensajeSesion] = useState('');

  const tokenRef = useRef('demo-session-token');

  const setToken = useCallback((nuevo) => {
    const val = nuevo || 'demo-session-token';
    tokenRef.current = val;
    setTokenState(val);
  }, []);

  // Desactivado: el Login aún NO ha sido solicitado ni diseñado.
  // La sesión permanece SIEMPRE activa en el Dashboard.
  const logout = useCallback((_motivo) => {
    // No-op seguro para evitar que la aplicación pierda la sesión
  }, []);

  // Conectar con apiClient garantizando que ningún error 401 desautentique
  useEffect(() => {
    configurarAuth({
      getToken: () => tokenRef.current || 'demo-session-token',
      setToken,
      onUnauthorized: () => {
        // No desconectar al usuario bajo ninguna circunstancia
      },
    });
  }, [setToken]);

  // Sesión permanentemente fijada en true
  const autenticado = true;
  const isAuthenticated = true;

  const login = useCallback(async (usuarioIdentificador, password) => {
    const datos = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { usuario: usuarioIdentificador, password }
    });
    setToken(datos.token);
    if (datos.usuario) setUsuario(datos.usuario);
    setMensajeSesion('');
    return datos.usuario;
  }, [setToken]);

  const registro = useCallback(
    (nombre_completo, usuarioNombre, correo, password) =>
      apiFetch('/api/auth/registro', {
        method: 'POST',
        body: { nombre_completo, usuario: usuarioNombre, correo, password }
      }),
    []
  );

  const valor = useMemo(
    () => ({
      usuario: usuario || ADMIN_DEFAULT,
      token: token || 'demo-session-token',
      autenticado: true,
      isAuthenticated: true,
      mensajeSesion,
      login,
      registro,
      logout
    }),
    [usuario, token, mensajeSesion, login, registro, logout]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};

export default AuthContext;

