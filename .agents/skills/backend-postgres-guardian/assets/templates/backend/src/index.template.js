'use strict';
// src/index.js — Punto de entrada del servidor.
// Carga variables de entorno, autentica la base de datos y arranca el socket TCP (app.listen).
// La aplicación Express vive configurada en src/app.js para permitir testing sin abrir puertos.

require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PUERTO = process.env.PUERTO || process.env.PORT || 3000;

// Autenticación de conexión a PostgreSQL antes de poner a escuchar el servidor
sequelize.authenticate()
  .then(() => {
    console.log('Conexión exitosa a PostgreSQL con Sequelize');
    app.listen(PUERTO, () => {
      console.log(`Servidor escuchando en http://localhost:${PUERTO}`);
    });
  })
  .catch((err) => {
    console.error('Error crítico al conectar con la base de datos:', err.message);
    process.exit(1);
  });

