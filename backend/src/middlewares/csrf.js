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

export function getAllowedOrigins() {
  const configured = [process.env.FRONTEND_URL, process.env.ALLOWED_ORIGINS]
    .filter(Boolean)
    .flatMap((raw) => String(raw).split(','))
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

export function getAllowedOriginsList() {
  return Array.from(getAllowedOrigins());
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

function hasSessionCookie(req) {
  if (req?.cookies?.sid || req?.cookies?.['__Host-sid']) {
    return true;
  }
  const rawCookieHeader = String(req?.headers?.cookie || '');
  return /(?:^|;\s*)(?:__Host-)?sid=[^;\s]+/.test(rawCookieHeader);
}

export function verificarOrigen(req, res, next) {
  if (!MUTABLE_METHODS.has(req.method)) return next();

  const originHeader = req.get('origin');
  const refererHeader = req.get('referer');
  const allowed = getAllowedOrigins();

  if (originHeader) {
    const normalizedOrigin = String(originHeader).trim().replace(/\/+$/, '');
    if (allowed.has(normalizedOrigin)) {
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

  if (refererHeader) {
    let refererOrigin = '';
    try {
      refererOrigin = new URL(refererHeader).origin;
    } catch {
      refererOrigin = '';
    }
    if (refererOrigin && allowed.has(refererOrigin)) {
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

  if (hasSessionCookie(req)) {
    return res.status(403).json({
      ok: false,
      success: false,
      status: 403,
      codigo: 'ORIGEN_NO_VERIFICADO',
      error: 'Origen no verificado',
      userMessage: 'No fue posible verificar el origen de tu solicitud.',
    });
  }

  return next();
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
  getAllowedOrigins,
  getAllowedOriginsList,
  generarTokenCsrf,
  validarTokenCsrf,
  verificarOrigen,
  verificarCsrf,
};

