'use strict';
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requerir } = require('../middlewares/validaciones');

router.post('/registro', requerir(['nombre', 'email', 'password']), ctrl.registro);
router.post('/login', requerir(['email', 'password']), ctrl.login);
router.get('/renovar', authMiddleware, ctrl.renovar);

module.exports = router;
