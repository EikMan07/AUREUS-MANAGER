'use strict';
// Configuración de Sequelize para sequelize-cli (migraciones) y para la aplicación.
// Las credenciales NUNCA van aquí: se leen de backend/.env (DATABASE_URL), que no se sube a Git.
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

const base = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  timezone: 'America/Costa_Rica',
  logging: false,
  pool: { max: 10, min: 0, acquire: 15000, idle: 10000 },
  dialectOptions: {
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 30000,
  },
  // Las migraciones guardan su historial en la tabla SequelizeMeta.
  migrationStorage: 'sequelize',
};

module.exports = {
  development: { ...base },
  test: { ...base },
  production: { ...base },
};
