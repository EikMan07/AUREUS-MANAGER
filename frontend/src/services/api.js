import {
  obtenerNotificaciones as apiObtenerNotificaciones,
  marcarNotificacionVista as apiMarcarNotificacionVista,
  getPersonasCompartir as apiGetPersonasCompartir,
  agregarPersonaCompartir as apiAgregarPersonaCompartir,
  eliminarPersonaCompartir as apiEliminarPersonaCompartir,
  getResumenDiaCompartir as apiGetResumenDiaCompartir,
  compartirCobrosDia as apiCompartirCobrosDia,
  dejarDeCompartirDia as apiDejarDeCompartirDia,
  eliminarPrestamo as apiEliminarPrestamo,
  eliminarPrestamosLote as apiEliminarPrestamosLote
} from './apiClient.js';

// API Service for Cobro-Firme connected to Node/Express + PostgreSQL backend

const API_BASE = '/api';

/**
 * Parsea las respuestas de error HTTP del backend separando el mensaje formal
 * para el usuario (userMessage) de los detalles técnicos para desarrollador (debugError).
 */
async function parseErrorResponse(res, fallbackMessage) {
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  const isTechnical = (str) => {
    if (!str || typeof str !== 'string') return false;
    const lower = str.toLowerCase();
    return (
      lower.includes('column') ||
      lower.includes('columna') ||
      lower.includes('tipo') ||
      lower.includes('type') ||
      lower.includes('relation') ||
      lower.includes('syntax') ||
      lower.includes('constraint') ||
      lower.includes('postgresql') ||
      lower.includes('null value') ||
      lower.includes('internal server error') ||
      lower.includes('error interno') ||
      lower.includes('violates') ||
      lower.includes('estado_prestamo') ||
      lower.includes('estado_cuota') ||
      lower.includes('dia_semana') ||
      lower.includes('failed to load')
    );
  };

  const rawUserMessage = data.userMessage || data.error;
  const userMessage = (rawUserMessage && !isTechnical(rawUserMessage))
    ? rawUserMessage
    : fallbackMessage;

  const debugError = data.debugError || data.error || res.statusText || 'Error de servidor';

  const err = new Error(userMessage);
  err.userMessage = userMessage;
  err.debugError = debugError;
  err.field = data.field || null;
  err.status = res.status;
  return err;
}

export const api = {
  // Clientes
  async getClients() {
    const res = await fetch(`${API_BASE}/clientes`);
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo consultar el listado de clientes.');
    }
    return await res.json();
  },

  async createClient(clientData) {
    const res = await fetch(`${API_BASE}/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No has completado los datos necesarios para registrar un nuevo cliente.');
    }
    return await res.json();
  },

  async updateClient(id, clientData) {
    const res = await fetch(`${API_BASE}/clientes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientData)
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No has completado los datos necesarios para guardar los cambios del cliente.');
    }
    return await res.json();
  },

  async sendClientToTrash(id, motivo = '') {
    const res = await fetch(`${API_BASE}/clientes/${id}/papelera`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo })
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo mover el cliente a la papelera.');
    }
    return await res.json();
  },

  async sendClientToBlacklist(id, motivo = '') {
    const res = await fetch(`${API_BASE}/clientes/${id}/lista-negra`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motivo })
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo enviar el cliente a la lista negra.');
    }
    return await res.json();
  },

  // Cobros
  async getCobros(fechaStr, vistaUsuarioId = null) {
    let url = fechaStr ? `${API_BASE}/cobros?fecha=${fechaStr}` : `${API_BASE}/cobros`;
    if (vistaUsuarioId) {
      url += `${url.includes('?') ? '&' : '?'}vista_usuario_id=${encodeURIComponent(vistaUsuarioId)}`;
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo consultar la agenda de cobros.');
    }
    return await res.json();
  },

  async registrarPago(id, data = {}) {
    const res = await fetch(`${API_BASE}/cobros/${id}/pago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo registrar el pago en este momento. Por favor, inténtalo nuevamente.');
    }
    return await res.json();
  },

  async pasarCobro(id, data = {}) {
    const res = await fetch(`${API_BASE}/cobros/${id}/pasar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo reprogramar el cobro en este momento. Por favor, inténtalo nuevamente.');
    }
    return await res.json();
  },

  async registrarNoPago(id) {
    const res = await fetch(`${API_BASE}/cobros/${id}/no-pago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo registrar la ausencia de pago en este momento. Por favor, inténtalo nuevamente.');
    }
    return await res.json();
  },

  // Hacienda CR Proxy
  async lookupHacienda(cedula) {
    const res = await fetch(`${API_BASE}/hacienda/${cedula}`);
    if (!res.ok) {
      throw await parseErrorResponse(res, 'Identificación no encontrada en el registro oficial.');
    }
    return await res.json();
  },

  // Préstamos (Módulo 3)
  async getLoans() {
    const res = await fetch(`${API_BASE}/prestamos`);
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudieron consultar los préstamos.');
    }
    return await res.json();
  },

  async createLoan(loanData) {
    const res = await fetch(`${API_BASE}/prestamos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loanData)
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo guardar el préstamo en el servidor.');
    }
    return await res.json();
  },

  async renewLoan(id, data) {
    const res = await fetch(`${API_BASE}/prestamos/${id}/renovar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo renovar el préstamo en este momento.');
    }
    return await res.json();
  },

  async paymentAgreement(id, data) {
    const res = await fetch(`${API_BASE}/prestamos/${id}/arreglo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo registrar el arreglo de pago en este momento.');
    }
    return await res.json();
  },

  async deleteLoan(id) {
    try {
      return await apiEliminarPrestamo(id);
    } catch (err) {
      const res = await fetch(`${API_BASE}/prestamos/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw await parseErrorResponse(res, 'No se pudo eliminar el préstamo en este momento.');
      }
      return await res.json();
    }
  },

  async deleteLoansBatch(ids) {
    try {
      return await apiEliminarPrestamosLote(ids);
    } catch (err) {
      const res = await fetch(`${API_BASE}/prestamos/eliminar-lote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) {
        throw await parseErrorResponse(res, 'No se pudieron eliminar los préstamos seleccionados en este momento.');
      }
      return await res.json();
    }
  },

  // Resumen y Estadísticas (Módulo 4)
  async getResumen() {
    const res = await fetch(`${API_BASE}/resumen`);
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo obtener el resumen de estadísticas.');
    }
    return await res.json();
  },

  async getTendencia(tipo = 'DIA', cantidad = 7) {
    const queryParams = new URLSearchParams({ tipo, cantidad: String(cantidad) });
    const res = await fetch(`${API_BASE}/resumen/tendencia?${queryParams.toString()}`);
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo consultar la tendencia de cobros.');
    }
    return await res.json();
  },

  // Lista Negra (Módulo 5)
  async getListaNegra() {
    const res = await fetch(`${API_BASE}/lista-negra`);
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo consultar la lista negra.');
    }
    return await res.json();
  },

  async verificarPersona(queryStr) {
    const term = String(queryStr || '').trim();
    const res = await fetch(`${API_BASE}/lista-negra/verificar?q=${encodeURIComponent(term)}`);
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo verificar el registro.');
    }
    return await res.json();
  },

  async consultarListaNegra(searchTerm) {
    const term = String(searchTerm || '').trim();
    const res = await fetch(`${API_BASE}/lista-negra/verificar?q=${encodeURIComponent(term)}`);
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo consultar el registro en la lista negra.');
    }
    return await res.json();
  },

  async agregarListaNegra(data) {
    const res = await fetch(`${API_BASE}/lista-negra`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo registrar a la persona en la lista negra.');
    }
    return await res.json();
  },

  async sacarListaNegra(id) {
    const res = await fetch(`${API_BASE}/lista-negra/${id}/sacar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo retirar a la persona de la lista negra.');
    }
    return await res.json();
  },

  // Papelera
  async getPapelera() {
    const res = await fetch(`${API_BASE}/papelera`);
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo consultar los clientes en la papelera.');
    }
    return await res.json();
  },

  async restaurarClientePapelera(id) {
    const res = await fetch(`${API_BASE}/papelera/${id}/restaurar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo restaurar el cliente de la papelera.');
    }
    return await res.json();
  },

  async eliminarClienteDefinitivo(id) {
    const res = await fetch(`${API_BASE}/papelera/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo eliminar definitivamente al cliente.');
    }
    return await res.json();
  },

  async vaciarPapelera() {
    const res = await fetch(`${API_BASE}/papelera/vaciar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      throw await parseErrorResponse(res, 'No se pudo vaciar la papelera.');
    }
    return await res.json();
  },

  // Notificaciones
  async getNotificaciones(fechaStr) {
    return await apiObtenerNotificaciones(fechaStr);
  },

  async marcarNotificacionVista(idOrIds) {
    return await apiMarcarNotificacionVista(idOrIds);
  },

  // Compartir Cobros y Contactos Vinculados
  async getPersonasCompartir(q = '') {
    return await apiGetPersonasCompartir(q);
  },

  async agregarPersonaCompartir(data) {
    return await apiAgregarPersonaCompartir(data);
  },

  async eliminarPersonaCompartir(contactoId) {
    return await apiEliminarPersonaCompartir(contactoId);
  },

  async getResumenDiaCompartir(fecha) {
    return await apiGetResumenDiaCompartir(fecha);
  },

  async compartirCobrosDia(data) {
    return await apiCompartirCobrosDia(data);
  },

  async dejarDeCompartirDia(data) {
    return await apiDejarDeCompartirDia(data);
  }
};

export {
  apiObtenerNotificaciones as obtenerNotificaciones,
  apiMarcarNotificacionVista as marcarNotificacionVista,
  apiGetPersonasCompartir as getPersonasCompartir,
  apiAgregarPersonaCompartir as agregarPersonaCompartir,
  apiEliminarPersonaCompartir as eliminarPersonaCompartir,
  apiGetResumenDiaCompartir as getResumenDiaCompartir,
  apiCompartirCobrosDia as compartirCobrosDia,
  apiDejarDeCompartirDia as dejarDeCompartirDia
};
