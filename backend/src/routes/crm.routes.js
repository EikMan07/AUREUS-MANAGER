// backend/src/routes/crm.routes.js
// Rutas REST del CRM Crediticio para Prestamistas (rol = 'COBRADOR')
// Protección estricta bajo Ley N.° 8968: aislamiento por cobrador_id

import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requiereCobrador } from '../middlewares/roleMiddleware.js';
import {
  crearProspecto,
  listarProspectos,
  actualizarProspecto,
  eliminarProspecto,
  convertirProspectoACliente,
  moverEtapaProspecto,
  consultarEmbudo,
  listarAtencionHoy,
  generarMensajeProspecto,
  actualizarEstadoMensaje,
  obtenerCerebroConfig,
  actualizarCerebroConfig,
  actualizarMetasEtapas,
} from '../controllers/crm.controller.js';

const router = Router();

// Todas las rutas del CRM del prestamista requieren autenticación y rol COBRADOR
router.use(authMiddleware);
router.use(requiereCobrador);

// Rutas del Embudo y Gestión de Prospectos
router.post('/prospectos', crearProspecto);
router.get('/prospectos', listarProspectos);
router.put('/prospectos/:id', actualizarProspecto);
router.delete('/prospectos/:id', eliminarProspecto);
router.post('/prospectos/:id/convertir-cliente', convertirProspectoACliente);
router.patch('/prospectos/:id/etapa', moverEtapaProspecto);
router.post('/prospectos/:id/mensaje', generarMensajeProspecto);

// Métricas y Bandeja Priorizada
router.get('/embudo', consultarEmbudo);
router.get('/atencion', listarAtencionHoy);

// Gestión de Mensajes IA
router.patch('/mensajes/:mensajeId/estado', actualizarEstadoMensaje);

// Cerebro de Séneca CRM
router.get('/cerebro', obtenerCerebroConfig);
router.put('/cerebro', actualizarCerebroConfig);

// Metas y Alertas por Etapa
router.put('/metas', actualizarMetasEtapas);

export default router;
