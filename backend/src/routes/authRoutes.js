import { Router } from 'express';
import {
  login,
  registro,
  yo,
  logout,
  actualizarPerfil,
  cambiarPassword,
} from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { verificarOrigen } from '../middlewares/csrf.js';

const router = Router();

// Rutas públicas de autenticación (protegidas contra orígenes cruzados)
router.post('/login', verificarOrigen, login);
router.post('/registro', verificarOrigen, registro);
router.post('/logout', verificarOrigen, logout);

// Rutas protegidas de sesión activa y renovación deslizante
router.get('/yo', authMiddleware, yo);
router.get('/perfil', authMiddleware, yo);
router.put('/perfil', authMiddleware, actualizarPerfil);
router.put('/password', authMiddleware, cambiarPassword);

export default router;
