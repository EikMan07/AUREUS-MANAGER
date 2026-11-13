import jwt from 'jsonwebtoken';
import {
  extractSessionCookie,
  setSessionCookie,
} from '../utils/cookies.js';
import {
  generarTokenCsrf,
  verificarCsrf,
} from './csrf.js';

const EXPIRA = process.env.JWT_EXPIRES_IN || '25m';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Falta JWT_SECRET en las variables de entorno (.env).');
  }
  return secret;
}

export const firmarToken = (usuario) => {
  const userName = usuario.usuario || usuario.username;
  return jwt.sign(
    {
      id: usuario.id,
      username: userName,
      usuario: userName,
      rol: usuario.rol || 'ADMINISTRADOR',
    },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: EXPIRA }
  );
};

export const authMiddleware = (req, res, next) => {
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
    const payload = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
    });

    req.user = payload;
    req.usuario = payload;
    req.authTransport = authTransport;

    return verificarCsrf(req, res, () => {
      if (authTransport === 'cookie') {
        const refreshedToken = firmarToken(payload);
        setSessionCookie(res, refreshedToken);
        res.setHeader('X-CSRF-Token', generarTokenCsrf(payload.id));
      }
      return next();
    });
  } catch (error) {
    const isExpired = error?.name === 'TokenExpiredError';
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
};

export default authMiddleware;
