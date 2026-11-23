import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const SUPPORTED_TEXT_MIMES = new Set([
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/csv',
  'application/csv',
  'text/tab-separated-values'
]);

const SUPPORTED_JSON_MIMES = new Set([
  'application/json',
  'text/json',
  'application/ld+json'
]);

const SUPPORTED_TEXT_EXTS = ['.txt', '.md'];

function createUnsupportedFormatError() {
  const err = new Error('Formato de archivo no compatible');
  err.statusCode = 400;
  err.userMessage =
    'Formato de archivo no compatible. Sube documentos TXT, Markdown, CSV, JSON, PDF o Word.';
  return err;
}

/**
 * Parsea contenido CSV siguiendo RFC-4180 basico con soporte para comillas y saltos internos.
 */
function parseCsvFilas(contenido) {
  const filas = [];
  let filaActual = [];
  let campoActual = '';
  let enComillas = false;
  const texto = String(contenido || '').replace(/^\uFEFF/, '');

  for (let i = 0; i < texto.length; i += 1) {
    const char = texto[i];
    const siguiente = texto[i + 1];

    if (enComillas) {
      if (char === '"' && siguiente === '"') {
        campoActual += '"';
        i += 1;
      } else if (char === '"') {
        enComillas = false;
      } else {
        campoActual += char;
      }
      continue;
    }

    if (char === '"') {
      enComillas = true;
    } else if (char === ',') {
      filaActual.push(campoActual.trim());
      campoActual = '';
    } else if (char === '\r' && siguiente === '\n') {
      filaActual.push(campoActual.trim());
      filas.push(filaActual);
      filaActual = [];
      campoActual = '';
      i += 1;
    } else if (char === '\n' || char === '\r') {
      filaActual.push(campoActual.trim());
      filas.push(filaActual);
      filaActual = [];
      campoActual = '';
    } else {
      campoActual += char;
    }
  }

  if (campoActual.length > 0 || filaActual.length > 0) {
    filaActual.push(campoActual.trim());
    filas.push(filaActual);
  }

  return filas.filter((fila) => fila.some((celda) => celda.length > 0));
}

function normalizarEtiquetaLegible(valor) {
  return String(valor || '')
    .replace(/_/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function asegurarPuntuacionFinal(texto) {
  const limpio = String(texto || '').trim();
  if (!limpio) return '';
  return /[.!?:]$/.test(limpio) ? limpio : `${limpio}.`;
}

/**
 * Convierte un CSV tabular en enunciados semanticos limpios por fila ("Columna: Valor. ...").
 */
export function convertirCsvATextoLegible(contenido) {
  const filas = parseCsvFilas(contenido);
  if (filas.length === 0) {
    return '';
  }

  if (filas.length === 1) {
    return asegurarPuntuacionFinal(filas[0].filter(Boolean).join('. '));
  }

  const encabezados = filas[0].map((col, idx) =>
    normalizarEtiquetaLegible(col) || `Columna ${idx + 1}`
  );
  const lineas = [];

  for (let i = 1; i < filas.length; i += 1) {
    const celdas = filas[i];
    const partes = [];
    const totalCols = Math.max(encabezados.length, celdas.length);

    for (let c = 0; c < totalCols; c += 1) {
      const valor = String(celdas[c] ?? '').replace(/\.+$/, '').trim();
      if (!valor) {
        continue;
      }
      const cabecera = encabezados[c] || `Columna ${c + 1}`;
      partes.push(`${cabecera}: ${valor}`);
    }

    if (partes.length > 0) {
      lineas.push(`${partes.join('. ')}.`);
    }
  }

  return lineas.join('\n').trim();
}

function aplanarJsonLegible(valor, ruta = '', lineas = []) {
  if (valor === null || valor === undefined) {
    return lineas;
  }

  if (Array.isArray(valor)) {
    if (valor.length === 0) {
      return lineas;
    }

    const todosPrimitivos = valor.every(
      (item) => item === null || (typeof item !== 'object')
    );

    if (todosPrimitivos) {
      const elementos = valor
        .filter((item) => item !== null && item !== undefined && String(item).trim() !== '')
        .map((item) => String(item).trim());
      if (elementos.length > 0) {
        const linea = ruta ? `${ruta}: ${elementos.join(', ')}` : elementos.join(', ');
        lineas.push(asegurarPuntuacionFinal(linea));
      }
      return lineas;
    }

    valor.forEach((item, idx) => {
      const subRuta = ruta ? `${ruta} - Registro ${idx + 1}` : `Registro ${idx + 1}`;
      aplanarJsonLegible(item, subRuta, lineas);
    });
    return lineas;
  }

  if (typeof valor === 'object') {
    const entradas = Object.entries(valor);
    for (const [clave, subValor] of entradas) {
      if (subValor === null || subValor === undefined) {
        continue;
      }
      const claveLimpia = normalizarEtiquetaLegible(clave);
      const nuevaRuta = ruta ? `${ruta} - ${claveLimpia}` : claveLimpia;
      aplanarJsonLegible(subValor, nuevaRuta, lineas);
    }
    return lineas;
  }

  const texto = String(valor).trim();
  if (texto.length > 0) {
    const linea = ruta ? `${ruta}: ${texto}` : texto;
    lineas.push(asegurarPuntuacionFinal(linea));
  }
  return lineas;
}

/**
 * Convierte un objeto JSON a texto estructurado sin llaves ni corchetes para indexacion RAG.
 */
export function convertirJsonATextoLegible(contenido) {
  const textoLimpio = String(contenido || '').replace(/^\uFEFF/, '').trim();
  if (!textoLimpio) {
    return '';
  }

  let parsed;
  try {
    parsed = JSON.parse(textoLimpio);
  } catch (_err) {
    const err = new Error('El contenido JSON no es valido');
    err.statusCode = 400;
    err.userMessage = 'El documento JSON seleccionado no tiene una estructura valida.';
    throw err;
  }

  const lineas = aplanarJsonLegible(parsed);
  return lineas.join('\n').trim();
}

/**
 * Extrae texto plano desde buffers .txt, .pdf o .docx.
 *
 * @param {Buffer|Uint8Array} buffer
 * @param {string} [mimetype='']
 * @param {string} [nombreArchivo='']
 * @returns {Promise<string>}
 */
export async function extraerTexto(
  buffer,
  mimetype = '',
  nombreArchivo = ''
) {
  if (!buffer || buffer.length === 0) {
    const err = new Error('El archivo recibido está vacío.');
    err.statusCode = 400;
    err.userMessage = 'El documento seleccionado está vacío y no se puede procesar.';
    throw err;
  }

  const mime = String(mimetype || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const nombre = String(nombreArchivo || '').trim().toLowerCase();
  const dataBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  if (mime === 'application/pdf' || nombre.endsWith('.pdf')) {
    const pdf = await getDocumentProxy(new Uint8Array(dataBuffer));
    const { text } = await extractText(pdf, { mergePages: false });
    const textoPdf = Array.isArray(text)
      ? text
          .map((pagina) => String(pagina || '').trim())
          .filter(Boolean)
          .join('\n\n')
      : String(text || '');
    return textoPdf
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  if (
    mime === DOCX_MIME ||
    mime.includes('wordprocessingml') ||
    nombre.endsWith('.docx')
  ) {
    const { value } = await mammoth.extractRawText({ buffer: dataBuffer });
    return String(value || '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  if (mime === 'text/csv' || mime === 'application/csv' || nombre.endsWith('.csv')) {
    return convertirCsvATextoLegible(dataBuffer.toString('utf8'));
  }

  if (SUPPORTED_JSON_MIMES.has(mime) || nombre.endsWith('.json')) {
    return convertirJsonATextoLegible(dataBuffer.toString('utf8'));
  }

  if (
    SUPPORTED_TEXT_MIMES.has(mime) ||
    mime.startsWith('text/') ||
    SUPPORTED_TEXT_EXTS.some((ext) => nombre.endsWith(ext))
  ) {
    return dataBuffer.toString('utf8').replace(/^\uFEFF/, '').trim();
  }

  throw createUnsupportedFormatError();
}

export default {
  extraerTexto
};
