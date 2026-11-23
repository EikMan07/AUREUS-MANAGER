import { Router } from 'express';
import {
  getClientes,
  consultarHistorialArchivo,
  listarAntecedentesArchivados,
  eliminarAntecedenteCliente,
  eliminarPrestamoAntecedenteIndividual,
  createCliente,
  updateCliente,
  enviarPapelera,
  enviarListaNegra
} from '../controllers/clientesController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requiereCobrador } from '../middlewares/roleMiddleware.js';

const router = Router();
router.use(authMiddleware);
router.use(requiereCobrador);

router.get('/', getClientes);
router.get('/historial-archivo/consultar', consultarHistorialArchivo);
router.get('/historial-archivo/lista', listarAntecedentesArchivados);
router.delete('/historial-archivo/prestamo/:prestamoArchivoId', eliminarPrestamoAntecedenteIndividual);
router.delete('/historial-archivo/:archivoId', eliminarAntecedenteCliente);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.post('/:id/papelera', enviarPapelera);
router.post('/:id/lista-negra', enviarListaNegra);

export default router;
