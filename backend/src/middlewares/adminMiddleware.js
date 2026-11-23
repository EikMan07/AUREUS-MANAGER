// backend/src/middlewares/adminMiddleware.js
// Middleware RBAC estricto: restringe rutas /api/admin exclusivamente al usuario con rol ADMINISTRADOR.
import { requiereAdmin } from './roleMiddleware.js';

export const adminMiddleware = requiereAdmin;
export default adminMiddleware;
