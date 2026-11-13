'use strict';
/**
 * src/middlewares/authMiddleware.js — Autenticación Segura y Expiración Deslizante.
 *
 * 1. Prioridad de extracción:
 *    - Cookie HttpOnly reforzada (__Host-sid o sid).
 *    - Fallback: Cabecera 'Authorization: Bearer <token>' (para clientes CLI / APIs no web).
 * 2. Verificación criptográfica con algoritmo estricto (HS256).
 * 3. Expiración deslizante: Si la sesión es válida y se originó por cookie,
 *    re-emite la cookie con un maxAge renovado de 25 minutos.
 */

const jwt = require('jsonwebtoken');

let cookiesUtil;
try {
  cookiesUtil = require('../utils/cookies');
} catch {
  cookiesUtil = require('../utils/cookies.template');
}
const { getCookieName, setCookieSesion } = cookiesUtil;

const EXPIRA = process.env.JWT_EXPIRES_IN || '25m';

/**
 * Genera un nuevo JWT firmado con los datos esenciales del usuario.
 * @param {{ id: string|number, email: string }} usuario
 */
function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: EXPIRA, algorithm: 'HS256' }
  );
}

/**
 * Middleware de autenticación principal de la API.
 */
function authMiddleware(req, res, next) {
  const nombreCookie = getCookieName();
  let token = req.cookies?.[nombreCookie];
  let origenCookie = Boolean(token);

  // Fallback a Authorization: Bearer <token> si no hay cookie
  if (!token) {
    const cabecera = req.headers.authorization || '';
    const [tipo, tokenHeader] = cabecera.split(' ');
    if (tipo === 'Bearer' && tokenHeader) {
      token = tokenHeader;
      origenCookie = false;
    }
  }

  if (!token) {
    return res.status(401).json({
      error: 'No has iniciado sesión o la sesión ha expirado.',
      codigo: 'TOKEN_AUSENTE',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.usuario = { id: payload.id, email: payload.email };

    // Expiración deslizante (sliding expiration):
    // Si la petición proviene de un navegador con cookies, re-emitimos la cookie con otros 25 minutos.
    if (origenCookie) {
      const nuevoToken = firmarToken(payload);
      setCookieSesion(res, nuevoToken);
    }

    return next();
  } catch (error) {
    const expirado = error.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expirado
        ? 'Tu sesión expiró por inactividad. Inicia sesión de nuevo.'
        : 'Token de sesión inválido o adulterado.',
      codigo: expirado ? 'TOKEN_EXPIRADO' : 'TOKEN_INVALIDO',
    });
  }
}

module.exports = authMiddleware;
module.exports.firmarToken = firmarToken;
