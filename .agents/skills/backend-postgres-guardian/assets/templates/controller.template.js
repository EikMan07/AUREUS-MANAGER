'use strict';
// Plantilla de Controlador CRUD (Controller Layer).
// Copiar como src/controllers/<entidad>Controller.js
// Responsabilidad única: Extrae req.params, req.query, req.body (con conversión de tipos),
// invoca a la capa de servicio/modelo y responde con helpers de Express (res.status, res.json, res.sendStatus).

const { Entidad, Categoria } = require('../models');
// Alternativa con Service Layer desacoplado:
// const entidadService = require('../services/entidadService');

// Campos permitidos en req.body (prevención de Mass Assignment)
const CAMPOS = ['nombre', 'monto', 'activo', 'categoriaId'];
const pick = (obj, campos) =>
  Object.fromEntries(campos.filter((c) => obj[c] !== undefined).map((c) => [c, obj[c]]));

// Inclusión de entidades relacionadas en consultas (evita problema N+1)
const INCLUIR = [{ model: Categoria, attributes: ['id', 'nombre'] }];

// Traducción de errores de BD/Sequelize a códigos de estado HTTP claros
const manejarError = (res, error) => {
  switch (error.name) {
    case 'SequelizeValidationError':
      return res.status(400).json({ error: error.errors.map((e) => e.message) });
    case 'SequelizeUniqueConstraintError':
      return res.status(409).json({ error: 'Ya existe un registro con ese valor único' });
    case 'SequelizeForeignKeyConstraintError':
      return res.status(409).json({ error: 'Operación bloqueada por relación con otros datos' });
    default:
      console.error('[Error de Controlador]:', error);
      return res.status(error.status || 500).json({ error: error.message || 'Error interno del servidor' });
  }
};

// Validación previa de existencia de claves foráneas referenciadas
const relacionExiste = async (res, datos) => {
  if (datos.categoriaId !== undefined) {
    const categoria = await Categoria.findByPk(datos.categoriaId);
    if (!categoria) {
      res.status(400).json({ error: `La categoría referenciada (categoriaId=${datos.categoriaId}) no existe` });
      return false;
    }
  }
  return true;
};

// GET /api/entidades — Listado general con paginación
exports.listar = async (req, res) => {
  try {
    // req.query llega como texto: conversión explícita obligatoria
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const items = await Entidad.findAll({ include: INCLUIR, limit, offset, order: [['id', 'ASC']] });
    res.json(items);
  } catch (error) {
    manejarError(res, error);
  }
};

// GET /api/entidades/:id — Detalle por ID
exports.obtener = async (req, res) => {
  try {
    // req.params.id llega como texto: conversión explícita
    const id = Number(req.params.id);
    const item = await Entidad.findByPk(id, { include: INCLUIR });
    if (!item) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json(item);
  } catch (error) {
    manejarError(res, error);
  }
};

// POST /api/entidades — Creación de nuevo registro
exports.crear = async (req, res) => {
  try {
    const datos = pick(req.body, CAMPOS);
    if (!(await relacionExiste(res, datos))) return;
    const item = await Entidad.create(datos);
    res.status(201).json(item); // 201 Created canónico
  } catch (error) {
    manejarError(res, error);
  }
};

// PUT /api/entidades/:id — Actualización completa o parcial
exports.actualizar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await Entidad.findByPk(id);
    if (!item) return res.status(404).json({ error: 'Registro no encontrado' });

    const datos = pick(req.body, CAMPOS);
    if (!(await relacionExiste(res, datos))) return;

    await item.update(datos);
    res.json(item); // 200 OK con recurso actualizado
  } catch (error) {
    manejarError(res, error);
  }
};

// DELETE /api/entidades/:id — Eliminación
exports.eliminar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await Entidad.findByPk(id);
    if (!item) return res.status(404).json({ error: 'Registro no encontrado' });

    await item.destroy(); // Con paranoid: true aplica borrado lógico
    res.sendStatus(204);  // 204 No Content canónico (sin cuerpo)
  } catch (error) {
    manejarError(res, error);
  }
};
