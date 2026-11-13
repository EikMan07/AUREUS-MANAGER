'use strict';
// src/middlewares/validar.js — Middleware Genérico de Validación con Esquemas (Zod)
// Valida en el borde (params, query, body) antes de llegar al controlador.
// Descarta automáticamente campos inyectados no declarados (evita mass-assignment).

const validar = (schema, target = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[target]);

  if (!result.success) {
    const detalles = result.error.issues.map((issue) => ({
      campo: issue.path.join('.'),
      mensaje: issue.message,
    }));

    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Datos de entrada inválidos',
      detalles,
    });
  }

  // Se asignan los datos sanitizados y validados por el esquema
  req[target] = result.data;
  next();
};

module.exports = validar;

