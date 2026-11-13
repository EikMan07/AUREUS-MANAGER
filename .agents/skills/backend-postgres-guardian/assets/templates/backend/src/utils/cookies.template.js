'use strict';
/**
 * src/utils/cookies.js — Única fuente de verdad para la cookie de sesión.
 *
 * Configuración reforzada conforme a OWASP ASVS v4 (V3.4), OWASP WSTG-SESS-02 y RFC 6265bis:
 * - Nombre __Host-sid en producción (exige HTTPS, sin Domain, Path=/).
 * - HttpOnly: inaccesible para JavaScript (mitiga exfiltración XSS).
 * - Secure: transmitida exclusivamente sobre TLS/HTTPS (excepción localhost en desarrollo).
 * - SameSite: 'lax' (o 'strict') para mitigar CSRF.
 * - Sin atributo Domain para comportarse como Host-Only Cookie.
 * - Expiración deslizante: maxAge en milisegundos (25 minutos).
 */

const DURACION_SESION_MS = 25 * 60 * 1000; // 25 minutos

/**
 * Retorna el nombre normativo de la cookie de sesión según el entorno.
 * En producción se exige el prefijo __Host- para fijar la cookie al host y exigir HTTPS.
 */
function getCookieName() {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) return '__Host-sid';
  return process.env.COOKIE_NAME || 'sid';
}

/**
 * Retorna las opciones normativas de la cookie de sesión.
 * NOTA: Deliberadamente NO se incluye la propiedad 'domain' para que el navegador
 * la trate como Host-Only Cookie, bloqueando la manipulación desde subdominios.
 */
function getCookieOptions(maxAgeMs = DURACION_SESION_MS) {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  // En producción secure es true por defecto; si se desactiva explícitamente se evaluará en validarConfiguracionCookies
  const secure = process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === 'true'
    : isProd;

  const opciones = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };

  if (typeof maxAgeMs === 'number' && maxAgeMs > 0) {
    opciones.maxAge = maxAgeMs;
  }

  return opciones;
}

/**
 * Valida combinaciones de configuración inseguras al arrancar el backend (Fail-Fast).
 * Lanza un error fatal si se detecta una configuración que vulnere las especificaciones.
 */
function validarConfiguracionCookies() {
  const isProd = process.env.NODE_ENV === 'production';
  const nombre = getCookieName();
  const opciones = getCookieOptions();

  if (isProd && !opciones.secure) {
    throw new Error('[Seguridad Crítica] En NODE_ENV=production la cookie de sesión exige Secure=true.');
  }

  if (opciones.sameSite === 'none' && !opciones.secure) {
    throw new Error('[Seguridad Crítica] SameSite=None exige obligatoriamente Secure=true (RFC 6265bis).');
  }

  if (nombre.startsWith('__Host-') && !opciones.secure) {
    throw new Error('[Seguridad Crítica] El prefijo __Host- exige obligatoriamente Secure=true (WSTG-SESS-02).');
  }

  if (nombre.startsWith('__Secure-') && !opciones.secure) {
    throw new Error('[Seguridad Crítica] El prefijo __Secure- exige obligatoriamente Secure=true.');
  }
}

/**
 * Emite la cookie de sesión con el token JWT y el tiempo de expiración normativo.
 * @param {import('express').Response} res
 * @param {string} token
 */
function setCookieSesion(res, token) {
  const nombre = getCookieName();
  const opciones = getCookieOptions();
  res.cookie(nombre, token, opciones);
}

/**
 * Elimina la cookie de sesión en el navegador.
 * IMPORTANTE: Para que el navegador la borre efectivamente, las opciones
 * (path, secure, sameSite) deben coincidir exactamente con las usadas al emitirla.
 * @param {import('express').Response} res
 */
function clearCookieSesion(res) {
  const nombre = getCookieName();
  const opciones = getCookieOptions(0);
  delete opciones.maxAge; // res.clearCookie sobreescribe internamente la expiración al pasado

  res.clearCookie(nombre, opciones);
}

module.exports = {
  DURACION_SESION_MS,
  getCookieName,
  getCookieOptions,
  validarConfiguracionCookies,
  setCookieSesion,
  clearCookieSesion,
};
