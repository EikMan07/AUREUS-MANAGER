// Servicio de datos para Cobro-Firme conectado en tiempo real al backend (PostgreSQL)
// 100% libre de datos simulados o clientes falsos.

import { api } from './api.js';

export function purgeLegacyDemoData() {
  if (typeof window === 'undefined') return;

  try {
    const legacyKeys = [
      'CobroClaroDB',
      'clientes_cobros',
      'clientes_lista_negra',
      'clientes_papelera',
      'cobroclaro_demo_initialized'
    ];

    legacyKeys.forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });

    if (window.indexedDB && window.indexedDB.deleteDatabase) {
      window.indexedDB.deleteDatabase('CobroClaroDB');
    }
    console.log('[Cobro-Firme] Datos demo antiguos purgados exitosamente.');
  } catch (err) {
    console.warn('[Cobro-Firme] Advertencia limpiando almacenamiento heredado:', err);
  }
}

export const dbService = {
  purgeLegacyDemoData,

  async getAllClients() {
    try {
      return await api.getClients();
    } catch (err) {
      console.error('Error obteniendo clientes desde PostgreSQL:', err);
      return [];
    }
  },

  async createClient(clientData) {
    return await api.createClient(clientData);
  },

  async updateClient(id, clientData) {
    return await api.updateClient(id, clientData);
  },

  async sendClientToTrash(id, motivo) {
    return await api.sendClientToTrash(id, motivo);
  },

  async sendClientToBlacklist(id, motivo) {
    return await api.sendClientToBlacklist(id, motivo);
  },

  async getCobros(fechaStr) {
    try {
      return await api.getCobros(fechaStr);
    } catch (err) {
      console.error('Error obteniendo cobros desde PostgreSQL:', err);
      return {
        fecha: fechaStr,
        metricas: { totalPrestado: 0, estaSemana: 0, hoy: 0 },
        pendientes: [],
        registrados: [],
        atrasados: []
      };
    }
  },

  async registrarPago(id, data) {
    return await api.registrarPago(id, data);
  },

  async pasarCobro(id, data) {
    return await api.pasarCobro(id, data);
  },

  async registrarNoPago(id) {
    return await api.registrarNoPago(id);
  },

  // Préstamos (Módulo 3)
  async getAllLoans() {
    try {
      return await api.getLoans();
    } catch (err) {
      console.error('Error obteniendo préstamos desde PostgreSQL:', err);
      return [];
    }
  },

  async createLoan(loanData) {
    return await api.createLoan(loanData);
  },

  async renewLoan(id, data) {
    return await api.renewLoan(id, data);
  },

  async paymentAgreement(id, data) {
    return await api.paymentAgreement(id, data);
  }
};
