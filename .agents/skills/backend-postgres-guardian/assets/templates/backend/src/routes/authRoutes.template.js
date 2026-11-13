'use strict';
/**
 * src/routes/authRoutes.js — Rutas de Autenticación y Control de Sesión.
 */

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { verificarCsrf } = require('../middlewares/csrf');
const { requerir } = require('../middlewares/validaciones');

// Endpoints públicos de entrada
router.post('/registro', requerir(['nombre', 'email', 'password']), ctrl.registro);
router.post('/login', requerir(['email', 'password']), ctrl.login);

// Endpoint de verificación y restauración de sesión (F5)
router.get('/yo', authMiddleware, ctrl.yo);

// Endpoint de cierre de sesión
router.post('/logout', authMiddleware, verificarCsrf, ctrl.logout);

module.exports = router;
