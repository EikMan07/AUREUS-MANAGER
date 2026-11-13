'use strict';
// Plantilla de Servicio de Lógica de Negocio (Service Layer).
// Copiar como src/services/<entidad>Service.js
// REGLA CRÍTICA: Esta capa es completamente agnóstica de HTTP (SIN req ni res).
// Recibe parámetros de dominio, interactúa con los modelos de Sequelize y devuelve datos o arroja errores de negocio.

const { Entidad, Categoria } = require('../models');

/**
 * Lista registros aplicando filtros y paginación.
 */
exports.listar = async ({ limit = 50, offset = 0 } = {}) => {
  return Entidad.findAll({
    include: [{ model: Categoria, attributes: ['id', 'nombre'] }],
    limit,
    offset,
    order: [['id', 'ASC']]
  });
};

/**
 * Busca un registro por su ID numérico.
 */
exports.buscarPorId = async (id) => {
  return Entidad.findByPk(id, {
    include: [{ model: Categoria, attributes: ['id', 'nombre'] }]
  });
};

/**
 * Crea un registro aplicando validaciones de negocio previas.
 */
exports.crear = async (datos) => {
  // Validación de regla de negocio o existencia de relación
  if (datos.categoriaId) {
    const categoria = await Categoria.findByPk(datos.categoriaId);
    if (!categoria) {
      const err = new Error(`La categoría ID ${datos.categoriaId} no existe`);
      err.status = 400;
      throw err;
    }
  }

  return Entidad.create(datos);
};

/**
 * Actualiza un registro existente si se encuentra en la base de datos.
 */
exports.actualizar = async (id, datos) => {
  const item = await Entidad.findByPk(id);
  if (!item) return null;

  if (datos.categoriaId) {
    const categoria = await Categoria.findByPk(datos.categoriaId);
    if (!categoria) {
      const err = new Error(`La categoría ID ${datos.categoriaId} no existe`);
      err.status = 400;
      throw err;
    }
  }

  return item.update(datos);
};

/**
 * Elimina un registro existente.
 */
exports.eliminar = async (id) => {
  const item = await Entidad.findByPk(id);
  if (!item) return false;

  await item.destroy();
  return true;
};

