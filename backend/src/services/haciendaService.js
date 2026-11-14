// Servicio compartido de consulta al padrón de Hacienda CR.
// Lo usan tanto el endpoint /api/hacienda/:cedula como el OCR /api/ocr/cedula.

const haciendaCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas

export function toTitleCase(str = '') {
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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
 * Consulta Hacienda CR por cédula de 9 dígitos.
 * @returns {Promise<{status: 'ok'|'not_found'|'error'|'timeout', nombre?: string, apellidos?: string}>}
 */
export async function fetchHaciendaByCedula(cleanCedula, timeoutMs = 10000) {
  // Verificar memoria caché primero para respuesta instantánea (<1ms)
  const cached = haciendaCache.get(cleanCedula);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cleanCedula}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    if (!response.ok) {
      const errResult = { status: response.status === 404 ? 'not_found' : 'error' };
      if (response.status === 404) {
        haciendaCache.set(cleanCedula, { data: errResult, timestamp: Date.now() });
      }
      return errResult;
    }

    const data = await response.json();
    if (!data || !data.nombre) {
      const notFoundResult = { status: 'not_found' };
      haciendaCache.set(cleanCedula, { data: notFoundResult, timestamp: Date.now() });
      return notFoundResult;
    }

    const { nombre, apellidos } = parseOfficialFullName(data.nombre);
    const situacionObj = data?.situacion || {};
    const morosoRaw = String(situacionObj.moroso || 'NO').toUpperCase().trim();
    const omisoRaw = String(situacionObj.omiso || 'NO').toUpperCase().trim();
    const esMoroso = morosoRaw === 'SI' || morosoRaw === 'SÍ' || morosoRaw === 'TRUE';
    const estadoTributario = String(situacionObj.estado || 'Inscrito').trim();

    const okResult = {
      status: 'ok',
      nombre,
      apellidos,
      nombreOficial: data.nombre,
      esMoroso,
      omiso: omisoRaw === 'SI' || omisoRaw === 'SÍ' || omisoRaw === 'TRUE',
      estadoHacienda: estadoTributario,
      situacion: situacionObj
    };

    haciendaCache.set(cleanCedula, { data: okResult, timestamp: Date.now() });
    return okResult;
  } catch (err) {
    if (err.name === 'AbortError') return { status: 'timeout' };
    console.error('[Hacienda] Error de consulta:', err.message);
    return { status: 'error' };
  } finally {
    clearTimeout(timeout);
  }
}
