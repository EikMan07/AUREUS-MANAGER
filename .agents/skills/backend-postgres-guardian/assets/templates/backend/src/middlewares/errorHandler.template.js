'use strict';
// src/middlewares/errorHandler.js — Manejador Centralizado de Errores de Express
// Requisito indispensable: firma de exactamente 4 parámetros (err, req, res, next).
// Se registra al final de app.js, después de todas las rutas y del manejador 404.

const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
  // 1. Error operacional conocido (AppError o subclases de dominio)
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.detalles ? { detalles: err.detalles } : {}),
    });
  }

  // 2. Errores de validación de esquemas (Zod)
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Datos de entrada inválidos',
      detalles: err.issues?.map((i) => ({
        campo: i.path.join('.'),
        mensaje: i.message,
      })),
    });
  }

  // 3. Error de unicidad de base de datos (PostgreSQL 23505 / SequelizeUniqueConstraintError)
  if (err?.name === 'SequelizeUniqueConstraintError' || err?.code === '23505') {
    return res.status(409).json({
      error: 'DUPLICADO',
      message: 'El registro ya existe en el sistema.',
    });
  }

  // 4. Error de clave foránea (PostgreSQL 23503 / SequelizeForeignKeyConstraintError)
  if (err?.name === 'SequelizeForeignKeyConstraintError' || err?.code === '23503') {
    return res.status(400).json({
      error: 'REFERENCIA_INVALIDA',
      message: 'El registro referenciado no existe.',
    });
  }

  // 5. Error de programación / Bug inesperado (HTTP 500)
  // Registrar siempre con contexto completo para depuración
  console.error('[Error 500 Inesperado]:', err);

  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: isProd ? 'Ocurrió un inconveniente interno en el servidor.' : err.message,
    ...(!isProd && { stack: err.stack }),
  });
}

module.exports = errorHandler;

