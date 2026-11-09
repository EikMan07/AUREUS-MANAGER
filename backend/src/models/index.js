// Modelos Sequelize de cobro_firme_db. Cada modelo COINCIDE con la tabla real
// (columnas, tipos, allowNull, defaults) definida en backend/sql/01_schema_cobro_firme.sql.
// Convención del proyecto respetada: tablas y columnas en snake_case, PK uuid.
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

import defineUsuario from './Usuario.js';
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

const models = {
  Usuario: defineUsuario(sequelize, DataTypes),
  Cliente: defineCliente(sequelize, DataTypes),
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
};

// Asociaciones: se declaran SIEMPRE ambos lados de cada relación.
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') model.associate(models);
});

export const {
  Usuario,
  Cliente,
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
} = models;

export { sequelize };
export default models;
