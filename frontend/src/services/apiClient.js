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
    !opciones.skipUnauthorizedEvent &&
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
  return await apiFetch('/api/auth/yo', { skipUnauthorizedEvent: true });
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

export async function revertirCobroCompartido(agendaId) {
  return await apiFetch(`/api/compartir/revertir-cobro/${agendaId}`, {
    method: 'POST',
    body: {}
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
  const rawCedula = typeof params === 'string' ? params : params?.cedula;
  const cleanCedula = String(rawCedula || '').replace(/\D/g, '');
  if (cleanCedula.length !== 9) {
    return {
      ok: true,
      encontrado: false,
      tieneAntecedentes: false,
      antecedente: null,
      registros: []
    };
  }

  try {
    return await apiFetch(
      `/api/clientes/historial-archivo/consultar?cedula=${encodeURIComponent(cleanCedula)}`
    );
  } catch (err) {
    console.warn('Error consultando historial anterior:', err?.message || err);
    return {
      ok: false,
      encontrado: false,
      tieneAntecedentes: false,
      antecedente: null,
      registros: []
    };
  }
}

export async function obtenerAntecedentesArchivados() {
  return apiFetch('/api/clientes/historial-archivo/lista');
}

export async function eliminarAntecedenteCliente(archivoIdOrCedula) {
  return apiFetch(
    `/api/clientes/historial-archivo/${encodeURIComponent(String(archivoIdOrCedula || '').trim())}`,
    {
      method: 'DELETE'
    }
  );
}

export async function eliminarPrestamoDeAntecedente(prestamoArchivoId) {
  return apiFetch(
    `/api/clientes/historial-archivo/prestamo/${encodeURIComponent(String(prestamoArchivoId || '').trim())}`,
    {
      method: 'DELETE'
    }
  );
}

// ==========================================
// PANEL EXCLUSIVO DEL ADMINISTRADOR ÚNICO (/api/admin)
// ==========================================
export async function obtenerResumenAdmin() {
  return apiFetch('/api/admin/resumen');
}

export async function obtenerPrestamistasAdmin() {
  return apiFetch('/api/admin/prestamistas');
}

export async function crearPrestamistaAdmin(data) {
  return apiFetch('/api/admin/prestamistas', {
    method: 'POST',
    body: JSON.stringify(data || {})
  });
}

export async function editarPrestamistaAdmin(id, data) {
  return apiFetch(`/api/admin/prestamistas/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data || {})
  });
}

export async function cambiarEstadoPrestamistaAdmin(id, estado_cuenta) {
  return apiFetch(`/api/admin/prestamistas/${encodeURIComponent(id)}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado_cuenta })
  });
}

export async function restablecerPasswordPrestamistaAdmin(id, nuevaPassword = '') {
  return apiFetch(`/api/admin/prestamistas/${encodeURIComponent(id)}/password`, {
    method: 'POST',
    body: JSON.stringify({ nuevaPassword })
  });
}

export async function eliminarPrestamistaAdmin(id) {
  return apiFetch(`/api/admin/prestamistas/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

export async function obtenerResumenDepuracionAdmin() {
  return apiFetch('/api/admin/depuracion/antecedentes');
}

export async function depurarRegistrosPrestamistaAdmin(targetId, tipo = 'antecedentes') {
  return apiFetch(
    `/api/admin/depuracion/antecedentes/${encodeURIComponent(targetId)}?tipo=${encodeURIComponent(tipo)}`,
    {
      method: 'DELETE'
    }
  );
}

export async function obtenerAuditoriaAdmin(page = 1, limit = 15) {
  return apiFetch(
    `/api/admin/auditoria?page=${encodeURIComponent(page)}&limit=${encodeURIComponent(limit)}`
  );
}

export async function limpiarAuditoriaAdmin(modo = 'antiguos') {
  return apiFetch(`/api/admin/auditoria/limpiar?modo=${encodeURIComponent(modo)}`, {
    method: 'DELETE'
  });
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

// =========================================================================
// PERFIL Y SEGURIDAD DEL USUARIO AUTENTICADO
// =========================================================================
export async function actualizarPerfilUsuario(payload) {
  return await apiFetch('/api/auth/perfil', {
    method: 'PUT',
    body: payload
  });
}

export async function cambiarPasswordUsuario(payload) {
  return await apiFetch('/api/auth/password', {
    method: 'PUT',
    body: payload
  });
}

export async function aceptarConsentimientoLegalUsuario(version = 'v1.0-2026') {
  return await apiFetch('/api/auth/consentimiento', {
    method: 'POST',
    body: { version }
  });
}

export async function exportarDatosPersonalesUsuario() {
  return await apiFetch('/api/auth/exportar-datos');
}

// =========================================================================
// MÓDULO II: CRM CREDITICIO DEL PRESTAMISTA (/api/crm)
// =========================================================================
export async function obtenerProspectosCrm(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros?.etapa) params.set('etapa', String(filtros.etapa).trim());
  if (filtros?.canal_origen) params.set('canal_origen', String(filtros.canal_origen).trim());
  if (filtros?.busqueda) params.set('busqueda', String(filtros.busqueda).trim());
  const qs = params.toString();
  const ruta = qs ? `/api/crm/prospectos?${qs}` : '/api/crm/prospectos';
  return await apiFetch(ruta);
}

export async function crearProspectoCrm(payload) {
  return await apiFetch('/api/crm/prospectos', {
    method: 'POST',
    body: payload,
  });
}

export async function actualizarProspectoCrm(id, payload) {
  return await apiFetch(`/api/crm/prospectos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function eliminarProspectoCrm(id) {
  return await apiFetch(`/api/crm/prospectos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function convertirProspectoAClienteCrm(id) {
  return await apiFetch(`/api/crm/prospectos/${encodeURIComponent(id)}/convertir-cliente`, {
    method: 'POST',
    body: {},
  });
}

export async function moverEtapaProspectoCrm(id, payload) {
  return await apiFetch(`/api/crm/prospectos/${encodeURIComponent(id)}/etapa`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function obtenerEmbudoCrm() {
  return await apiFetch('/api/crm/embudo');
}

export async function obtenerAtencionCrm(dias = 3) {
  const diasNum = Number(dias);
  const diasValido = Number.isFinite(diasNum) && diasNum >= 1 ? Math.floor(diasNum) : 3;
  return await apiFetch(`/api/crm/atencion?dias=${encodeURIComponent(diasValido)}`);
}

export async function redactarMensajeCrm(id) {
  return await apiFetch(`/api/crm/prospectos/${encodeURIComponent(id)}/mensaje`, {
    method: 'POST',
    body: {},
  });
}

export async function actualizarEstadoMensajeCrm(mensajeId, estado) {
  return await apiFetch(`/api/crm/mensajes/${encodeURIComponent(mensajeId)}/estado`, {
    method: 'PATCH',
    body: { estado },
  });
}

export async function obtenerCerebroCrm() {
  return await apiFetch('/api/crm/cerebro');
}

export async function actualizarCerebroCrm(payload) {
  return await apiFetch('/api/crm/cerebro', {
    method: 'PUT',
    body: payload,
  });
}

export async function actualizarMetasCrm(payload) {
  return await apiFetch('/api/crm/metas', {
    method: 'PUT',
    body: payload,
  });
}

// =========================================================================
// MÓDULO V ADMINISTRATIVO: CRM COMERCIAL Y MERCADEO (/api/admin/crm)
// =========================================================================
export async function obtenerProspectosCrmAdmin(filtros = {}) {
  const params = new URLSearchParams();
  if (filtros?.etapa) params.set('etapa', String(filtros.etapa).trim());
  if (filtros?.canal_origen) params.set('canal_origen', String(filtros.canal_origen).trim());
  if (filtros?.busqueda) params.set('busqueda', String(filtros.busqueda).trim());
  const qs = params.toString();
  const ruta = qs ? `/api/admin/crm/prospectos?${qs}` : '/api/admin/crm/prospectos';
  return await apiFetch(ruta);
}

export async function crearProspectoCrmAdmin(payload) {
  return await apiFetch('/api/admin/crm/prospectos', {
    method: 'POST',
    body: payload,
  });
}

export async function actualizarProspectoCrmAdmin(id, payload) {
  return await apiFetch(`/api/admin/crm/prospectos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function eliminarProspectoCrmAdmin(id) {
  return await apiFetch(`/api/admin/crm/prospectos/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function moverEtapaProspectoCrmAdmin(id, payload) {
  return await apiFetch(`/api/admin/crm/prospectos/${encodeURIComponent(id)}/etapa`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function obtenerEmbudoCrmAdmin() {
  return await apiFetch('/api/admin/crm/embudo');
}

export async function obtenerAtencionCrmAdmin(dias = 3) {
  const diasNum = Number(dias);
  const diasValido = Number.isFinite(diasNum) && diasNum >= 1 ? Math.floor(diasNum) : 3;
  return await apiFetch(`/api/admin/crm/atencion?dias=${encodeURIComponent(diasValido)}`);
}

export async function redactarMensajeCrmAdmin(id) {
  return await apiFetch(`/api/admin/crm/prospectos/${encodeURIComponent(id)}/mensaje`, {
    method: 'POST',
    body: {},
  });
}

export async function obtenerCampanasCrmAdmin() {
  return await apiFetch('/api/admin/crm/campanas');
}

export async function crearCampanaCrmAdmin(payload) {
  return await apiFetch('/api/admin/crm/campanas', {
    method: 'POST',
    body: payload,
  });
}

export async function actualizarCampanaCrmAdmin(id, payload) {
  return await apiFetch(`/api/admin/crm/campanas/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function generarPiezasCampanaCrmAdmin(id) {
  return await apiFetch(`/api/admin/crm/campanas/${encodeURIComponent(id)}/generar-piezas`, {
    method: 'POST',
    body: {},
  });
}

export async function actualizarEstadoPiezaCrmAdmin(piezaId, estado) {
  return await apiFetch(`/api/admin/crm/piezas/${encodeURIComponent(piezaId)}/estado`, {
    method: 'PATCH',
    body: { estado },
  });
}

export default apiFetch;
