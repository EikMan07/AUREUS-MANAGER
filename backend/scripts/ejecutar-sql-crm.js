import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const sqlPath = path.resolve(__dirname, '../sql/03_crm_aureus.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Ejecutando 03_crm_aureus.sql en cobro_firme_db...');
  await pool.query(sql);
  console.log('¡03_crm_aureus.sql ejecutado con éxito!');

  const { rows } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'crm_%' ORDER BY table_name;"
  );
  console.log('Tablas CRM activas:', rows.map((r) => r.table_name));
  process.exit(0);
}

main().catch((err) => {
  console.error('Error ejecutando SQL:', err);
  process.exit(1);
});
