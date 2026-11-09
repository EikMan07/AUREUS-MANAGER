import jwt from 'jsonwebtoken';

const EXPIRA = process.env.JWT_EXPIRES_IN || '25m';

export const firmarToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario.id,
      usuario: usuario.usuario,
      rol: usuario.rol,
      correo: usuario.correo
    },
    process.env.JWT_SECRET || 'cobro_firme_super_secret_jwt_key_2026_secure_production_token',
    { expiresIn: EXPIRA }
  );
};

export const authMiddleware = (req, res, next) => {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');

  // MODO PASARELA ABIERTA (PERMISIVO):
  // Si no se envía token o mientras no se haya activado el Login en el frontend,
  // inyecta el usuario administrador por defecto y permite continuar sin bloquear.
  if (tipo !== 'Bearer' || !token) {
    req.user = {
      id: 'ca496c63-9976-4ec6-8360-58d0e180cce2',
      usuario: 'admin',
      rol: 'ADMINISTRADOR',
      nombre_completo: 'Administrador Cobro-Firme'
    };
    req.usuario = req.user;
    return next();
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'cobro_firme_super_secret_jwt_key_2026_secure_production_token'
    );
    req.usuario = payload;
    req.user = payload;
    // Renovación deslizante: reinicia los 25 min de inactividad
    res.setHeader('x-access-token', firmarToken(payload));
    return next();
  } catch (error) {
    // Si el token es inválido o expiró pero estamos en modo permisivo inicial,
    // inyecta el usuario por defecto para no bloquear las rutas actuales.
    req.user = {
      id: 'ca496c63-9976-4ec6-8360-58d0e180cce2',
      usuario: 'admin',
      rol: 'ADMINISTRADOR',
      nombre_completo: 'Administrador Cobro-Firme'
    };
    req.usuario = req.user;
    return next();
  }
};

export default authMiddleware;

