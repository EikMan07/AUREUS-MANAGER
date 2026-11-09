import { Router } from 'express';
import {
  getPrestamos,
  createPrestamo,
  renovarPrestamo,
  arregloPagoPrestamo,
  eliminarPrestamos
} from '../controllers/prestamosController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getPrestamos);
router.post('/', createPrestamo);
router.post('/eliminar-lote', eliminarPrestamos);
router.post('/:id/renovar', renovarPrestamo);
router.post('/:id/arreglo', arregloPagoPrestamo);
router.delete('/:id', eliminarPrestamos);

export default router;
