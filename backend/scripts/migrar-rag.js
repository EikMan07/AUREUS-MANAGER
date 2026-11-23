import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { ensureRagSchema } from '../src/db/ragSchema.js';
import { pool } from '../src/config/db.js';

async function main() {
  try {
    await ensureRagSchema();
    const { rows } = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name LIKE '%\\_rag' ESCAPE '\\'
       ORDER BY table_name`
    );
    const planes = await pool.query(`SELECT id, nombre, max_documentos, max_preguntas_mes FROM planes_rag ORDER BY id`);
    console.log('✓ Esquema RAG aplicado en cobro_firme_db. Tablas:', rows.map((r) => r.table_name));
    console.log('✓ Planes RAG activos:', planes.rows);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Error aplicando migración RAG:', err.message);
  process.exit(1);
});
