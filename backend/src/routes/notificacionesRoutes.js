import { Router } from 'express';
import { getNotificaciones, marcarNotificacionVista } from '../controllers/notificacionesController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getNotificaciones);
router.post('/marcar-vista', marcarNotificacionVista);

export default router;
