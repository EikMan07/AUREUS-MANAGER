import { Router } from 'express';
import { getResumenRapido, postConsultarSeneca } from '../controllers/senecaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/resumen-rapido', getResumenRapido);
router.post('/consultar', postConsultarSeneca);

export default router;

