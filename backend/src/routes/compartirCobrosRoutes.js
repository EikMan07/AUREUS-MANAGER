import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getPersonas,
  agregarPersona,
  eliminarPersona,
  getResumenDiaParaCompartir,
  compartirCobrosDia,
  dejarDeCompartirDia,
  revertirCobroCompartido
} from '../controllers/compartirCobrosController.js';

const router = Router();

// Aplica el middleware permisivo para identificar al usuario autenticado o inyectar el cobrador base
router.use(authMiddleware);

router.get('/personas', getPersonas);
router.post('/personas', agregarPersona);
router.delete('/personas/:contactoId', eliminarPersona);

router.get('/resumen-dia', getResumenDiaParaCompartir);
router.post('/dia', compartirCobrosDia);
router.post('/revertir-dia', dejarDeCompartirDia);
router.post('/revertir-cobro/:agendaId', revertirCobroCompartido);
router.delete('/dia', dejarDeCompartirDia);

export default router;

