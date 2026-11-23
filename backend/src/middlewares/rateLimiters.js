import rateLimit from 'express-rate-limit';

function createLimiter({ windowMs, max, skipSuccessfulRequests = false, skip, userMessage }) {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip,
    handler: (_req, res) =>
      res.status(429).json({
        ok: false,
        success: false,
        status: 429,
        codigo: 'LIMITE_PETICIONES',
        error: 'Demasiadas solicitudes',
        userMessage,
      }),
  });
}

export const loginRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: Math.max(1, Number(process.env.RATE_LIMIT_LOGIN_MAX || 15)),
  skipSuccessfulRequests: true,
  userMessage: 'Demasiados intentos de acceso. Espera unos minutos antes de volver a intentarlo.',
});

export const registroRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: Math.max(1, Number(process.env.RATE_LIMIT_REGISTER_MAX || 10)),
  userMessage: 'Demasiados intentos de registro. Inténtalo nuevamente más tarde.',
});

export const passwordRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: Math.max(1, Number(process.env.RATE_LIMIT_PASSWORD_MAX || 10)),
  userMessage:
    'Demasiados intentos de cambio de contraseña. Espera unos minutos e inténtalo nuevamente.',
});

export const oauthRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: Math.max(1, Number(process.env.RATE_LIMIT_OAUTH_MAX || 30)),
  userMessage: 'Demasiados intentos de acceso. Espera unos minutos antes de volver a intentarlo.',
});

export const apiGlobalRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: Math.max(1, Number(process.env.RATE_LIMIT_GLOBAL_MAX || 400)),
  skip: (req) => req.path === '/health' || req.originalUrl === '/api/health',
  userMessage: 'Has realizado demasiadas solicitudes en poco tiempo. Espera un momento antes de continuar.',
});

export default {
  loginRateLimiter,
  registroRateLimiter,
  passwordRateLimiter,
  oauthRateLimiter,
  apiGlobalRateLimiter,
};
