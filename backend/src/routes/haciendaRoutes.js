import { Router } from 'express';
import { lookupHacienda } from '../controllers/haciendaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/:cedula', lookupHacienda);

export default router;
