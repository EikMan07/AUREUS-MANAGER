import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import {
  getResumenPlataforma,
  getPrestamistas,
  crearPrestamistaAdmin,
  editarPrestamistaAdmin,
  cambiarEstadoPrestamistaAdmin,
  restablecerPasswordPrestamistaAdmin,
  eliminarPrestamistaAdmin,
  getResumenAntecedentesPorPrestamista,
  depurarAntecedentesPrestamista,
  getBitacoraAuditoriaAdmin,
  limpiarAuditoriaAdmin
} from '../controllers/adminController.js';

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/resumen', getResumenPlataforma);
router.get('/prestamistas', getPrestamistas);
router.post('/prestamistas', crearPrestamistaAdmin);
router.put('/prestamistas/:id', editarPrestamistaAdmin);
router.patch('/prestamistas/:id/estado', cambiarEstadoPrestamistaAdmin);
router.post('/prestamistas/:id/password', restablecerPasswordPrestamistaAdmin);
router.delete('/prestamistas/:id', eliminarPrestamistaAdmin);
router.get('/depuracion/antecedentes', getResumenAntecedentesPorPrestamista);
router.delete('/depuracion/antecedentes/:targetId', depurarAntecedentesPrestamista);
router.get('/auditoria', getBitacoraAuditoriaAdmin);
router.delete('/auditoria/limpiar', limpiarAuditoriaAdmin);

export default router;
