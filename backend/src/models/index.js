// backend/src/models/index.js
// Modelos Sequelize de cobro_firme_db. Cada modelo COINCIDE con la tabla real
// (columnas, tipos, allowNull, defaults) definida en backend/sql/.
// Convención del proyecto respetada: tablas y columnas en snake_case, PK uuid.
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

import defineUsuario from './Usuario.js';
import defineCuentaOauth from './CuentaOauth.js';
import defineCliente from './Cliente.js';
import definePrestamo from './Prestamo.js';
import defineAgendaCobro from './AgendaCobro.js';
import definePagoPrestamo from './PagoPrestamo.js';
import defineArregloPago from './ArregloPago.js';
import defineListaNegra from './ListaNegra.js';
import defineListaNegraGlobal from './ListaNegraGlobal.js';
import defineHistorialClienteArchivo from './HistorialClienteArchivo.js';
import defineHistorialPrestamoArchivo from './HistorialPrestamoArchivo.js';
import defineBitacoraActividad from './BitacoraActividad.js';
import defineTransferenciaCartera from './TransferenciaCartera.js';
import defineClienteBaneado from './ClienteBaneado.js';
import definePrestamoBaneado from './PrestamoBaneado.js';

// CRM Dual Aureus
import defineCrmProspecto from './CrmProspecto.js';
import defineCrmHistorialEtapa from './CrmHistorialEtapa.js';
import defineCrmMetaEtapa from './CrmMetaEtapa.js';
import defineCrmMensajeIa from './CrmMensajeIa.js';
import defineCrmCerebroConfig from './CrmCerebroConfig.js';
import defineCrmAdminProspecto from './CrmAdminProspecto.js';
import defineCrmAdminHistorialEtapa from './CrmAdminHistorialEtapa.js';
import defineCrmAdminCampana from './CrmAdminCampana.js';
import defineCrmAdminCampanaPieza from './CrmAdminCampanaPieza.js';

const models = {
  Usuario: defineUsuario(sequelize, DataTypes),
  CuentaOauth: defineCuentaOauth(sequelize, DataTypes),
  Cliente: defineCliente(sequelize, DataTypes),
  ClienteBaneado: defineClienteBaneado(sequelize, DataTypes),
  PrestamoBaneado: definePrestamoBaneado(sequelize, DataTypes),
  Prestamo: definePrestamo(sequelize, DataTypes),
  AgendaCobro: defineAgendaCobro(sequelize, DataTypes),
  PagoPrestamo: definePagoPrestamo(sequelize, DataTypes),
  ArregloPago: defineArregloPago(sequelize, DataTypes),
  ListaNegra: defineListaNegra(sequelize, DataTypes),
  ListaNegraGlobal: defineListaNegraGlobal(sequelize, DataTypes),
  HistorialClienteArchivo: defineHistorialClienteArchivo(sequelize, DataTypes),
  HistorialPrestamoArchivo: defineHistorialPrestamoArchivo(sequelize, DataTypes),
  BitacoraActividad: defineBitacoraActividad(sequelize, DataTypes),
  TransferenciaCartera: defineTransferenciaCartera(sequelize, DataTypes),

  // CRM
  CrmProspecto: defineCrmProspecto(sequelize, DataTypes),
  CrmHistorialEtapa: defineCrmHistorialEtapa(sequelize, DataTypes),
  CrmMetaEtapa: defineCrmMetaEtapa(sequelize, DataTypes),
  CrmMensajeIa: defineCrmMensajeIa(sequelize, DataTypes),
  CrmCerebroConfig: defineCrmCerebroConfig(sequelize, DataTypes),
  CrmAdminProspecto: defineCrmAdminProspecto(sequelize, DataTypes),
  CrmAdminHistorialEtapa: defineCrmAdminHistorialEtapa(sequelize, DataTypes),
  CrmAdminCampana: defineCrmAdminCampana(sequelize, DataTypes),
  CrmAdminCampanaPieza: defineCrmAdminCampanaPieza(sequelize, DataTypes),
};

// Asociaciones: se declaran SIEMPRE ambos lados de cada relación.
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') model.associate(models);
});

export const {
  Usuario,
  CuentaOauth,
  Cliente,
  ClienteBaneado,
  PrestamoBaneado,
  Prestamo,
  AgendaCobro,
  PagoPrestamo,
  ArregloPago,
  ListaNegra,
  ListaNegraGlobal,
  HistorialClienteArchivo,
  HistorialPrestamoArchivo,
  BitacoraActividad,
  TransferenciaCartera,

  // CRM
  CrmProspecto,
  CrmHistorialEtapa,
  CrmMetaEtapa,
  CrmMensajeIa,
  CrmCerebroConfig,
  CrmAdminProspecto,
  CrmAdminHistorialEtapa,
  CrmAdminCampana,
  CrmAdminCampanaPieza,
} = models;

export { sequelize };
export default models;
