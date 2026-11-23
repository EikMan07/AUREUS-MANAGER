import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import {
  extractSessionCookie,
  setSessionCookie,
  clearSessionCookie,
} from '../utils/cookies.js';
import {
  generarTokenCsrf,
  verificarCsrf,
} from './csrf.js';
import { redactarPII } from '../utils/piiRedactor.js';

export const JWT_ISSUER = process.env.JWT_ISSUER || 'aureus-manager-api';
export const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'aureus-manager-web';
export const JWT_ALGORITHM = 'HS256';
export const MAX_SESSION_HOURS = Math.max(1, Number(process.env.SESSION_MAX_HOURS || 12));
export const MAX_SESSION_AGE_MS = MAX_SESSION_HOURS * 60 * 60 * 1000;
export const ROLES_VALIDOS = new Set(['COBRADOR', 'ADMINISTRADOR']);

const EXPIRA = process.env.JWT_EXPIRES_IN || '25m';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Falta JWT_SECRET en las variables de entorno.');
  }
  return secret;
}

export const firmarToken = (usuario, opciones = {}) => {
  const userId = usuario?.id;
  const rolNormalizado = String(usuario?.rol || '').trim().toUpperCase();

  if (!userId || !ROLES_VALIDOS.has(rolNormalizado)) {
    const err = new Error('No fue posible emitir credenciales de sesión para el perfil indicado.');
    err.statusCode = 403;
    throw err;
  }

  const userName = usuario.usuario || usuario.username;
  const rawTv = Number(usuario.token_version ?? usuario.tv ?? 1);
  const tokenVersion = Number.isInteger(rawTv) && rawTv > 0 ? rawTv : 1;
  const rawStart = Number(opciones.sessionStartedAt ?? usuario.sessionStartedAt ?? Date.now());
  const sessionStartedAt = Number.isFinite(rawStart) && rawStart > 0 ? rawStart : Date.now();

  return jwt.sign(
    {
      id: userId,
      username: userName,
      usuario: userName,
      rol: rolNormalizado,
      tv: tokenVersion,
      sessionStartedAt,
    },
    getJwtSecret(),
    { algorithm: JWT_ALGORITHM, issuer: JWT_ISSUER, audience: JWT_AUDIENCE, expiresIn: EXPIRA }
  );
};

export const authMiddleware = async (req, res, next) => {
  const cookieToken = extractSessionCookie(req);
  let token = cookieToken;
  let authTransport = cookieToken ? 'cookie' : null;

  if (!token) {
    const cabecera = req.headers.authorization || '';
    const [tipo, bearerToken] = cabecera.split(' ');
    if (tipo === 'Bearer' && bearerToken) {
      token = bearerToken.trim();
      authTransport = 'bearer';
    }
  }

  if (!token) {
    return res.status(401).json({
      ok: false,
      success: false,
      status: 401,
      codigo: 'TOKEN_AUSENTE',
      error: 'No autorizado',
      userMessage: 'Debes iniciar sesión para acceder a esta información.',
    });
  }

  try {
    const jwtSecret = getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    const startedAt = Number(decoded?.sessionStartedAt);
    if (!Number.isFinite(startedAt) || startedAt <= 0 || Date.now() - startedAt > MAX_SESSION_AGE_MS) {
      clearSessionCookie(res);
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        codigo: 'SESION_MAXIMA_ALCANZADA',
        error: 'No autorizado',
        userMessage: 'Tu sesión ha alcanzado el tiempo máximo permitido. Inicia sesión nuevamente.',
      });
    }

    const userId = decoded?.id;
    const tokenVersion = Number(decoded?.tv);
    if (!userId || !Number.isInteger(tokenVersion) || tokenVersion <= 0) {
      clearSessionCookie(res);
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        codigo: 'TOKEN_INVALIDO',
        error: 'No autorizado',
        userMessage: 'Tu sesión ya no es válida. Inicia sesión nuevamente.',
      });
    }

    const { rows } = await query(
      `SELECT id,
              usuario,
              nombre_completo,
              correo,
              rol::text AS rol,
              estado_cuenta::text AS estado_cuenta,
              COALESCE(token_version, 1) AS token_version
       FROM usuarios
       WHERE id = $1::uuid
       LIMIT 1;`,
      [userId]
    );

    const dbUser = rows[0];
    const dbRol = String(dbUser?.rol || '').trim().toUpperCase();
    const dbTv = Number(dbUser?.token_version ?? 1);

    if (
      !dbUser ||
      dbUser.estado_cuenta !== 'ACTIVA' ||
      !ROLES_VALIDOS.has(dbRol) ||
      dbTv !== tokenVersion
    ) {
      clearSessionCookie(res);
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        codigo: 'SESION_REVOCADA',
        error: 'No autorizado',
        userMessage: 'Tu sesión ya no es válida. Inicia sesión nuevamente.',
      });
    }

    const userContext = {
      id: dbUser.id,
      username: dbUser.usuario,
      usuario: dbUser.usuario,
      nombre_completo: dbUser.nombre_completo,
      correo: dbUser.correo,
      rol: dbRol,
      estado_cuenta: dbUser.estado_cuenta,
      token_version: dbTv,
      tv: dbTv,
      sessionStartedAt: startedAt,
    };

    req.user = userContext;
    req.usuario = userContext;
    req.authTransport = authTransport;

    return verificarCsrf(req, res, () => {
      const requestPath = String(req.originalUrl || '').split('?')[0];
      if (
        authTransport === 'cookie' &&
        requestPath !== '/api/auth/logout' &&
        requestPath !== '/api/auth/password'
      ) {
        const refreshedToken = firmarToken(userContext, { sessionStartedAt: startedAt });
        setSessionCookie(res, refreshedToken);
        res.setHeader('X-CSRF-Token', generarTokenCsrf(userContext.id));
      }
      return next();
    });
  } catch (error) {
    const isJwtError =
      error?.name === 'TokenExpiredError' ||
      error?.name === 'JsonWebTokenError' ||
      error?.name === 'NotBeforeError';

    if (isJwtError) {
      const isExpired = error?.name === 'TokenExpiredError';
      clearSessionCookie(res);
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        codigo: isExpired ? 'TOKEN_EXPIRADO' : 'TOKEN_INVALIDO',
        error: 'No autorizado',
        userMessage: isExpired
          ? 'Tu sesión expiró por inactividad. Inicia sesión de nuevo.'
          : 'Debes iniciar sesión para acceder a esta información.',
      });
    }

    console.error(redactarPII(`[AuthMiddleware] Error verificando sesión: ${error?.message || error}`));
    return res.status(500).json({
      ok: false,
      success: false,
      status: 500,
      error: 'Error de validación',
      userMessage: 'No fue posible verificar tu sesión en este momento.',
    });
  }
};

export default authMiddleware;
