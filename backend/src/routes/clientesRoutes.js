import { Router } from 'express';
import {
  getClientes,
  consultarHistorialArchivo,
  createCliente,
  updateCliente,
  enviarPapelera,
  enviarListaNegra
} from '../controllers/clientesController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getClientes);
router.get('/historial-archivo/consultar', consultarHistorialArchivo);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.post('/:id/papelera', enviarPapelera);
router.post('/:id/lista-negra', enviarListaNegra);

export default router;
