// API Service for Cobro-Firme connected to Node/Express + PostgreSQL backend

const API_BASE = '/api';

export const api = {
  // Clientes
  async getClients() {
    const res = await fetch(`${API_BASE}/clientes`);
    if (!res.ok) {
      throw new Error(`Error al obtener clientes: ${res.statusText}`);
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
      const err = await res.json().catch(() => ({}));
      const errorObj = new Error(err.error || `Error al crear cliente (${res.status})`);
      errorObj.status = res.status;
      errorObj.field = err.field || null;
      throw errorObj;
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
      const err = await res.json().catch(() => ({}));
      const errorObj = new Error(err.error || `Error al actualizar cliente (${res.status})`);
      errorObj.status = res.status;
      errorObj.field = err.field || null;
      throw errorObj;
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error al enviar a papelera (${res.status})`);
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error al enviar a lista negra (${res.status})`);
    }
    return await res.json();
  },

  // Cobros
  async getCobros(fechaStr) {
    const url = fechaStr ? `${API_BASE}/cobros?fecha=${fechaStr}` : `${API_BASE}/cobros`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error al obtener cobros: ${res.statusText}`);
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error al registrar pago (${res.status})`);
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error al reprogramar cobro (${res.status})`);
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error al registrar no pago (${res.status})`);
    }
    return await res.json();
  },

  // Hacienda CR Proxy
  async lookupHacienda(cedula) {
    const res = await fetch(`${API_BASE}/hacienda/${cedula}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Identificación no encontrada en Hacienda CR');
    }
    return await res.json();
  },

  // Préstamos (Módulo 3)
  async getLoans() {
    const res = await fetch(`${API_BASE}/prestamos`);
    if (!res.ok) {
      throw new Error(`Error al obtener préstamos: ${res.statusText}`);
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error al crear préstamo (${res.status})`);
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error al renovar préstamo (${res.status})`);
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
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error al registrar arreglo de pago (${res.status})`);
    }
    return await res.json();
  }
};
