import { Router } from 'express';
import { lookupHacienda } from '../controllers/haciendaController.js';

const router = Router();

router.get('/:cedula', lookupHacienda);

export default router;
