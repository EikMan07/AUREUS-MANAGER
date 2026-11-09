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

  async getCobros(fechaStr, vistaUsuarioId = null) {
    try {
      return await api.getCobros(fechaStr, vistaUsuarioId);
    } catch (err) {
      console.error('Error obteniendo cobros desde PostgreSQL:', err);
      return {
        fecha: fechaStr,
        metricas: { totalPrestado: 0, estaSemana: 0, hoy: 0 },
        pendientes: [],
        registrados: [],
        atrasados: [],
        diasConPendientesSinCerrar: []
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
  },

  async deleteLoan(id) {
    return await api.deleteLoan(id);
  },

  async deleteLoansBatch(ids) {
    return await api.deleteLoansBatch(ids);
  },

  // Resumen y Estadísticas (Módulo 4)
  async getResumen() {
    try {
      return await api.getResumen();
    } catch (err) {
      console.error('Error obteniendo métricas de resumen:', err);
      return null;
    }
  },

  async getTendencia(tipo = 'DIA', cantidad = 7) {
    try {
      return await api.getTendencia(tipo, cantidad);
    } catch (err) {
      console.error('Error obteniendo tendencia de cobros:', err);
      return null;
    }
  },

  // Lista Negra (Módulo 5)
  async getListaNegra() {
    try {
      return await api.getListaNegra();
    } catch (err) {
      console.error('Error obteniendo personas en Lista Negra:', err);
      return [];
    }
  },

  async verificarPersona(queryStr) {
    return await api.verificarPersona(queryStr);
  },

  async consultarListaNegra(cedula) {
    return await api.consultarListaNegra(cedula);
  },

  async agregarListaNegra(data) {
    return await api.agregarListaNegra(data);
  },

  async sacarListaNegra(id) {
    return await api.sacarListaNegra(id);
  },

  // Papelera de Clientes (Módulo 6)
  async getPapelera() {
    try {
      return await api.getPapelera();
    } catch (err) {
      console.error('Error obteniendo clientes en papelera:', err);
      return [];
    }
  },

  async restaurarClientePapelera(id) {
    return await api.restaurarClientePapelera(id);
  },

  async eliminarClienteDefinitivo(id) {
    return await api.eliminarClienteDefinitivo(id);
  },

  async vaciarPapelera() {
    return await api.vaciarPapelera();
  },

  // Centro de Notificaciones
  async getNotificaciones(fechaStr) {
    try {
      return await api.getNotificaciones(fechaStr);
    } catch (err) {
      console.error('Error obteniendo notificaciones:', err);
      return {
        success: false,
        total: 0,
        categorias: {
          COBROS_HOY: [],
          COBROS_OLVIDADOS: [],
          PASADOS_PARA_HOY: [],
          ATRASOS_ACUMULADOS: []
        },
        notificaciones: []
      };
    }
  },

  async marcarNotificacionVista(idOrIds) {
    try {
      return await api.marcarNotificacionVista(idOrIds);
    } catch (err) {
      console.error('Error al sincronizar notificación vista:', err);
      return { success: false, error: err.message };
    }
  },

  // Compartir Cobros y Contactos Vinculados
  async getPersonasCompartir(q = '') {
    try {
      return await api.getPersonasCompartir(q);
    } catch (err) {
      console.error('Error al obtener personas vinculadas:', err);
      return { success: false, misPersonas: [], resultadosBusqueda: [] };
    }
  },

  async agregarPersonaCompartir(data) {
    return await api.agregarPersonaCompartir(data);
  },

  async eliminarPersonaCompartir(contactoId) {
    return await api.eliminarPersonaCompartir(contactoId);
  },

  async getResumenDiaCompartir(fecha) {
    try {
      return await api.getResumenDiaCompartir(fecha);
    } catch (err) {
      console.error('Error al obtener resumen de cobros del día:', err);
      return { success: false, total_cobros: 0, monto_total: 0, cobros: [] };
    }
  },

  async compartirCobrosDia(data) {
    return await api.compartirCobrosDia(data);
  },

  async dejarDeCompartirDia(data) {
    return await api.dejarDeCompartirDia(data);
  }
};
