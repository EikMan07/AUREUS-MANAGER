import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { requiereCobrador } from '../middlewares/roleMiddleware.js';
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

router.use(authMiddleware);
router.use(requiereCobrador);

router.get('/personas', getPersonas);
router.post('/personas', agregarPersona);
router.delete('/personas/:contactoId', eliminarPersona);

router.get('/resumen-dia', getResumenDiaParaCompartir);
router.post('/dia', compartirCobrosDia);
router.post('/revertir-dia', dejarDeCompartirDia);
router.post('/revertir-cobro/:agendaId', revertirCobroCompartido);
router.delete('/dia', dejarDeCompartirDia);

export default router;

