import { Router } from 'express';
import { lookupHacienda } from '../controllers/haciendaController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requiereCobrador } from '../middlewares/roleMiddleware.js';

const router = Router();
router.use(authMiddleware);
router.use(requiereCobrador);

router.get('/:cedula', lookupHacienda);

export default router;
