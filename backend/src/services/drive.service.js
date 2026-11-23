import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import { extraerTexto } from './extraccion.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_CREDENTIALS_PATH = './credenciales/aureusmanager-29fbb8644fbc.json';
const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const SERVICE_ACCOUNT_EMAIL =
  'aureusmanager@aureusmanager.iam.gserviceaccount.com';

const FOLDER_ID_REGEX = /^[a-zA-Z0-9_-]{10,120}$/;

const EXPORTABLES = {
  'application/vnd.google-apps.document': 'text/plain',
  'application/vnd.google-apps.spreadsheet': 'text/csv'
};

export function resolverRutaCredencialesDrive() {
  const configured =
    String(process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim() ||
    DEFAULT_CREDENTIALS_PATH;
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(BACKEND_ROOT, configured);
}

export function verificarCredencialesDrive() {
  const ruta = resolverRutaCredencialesDrive();
  return {
    existe: fs.existsSync(ruta),
    ruta,
    serviceAccountEmail: SERVICE_ACCOUNT_EMAIL
  };
}

function getDriveInstance() {
  const { existe, ruta } = verificarCredencialesDrive();
  if (!existe) {
    const err = new Error(
      `No se encontró el archivo de credenciales de servicio en: ${ruta}`
    );
    err.statusCode = 503;
    err.userMessage =
      'Falta el archivo de credenciales de Google Drive para autenticar la sincronización.';
    throw err;
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: ruta,
    scopes: DRIVE_SCOPES
  });

  return google.drive({ version: 'v3', auth });
}

/**
 * Extrae y valida estrictamente el ID de carpeta a partir de una URL completa o ID directo.
 *
 * @param {string} input
 * @returns {string}
 */
export function extraerCarpetaId(input) {
  const raw = String(input || '').trim();
  if (!raw) {
    const err = new Error('Identificador de carpeta vacío.');
    err.statusCode = 400;
    err.userMessage = 'Ingresa el enlace o identificador de la carpeta de Google Drive.';
    throw err;
  }

  let candidate = raw;
  const folderMatch = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch?.[1]) {
    candidate = folderMatch[1];
  } else {
    try {
      const parsed = new URL(raw);
      const idParam = parsed.searchParams.get('id');
      if (idParam) {
        candidate = idParam.trim();
      }
    } catch {
      // No es URL, usar candidate limpio
    }
  }

  candidate = candidate.split('?')[0].split('#')[0].replace(/\/+$/, '').trim();

  if (!FOLDER_ID_REGEX.test(candidate)) {
    const err = new Error(`ID de carpeta de Drive inválido: ${candidate}`);
    err.statusCode = 400;
    err.userMessage =
      'El enlace o identificador de la carpeta de Google Drive no tiene un formato válido.';
    throw err;
  }

  return candidate;
}

/**
 * Resuelve de forma síncrona el ID de carpeta configurado en las variables de entorno
 * (`GOOGLE_DRIVE_FOLDER_URL` o `GOOGLE_DRIVE_FOLDER_ID`) si existe y es válido.
 *
 * @returns {string}
 */
export function resolverCarpetaIdDesdeEnvSync() {
  const raw = String(
    process.env.GOOGLE_DRIVE_FOLDER_URL ||
      process.env.GOOGLE_DRIVE_FOLDER_ID ||
      ''
  ).trim();
  if (!raw) return '';
  return extraerCarpetaId(raw);
}

/**
 * Obtiene el identificador limpio de la carpeta compartida en Google Drive
 * desde `GOOGLE_DRIVE_FOLDER_URL` / `GOOGLE_DRIVE_FOLDER_ID` o, como respaldo,
 * detectando automáticamente la carpeta "Aureus Manager" compartida.
 *
 * @returns {Promise<string>}
 */
export async function obtenerCarpetaIdDesdeEnv() {
  const raw = String(
    process.env.GOOGLE_DRIVE_FOLDER_URL ||
      process.env.GOOGLE_DRIVE_FOLDER_ID ||
      ''
  ).trim();

  if (raw) {
    return extraerCarpetaId(raw);
  }

  const detectada = await detectarCarpetaCompartida();
  return detectada?.id || '';
}

/**
 * Busca carpetas compartidas con la cuenta de servicio, priorizando "Aureus Manager".
 */
export async function detectarCarpetaCompartida() {
  const drive = getDriveInstance();
  const { data } = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: 'files(id, name, modifiedTime)',
    pageSize: 20,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true
  });

  const carpetas = Array.isArray(data?.files) ? data.files : [];
  if (carpetas.length === 0) {
    return null;
  }

  const preferida = carpetas.find(
    (c) => String(c.name || '').trim().toLowerCase() === 'aureus manager'
  );
  return preferida || carpetas[0];
}

/**
 * Lista todos los archivos contenidos en una carpeta de Google Drive paginando con nextPageToken.
 *
 * @param {string} carpetaId
 */
export const DRIVE_CARPETAS_NIVELES = Object.freeze({
  PRESTAMISTA: 'PRESTAMISTA',
  ADMIN: 'ADMIN'
});

function normalizarTextoComparacion(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function clasificarNivelAcceso(rutaCarpeta = '', nombreArchivo = '') {
  const ruta = normalizarTextoComparacion(rutaCarpeta);
  const nombre = normalizarTextoComparacion(nombreArchivo);

  if (
    ruta.includes('administracion') ||
    /(^|\/)admin(\/|$)/i.test(ruta) ||
    nombre.startsWith('admin_')
  ) {
    return DRIVE_CARPETAS_NIVELES.ADMIN;
  }

  return DRIVE_CARPETAS_NIVELES.PRESTAMISTA;
}

export async function listarCarpeta(carpetaId) {
  const idValido = extraerCarpetaId(carpetaId);
  const drive = getDriveInstance();
  const archivos = [];
  const pendientes = [{ folderId: idValido, rutaRelativa: '' }];
  const carpetasVisitadas = new Set([idValido]);

  while (pendientes.length > 0) {
    const actual = pendientes.shift();
    let pageToken;

    do {
      const { data } = await drive.files.list({
        q: `'${actual.folderId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
        pageSize: 200,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      const items = Array.isArray(data?.files) ? data.files : [];
      for (const item of items) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          if (item.id && !carpetasVisitadas.has(item.id)) {
            carpetasVisitadas.add(item.id);
            const nuevaRuta = actual.rutaRelativa
              ? `${actual.rutaRelativa}/${item.name}`
              : String(item.name || '').trim();
            pendientes.push({ folderId: item.id, rutaRelativa: nuevaRuta });
          }
          continue;
        }

        const rutaCarpeta =
          actual.rutaRelativa ||
          (normalizarTextoComparacion(item.name).startsWith('admin_')
            ? 'Administracion'
            : 'Prestamistas');
        const nivelAcceso = clasificarNivelAcceso(rutaCarpeta, item.name);

        archivos.push({
          ...item,
          rutaCarpeta,
          nivelAcceso
        });
      }

      pageToken = data?.nextPageToken || undefined;
    } while (pageToken);
  }

  return archivos;
}

/**
 * Lee y extrae el contenido de texto de un archivo almacenado en Google Drive.
 *
 * @param {{ id: string, name?: string, mimeType?: string }} f
 * @returns {Promise<string>}
 */
export async function leerArchivoDrive(f) {
  if (!f || !f.id) {
    throw new Error('Metadatos de archivo de Google Drive inválidos.');
  }

  const drive = getDriveInstance();
  const exportMime = EXPORTABLES[f.mimeType];

  if (exportMime) {
    const r = await drive.files.export(
      { fileId: f.id, mimeType: exportMime },
      { responseType: 'arraybuffer' }
    );
    const bufferExportado = Buffer.from(r.data);
    if (
      exportMime.includes('csv') ||
      f.mimeType === 'application/vnd.google-apps.spreadsheet'
    ) {
      return await extraerTexto(
        bufferExportado,
        'text/csv',
        `${f.name || f.id}.csv`
      );
    }
    return bufferExportado.toString('utf8').trim();
  }

  const r = await drive.files.get(
    { fileId: f.id, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  );

  return await extraerTexto(Buffer.from(r.data), f.mimeType, f.name);
}

export const leerArchivo = leerArchivoDrive;

export default {
  SERVICE_ACCOUNT_EMAIL,
  resolverRutaCredencialesDrive,
  verificarCredencialesDrive,
  extraerCarpetaId,
  resolverCarpetaIdDesdeEnvSync,
  obtenerCarpetaIdDesdeEnv,
  detectarCarpetaCompartida,
  listarCarpeta,
  leerArchivoDrive,
  leerArchivo
};
