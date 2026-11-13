'use strict';
/**
 * src/app.js — Configuración Integral de Express con Cookies Seguras.
 *
 * Pipeline estricto de ejecución:
 * 1. Validación de directivas de seguridad en arranque (cookies, entorno)
 * 2. Seguridad de cabeceras HTTP y compresión (helmet, compression)
 * 3. Control de acceso cruzado con credenciales (cors: origin explícito y credentials:true)
 * 4. Parseo de cookies (cookie-parser)
 * 5. Parseo de cuerpos (express.json, express.urlencoded)
 * 6. Verificación de origen en métodos mutables (verificarOrigen)
 * 7. Montaje de enrutadores modulares (authRoutes, entidadRoutes)
 * 8. Manejador 404 (Rutas inexistentes)
 * 9. Manejador Centralizado de Errores (firma cuádruple: err, req, res, next)
 */

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const { validarConfiguracionCookies } = require('./utils/cookies');
const { verificarOrigen } = require('./middlewares/csrf');
const authRoutes = require('./routes/authRoutes');
const entidadRoutes = require('./routes/entidadRoutes');
const errorHandler = require('./middlewares/errorHandler');

// 1. Validación temprana de directivas de seguridad (Fail-Fast)
validarConfiguracionCookies();

const app = express();

// 2. Seguridad de cabeceras HTTP y compresión
app.use(helmet());
app.use(compression());

// 3. Control de acceso cruzado con credenciales activas
// NOTA CRÍTICA: Con credentials:true, origin NUNCA debe ser '*'
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: frontendUrl,
  credentials: true,
}));

// 4. Parseo de cookies de la petición HTTP
app.use(cookieParser());

// 5. Parseo de bodies en formato JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 6. Verificación de origen para peticiones mutables (Capa 2 anti-CSRF)
app.use(verificarOrigen);

// 7. Montaje modular de rutas de la API
app.use('/auth', authRoutes);
app.use('/entidades', entidadRoutes);

// 8. Manejador 404 para rutas inexistentes
app.use((req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Ruta no encontrada' });
});

// 9. Manejador centralizado de errores (Firma cuádruple obligatoria al final)
app.use(errorHandler);

module.exports = app;
