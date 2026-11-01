// Motor OCR de cédulas costarricenses en el servidor.
// - Un único worker de tesseract.js ('spa') vive en memoria durante toda la vida del proceso.
// - Preprocesamiento con sharp: rotación EXIF, lado máximo 1400px, escala de grises + normalize.
// - Estrategia de rotaciones:
//     Horizontal (w >= h): 0° -> franja central ampliada -> 180°
//     Vertical   (h >  w): 270° (-90°, endereza encabezado a la derecha) -> 90° -> 0° (último recurso)

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
import { toTitleCase } from './haciendaService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.resolve(__dirname, '../../.tesseract-cache');
const MAX_SIDE = 1400;

let workerPromise = null;

/**
 * Inicializa (una sola vez) el worker persistente. Llamadas posteriores reutilizan la misma promesa.
 * La primera ejecución descarga spa.traineddata y lo guarda en backend/.tesseract-cache.
 */
export function initOcrWorker() {
  if (!workerPromise) {
    fs.mkdirSync(CACHE_PATH, { recursive: true });
    const started = Date.now();
    workerPromise = createWorker('spa', 1, { cachePath: CACHE_PATH })
      .then((worker) => {
        console.log(`[OCR] Worker tesseract.js (spa) listo en memoria (${Date.now() - started}ms)`);
        return worker;
      })
      .catch((err) => {
        console.error('[OCR] No se pudo inicializar el worker:', err.message);
        workerPromise = null; // permitir reintento en la próxima petición
        throw err;
      });
  }
  return workerPromise;
}

export async function terminateOcrWorker() {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch {
    // ya terminado o nunca inicializado
  } finally {
    workerPromise = null;
  }
}

/**
 * Extracción de cédula + nombre impreso a partir del texto OCR.
 * Devuelve siempre 9 dígitos puros sin guiones ni espacios.
 */
export function parseCostaRicanCardText(rawText = '') {
  if (!rawText || typeof rawText !== 'string') return null;

  // 1. Quitar fechas con etiqueta (F. Nac: 07/01/2008, Vence: 04/02/2036) y cualquier fecha suelta DD/MM/YYYY
  let s = rawText.replace(
    /\b(?:vence|vencimiento|nacimiento|f\.?\s*nac\.?|expedici[oó]n|fecha|exp)\s*[:.\-]?\s*\d{1,2}\s*[\/\-.|]\s*\d{1,2}\s*[\/\-.|]\s*\d{2,4}/gi,
    ' '
  );
  s = s.replace(/\b\d{1,2}\s*[\/\-.|]\s*\d{1,2}\s*[\/\-.|]\s*\d{2,4}\b/g, ' ');

  // 2. Formato TSE con espacios (2 0239 0084) o 9 dígitos seguidos
  let cleanCedula = '';
  const tsePattern = /\b([1-9])[\s\-.,_]*(\d{4})[\s\-.,_]*(\d{4})\b/;
  const tseMatch = s.match(tsePattern);
  if (tseMatch) {
    cleanCedula = `${tseMatch[1]}${tseMatch[2]}${tseMatch[3]}`;
  } else {
    // 3. Respaldo tolerante a confusiones típicas del OCR (O→0, I/l→1)
    const tolerant = s.match(/\b([1-9])[\s\-.,_]*([0-9oOlI]{4})[\s\-.,_]*([0-9oOlI]{4})\b/);
    if (tolerant) {
      const fix = (str) => str.replace(/[oO]/g, '0').replace(/[lI]/g, '1');
      cleanCedula = `${tolerant[1]}${fix(tolerant[2])}${fix(tolerant[3])}`;
    }
  }

  if (!/^[1-9]\d{8}$/.test(cleanCedula)) return null;

  // 4. Nombre y apellidos impresos (respaldo si Hacienda no responde). Se limitan a la misma línea.
  const letters = "A-Za-záéíóúñüÁÉÍÓÚÑÜ";
  const ap1 = rawText.match(new RegExp(`(?:1\\s*(?:er|°|º|o|ero)?\\.?\\s*apellido|primer\\s*apellido)\\s*[:.\\-]?\\s*([${letters}]+)`, 'i'));
  const ap2 = rawText.match(new RegExp(`(?:2\\s*(?:do|°|º|o|ndo)?\\.?\\s*apellido|segundo\\s*apellido)\\s*[:.\\-]?\\s*([${letters}]+)`, 'i'));
  const nom = rawText.match(new RegExp(`\\bnombres?\\s*[:.\\-]?\\s*([${letters} ]+)`, 'i'));

  const apellidos = [ap1?.[1], ap2?.[1]].filter(Boolean).map(toTitleCase).join(' ');
  const nombre = nom ? toTitleCase(nom[1].trim()) : '';

  return { cleanCedula, nombre, apellidos };
}

/** Preprocesa: EXIF, lado máximo 1400px, grises + normalize. Devuelve buffer PNG y dimensiones. */
async function preprocess(buffer) {
  const { data, info } = await sharp(buffer)
    .rotate() // respeta EXIF (no-op si no hay metadatos)
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .normalize()
    .png()
    .toBuffer({ resolveWithObject: true });
  return { base: data, width: info.width, height: info.height };
}

function rotated(base, angle) {
  if (angle === 0) return Promise.resolve(base);
  return sharp(base).rotate(angle).png().toBuffer();
}

/** Franja central (20%–80% de la altura) ampliada 1.5x, donde suele ir el número en horizontal. */
function centralBand(base, width, height) {
  const top = Math.round(height * 0.2);
  const bandHeight = Math.round(height * 0.6);
  return sharp(base)
    .extract({ left: 0, top, width, height: bandHeight })
    .resize({ width: Math.round(width * 1.5) })
    .png()
    .toBuffer();
}

/**
 * Ejecuta el OCR con la estrategia de rotaciones y devuelve el primer resultado válido.
 * @returns {Promise<{cleanCedula: string, nombre: string, apellidos: string, intento: string} | null>}
 */
export async function scanCedulaBuffer(buffer) {
  const worker = await initOcrWorker();
  const { base, width, height } = await preprocess(buffer);
  const isVertical = height > width;

  const attempts = isVertical
    ? [
        { label: '270°', build: () => rotated(base, 270) },
        { label: '90°', build: () => rotated(base, 90) },
        { label: '0°', build: () => rotated(base, 0) }
      ]
    : [
        { label: '0°', build: () => rotated(base, 0) },
        { label: 'franja central', build: () => centralBand(base, width, height) },
        { label: '180°', build: () => rotated(base, 180) }
      ];

  for (const attempt of attempts) {
    const started = Date.now();
    const image = await attempt.build();
    const { data } = await worker.recognize(image);
    const parsed = parseCostaRicanCardText(data?.text || '');
    console.log(`[OCR] Intento ${attempt.label} (${isVertical ? 'vertical' : 'horizontal'}) -> ${parsed ? parsed.cleanCedula : 'sin cédula'} (${Date.now() - started}ms)`);
    if (parsed) return { ...parsed, intento: attempt.label };
  }

  return null;
}
