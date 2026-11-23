// backend/src/routes/crmAdmin.routes.js
// Rutas REST del CRM Comercial y Campañas de Mercadeo (exclusivo para rol 'ADMINISTRADOR')

import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import {
  crearProspectoAdmin,
  listarProspectosAdmin,
  actualizarProspectoAdmin,
  eliminarProspectoAdmin,
  moverEtapaProspectoAdmin,
  consultarEmbudoAdmin,
  listarAtencionAdmin,
  generarMensajeProspectoAdminCtrl,
  listarCampanasAdmin,
  crearCampanaAdmin,
  actualizarCampanaAdmin,
  generarPiezasCampanaAdminCtrl,
  actualizarEstadoPiezaAdmin,
} from '../controllers/crmAdmin.controller.js';

const router = Router();

// Todas las rutas requieren autenticación y rol ADMINISTRADOR
router.use(authMiddleware);
router.use(adminMiddleware);

// Embudo de Adquisición de Prestamistas
router.post('/prospectos', crearProspectoAdmin);
router.get('/prospectos', listarProspectosAdmin);
router.put('/prospectos/:id', actualizarProspectoAdmin);
router.delete('/prospectos/:id', eliminarProspectoAdmin);
router.patch('/prospectos/:id/etapa', moverEtapaProspectoAdmin);
router.get('/embudo', consultarEmbudoAdmin);
router.get('/atencion', listarAtencionAdmin);
router.post('/prospectos/:id/mensaje', generarMensajeProspectoAdminCtrl);

// Campañas de Mercadeo Comercial
router.get('/campanas', listarCampanasAdmin);
router.post('/campanas', crearCampanaAdmin);
router.patch('/campanas/:id', actualizarCampanaAdmin);
router.post('/campanas/:id/generar-piezas', generarPiezasCampanaAdminCtrl);
router.patch('/piezas/:piezaId/estado', actualizarEstadoPiezaAdmin);

export default router;
