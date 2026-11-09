import { Router } from 'express';
import {
  getResumenMetricas,
  getResumenTendencia
} from '../controllers/resumenController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

// GET /api/resumen - Métricas generales y distribución circular de clientes
router.get('/', getResumenMetricas);

// GET /api/resumen/tendencia - Serie temporal interactiva de cobros
router.get('/tendencia', getResumenTendencia);

export default router;
