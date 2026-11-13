'use strict';
// src/utils/errors.js — Jerarquía de Errores Operacionales (AppError)
// Los servicios lanzan estas excepciones tipadas sin acoplarse a Express ni a req/res.

class AppError extends Error {
  constructor(status, message, code = 'APP_ERROR', detalles = null) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.detalles = detalles;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(recurso = 'Recurso') {
    super(404, `${recurso} no encontrado`, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message = 'Datos de entrada inválidos', detalles = []) {
    super(400, message, 'VALIDATION_ERROR', detalles);
  }
}

class ConflictError extends AppError {
  constructor(message = 'El registro ya existe o genera conflicto') {
    super(409, message, 'CONFLICT');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Token de acceso no proporcionado o inválido') {
    super(401, message, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado: permisos insuficientes') {
    super(403, message, 'FORBIDDEN');
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
};

