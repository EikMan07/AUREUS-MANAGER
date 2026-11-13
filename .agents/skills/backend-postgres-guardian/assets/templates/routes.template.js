'use strict';
// Plantilla de Rutas Modulares (Router Layer). Copiar como src/routes/<entidad>Routes.js
// Registrar en src/app.js: app.use('/entidades', require('./routes/entidadRoutes'));

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/entidadController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requerir, tipos } = require('../middlewares/validaciones');

// Protección global del módulo: requiere token JWT válido (401 si falta o expira)
router.use(authMiddleware);

// REGLA CRÍTICA DE ORDEN EN EXPRESS:
// Las rutas fijas y específicas deben declararse SIEMPRE ANTES que las rutas con parámetros dinámicos (:id).
// Ejemplo: router.get('/reporte', ctrl.generarReporte); DEBE ir antes de router.get('/:id', ctrl.obtener);

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', requerir(['nombre']), tipos({ nombre: 'texto', monto: 'numero' }), ctrl.crear);
router.put('/:id', tipos({ nombre: 'texto', monto: 'numero' }), ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
