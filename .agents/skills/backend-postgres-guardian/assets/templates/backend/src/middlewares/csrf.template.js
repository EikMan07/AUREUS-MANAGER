'use strict';
/**
 * src/middlewares/csrf.js — Defensa Anti-CSRF en Capas conforme a OWASP Cheat Sheet.
 *
 * Capa 2: Verificación de cabeceras estándar (Origin / Referer) en peticiones mutables.
 * Capa 3: Validación de token criptográfico HMAC ligado al usuario en cabecera personalizada (X-CSRF-Token).
 */

const crypto = require('crypto');

const METODOS_MUTABLES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const VIGENCIA_CSRF_MS = 25 * 60 * 1000; // 25 minutos (sincronizado con la sesión)

/**
 * Capa 2: Verifica que el origen de peticiones mutables coincida con el FRONTEND_URL autorizado.
 */
function verificarOrigen(req, res, next) {
  if (!METODOS_MUTABLES.has(req.method)) {
    return next();
  }

  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl) {
    // Si no está configurada la variable, se permite en desarrollo advirtiendo en consola
    return next();
  }

  const origen = req.headers.origin;
  const referer = req.headers.referer;

  // Si viene cabecera Origin, debe coincidir exactamente con FRONTEND_URL
  if (origen) {
    if (origen !== frontendUrl) {
      return res.status(403).json({
        error: 'Petición bloqueada por seguridad de origen.',
        codigo: 'ORIGEN_NO_PERMITIDO',
      });
    }
    return next();
  }

  // Fallback a Referer si Origin no está presente (algunos navegadores en redirects)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const expectedUrl = new URL(frontendUrl);
      if (refererUrl.origin !== expectedUrl.origin) {
        return res.status(403).json({
          error: 'Petición bloqueada por seguridad de origen (referer).',
          codigo: 'ORIGEN_NO_PERMITIDO',
        });
      }
      return next();
    } catch {
      return res.status(403).json({
        error: 'Cabecera Referer malformada.',
        codigo: 'ORIGEN_NO_PERMITIDO',
      });
    }
  }

  // Si no hay Origin ni Referer en un método mutable desde un navegador
  return res.status(403).json({
    error: 'Falta cabecera de origen requerida para métodos mutables.',
    codigo: 'ORIGEN_AUSENTE',
  });
}

/**
 * Genera un token CSRF firmado con HMAC SHA-256 para el usuario autenticado.
 * Formato: `<timestamp>.<hmac>`
 * @param {string|number} usuarioId
 * @returns {string}
 */
function generarTokenCsrf(usuarioId) {
  const secreto = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (!secreto) {
    throw new Error('[Seguridad] Se requiere CSRF_SECRET o JWT_SECRET para generar tokens CSRF.');
  }

  const timestamp = Date.now().toString();
  const datos = `${usuarioId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', secreto).update(datos).digest('hex');
  return `${timestamp}.${hmac}`;
}

/**
 * Capa 3: Valida el token CSRF recibido en la cabecera X-CSRF-Token contra el usuario autenticado.
 * Utiliza comparación en tiempo constante (timingSafeEqual) para mitigar ataques de canal lateral (timing attacks).
 */
function verificarCsrf(req, res, next) {
  if (!METODOS_MUTABLES.has(req.method)) {
    return next();
  }

  // Rutas públicas de autenticación donde el usuario aún no posee sesión
  if (req.path === '/login' || req.path === '/registro' || req.path === '/auth/login' || req.path === '/auth/registro') {
    return next();
  }

  const tokenRecibido = req.headers['x-csrf-token'];
  if (!tokenRecibido || typeof tokenRecibido !== 'string') {
    return res.status(403).json({
      error: 'Falta el token anti-CSRF en la cabecera X-CSRF-Token.',
      codigo: 'CSRF_TOKEN_AUSENTE',
    });
  }

  const partes = tokenRecibido.split('.');
  if (partes.length !== 2) {
    return res.status(403).json({
      error: 'Formato de token anti-CSRF inválido.',
      codigo: 'CSRF_TOKEN_INVALIDO',
    });
  }

  const [timestampStr, hmacRecibido] = partes;
  const timestamp = parseInt(timestampStr, 10);

  // Validar vigencia temporal
  if (Number.isNaN(timestamp) || Date.now() - timestamp > VIGENCIA_CSRF_MS || timestamp > Date.now() + 60000) {
    return res.status(403).json({
      error: 'El token anti-CSRF ha expirado. Recarga la página o reanuda sesión.',
      codigo: 'CSRF_TOKEN_EXPIRADO',
    });
  }

  // El middleware authMiddleware debe haberse ejecutado previamente para contar con req.usuario
  const usuarioId = req.usuario?.id;
  if (!usuarioId) {
    return res.status(401).json({
      error: 'No se puede verificar CSRF sin una sesión autenticada válida.',
      codigo: 'TOKEN_AUSENTE',
    });
  }

  const secreto = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  const datos = `${usuarioId}:${timestampStr}`;
  const hmacEsperado = crypto.createHmac('sha256', secreto).update(datos).digest('hex');

  // Comparación en tiempo constante segura contra timing attacks
  const bufRecibido = Buffer.from(hmacRecibido);
  const bufEsperado = Buffer.from(hmacEsperado);

  if (bufRecibido.length !== bufEsperado.length || !crypto.timingSafeEqual(bufRecibido, bufEsperado)) {
    return res.status(403).json({
      error: 'Token anti-CSRF inválido o adulterado.',
      codigo: 'CSRF_TOKEN_INVALIDO',
    });
  }

  return next();
}

module.exports = {
  verificarOrigen,
  generarTokenCsrf,
  verificarCsrf,
};

