import { Router } from 'express';
import {
  getCobros,
  registrarPago,
  pasarCobro,
  registrarNoPago
} from '../controllers/cobrosController.js';

const router = Router();

router.get('/', getCobros);
router.post('/:id/pago', registrarPago);
router.post('/:id/pasar', pasarCobro);
router.post('/:id/no-pago', registrarNoPago);

export default router;
