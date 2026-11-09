import { createRequire } from 'node:module';
import { Sequelize } from 'sequelize';

const require = createRequire(import.meta.url);
// Misma configuración que usa sequelize-cli (carga también backend/.env).
const configs = require('./sequelize.config.cjs');

const env = process.env.NODE_ENV || 'development';
const { use_env_variable: envVar, ...options } = configs[env] || configs.development;
const connectionString = process.env[envVar];

if (!connectionString) {
  throw new Error(`Falta la variable de entorno ${envVar}. Revisa backend/.env (ver .env.example).`);
}

// Única instancia de Sequelize de toda la aplicación.
// La estructura de la base de datos la crean SOLO las migraciones: nunca sequelize.sync().
export const sequelize = new Sequelize(connectionString, options);

