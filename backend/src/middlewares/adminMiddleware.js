// backend/src/middlewares/adminMiddleware.js
// Middleware RBAC estricto: restringe rutas /api/admin exclusivamente al usuario con rol ADMINISTRADOR.

export function adminMiddleware(req, res, next) {
  const user = req.user || req.usuario;
  if (!user || user.rol !== 'ADMINISTRADOR') {
    return res.status(403).json({
      ok: false,
      success: false,
      status: 403,
      error: 'FORBIDDEN',
      userMessage: 'Acceso exclusivo para la administración de la plataforma.',
    });
  }
  return next();
}

export default adminMiddleware;
