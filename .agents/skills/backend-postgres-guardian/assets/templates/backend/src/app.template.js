'use strict';
// src/app.js — configuración de Express. Una línea app.use(...) por cada router.
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const authRoutes = require('./routes/authRoutes');
const entidadRoutes = require('./routes/entidadRoutes'); // ejemplo

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  exposedHeaders: ['x-access-token'], // el front necesita leer el token renovado
}));
app.use(express.json());

app.use('/auth', authRoutes);          // pública: registro, login (renovar va protegida)
app.use('/entidades', entidadRoutes);  // protegida con authMiddleware dentro del router

// Último middleware: errores no controlados (sin filtrar detalles internos).
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Nunca sequelize.sync(): la estructura la crean las migraciones.
const PUERTO = process.env.PUERTO || 3000;
sequelize.authenticate()
  .then(() => app.listen(PUERTO, () => console.log(`API en el puerto ${PUERTO}`)))
  .catch((err) => console.error('Sin conexión a la BD:', err.message));

module.exports = app;
