import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

// Sin credenciales por defecto en el código: la conexión sale únicamente de backend/.env (no se sube a Git).
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Falta la variable de entorno DATABASE_URL. Copia backend/.env.example a backend/.env y complétala.');
}

export const pool = new Pool({
  connectionString,
  options: '-c TimeZone=America/Costa_Rica',
  // Pool seguro: tamaño acotado y timeouts para que una consulta colgada no tumbe el servicio.
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 35000,
  idle_in_transaction_session_timeout: 30000,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el Pool de PostgreSQL:', err.message);
});

export const query = (text, params) => pool.query(text, params);

/**
 * Ejecuta `work(client)` dentro de una transacción: BEGIN, COMMIT si todo sale bien y ROLLBACK
 * si algo falla (relanza el error original). Siempre libera la conexión.
 * Úsalo en toda operación de escritura que toque más de una sentencia.
 */
export async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Error al hacer ROLLBACK:', rollbackErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Cuerpo de error técnico para las respuestas HTTP: el detalle (`debugError`) solo se incluye fuera de
 * producción. En producción el usuario recibe únicamente `userMessage`; el detalle queda en los logs.
 */
export function debugPayload(err) {
  if (process.env.NODE_ENV === 'production') return {};
  return { debugError: err?.message || err?.detail || String(err) };
}
