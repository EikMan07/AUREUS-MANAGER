export const SESSION_MAX_AGE_MS = 25 * 60 * 1000;

export function getCookieName() {
  return process.env.NODE_ENV === 'production' ? '__Host-sid' : 'sid';
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

export default {
  SESSION_MAX_AGE_MS,
  getCookieName,
  getCookieOptions,
  setSessionCookie,
  clearSessionCookie,
  extractSessionCookie,
};

