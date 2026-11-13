'use strict';
/**
 * src/controllers/authController.js — Controlador de Autenticación con Cookies Seguras.
 *
 * - Login y Registro emiten la cookie de sesión HttpOnly mediante setCookieSesion(res, token).
 * - NUNCA se expone el JWT dentro de las respuestas JSON.
 * - Retorna un token anti-CSRF firmado (HMAC) en el JSON para que el cliente lo guarde en memoria.
 * - Endpoint 'yo' para validar y restaurar sesión tras recarga de página (F5).
 * - Endpoint 'logout' que destruye la cookie de sesión con clearCookieSesion(res).
 */

const { Usuario } = require('../models');
const { firmarToken } = require('../middlewares/authMiddleware');
const { setCookieSesion, clearCookieSesion } = require('../utils/cookies');
const { generarTokenCsrf } = require('../middlewares/csrf');

const manejarError = (res, error) => {
  switch (error.name) {
    case 'SequelizeValidationError':
      return res.status(400).json({ error: error.errors.map((e) => e.message) });
    case 'SequelizeUniqueConstraintError':
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    default:
      console.error(error);
      return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Registra un nuevo usuario, emite la cookie de sesión y devuelve el token CSRF.
 */
exports.registro = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const usuario = await Usuario.create({ nombre, email, password });
    const token = firmarToken(usuario);

    // Cookie de sesión segura
    setCookieSesion(res, token);

    // Token CSRF en memoria para el frontend
    const csrfToken = generarTokenCsrf(usuario.id);

    // NOTA DE SEGURIDAD: Nunca devolver el token JWT en el JSON
    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      usuario, // toJSON() ya excluye password
      csrfToken,
    });
  } catch (error) {
    manejarError(res, error);
  }
};

/**
 * Autentica al usuario mediante correo y contraseña.
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
    }

    // El scope conPassword es el ÚNICO lugar donde se lee el hash cifrado
    const usuario = await Usuario.scope('conPassword').findOne({ where: { email } });
    const valido = usuario && (await usuario.verificarPassword(password));

    // Mismo mensaje ante correo inexistente o contraseña incorrecta para evitar enumeración
    if (!valido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = firmarToken(usuario);

    // Emite la cookie HttpOnly segura (expira a los 25 min de inactividad)
    setCookieSesion(res, token);

    // Token anti-CSRF para peticiones mutables del cliente
    const csrfToken = generarTokenCsrf(usuario.id);

    // Respuesta JSON limpia sin token JWT
    res.json({
      mensaje: 'Inicio de sesión exitoso',
      usuario: usuario.toJSON(),
      csrfToken,
    });
  } catch (error) {
    manejarError(res, error);
  }
};

/**
 * Endpoint para restaurar la sesión en el cliente (al presionar F5 o montar la aplicación).
 * Protegido por authMiddleware: si la cookie es válida, req.usuario estará poblado.
 */
exports.yo = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id);
    if (!usuario) {
      clearCookieSesion(res);
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const csrfToken = generarTokenCsrf(usuario.id);

    res.json({
      usuario,
      csrfToken,
    });
  } catch (error) {
    manejarError(res, error);
  }
};

/**
 * Cierra la sesión del usuario eliminando la cookie en el navegador.
 */
exports.logout = (req, res) => {
  clearCookieSesion(res);
  res.json({ mensaje: 'Sesión cerrada exitosamente' });
};
