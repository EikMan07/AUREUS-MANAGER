import crypto from 'node:crypto';
import { SESSION_MAX_AGE_MS } from '../utils/cookies.js';

const MUTABLE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getCsrfSecret() {
  const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Falta CSRF_SECRET o JWT_SECRET en las variables de entorno.');
  }
  return secret;
}

function getAllowedOrigins() {
  const configured = String(process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const defaults =
    process.env.NODE_ENV === 'production'
      ? []
      : [
          'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:5000',
          'http://127.0.0.1:5000',
        ];

  return new Set([...configured, ...defaults]);
}

function extractOriginFromHeader(headerVal) {
  if (!headerVal || typeof headerVal !== 'string') return '';
  try {
    return new URL(headerVal).origin;
  } catch {
    return headerVal.trim().replace(/\/+$/, '');
  }
}

export function generarTokenCsrf(userId) {
  const timestamp = String(Date.now());
  const payload = `${String(userId)}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', getCsrfSecret()).update(payload).digest('hex');
  return `${timestamp}.${hmac}`;
}

export function validarTokenCsrf(token, userId) {
  if (!token || typeof token !== 'string' || !userId) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestampStr, receivedHmac] = parts;
  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp) || !receivedHmac) return false;

  const ageMs = Date.now() - timestamp;
  if (ageMs < -60_000 || ageMs > SESSION_MAX_AGE_MS + 60_000) {
    return false;
  }

  const expectedHmac = crypto
    .createHmac('sha256', getCsrfSecret())
    .update(`${String(userId)}:${timestampStr}`)
    .digest('hex');

  const receivedBuf = Buffer.from(receivedHmac, 'utf8');
  const expectedBuf = Buffer.from(expectedHmac, 'utf8');
  if (receivedBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(receivedBuf, expectedBuf);
}

export function verificarOrigen(req, res, next) {
  if (!MUTABLE_METHODS.has(req.method)) return next();

  const rawOrigin = req.headers.origin;
  const rawReferer = req.headers.referer;

  if (!rawOrigin && !rawReferer) {
    return next();
  }

  const allowed = getAllowedOrigins();
  const requestOrigin = extractOriginFromHeader(rawOrigin || rawReferer);
  const hostOrigin = req.headers.host ? `${req.protocol}://${req.headers.host}` : '';

  if (allowed.has(requestOrigin) || (hostOrigin && requestOrigin === hostOrigin)) {
    return next();
  }

  return res.status(403).json({
    ok: false,
    success: false,
    status: 403,
    codigo: 'ORIGEN_NO_PERMITIDO',
    error: 'Origen no autorizado',
    userMessage: 'La solicitud proviene de un origen no autorizado.',
  });
}

export function verificarCsrf(req, res, next) {
  if (!MUTABLE_METHODS.has(req.method)) return next();

  // Solo exigimos X-CSRF-Token cuando la sesión se autentica mediante cookie (navegador)
  if (req.authTransport !== 'cookie') {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'];
  const userId = req.user?.id || req.usuario?.id;

  if (!validarTokenCsrf(csrfToken, userId)) {
    return res.status(403).json({
      ok: false,
      success: false,
      status: 403,
      codigo: 'CSRF_TOKEN_INVALIDO',
      error: 'Validación de seguridad requerida',
      userMessage: 'Tu sesión de seguridad requiere actualizar la página para continuar.',
    });
  }

  return next();
}

export default {
  generarTokenCsrf,
  validarTokenCsrf,
  verificarOrigen,
  verificarCsrf,
};

