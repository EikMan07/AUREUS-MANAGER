import { Router } from 'express';
import {
  login,
  registro,
  yo,
  logout,
  actualizarPerfil,
  cambiarPassword,
  aceptarConsentimientoLegal,
  exportarMisDatosPersonales,
} from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { verificarOrigen } from '../middlewares/csrf.js';

const router = Router();

// Rutas públicas de autenticación (protegidas contra orígenes cruzados)
router.post('/login', verificarOrigen, login);
router.post('/registro', verificarOrigen, registro);
router.post('/logout', verificarOrigen, logout);

// Rutas protegidas de sesión activa, consentimiento legal y derechos ARCO
router.get('/yo', authMiddleware, yo);
router.get('/perfil', authMiddleware, yo);
router.put('/perfil', authMiddleware, actualizarPerfil);
router.put('/password', authMiddleware, cambiarPassword);
router.post('/consentimiento', authMiddleware, aceptarConsentimientoLegal);
router.get('/exportar-datos', authMiddleware, exportarMisDatosPersonales);

export default router;
