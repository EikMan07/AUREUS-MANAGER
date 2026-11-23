// backend/src/middlewares/roleMiddleware.js
// Guardián de autorización por rol en servidor con denegación por defecto.

export function requiereRol(...rolesPermitidos) {
  const permitidos = new Set(
    rolesPermitidos
      .flat()
      .map((r) => String(r || '').trim().toUpperCase())
      .filter(Boolean)
  );

  return function roleGuard(req, res, next) {
    const user = req.user || req.usuario;
    if (!user || !user.id) {
      return res.status(401).json({
        ok: false,
        success: false,
        status: 401,
        error: 'No autenticado',
        userMessage: 'Debes iniciar sesión para continuar.',
      });
    }

    const rolActual = String(user.rol || '').trim().toUpperCase();
    if (!rolActual || !permitidos.has(rolActual)) {
      return res.status(403).json({
        ok: false,
        success: false,
        status: 403,
        error: 'Acceso denegado',
        userMessage: 'No cuentas con permisos para realizar esta acción.',
      });
    }

    return next();
  };
}

export const requiereCobrador = requiereRol('COBRADOR');
export const requiereAdmin = requiereRol('ADMINISTRADOR');

export default {
  requiereRol,
  requiereCobrador,
  requiereAdmin,
};
