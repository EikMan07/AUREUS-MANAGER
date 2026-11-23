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
import { requiereRol } from '../middlewares/roleMiddleware.js';
import { verificarOrigen } from '../middlewares/csrf.js';
import {
  loginRateLimiter,
  registroRateLimiter,
  passwordRateLimiter,
  oauthRateLimiter,
} from '../middlewares/rateLimiters.js';
import {
  iniciarOAuthGoogle,
  iniciarOAuthGitHub,
  callbackOAuthGoogle,
  callbackOAuthGitHub,
  getEstadoOAuthPublico,
} from '../controllers/oauthController.js';

const router = Router();
const rolesAutenticados = requiereRol('COBRADOR', 'ADMINISTRADOR');

// Rutas públicas de autenticación (protegidas contra orígenes cruzados y fuerza bruta)
router.post('/login', verificarOrigen, loginRateLimiter, login);
router.post('/registro', verificarOrigen, registroRateLimiter, registro);

// Rutas públicas OAuth 2.0 + OIDC + PKCE (patrón BFF con cookie efímera cifrada)
router.get('/oauth/proveedores', getEstadoOAuthPublico);
router.get('/oauth/google', oauthRateLimiter, iniciarOAuthGoogle);
router.get('/oauth/google/callback', oauthRateLimiter, callbackOAuthGoogle);
router.get('/oauth/github', oauthRateLimiter, iniciarOAuthGitHub);
router.get('/oauth/github/callback', oauthRateLimiter, callbackOAuthGitHub);

// Rutas protegidas de sesión activa, cierre de sesión, consentimiento legal y derechos ARCO
router.post('/logout', authMiddleware, rolesAutenticados, logout);
router.get('/yo', authMiddleware, rolesAutenticados, yo);
router.get('/perfil', authMiddleware, rolesAutenticados, yo);
router.put('/perfil', authMiddleware, rolesAutenticados, actualizarPerfil);
router.put('/password', authMiddleware, rolesAutenticados, passwordRateLimiter, cambiarPassword);
router.post('/consentimiento', authMiddleware, rolesAutenticados, aceptarConsentimientoLegal);
router.get('/exportar-datos', authMiddleware, rolesAutenticados, exportarMisDatosPersonales);

export default router;
