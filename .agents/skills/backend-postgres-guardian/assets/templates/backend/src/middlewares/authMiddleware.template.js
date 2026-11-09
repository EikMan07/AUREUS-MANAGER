'use strict';
// Verifica Authorization: Bearer <token>. Sin token o token inválido/expirado -> 401.
// EXPIRACIÓN POR INACTIVIDAD: cada petición autenticada recibe un token nuevo (header x-access-token)
// con otros 25 min de vida. Si pasan 25 min sin ninguna petición, el token expira y el front vuelve al login.
const jwt = require('jsonwebtoken');

const EXPIRA = process.env.JWT_EXPIRES_IN || '25m';

const firmarToken = (usuario) =>
  jwt.sign({ id: usuario.id, email: usuario.email }, process.env.JWT_SECRET, { expiresIn: EXPIRA });

const authMiddleware = (req, res, next) => {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Falta el token de autenticación', codigo: 'TOKEN_AUSENTE' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { id: payload.id, email: payload.email };
    // Renovación deslizante: reinicia los 25 min de inactividad.
    res.setHeader('x-access-token', firmarToken(payload));
    return next();
  } catch (error) {
    const expirado = error.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expirado ? 'La sesión expiró por inactividad. Inicia sesión de nuevo.' : 'Token inválido',
      codigo: expirado ? 'TOKEN_EXPIRADO' : 'TOKEN_INVALIDO',
    });
  }
};

module.exports = authMiddleware;
module.exports.firmarToken = firmarToken;
