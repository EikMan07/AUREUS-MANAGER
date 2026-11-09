'use strict';
// Plantilla de controlador CRUD (misma estructura del curso + seguridad + relaciones).
// Copiar como src/controllers/<entidad>Controller.js
const { Entidad, Categoria } = require('../models'); // Categoria = ejemplo de registro relacionado

// Campos que el cliente SÍ puede enviar (evita mass assignment).
const CAMPOS = ['nombre', 'monto', 'activo', 'categoriaId'];
const pick = (obj, campos) =>
  Object.fromEntries(campos.filter((c) => obj[c] !== undefined).map((c) => [c, obj[c]]));

// El listado incluye los datos del registro relacionado (ej.: nombre de la categoría en cada producto).
const INCLUIR = [{ model: Categoria, attributes: ['id', 'nombre'] }];

// Traduce errores de Sequelize a códigos HTTP claros.
const manejarError = (res, error) => {
  switch (error.name) {
    case 'SequelizeValidationError':
      return res.status(400).json({ error: error.errors.map((e) => e.message) });
    case 'SequelizeUniqueConstraintError':
      return res.status(409).json({ error: 'Ya existe un registro con ese valor único' });
    case 'SequelizeForeignKeyConstraintError':
      return res.status(409).json({ error: 'Operación bloqueada por una relación con otros datos' });
    default:
      console.error(error);
      return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Al crear/actualizar un registro relacionado: verificar que el referenciado exista (400, o 404).
const relacionExiste = async (res, datos) => {
  if (datos.categoriaId !== undefined) {
    const categoria = await Categoria.findByPk(datos.categoriaId);
    if (!categoria) {
      res.status(400).json({ error: `La categoría (categoriaId=${datos.categoriaId}) no existe` });
      return false;
    }
  }
  return true;
};

exports.listar = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = parseInt(req.query.offset, 10) || 0;
    const items = await Entidad.findAll({ include: INCLUIR, limit, offset, order: [['id', 'ASC']] });
    res.json(items);
  } catch (error) { manejarError(res, error); }
};

exports.obtener = async (req, res) => {
  try {
    const item = await Entidad.findByPk(req.params.id, { include: INCLUIR });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json(item);
  } catch (error) { manejarError(res, error); }
};

exports.crear = async (req, res) => {
  try {
    const datos = pick(req.body, CAMPOS);
    if (!(await relacionExiste(res, datos))) return;
    const item = await Entidad.create(datos);
    res.status(201).json(item);
  } catch (error) { manejarError(res, error); }
};

exports.actualizar = async (req, res) => {
  try {
    const item = await Entidad.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    const datos = pick(req.body, CAMPOS);
    if (!(await relacionExiste(res, datos))) return;
    await item.update(datos);
    res.json(item);
  } catch (error) { manejarError(res, error); }
};

exports.eliminar = async (req, res) => {
  try {
    const item = await Entidad.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    await item.destroy(); // con paranoid: true es borrado lógico
    res.status(204).send();
  } catch (error) { manejarError(res, error); }
};
