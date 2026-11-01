import { Router } from 'express';
import {
  getClientes,
  createCliente,
  updateCliente,
  enviarPapelera,
  enviarListaNegra
} from '../controllers/clientesController.js';

const router = Router();

router.get('/', getClientes);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.post('/:id/papelera', enviarPapelera);
router.post('/:id/lista-negra', enviarListaNegra);

export default router;
