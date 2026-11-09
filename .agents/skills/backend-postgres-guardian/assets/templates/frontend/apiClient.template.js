// src/services/apiClient.js — todas las peticiones al backend pasan por aquí.
// - Envía Authorization: Bearer <token> en cada petición.
// - Guarda el token renovado (header x-access-token) que manda el backend en cada respuesta.
// - Si el backend responde 401 (token ausente, inválido o expirado) -> cierra la sesión y vuelve al login.
// El token vive SOLO en memoria (AuthContext). Nada de localStorage/sessionStorage.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let auth = {
  getToken: () => null,
  setToken: () => {},
  onUnauthorized: () => {},
};

// Lo llama AuthProvider una sola vez para conectar el contexto con el cliente HTTP.
export const configurarAuth = (callbacks) => {
  auth = { ...auth, ...callbacks };
};

export async function apiFetch(ruta, opciones = {}) {
  const token = auth.getToken();
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
  });

  const nuevoToken = respuesta.headers.get('x-access-token');
  if (nuevoToken) auth.setToken(nuevoToken);

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);

  // 401 en una ruta protegida = sesión inválida o expirada por inactividad.
  // (En /auth/login un 401 significa "credenciales inválidas": ahí no se cierra sesión.)
  if (respuesta.status === 401 && token) auth.onUnauthorized();

  if (!respuesta.ok) {
    const mensaje = Array.isArray(datos?.error) ? datos.error.join('. ') : datos?.error;
    throw Object.assign(new Error(mensaje || 'Error en la petición'), { status: respuesta.status, datos });
  }
  return datos;
}
