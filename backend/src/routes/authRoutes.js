import { Router } from 'express';
import { login, registro, perfil } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Rutas públicas de autenticación
router.post('/login', login);
router.post('/registro', registro);

// Ruta protegida con authMiddleware
router.get('/perfil', authMiddleware, perfil);

export default router;

