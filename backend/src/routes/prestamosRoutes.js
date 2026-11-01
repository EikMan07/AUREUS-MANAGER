import { Router } from 'express';
import {
  getPrestamos,
  createPrestamo,
  renovarPrestamo,
  arregloPagoPrestamo
} from '../controllers/prestamosController.js';

const router = Router();

router.get('/', getPrestamos);
router.post('/', createPrestamo);
router.post('/:id/renovar', renovarPrestamo);
router.post('/:id/arreglo', arregloPagoPrestamo);

export default router;
