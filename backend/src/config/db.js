import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cobro_firme_db';

export const pool = new Pool({
  connectionString,
  options: '-c TimeZone=America/Costa_Rica',
});

pool.on('error', (err) => {
  console.error('Error inesperado en el Pool de PostgreSQL:', err.message);
});

export const query = (text, params) => pool.query(text, params);
