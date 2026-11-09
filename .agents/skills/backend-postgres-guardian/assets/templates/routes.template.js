'use strict';
// Plantilla de rutas protegidas. Copiar como src/routes/<entidad>Routes.js
// Registrar en src/app.js: app.use('/entidades', require('./routes/entidadRoutes'));
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/entidadController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requerir, tipos } = require('../middlewares/validaciones');

router.use(authMiddleware); // todo lo de esta entidad exige token (si falta o es inválido -> 401)

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requerir(['nombre']), tipos({ nombre: 'texto', monto: 'numero' }), ctrl.crear);
router.put('/:id', tipos({ nombre: 'texto', monto: 'numero' }), ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
