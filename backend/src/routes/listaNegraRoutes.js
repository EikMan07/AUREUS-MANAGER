import { Router } from 'express';
import {
  getListaNegra,
  consultarCedulaListaNegra,
  verificarPersonaListaNegra,
  registrarEnListaNegra,
  sacarDeListaNegra
} from '../controllers/listaNegraController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getListaNegra);
router.get('/verificar', verificarPersonaListaNegra);
router.get('/consultar/:cedula', consultarCedulaListaNegra);
router.post('/', registrarEnListaNegra);
router.post('/:id/sacar', sacarDeListaNegra);

export default router;
