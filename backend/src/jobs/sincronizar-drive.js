import cron from 'node-cron';
import { pool } from '../config/db.js';
import {
  listarCarpeta,
  leerArchivoDrive,
  detectarCarpetaCompartida,
  verificarCredencialesDrive,
  obtenerCarpetaIdDesdeEnv
} from '../services/drive.service.js';
import { indexarDocumento } from '../rag/indexar.js';

let driveCronTask = null;
let syncEnCurso = false;
const syncEnProgresoPorEmpresa = new Map();

export const ARCHIVOS_FICTICIOS_LEGADO = [
  '01_Politica_Otorgamiento_Prestamos_y_Tasas_Aureus.txt',
  '02_Reglamento_Cobros_Atrasos_y_Arreglos_de_Pago.txt',
  '03_Protocolo_Delegacion_Cobradores_y_Seguridad_Datos.txt',
  '04_Rutas_Zonas_Viaticos_y_Prueba_Seguridad.txt'
];

function esArchivoFicticioLegado(nombre) {
  return ARCHIVOS_FICTICIOS_LEGADO.includes(String(nombre || '').trim());
}

export async function limpiarDocumentosLegadoEmpresa(empresaId) {
  if (!empresaId) return 0;
  const { rowCount } = await pool.query(
    `DELETE FROM documentos_rag
     WHERE empresa_id = $1::uuid
       AND nombre = ANY($2::text[])`,
    [empresaId, ARCHIVOS_FICTICIOS_LEGADO]
  );
  return rowCount || 0;
}

function inferirNivelYRutaLocal(subcarpeta, nombreArchivo) {
  const sub = String(subcarpeta || '').toLowerCase();
  const nombre = String(nombreArchivo || '').toLowerCase();
  if (sub.includes('admin') || nombre.startsWith('admin_')) {
    return { nivelAcceso: 'ADMIN', rutaCarpeta: 'Administracion' };
  }
  return { nivelAcceso: 'PRESTAMISTA', rutaCarpeta: 'Prestamistas' };
}

/**
 * Sincroniza documentos reales locales desde docs/drive_archivos como respaldo
 * cuando Google Drive aun no contiene los archivos actualizados o no esta accesible.
 */
export async function sincronizarDocumentosLocales(
  empresaId,
  { forzarReindexado = false } = {}
) {
  const [
    { default: fsPromises },
    { default: nodePath },
    { fileURLToPath: urlToPath },
    { extraerTexto: extraerTextoLocal }
  ] = await Promise.all([
    import('node:fs/promises'),
    import('node:path'),
    import('node:url'),
    import('../services/extraccion.service.js')
  ]);

  const __localDir = nodePath.dirname(urlToPath(import.meta.url));
  const localDriveRoot = nodePath.resolve(__localDir, '../../../docs/drive_archivos');

  await limpiarDocumentosLegadoEmpresa(empresaId);

  let sincronizados = 0;
  let omitidos = 0;
  const errores = [];

  for (const subcarpeta of ['Prestamistas', 'Administracion']) {
    const dirPath = nodePath.join(localDriveRoot, subcarpeta);
    let entradas = [];
    try {
      entradas = (await fsPromises.readdir(dirPath, { withFileTypes: true }))
        .filter((e) => e.isFile())
        .map((e) => e.name)
        .sort();
    } catch {
      continue;
    }

    for (const nombreArchivo of entradas) {
      const { nivelAcceso, rutaCarpeta } = inferirNivelYRutaLocal(
        subcarpeta,
        nombreArchivo
      );

      try {
        const { rows: driveExistente } = await pool.query(
          `SELECT id, estado
           FROM documentos_rag
           WHERE empresa_id = $1::uuid
             AND nombre = $2
             AND origen = 'drive'
             AND estado = 'indexado'
           LIMIT 1`,
          [empresaId, nombreArchivo]
        );
        if (driveExistente.length > 0 && !forzarReindexado) {
          omitidos += 1;
          continue;
        }

        const { rows: cargaExistente } = await pool.query(
          `SELECT id, estado, nivel_acceso, ruta_carpeta
           FROM documentos_rag
           WHERE empresa_id = $1::uuid
             AND nombre = $2
             AND origen = 'carga'
           LIMIT 1`,
          [empresaId, nombreArchivo]
        );

        let doc = cargaExistente[0];
        if (!doc) {
          const { rows: insertados } = await pool.query(
            `INSERT INTO documentos_rag (
               empresa_id, nombre, origen, nivel_acceso, ruta_carpeta, estado
             )
             VALUES ($1::uuid, $2, 'carga', $3, $4, 'pendiente')
             RETURNING *`,
            [empresaId, nombreArchivo, nivelAcceso, rutaCarpeta]
          );
          doc = insertados[0];
        } else {
          await pool.query(
            `UPDATE documentos_rag
             SET nivel_acceso = $1, ruta_carpeta = $2
             WHERE id = $3`,
            [nivelAcceso, rutaCarpeta, doc.id]
          );
        }

        if (doc.estado === 'indexado' && !forzarReindexado) {
          omitidos += 1;
          continue;
        }

        const buf = await fsPromises.readFile(nodePath.join(dirPath, nombreArchivo));
        const texto = await extraerTextoLocal(buf, '', nombreArchivo);
        await indexarDocumento(empresaId, doc.id, texto);
        sincronizados += 1;
      } catch (errLocal) {
        errores.push({
          nombre: nombreArchivo,
          motivo: errLocal.userMessage || errLocal.message
        });
      }
    }
  }

  return {
    ok: true,
    fuente: 'local_fallback',
    sincronizados,
    omitidos,
    errores
  };
}

export async function upsertDocumentoDrive(empresaId, file) {
  const nivelAcceso =
    file.nivelAcceso === 'ADMIN' ||
    String(file.rutaCarpeta || '').toLowerCase().includes('admin') ||
    String(file.name || '').toLowerCase().startsWith('admin_')
      ? 'ADMIN'
      : 'PRESTAMISTA';
  const rutaCarpeta = String(
    file.rutaCarpeta || (nivelAcceso === 'ADMIN' ? 'Administracion' : 'Prestamistas')
  ).slice(0, 120);

  const { rows } = await pool.query(
    `INSERT INTO documentos_rag (
       empresa_id, nombre, origen, drive_file_id, nivel_acceso, ruta_carpeta, estado
     )
     VALUES ($1::uuid, $2, 'drive', $3, $4, $5, 'pendiente')
     ON CONFLICT (empresa_id, drive_file_id)
     DO UPDATE SET
       nombre = EXCLUDED.nombre,
       nivel_acceso = EXCLUDED.nivel_acceso,
       ruta_carpeta = EXCLUDED.ruta_carpeta
     RETURNING *`,
    [empresaId, file.name || file.id, file.id, nivelAcceso, rutaCarpeta]
  );
  return rows[0];
}

export async function marcarModificado(documentoId, modifiedTime) {
  const fechaMod = modifiedTime ? new Date(modifiedTime) : new Date();
  await pool.query(
    `UPDATE documentos_rag SET drive_modificado = $1 WHERE id = $2`,
    [fechaMod, documentoId]
  );
}

/**
 * Sincroniza de manera incremental por `modifiedTime` los archivos de la carpeta
 * de Google Drive perteneciente a una empresa autenticada.
 */
export async function sincronizarCarpetaEmpresa(
  empresaId,
  carpetaIdOpcional = ''
) {
  const { rows: empRows } = await pool.query(
    `SELECT empresa_id, drive_carpeta_id, drive_carpeta_nombre
     FROM empresas_rag
     WHERE empresa_id = $1::uuid`,
    [empresaId]
  );

  let envCarpetaId = '';
  try {
    envCarpetaId = await obtenerCarpetaIdDesdeEnv();
  } catch {
    envCarpetaId = '';
  }

  let carpetaId = String(
    carpetaIdOpcional || envCarpetaId || empRows[0]?.drive_carpeta_id || ''
  ).trim();
  let carpetaNombre = empRows[0]?.drive_carpeta_nombre || 'Aureus Manager';

  if (!carpetaId) {
    const detectada = await detectarCarpetaCompartida();
    if (!detectada) {
      const err = new Error('No se encontró ninguna carpeta compartida en Google Drive');
      err.statusCode = 404;
      err.userMessage =
        'No se detectó la carpeta compartida de Google Drive configurada para la cuenta.';
      throw err;
    }
    carpetaId = detectada.id;
    carpetaNombre = detectada.name || 'Aureus Manager';
  }

  if (envCarpetaId && carpetaId === envCarpetaId) {
    carpetaNombre = 'Aureus Manager';
  }

  await pool.query(
    `UPDATE empresas_rag
     SET drive_carpeta_id = $1,
         drive_carpeta_nombre = $2
     WHERE empresa_id = $3::uuid`,
    [carpetaId, carpetaNombre, empresaId]
  );

  let archivos;
  try {
    archivos = await listarCarpeta(carpetaId);
  } catch (listErr) {
    const isNotFound =
      listErr?.code === 404 ||
      listErr?.status === 404 ||
      /file not found/i.test(String(listErr?.message || ''));
    if (!isNotFound) throw listErr;

    const detectada = await detectarCarpetaCompartida();
    if (!detectada?.id) throw listErr;

    carpetaId = detectada.id;
    carpetaNombre = detectada.name || 'Aureus Manager';
    await pool.query(
      `UPDATE empresas_rag
       SET drive_carpeta_id = $1,
           drive_carpeta_nombre = $2
       WHERE empresa_id = $3::uuid`,
      [carpetaId, carpetaNombre, empresaId]
    );
    archivos = await listarCarpeta(carpetaId);
  }
  await limpiarDocumentosLegadoEmpresa(empresaId);

  const archivosValidos = (archivos || []).filter(
    (f) => !esArchivoFicticioLegado(f.name)
  );

  if (archivosValidos.length === 0) {
    const localRes = await sincronizarDocumentosLocales(empresaId);
    await pool.query(
      `UPDATE empresas_rag SET ultima_sincronizacion = now() WHERE empresa_id = $1::uuid`,
      [empresaId]
    );
    return {
      ok: true,
      carpetaId,
      carpetaNombre,
      fuente: 'local_fallback',
      totalEnDrive: 0,
      sincronizados: localRes.sincronizados,
      omitidos: localRes.omitidos,
      errores: localRes.errores
    };
  }

  const idsEnDrive = archivosValidos.map((f) => String(f.id)).filter(Boolean);
  const nombresEnDrive = archivosValidos.map((f) => String(f.name || f.id));

  if (nombresEnDrive.length > 0) {
    await pool.query(
      `DELETE FROM documentos_rag
       WHERE empresa_id = $1::uuid
         AND origen = 'carga'
         AND nombre = ANY($2::text[])`,
      [empresaId, nombresEnDrive]
    );
  }

  if (idsEnDrive.length > 0) {
    await pool.query(
      `DELETE FROM documentos_rag
       WHERE empresa_id = $1::uuid
         AND origen = 'drive'
         AND (drive_file_id IS NULL OR NOT (drive_file_id = ANY($2::text[])))`,
      [empresaId, idsEnDrive]
    );
  }

  let nuevosOActualizados = 0;
  let omitidos = 0;
  const errores = [];

  for (const f of archivosValidos) {
    const doc = await upsertDocumentoDrive(empresaId, f);
    const modDriveIso = f.modifiedTime
      ? new Date(f.modifiedTime).toISOString()
      : null;
    const modDbIso = doc.drive_modificado
      ? new Date(doc.drive_modificado).toISOString()
      : null;

    if (modDriveIso && modDbIso === modDriveIso && doc.estado === 'indexado') {
      omitidos += 1;
      continue;
    }

    try {
      const texto = await leerArchivoDrive(f);
      await indexarDocumento(empresaId, doc.id, texto);
      await marcarModificado(doc.id, f.modifiedTime);
      nuevosOActualizados += 1;
    } catch (fileErr) {
      await pool
        .query(`UPDATE documentos_rag SET estado = 'error' WHERE id = $1`, [
          doc.id
        ])
        .catch(() => {});
      errores.push({
        nombre: f.name || f.id,
        motivo: fileErr.userMessage || fileErr.message
      });
    }
  }

  await pool.query(
    `UPDATE empresas_rag SET ultima_sincronizacion = now() WHERE empresa_id = $1::uuid`,
    [empresaId]
  );

  return {
    ok: true,
    carpetaId,
    carpetaNombre,
    fuente: 'google_drive',
    totalEnDrive: archivosValidos.length,
    sincronizados: nuevosOActualizados,
    omitidos,
    errores
  };
}

/**
 * Ejecuta una sincronización en segundo plano sin bloquear la petición HTTP,
 * deduplicando llamadas concurrentes para una misma empresa.
 *
 * @param {string} empresaId
 */
export function sincronizarCarpetaEnSegundoPlano(empresaId) {
  if (!empresaId) return;
  const key = String(empresaId);
  if (syncEnProgresoPorEmpresa.has(key)) return;

  const promesa = sincronizarCarpetaEmpresa(empresaId)
    .catch((err) => {
      console.warn(
        `[Drive Sync] Sincronización automática omitida para ${key}:`,
        err?.message || err
      );
    })
    .finally(() => {
      syncEnProgresoPorEmpresa.delete(key);
    });

  syncEnProgresoPorEmpresa.set(key, promesa);
}

/**
 * Ejecuta un ciclo único de sincronización para todas las empresas con carpeta vinculada
 * (o cuentas activas si `GOOGLE_DRIVE_FOLDER_URL` está configurada).
 */
export async function ejecutarSincronizacionDriveGlobal() {
  if (syncEnCurso) return;
  const creds = verificarCredencialesDrive();
  if (!creds.existe) return;

  syncEnCurso = true;
  try {
    let envCarpetaId = '';
    try {
      envCarpetaId = await obtenerCarpetaIdDesdeEnv();
    } catch {
      envCarpetaId = '';
    }

    if (envCarpetaId) {
      await pool.query(
        `UPDATE empresas_rag
         SET drive_carpeta_id = $1,
             drive_carpeta_nombre = 'Aureus Manager'
         WHERE drive_carpeta_id IS NULL
            OR drive_carpeta_id <> $1`,
        [envCarpetaId]
      );
    }

    const { rows } = await pool.query(
      `SELECT empresa_id, drive_carpeta_id
       FROM empresas_rag
       WHERE drive_carpeta_id IS NOT NULL AND BTRIM(drive_carpeta_id) <> ''`
    );
    for (const emp of rows) {
      try {
        await sincronizarCarpetaEmpresa(emp.empresa_id, emp.drive_carpeta_id);
      } catch (err) {
        console.error(
          `[Drive Sync] Error sincronizando empresa ${emp.empresa_id}:`,
          err.message
        );
      }
    }
  } finally {
    syncEnCurso = false;
  }
}

/**
 * Job horario con node-cron ("0 * * * *") para sincronizar todas las empresas
 * que tienen carpeta de Google Drive vinculada.
 */
export function iniciarCronSincronizacionDrive() {
  if (driveCronTask) return driveCronTask;

  // Sincronización inicial no bloqueante al arrancar el servidor
  setTimeout(() => {
    ejecutarSincronizacionDriveGlobal().catch(() => {});
  }, 1500);

  driveCronTask = cron.schedule('0 * * * *', () => {
    ejecutarSincronizacionDriveGlobal().catch(() => {});
  });

  return driveCronTask;
}

export function detenerCronSincronizacionDrive() {
  if (driveCronTask) {
    driveCronTask.stop();
    driveCronTask = null;
  }
}

export default {
  upsertDocumentoDrive,
  marcarModificado,
  sincronizarCarpetaEmpresa,
  iniciarCronSincronizacionDrive,
  detenerCronSincronizacionDrive
};
