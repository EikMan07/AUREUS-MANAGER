import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAG_SQL_PATH = path.resolve(__dirname, '../../sql/012_rag_google_drive.sql');

let schemaReadyPromise = null;

/**
 * Aplica de forma idempotente el esquema multiempresa RAG (`012_rag_google_drive.sql`)
 * sobre PostgreSQL `cobro_firme_db`.
 */
export async function ensureRagSchema() {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    } catch (_err) {
      // Continuar con almacenamiento vectorial DOUBLE PRECISION[] cuando pgvector no esté disponible
    }
    const sql = fs.readFileSync(RAG_SQL_PATH, 'utf8');
    await pool.query(sql);
    await pool.query(`
      ALTER TABLE documentos_rag
        ADD COLUMN IF NOT EXISTS nivel_acceso VARCHAR(20) NOT NULL DEFAULT 'PRESTAMISTA',
        ADD COLUMN IF NOT EXISTS ruta_carpeta VARCHAR(120) NOT NULL DEFAULT 'Prestamistas';
      CREATE INDEX IF NOT EXISTS idx_documentos_rag_empresa_nivel
        ON documentos_rag (empresa_id, nivel_acceso);
    `);
    return true;
  })().catch((err) => {
    schemaReadyPromise = null;
    throw err;
  });

  return schemaReadyPromise;
}

export default {
  ensureRagSchema
};
