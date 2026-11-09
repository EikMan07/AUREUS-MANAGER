import { Router } from 'express';
import {
  getCobros,
  registrarPago,
  pasarCobro,
  registrarNoPago
} from '../controllers/cobrosController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getCobros);
router.post('/:id/pago', registrarPago);
router.post('/:id/pasar', pasarCobro);
router.post('/:id/no-pago', registrarNoPago);

export default router;
