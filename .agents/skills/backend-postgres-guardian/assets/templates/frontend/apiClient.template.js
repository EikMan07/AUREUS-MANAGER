// src/services/apiClient.js — Cliente HTTP centralizado con Cookies Seguras y CSRF.
// - credentials: 'include' en todas las peticiones para enviar/recibir la cookie de sesión HttpOnly.
// - Envía automáticamente la cabecera X-CSRF-Token en métodos mutables (POST, PUT, PATCH, DELETE).
// - Si el backend responde 401 en rutas privadas -> notifica expiración de sesión.
// - NUNCA manipula ni almacena tokens JWT en JavaScript (viven en la cookie HttpOnly).

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let auth = {
  getCsrfToken: () => null,
  setCsrfToken: () => {},
  onUnauthorized: () => {},
};

/**
 * Conecta el cliente HTTP con el AuthContext de React.
 */
export const configurarAuth = (callbacks) => {
  auth = { ...auth, ...callbacks };
};

const METODOS_MUTABLES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function apiFetch(ruta, opciones = {}) {
  const metodo = (opciones.method || 'GET').toUpperCase();
  const csrfToken = auth.getCsrfToken();

  const headers = {
    'Content-Type': 'application/json',
    ...opciones.headers,
  };

  // Adjunta el token anti-CSRF en peticiones que modifican estado
  if (METODOS_MUTABLES.has(metodo) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const respuesta = await fetch(`${API_URL}${ruta}`, {
    ...opciones,
    method: metodo,
    headers,
    // Obligatorio para enviar y recibir cookies HttpOnly en entornos cross-origin
    credentials: 'include',
    body: opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
  });

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);

  // Si el backend envía un nuevo token CSRF en la respuesta, se actualiza en memoria
  if (datos?.csrfToken) {
    auth.setCsrfToken(datos.csrfToken);
  }

  // 401 en una ruta protegida = sesión inválida o expirada por inactividad
  // (En /auth/login un 401 es "credenciales inválidas", no expiración)
  if (respuesta.status === 401 && !ruta.includes('/auth/login')) {
    auth.onUnauthorized();
  }

  if (!respuesta.ok) {
    const mensaje = Array.isArray(datos?.error) ? datos.error.join('. ') : datos?.error;
    throw Object.assign(new Error(mensaje || 'Error en la petición'), { status: respuesta.status, datos });
  }

  return datos;
}
