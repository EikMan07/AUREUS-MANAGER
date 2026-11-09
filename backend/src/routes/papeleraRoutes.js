import { Router } from 'express';
import {
  getPapelera,
  restaurarCliente,
  eliminarDefinitivo,
  vaciarPapelera
} from '../controllers/papeleraController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getPapelera);
router.post('/:id/restaurar', restaurarCliente);
router.delete('/:id', eliminarDefinitivo);
router.delete('/', vaciarPapelera);
router.post('/vaciar', vaciarPapelera);

export default router;
