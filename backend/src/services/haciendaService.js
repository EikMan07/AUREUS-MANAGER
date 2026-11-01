// Servicio compartido de consulta al padrón de Hacienda CR.
// Lo usan tanto el endpoint /api/hacienda/:cedula como el OCR /api/ocr/cedula.

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
  // - Las últimas 2 palabras son los Apellidos (ej. "Abarca Murillo")
  // - Todas las palabras anteriores son el Nombre de pila (ej. "Eiker Manuel")
  const apellidos = toTitleCase(words.slice(-2).join(' '));
  const nombre = toTitleCase(words.slice(0, -2).join(' '));
  return { nombre, apellidos };
}

/**
 * Consulta Hacienda CR por cédula de 9 dígitos.
 * @returns {Promise<{status: 'ok'|'not_found'|'error'|'timeout', nombre?: string, apellidos?: string}>}
 */
export async function fetchHaciendaByCedula(cleanCedula, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://api.hacienda.go.cr/fe/ae?identificacion=${cleanCedula}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    if (!response.ok) {
      return { status: response.status === 404 ? 'not_found' : 'error' };
    }

    const data = await response.json();
    if (!data || !data.nombre) {
      return { status: 'not_found' };
    }

    const { nombre, apellidos } = parseOfficialFullName(data.nombre);
    return { status: 'ok', nombre, apellidos };
  } catch (err) {
    if (err.name === 'AbortError') return { status: 'timeout' };
    console.error('[Hacienda] Error de consulta:', err.message);
    return { status: 'error' };
  } finally {
    clearTimeout(timeout);
  }
}
