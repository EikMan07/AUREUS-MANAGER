import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, debugPayload } from '../config/db.js';
import { ensureRagSchema } from '../db/ragSchema.js';
import { indexarDocumento } from '../rag/indexar.js';
import { resolverCarpetaIdDesdeEnvSync } from '../services/drive.service.js';
import { redactarPII } from '../utils/piiRedactor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DOCS_DIR = path.resolve(__dirname, '../../documentos_drive_aureus');

async function seedBaseDocumentsIfEmpty(empresaId) {
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM documentos_rag WHERE empresa_id = $1::uuid`,
    [empresaId]
  );
  if ((countRows[0]?.total || 0) > 0) {
    return;
  }

  if (!fs.existsSync(SEED_DOCS_DIR)) {
    return;
  }

  const files = fs
    .readdirSync(SEED_DOCS_DIR)
    .filter((f) => f.toLowerCase().endsWith('.txt'))
    .sort();

  for (const fileName of files) {
    const fullPath = path.join(SEED_DOCS_DIR, fileName);
    const texto = fs.readFileSync(fullPath, 'utf8').trim();
    if (!texto) continue;

    const { rows: docRows } = await pool.query(
      `INSERT INTO documentos_rag (empresa_id, nombre, origen, estado)
       VALUES ($1::uuid, $2, 'carga', 'pendiente')
       RETURNING id`,
      [empresaId, fileName]
    );
    const docId = docRows[0].id;
    await indexarDocumento(empresaId, docId, texto);
  }
}

const LEGACY_SEED_FILES = [
  '01_Politica_Otorgamiento_Prestamos_y_Tasas_Aureus.txt',
  '02_Reglamento_Cobros_Atrasos_y_Arreglos_de_Pago.txt',
  '03_Protocolo_Delegacion_Cobradores_y_Seguridad_Datos.txt',
  '04_Rutas_Zonas_Viaticos_y_Prueba_Seguridad.txt'
];

async function asegurarDocumentosBaseReales(empresaId) {
  await pool.query(
    `DELETE FROM documentos_rag
     WHERE empresa_id = $1::uuid
       AND nombre = ANY($2::text[])`,
    [empresaId, LEGACY_SEED_FILES]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM documentos_rag WHERE empresa_id = $1::uuid`,
    [empresaId]
  );

  if ((countRows[0]?.total || 0) > 0) {
    return;
  }

  const { sincronizarDocumentosLocales } = await import('../jobs/sincronizar-drive.js');
  await sincronizarDocumentosLocales(empresaId);
}

export async function asegurarDocumentosBaseParaConsulta(empresaId) {
  return asegurarDocumentosBaseReales(empresaId);
}

/**
 * Aprovisiona el registro `empresas_rag` de una cuenta y opcionalmente
 * sincroniza los documentos base si aún no tiene ninguno.
 */
export async function aprovisionarEmpresaRag(
  empresaId,
  nombre = 'Aureus Manager',
  { seedBaseDocs = true } = {}
) {
  if (!empresaId) return;
  await ensureRagSchema();

  let envCarpetaId = '';
  try {
    envCarpetaId = resolverCarpetaIdDesdeEnvSync();
  } catch {
    envCarpetaId = '';
  }

  await pool.query(
    `INSERT INTO empresas_rag (empresa_id, nombre, plan_id, drive_carpeta_id, drive_carpeta_nombre)
     VALUES ($1::uuid, $2, 'gratis', NULLIF($3, ''), 'Aureus Manager')
     ON CONFLICT (empresa_id)
     DO UPDATE SET nombre = EXCLUDED.nombre,
                   drive_carpeta_id = CASE
                     WHEN NULLIF($3, '') IS NOT NULL
                          AND (empresas_rag.drive_carpeta_id IS NULL
                               OR empresas_rag.drive_carpeta_id <> $3)
                       THEN $3
                     ELSE empresas_rag.drive_carpeta_id
                   END,
                   drive_carpeta_nombre = CASE
                     WHEN NULLIF($3, '') IS NOT NULL
                       THEN 'Aureus Manager'
                     ELSE COALESCE(empresas_rag.drive_carpeta_nombre, 'Aureus Manager')
                   END`,
    [empresaId, nombre || 'Aureus Manager', envCarpetaId]
  );

  if (seedBaseDocs) {
    await asegurarDocumentosBaseReales(empresaId);
  }
}

/**
 * Inicializa en arranque de servidor el entorno RAG para las cuentas existentes.
 */
export async function inicializarEmpresasRagUsuariosExistentes() {
  try {
    await ensureRagSchema();
    const { rows } = await pool.query(
      `SELECT id, COALESCE(NULLIF(BTRIM(nombre_completo), ''), usuario, 'Aureus Manager') AS nombre
       FROM usuarios;`
    );
    for (const u of rows) {
      await aprovisionarEmpresaRag(u.id, u.nombre, { seedBaseDocs: true });
    }
  } catch (err) {
    console.warn(
      '[RAG Init] Advertencia inicializando entornos documentales al arranque:',
      redactarPII(err?.message || 'Error')
    );
  }
}

/**
 * Middleware de aislamiento estrictamente de solo lectura para rutas GET de Séneca RAG.
 * No ejecuta INSERT, UPDATE ni DDL.
 */
export function asegurarEmpresaRagSoloLectura(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({
      ok: false,
      userMessage: 'Debes iniciar sesión para consultar el asistente documentado.'
    });
  }

  req.empresaId = req.user.id;
  req.empresaNombre =
    req.user.nombre_completo || req.user.username || 'Aureus Manager';
  return next();
}

/**
 * Aislamiento multiempresa obligatorio para operaciones mutables/streaming:
 * Extrae `empresaId` exclusivamente desde la sesión verificada (`req.user.id`),
 * garantiza su registro en `empresas_rag` e indexa los documentos base si aún no tiene ninguno.
 */
export async function asegurarEmpresaRag(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        ok: false,
        userMessage: 'Debes iniciar sesión para consultar el asistente documentado.'
      });
    }

    req.empresaId = req.user.id;
    req.empresaNombre =
      req.user.nombre_completo || req.user.username || 'Aureus Manager';

    const skipBaseSeed =
      String(req.headers['x-rag-skip-seed'] || '').toLowerCase() === 'true';

    await aprovisionarEmpresaRag(req.empresaId, req.empresaNombre, {
      seedBaseDocs: !skipBaseSeed
    });

    return next();
  } catch (err) {
    console.error('[ragLimites] Error en asegurarEmpresaRag:', redactarPII(err?.message || 'Error'));
    return res.status(500).json({
      ok: false,
      userMessage: 'No se pudo inicializar el entorno documental de tu cuenta.',
      ...debugPayload(err)
    });
  }
}

/**
 * Control de rol para gestión documental y conexión con Google Drive.
 * Bloquea con HTTP 403 si el solicitante actúa como colaborador delegado sin privilegio de titular.
 */
export function soloAdminRag(req, res, next) {
  const rolCuenta = String(req.user?.rol || '').trim().toLowerCase();
  const rolHeader = String(
    req.headers['x-rag-rol'] || req.headers['x-seneca-rol'] || ''
  )
    .trim()
    .toLowerCase();

  if (
    rolCuenta !== 'administrador' ||
    rolHeader === 'colaborador' ||
    rolHeader === 'delegado' ||
    rolHeader === 'cobrador'
  ) {
    return res.status(403).json({
      ok: false,
      userMessage:
        'Solo un usuario con rol administrador puede gestionar documentos o configuraciones de conocimiento.'
    });
  }

  return next();
}

/**
 * Control estricto de cuota mensual de consultas por plan RAG.
 * Responde HTTP 429 al alcanzar `max_preguntas_mes`.
 */
export async function verificarLimitePreguntasRag(req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT p.max_preguntas_mes, p.max_documentos, e.plan_id,
        (SELECT count(*)::int FROM mensajes_rag m
         WHERE m.empresa_id = e.empresa_id
           AND m.creado_en >= date_trunc('month', now())) AS usadas
       FROM empresas_rag e
       JOIN planes_rag p ON p.id = e.plan_id
       WHERE e.empresa_id = $1::uuid`,
      [req.empresaId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        userMessage: 'No se encontró configuración de plan para la cuenta.'
      });
    }

    const { usadas, max_preguntas_mes } = rows[0];
    if (Number(usadas) >= Number(max_preguntas_mes)) {
      return res.status(429).json({
        ok: false,
        userMessage:
          'Se ha alcanzado el limite mensual de consultas de tu plan actual.'
      });
    }

    req.ragPlanEstado = rows[0];
    return next();
  } catch (err) {
    console.error('[ragLimites] Error en verificarLimitePreguntasRag:', redactarPII(err?.message || 'Error'));
    return res.status(500).json({
      ok: false,
      userMessage: 'No se pudo validar la cuota mensual de consultas.',
      ...debugPayload(err)
    });
  }
}

export default {
  aprovisionarEmpresaRag,
  inicializarEmpresasRagUsuariosExistentes,
  asegurarEmpresaRagSoloLectura,
  asegurarEmpresaRag,
  soloAdminRag,
  verificarLimitePreguntasRag
};
