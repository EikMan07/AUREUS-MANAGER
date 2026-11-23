import { Router } from 'express';
import multer from 'multer';
import {
  getResumenRapido,
  postConsultarSeneca
} from '../controllers/senecaController.js';
import {
  getEstadoRag,
  postSubirDocumentoRag,
  deleteDocumentoRag,
  postConectarDriveRag,
  postSincronizarDriveRag,
  putCambiarPlanRag,
  postStreamRag
} from '../controllers/ragController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requiereRol } from '../middlewares/roleMiddleware.js';
import {
  asegurarEmpresaRagSoloLectura,
  asegurarEmpresaRag,
  soloAdminRag,
  verificarLimitePreguntasRag
} from '../middlewares/ragLimites.js';

const router = Router();

const uploadRagDoc = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

router.use(authMiddleware);
router.use(requiereRol('COBRADOR', 'ADMINISTRADOR'));

// Consultas operativas originales de Séneca
router.get('/resumen-rapido', getResumenRapido);
router.post('/consultar', postConsultarSeneca);

// Rutas SaaS RAG sobre Google Drive integradas en Séneca (aisladas por req.user.id)
router.get('/rag/estado', asegurarEmpresaRagSoloLectura, getEstadoRag);
router.post(
  '/rag/documentos',
  asegurarEmpresaRag,
  soloAdminRag,
  uploadRagDoc.single('archivo'),
  postSubirDocumentoRag
);
router.delete(
  '/rag/documentos/:id',
  asegurarEmpresaRag,
  soloAdminRag,
  deleteDocumentoRag
);
router.post(
  '/rag/drive/conectar',
  asegurarEmpresaRag,
  soloAdminRag,
  postConectarDriveRag
);
router.post(
  '/rag/drive/sincronizar',
  asegurarEmpresaRag,
  soloAdminRag,
  postSincronizarDriveRag
);
router.put('/rag/plan', asegurarEmpresaRag, soloAdminRag, putCambiarPlanRag);
router.patch('/rag/plan', asegurarEmpresaRag, soloAdminRag, putCambiarPlanRag);
router.post(
  '/rag/stream',
  asegurarEmpresaRag,
  verificarLimitePreguntasRag,
  postStreamRag
);

export default router;
