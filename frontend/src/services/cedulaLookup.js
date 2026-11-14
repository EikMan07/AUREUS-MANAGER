// Servicio transparente de autocompletado y consulta de cédulas costarricenses
// Regla estricta: Cero menciones técnicas a "Hacienda" o "API" en la interfaz
// Escaneo de cédula desde foto (botón "Foto"):
// 1. Principal: la foto se reduce en el teléfono (máx. 1400px, JPEG 0.85) y se envía a POST /api/ocr/cedula,
//    donde el servidor hace el OCR con un worker persistente y consulta Hacienda.
// 2. Respaldo: si el servidor no responde, se usa OCR local con Tesseract.js en el navegador (tope 25 s).
// 3. Extracción tolerante de 9 dígitos numéricos puros SIN guiones (ej: 101110111)

import Tesseract from 'tesseract.js';
import { cleanCedulaDigits, formatCedulaCR } from '../utils/formatters.js';
import { getCsrfToken, setCsrfToken, notifyUnauthorized } from './apiClient.js';

export function toTitleCase(str = '') {
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Separa un nombre oficial costarricense (formato Hacienda: Nombres de pila seguidos de los 2 apellidos al final)
 * Ejemplo: "CARLOS ALBERTO ROJAS MORA" -> Nombre: "Carlos Alberto", Apellidos: "Rojas Mora"
 */
export function parseOfficialFullName(rawFullName = '') {
  const words = rawFullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { nombre: '', apellidos: '' };
  if (words.length === 1) return { nombre: toTitleCase(words[0]), apellidos: '' };
  if (words.length === 2) {
    return {
      nombre: toTitleCase(words[0]),
      apellidos: toTitleCase(words[1])
    };
  }

  // En Costa Rica toda persona tiene 2 apellidos que van SIEMPRE al final:
  // - Las últimas 2 palabras son los Apellidos (ej. "Rojas Mora")
  // - Todas las palabras anteriores son el Nombre de pila (ej. "Carlos Alberto")
  const apellidos = toTitleCase(words.slice(-2).join(' '));
  const nombre = toTitleCase(words.slice(0, -2).join(' '));
  return { nombre, apellidos };
}

/**
 * Consulta transparente de cédula por 9 dígitos
 * Conecta a través del backend proxy /api/hacienda/:cedula con fallback al registro oficial
 */
export async function lookupCedula(cedulaInput, timeoutMs = 11000) {
  const clean = cleanCedulaDigits(cedulaInput);
  if (clean.length !== 9) return null;

  // Consulta mediante el proxy del backend /api/hacienda/:cedula
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const proxyRes = await fetch(`/api/hacienda/${clean}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });

    const headerCsrf = proxyRes.headers.get('x-csrf-token');
    if (headerCsrf) setCsrfToken(headerCsrf);
    if (proxyRes.status === 401) notifyUnauthorized(`/api/hacienda/${clean}`);

    clearTimeout(timeoutId);

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data && data.nombre) {
        return {
          nombre: data.nombre,
          apellidos: data.apellidos || '',
          cedulaFormateada: clean,
          haciendaInfo: {
            status: 'ok',
            esMoroso: Boolean(data.esMoroso),
            omiso: Boolean(data.omiso),
            estadoHacienda: data.estadoHacienda || 'Inscrito',
            nombreOficial: data.nombreOficial || `${data.nombre} ${data.apellidos || ''}`.trim()
          }
        };
      }
    } else if (proxyRes.status === 404) {
      return {
        nombre: '',
        apellidos: '',
        cedulaFormateada: clean,
        haciendaInfo: {
          status: 'not_found',
          esMoroso: false,
          omiso: false,
          estadoHacienda: '',
          nombreOficial: ''
        }
      };
    }
  } catch {
    // Falla de red o timeout en el proxy: retorna fallback silencioso sin llamar directo a Hacienda (evita error CORS en navegador)
  }

  // Si no se encuentra o hay timeout, devolver la cédula sin alterar
  return {
    nombre: '',
    apellidos: '',
    cedulaFormateada: clean,
    haciendaInfo: {
      status: 'error',
      esMoroso: false,
      omiso: false,
      estadoHacienda: '',
      nombreOficial: ''
    }
  };
}

/**
 * Carga un archivo de imagen en un objeto HTMLImageElement en memoria
 */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Entorno sin ventana'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Genera un canvas rotado a color natural con ligero realce de contraste
 * Ancho/alto máximo de 1200px sin binarización destructiva para preservar los números azules
 */
function createRotatedCanvas(img, angleDeg = 0) {
  const MAX_DIM = 1200;
  const rawW = img.naturalWidth || img.width;
  const rawH = img.naturalHeight || img.height;

  let scale = 1;
  const maxDim = Math.max(rawW, rawH);
  if (maxDim > MAX_DIM) {
    scale = MAX_DIM / maxDim;
  }

  const scaledW = Math.max(1, Math.round(rawW * scale));
  const scaledH = Math.max(1, Math.round(rawH * scale));

  const canvas = document.createElement('canvas');
  const normalizedAngle = ((angleDeg % 360) + 360) % 360;

  if (normalizedAngle === 90 || normalizedAngle === 270) {
    canvas.width = scaledH;
    canvas.height = scaledW;
  } else {
    canvas.width = scaledW;
    canvas.height = scaledH;
  }

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normalizedAngle * Math.PI) / 180);

  // Filtro no destructivo a color/grises suave: contraste 1.35 y brillo 1.05
  // Conserva el azul de los números de cédula costarricense
  if (typeof ctx.filter !== 'undefined') {
    ctx.filter = 'contrast(1.35) brightness(1.05)';
  }

  ctx.drawImage(img, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
  ctx.restore();

  return canvas;
}

/**
 * Extracción tolerante a errores de OCR en cédulas de Costa Rica
 * - Elimina primero cualquier fecha DD/MM/YYYY para no confundirla con la cédula
 * - Convierte errores típicos de OCR como O/o por 0 e I/l por 1 en bloques de dígitos
 * - Busca patrón costarricense: provincia [1-9], tomo (4 dígitos), asiento (4 dígitos)
 * - Retorna estrictamente 9 dígitos seguidos sin guiones (ej. 101110111)
 */
export function parseCostaRicanCardText(rawText = '') {
  if (!rawText || typeof rawText !== 'string') return null;

  // 1. Quitar etiquetas y fechas de vencimiento/nacimiento (ej. VENCE: 04/02/2036, EXP: 07/01/2008)
  let s = rawText.replace(/\b(?:vence|vencimiento|nacimiento|f\.\s*nac|expedici[oó]n|fecha|exp)\s*[:.\-]?\s*\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/gi, ' ');

  // 2. Quitar cualquier fecha con barras o guiones (DD/MM/YYYY)
  s = s.replace(/\b\d{1,2}\s*[\/\|\-.]\s*\d{1,2}\s*[\/\|\-.]\s*\d{2,4}\b/g, ' ');

  let cleanCedula = '';

  // 3. Normalizar O/o por 0 e I/l por 1 en bloques de dígitos
  // Buscar patrón costarricense: provincia (1-9), tomo (4 dígitos), asiento (4 dígitos)
  const pattern = /([1-9])[\s\-.,]*([0-9oOlI]{4})[\s\-.,]*([0-9oOlI]{4})/;
  const match = s.match(pattern);
  if (match) {
    const fix = str => str.replace(/[oO]/g, '0').replace(/[lI]/g, '1');
    cleanCedula = `${match[1]}${fix(match[2])}${fix(match[3])}`;
  } else {
    // Fallback: 9 dígitos numéricos puros iniciando de 1 a 9
    const nineMatch = s.match(/\b([1-9]\d{8})\b/);
    if (nineMatch) {
      cleanCedula = nineMatch[1];
    }
  }

  // 4. Buscar nombres y apellidos impresos en la cédula física
  const ap1Match = rawText.match(/(?:1(?:er|°|º|ero)?\s*apellido|primer\s*apellido)\s*[:.\-]?\s*([A-Za-záéíóúñÁÉÍÓÚÑ]+)/i);
  const ap2Match = rawText.match(/(?:2(?:do|°|º|ndo)?\s*apellido|segundo\s*apellido)\s*[:.\-]?\s*([A-Za-záéíóúñÁÉÍÓÚÑ]+)/i);
  const nombreMatch = rawText.match(/(?:nombres?|given\s*names?)\s*[:.\-]?\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s]+?)(?=\n|1|2|f\.|vence|exp|cedula|cédula|$)/i);

  const apellidosFromCard = ap1Match && ap2Match
    ? toTitleCase(`${ap1Match[1]} ${ap2Match[1]}`)
    : (ap1Match ? toTitleCase(ap1Match[1]) : '');

  const nombreFromCard = nombreMatch ? toTitleCase(nombreMatch[1].trim()) : '';

  if (cleanCedula && cleanCedula.length === 9) {
    return {
      cleanCedula,
      cedulaFormateada: cleanCedula, // Estrictamente 9 dígitos numéricos puros sin guiones
      nombre: nombreFromCard,
      apellidos: apellidosFromCard
    };
  }

  return null;
}

const SCAN_TIMEOUT_MS = 25000;
const UPLOAD_MAX_SIDE = 1400;
const UPLOAD_JPEG_QUALITY = 0.85;

/**
 * Reduce la foto en el teléfono antes de subirla (máx. 1400px, JPEG 0.85).
 * Los navegadores modernos aplican la orientación EXIF al dibujar el <img>, así que los píxeles
 * enviados ya vienen derechos cuando la foto tiene metadatos.
 */
async function resizeForUpload(img) {
  const rawW = img.naturalWidth || img.width;
  const rawH = img.naturalHeight || img.height;
  const scale = Math.min(1, UPLOAD_MAX_SIDE / Math.max(rawW, rawH));

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(rawW * scale));
  canvas.height = Math.max(1, Math.round(rawH * scale));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen'))),
      'image/jpeg',
      UPLOAD_JPEG_QUALITY
    );
  });
}

/**
 * OCR en el servidor: POST /api/ocr/cedula.
 * - Devuelve { cedula, cleanCedula, nombre, apellidos } si se detectó la cédula.
 * - Devuelve null si el servidor procesó la foto pero no encontró cédula (HTTP 422).
 * - Lanza error si el servidor no respondió o falló, para activar el respaldo local.
 */
async function scanOnServer(img) {
  const blob = await resizeForUpload(img);
  const form = new FormData();
  form.append('imagen', blob, 'cedula.jpg');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

  try {
    const csrfToken = getCsrfToken();
    const res = await fetch('/api/ocr/cedula', {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
      body: form,
      signal: controller.signal
    });

    const headerCsrf = res.headers.get('x-csrf-token');
    if (headerCsrf) setCsrfToken(headerCsrf);
    if (res.status === 401) notifyUnauthorized('/api/ocr/cedula');

    if (res.status === 422) return null;
    if (!res.ok) throw new Error(`Servidor OCR respondió ${res.status}`);

    const data = await res.json();
    const clean = cleanCedulaDigits(data?.cedula || '');
    if (clean.length !== 9) return null;

    return {
      cedula: clean,
      cleanCedula: clean,
      nombre: data.nombre || '',
      apellidos: data.apellidos || '',
      haciendaInfo: data.haciendaInfo || null
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Respaldo: OCR local con Tesseract.js en el navegador (solo si el servidor no responde).
 * Rotaciones adaptativas: vertical 270° → 90° → 0°; horizontal 0° → 180° → 270°.
 */
async function scanLocally(img) {
  let worker = null;
  let timeoutId = null;

  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(null), SCAN_TIMEOUT_MS);
  });

  const scanTask = (async () => {
    try {
      const isVertical = (img.naturalHeight || img.height) > (img.naturalWidth || img.width);
      const anglesToTry = isVertical ? [270, 90, 0] : [0, 180, 270];

      try {
        worker = await Tesseract.createWorker('spa');
      } catch {
        try {
          worker = await Tesseract.createWorker('eng');
        } catch {
          worker = null;
        }
      }

      for (const angle of anglesToTry) {
        // Pausa para mantener la animación del spinner activa
        await new Promise(r => setTimeout(r, 50));

        const canvas = createRotatedCanvas(img, angle);
        let ocrText = '';
        if (worker) {
          const ret = await worker.recognize(canvas);
          ocrText = ret?.data?.text || '';
        } else {
          const res = await Tesseract.recognize(canvas, 'eng');
          ocrText = res?.data?.text || '';
        }

        const cardData = parseCostaRicanCardText(ocrText);
        if (cardData && cardData.cleanCedula) {
          const cleanCedula = cardData.cleanCedula;
          let officialData = null;
          try {
            officialData = await lookupCedula(cleanCedula, 3000);
          } catch {
            // Continuar con datos de la tarjeta si la red demora
          }
          return {
            cedula: cleanCedula,
            cleanCedula,
            nombre: officialData?.nombre || cardData.nombre || '',
            apellidos: officialData?.apellidos || cardData.apellidos || '',
            haciendaInfo: officialData?.haciendaInfo || null
          };
        }
      }
      return null;
    } catch (err) {
      console.warn('Inconveniente durante escaneo local de imagen:', err);
      return null;
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch {
          // Worker terminado
        }
      }
    }
  })();

  try {
    return await Promise.race([scanTask, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Punto de entrada del botón "Foto": servidor primero, OCR local solo si el servidor no responde.
 */
export async function scanCedulaFromImageFile(file) {
  if (!file) return null;

  // Micro-pausa para que el spinner empiece a girar antes del trabajo pesado
  await new Promise(r => setTimeout(r, 60));

  let img;
  try {
    img = await loadImageFromFile(file);
  } catch (err) {
    console.warn('No se pudo leer la imagen seleccionada:', err);
    return null;
  }

  try {
    return await scanOnServer(img);
  } catch (err) {
    console.warn('Servidor OCR no disponible, usando OCR local como respaldo:', err?.message || err);
    return scanLocally(img);
  }
}
