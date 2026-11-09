// src/services/apiClient.js — cliente HTTP centralizado para peticiones a la API
// - Envía Authorization: Bearer <token> cuando está disponible.
// - Guarda el token renovado (header x-access-token) que envía el backend.
// - Maneja expiración por inactividad. El token vive SOLO en memoria (AuthContext).

const API_URL = import.meta.env.VITE_API_URL || '';

let auth = {
  getToken: () => null,
  setToken: () => {},
  onUnauthorized: () => {},
};

export const configurarAuth = (callbacks) => {
  auth = { ...auth, ...callbacks };
};

export async function apiFetch(ruta, opciones = {}) {
  const token = auth.getToken();
  const url = ruta.startsWith('http') ? ruta : `${API_URL}${ruta.startsWith('/') ? '' : '/'}${ruta}`;

  const respuesta = await fetch(url, {
    ...opciones,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
    body: opciones.body !== undefined && typeof opciones.body !== 'string'
      ? JSON.stringify(opciones.body)
      : opciones.body,
  });

  const nuevoToken = respuesta.headers.get('x-access-token');
  if (nuevoToken) auth.setToken(nuevoToken);

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);

  // No desconectar ni redirigir a /login en caso de 401 (el login aún no está activo)
  // if (respuesta.status === 401 && token) { auth.onUnauthorized(); }

  if (!respuesta.ok) {
    const mensaje = Array.isArray(datos?.error)
      ? datos.error.join('. ')
      : datos?.userMessage || datos?.error || 'Error en la petición';
    const err = new Error(mensaje);
    err.status = respuesta.status;
    err.datos = datos;
    err.userMessage = datos?.userMessage || mensaje;
    err.debugError = datos?.debugError;
    throw err;
  }
  return datos;
}

export async function obtenerNotificaciones(fechaStr) {
  const ruta = fechaStr ? `/api/notificaciones?fecha=${fechaStr}` : '/api/notificaciones';
  return await apiFetch(ruta);
}

export async function marcarNotificacionVista(idOrIds) {
  const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
  const body = { id: ids[0] || null, ids };
  return await apiFetch('/api/notificaciones/marcar-vista', {
    method: 'POST',
    body
  });
}

// =========================================================================
// MÓDULO 1: COMPARTIR COBROS Y GESTIÓN DE CONTACTOS VINCULADOS
// =========================================================================
export async function getPersonasCompartir(q = '') {
  const term = String(q || '').trim();
  const ruta = term ? `/api/compartir/personas?q=${encodeURIComponent(term)}` : '/api/compartir/personas';
  return await apiFetch(ruta);
}

export async function agregarPersonaCompartir(data) {
  return await apiFetch('/api/compartir/personas', {
    method: 'POST',
    body: data
  });
}

export async function eliminarPersonaCompartir(contactoId) {
  return await apiFetch(`/api/compartir/personas/${contactoId}`, {
    method: 'DELETE'
  });
}

export async function getResumenDiaCompartir(fecha) {
  const ruta = fecha ? `/api/compartir/resumen-dia?fecha=${encodeURIComponent(fecha)}` : '/api/compartir/resumen-dia';
  return await apiFetch(ruta);
}

export async function compartirCobrosDia(data) {
  return await apiFetch('/api/compartir/dia', {
    method: 'POST',
    body: data
  });
}

export async function dejarDeCompartirDia(data) {
  return await apiFetch('/api/compartir/dia', {
    method: 'DELETE',
    body: data
  });
}

// =========================================================================
// MÓDULO 3: GESTIÓN Y ELIMINACIÓN DE PRÉSTAMOS
// =========================================================================
export async function eliminarPrestamo(id) {
  return await apiFetch(`/api/prestamos/${id}`, {
    method: 'DELETE'
  });
}

export async function eliminarPrestamosLote(ids) {
  return await apiFetch('/api/prestamos/eliminar-lote', {
    method: 'POST',
    body: { ids }
  });
}

export default apiFetch;
