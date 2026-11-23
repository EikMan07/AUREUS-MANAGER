import crypto from 'node:crypto';

export const SESSION_MAX_AGE_MS = 25 * 60 * 1000;
export const OAUTH_TX_MAX_AGE_MS = 10 * 60 * 1000;
export const OAUTH_TX_COOKIE_NAME =
  process.env.NODE_ENV === 'production' ? '__Host-oauth_tx' : 'oauth_tx';

export function getCookieName() {
  return process.env.NODE_ENV === 'production' ? '__Host-sid' : 'sid';
}

export function getOAuthTxCookieName() {
  return process.env.NODE_ENV === 'production' ? '__Host-oauth_tx' : 'oauth_tx';
}

function getOAuthTxKey() {
  const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Falta CSRF_SECRET o JWT_SECRET para cifrar la transacción OAuth.');
  }
  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encryptOAuthTx(payload) {
  const key = getOAuthTxKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptOAuthTx(encoded) {
  if (!encoded || typeof encoded !== 'string') return null;
  const parts = encoded.split('.');
  if (parts.length !== 3) return null;

  try {
    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const encrypted = Buffer.from(dataB64, 'base64url');

    if (iv.length !== 12 || tag.length !== 16 || encrypted.length === 0) {
      return null;
    }

    const key = getOAuthTxKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const payload = JSON.parse(decrypted.toString('utf8'));

    if (!payload || typeof payload !== 'object' || typeof payload.exp !== 'number') {
      return null;
    }
    if (Date.now() >= payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  const secure = isProd || process.env.COOKIE_SECURE === 'true';
  const sameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  const cookieName = getCookieName();

  if (isProd && !secure) {
    throw new Error('Configuración insegura: COOKIE_SECURE debe ser true cuando NODE_ENV=production.');
  }
  if (sameSite === 'none' && !secure) {
    throw new Error('Configuración insegura: SameSite=None exige Secure=true.');
  }
  if (cookieName.startsWith('__Host-') && !secure) {
    throw new Error('Configuración insegura: la cookie __Host-sid exige Secure=true.');
  }

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
}

export function setSessionCookie(res, token) {
  const cookieName = getCookieName();
  const baseOptions = getCookieOptions();
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: baseOptions.secure,
    sameSite: baseOptions.sameSite,
    path: '/',
    maxAge: SESSION_MAX_AGE_MS,
  });
}

export function clearSessionCookie(res) {
  const baseOptions = getCookieOptions();
  const clearOpts = {
    httpOnly: true,
    secure: baseOptions.secure,
    sameSite: baseOptions.sameSite,
    path: '/',
  };
  res.clearCookie('sid', clearOpts);
  res.clearCookie('__Host-sid', clearOpts);
}

export function extractSessionCookie(req) {
  if (!req?.cookies) return null;
  const primaryName = getCookieName();
  return req.cookies[primaryName] || req.cookies['__Host-sid'] || req.cookies.sid || null;
}

export function setOAuthTxCookie(res, payload) {
  const cookieName = getOAuthTxCookieName();
  const baseOptions = getCookieOptions();
  const encoded = encryptOAuthTx(payload);
  res.cookie(cookieName, encoded, {
    httpOnly: true,
    secure: baseOptions.secure,
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_TX_MAX_AGE_MS,
  });
}

export function clearOAuthTxCookie(res) {
  const baseOptions = getCookieOptions();
  const clearOpts = {
    httpOnly: true,
    secure: baseOptions.secure,
    sameSite: 'lax',
    path: '/',
  };
  res.clearCookie('oauth_tx', clearOpts);
  res.clearCookie('__Host-oauth_tx', clearOpts);
}

export function readOAuthTxCookie(req) {
  if (!req?.cookies) return null;
  const primaryName = getOAuthTxCookieName();
  const raw =
    req.cookies[primaryName] || req.cookies['__Host-oauth_tx'] || req.cookies.oauth_tx || null;
  return decryptOAuthTx(raw);
}

export default {
  SESSION_MAX_AGE_MS,
  OAUTH_TX_MAX_AGE_MS,
  OAUTH_TX_COOKIE_NAME,
  getCookieName,
  getOAuthTxCookieName,
  getCookieOptions,
  setSessionCookie,
  clearSessionCookie,
  extractSessionCookie,
  setOAuthTxCookie,
  clearOAuthTxCookie,
  readOAuthTxCookie,
};

