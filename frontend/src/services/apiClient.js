// src/services/apiClient.js — cliente HTTP centralizado para peticiones a la API
// - Configurado con credentials: 'include' para cookies seguras HttpOnly.
// - Mantiene el token Anti-CSRF únicamente en memoria e inyecta X-CSRF-Token en métodos mutables.
// - Emite aureus:unauthorized ante respuestas 401 en rutas protegidas.

const API_URL = import.meta.env?.VITE_API_URL || '';

const DEFAULT_FALLBACK_MESSAGE =
  'En este momento no fue posible completar la solicitud. Por favor, inténtalo de nuevo en unos segundos.';

const COMMUNICATION_FALLBACK_MESSAGE =
  'No fue posible establecer la comunicación en este momento. Inténtalo nuevamente en unos segundos.';

const FORBIDDEN_TECHNICAL_RX =
  /\b(backend|frontend|servidor|server|base de datos|bases de datos|database|postgresql|postgres|sequelize|sql|endpoint|api|fetch|networkerror|failed to fetch|localhost|puerto|port|json|stack|syntaxerror|typeerror|referenceerror|econnrefused|aplicativo|sistema|sistemas|cartera|carteras|jwt|csrf|httponly)\b/i;

const MUTABLE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

let csrfTokenInMemory = null;

export function getCsrfToken() {
  return csrfTokenInMemory;
}

export function setCsrfToken(nextToken) {
  csrfTokenInMemory = nextToken || null;
}

export function notifyUnauthorized(ruta = '') {
  try {
    auth.onUnauthorized();
  } catch {
    // Ignorar error en callback
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('aureus:unauthorized', { detail: { status: 401, ruta } })
    );
  }
}

export function sanitizeUserFacingMessage(rawMessage, fallbackMessage = DEFAULT_FALLBACK_MESSAGE) {
  const safeFallback =
    typeof fallbackMessage === 'string' && fallbackMessage.trim() && !FORBIDDEN_TECHNICAL_RX.test(fallbackMessage)
      ? fallbackMessage.trim()
      : DEFAULT_FALLBACK_MESSAGE;

  if (typeof rawMessage !== 'string') return safeFallback;
  const trimmed = rawMessage.trim();
  if (!trimmed) return safeFallback;
  if (FORBIDDEN_TECHNICAL_RX.test(trimmed)) return safeFallback;
  return trimmed;
}

let auth = {
  getCsrfToken: () => csrfTokenInMemory,
  setCsrfToken: (next) => setCsrfToken(next),
  onUnauthorized: () => {},
};

export const configurarAuth = (callbacks) => {
  auth = { ...auth, ...callbacks };
};

export async function apiFetch(ruta, opciones = {}) {
  const metodo = (opciones.method || 'GET').toUpperCase();
  const csrfToken = auth.getCsrfToken?.() || csrfTokenInMemory;
  const url = ruta.startsWith('http') ? ruta : `${API_URL}${ruta.startsWith('/') ? '' : '/'}${ruta}`;

  const headers = {
    'Content-Type': 'application/json',
    ...opciones.headers,
  };

  if (MUTABLE_METHODS.has(metodo) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  let respuesta;
  try {
    respuesta = await fetch(url, {
      ...opciones,
      method: metodo,
      credentials: 'include',
      headers,
      body: opciones.body !== undefined && typeof opciones.body !== 'string'
        ? JSON.stringify(opciones.body)
        : opciones.body,
    });
  } catch (networkError) {
    const safeMsg = sanitizeUserFacingMessage(networkError?.message, COMMUNICATION_FALLBACK_MESSAGE);
    const err = new Error(safeMsg);
    err.userMessage = safeMsg;
    err.debugError = networkError?.message || 'Error de comunicación';
    throw err;
  }

  const headerCsrf = respuesta.headers.get('x-csrf-token');
  if (headerCsrf) {
    setCsrfToken(headerCsrf);
    auth.setCsrfToken?.(headerCsrf);
  }

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);

  if (datos?.csrfToken) {
    setCsrfToken(datos.csrfToken);
    auth.setCsrfToken?.(datos.csrfToken);
  }

  if (
    respuesta.status === 401 &&
    !ruta.includes('/auth/login') &&
    !ruta.includes('/auth/registro')
  ) {
    notifyUnauthorized(ruta);
  }

  if (!respuesta.ok) {
    const rawMensaje = Array.isArray(datos?.error)
      ? datos.error.join('. ')
      : datos?.userMessage || datos?.error || '';
    const safeMensaje = sanitizeUserFacingMessage(rawMensaje, DEFAULT_FALLBACK_MESSAGE);
    const err = new Error(safeMensaje);
    err.status = respuesta.status;
    err.datos = datos;
    err.userMessage = safeMensaje;
    err.debugError = datos?.debugError;
    throw err;
  }
  return datos;
}

export async function loginUsuario(payload) {
  return await apiFetch('/api/auth/login', {
    method: 'POST',
    body: payload,
  });
}

export async function registrarUsuario(payload) {
  return await apiFetch('/api/auth/registro', {
    method: 'POST',
    body: payload,
  });
}

export async function obtenerSesionActual() {
  return await apiFetch('/api/auth/yo');
}

export async function cerrarSesionUsuario() {
  return await apiFetch('/api/auth/logout', {
    method: 'POST',
  });
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

// =========================================================================
// MÓDULO 6: PAPELERA UNIFICADA (CLIENTES Y PRÉSTAMOS)
// =========================================================================
export async function restaurarPrestamoPapelera(prestamoId) {
  return await apiFetch(`/api/papelera/prestamo/${prestamoId}/restaurar`, {
    method: 'POST'
  });
}

export async function eliminarPrestamoDefinitivoPapelera(prestamoId) {
  return await apiFetch(`/api/papelera/prestamo/${prestamoId}`, {
    method: 'DELETE'
  });
}

export async function consultarHistorialArchivoCliente(params = {}) {
  const query = new URLSearchParams();
  if (params.cedula) query.set('cedula', String(params.cedula).trim());
  if (params.telefono) query.set('telefono', String(params.telefono).trim());
  if (params.telefono_secundario) query.set('telefono_secundario', String(params.telefono_secundario).trim());
  if (params.nombre) query.set('nombre', String(params.nombre).trim());
  if (params.apellidos) query.set('apellidos', String(params.apellidos).trim());
  if (params.tipo_cliente) query.set('tipo_cliente', String(params.tipo_cliente).trim());

  const qs = query.toString();
  if (!qs) {
    return { ok: true, encontrado: false };
  }

  try {
    return await apiFetch(`/api/clientes/historial-archivo/consultar?${qs}`);
  } catch (err) {
    console.warn('Error consultando historial anterior:', err?.message || err);
    return { ok: false, encontrado: false };
  }
}

// =========================================================================
// AGENTE IA INFORMATIVO: SENECA
// =========================================================================
export async function obtenerResumenSeneca() {
  return await apiFetch('/api/seneca/resumen-rapido');
}

export async function consultarSeneca(pregunta, historial = []) {
  return await apiFetch('/api/seneca/consultar', {
    method: 'POST',
    body: { pregunta, historial }
  });
}

export default apiFetch;
