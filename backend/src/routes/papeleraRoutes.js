import { Router } from 'express';
import {
  getPapelera,
  restaurarPrestamo,
  eliminarPrestamoDefinitivo,
  restaurarCliente,
  eliminarDefinitivo,
  vaciarPapelera,
} from '../controllers/papeleraController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getPapelera);
router.post('/prestamo/:prestamoId/restaurar', restaurarPrestamo);
router.delete('/prestamo/:prestamoId', eliminarPrestamoDefinitivo);
router.post('/vaciar', vaciarPapelera);
router.delete('/', vaciarPapelera);
router.post('/:id/restaurar', restaurarCliente);
router.delete('/:id', eliminarDefinitivo);

export default router;
