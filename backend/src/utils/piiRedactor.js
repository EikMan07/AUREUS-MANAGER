// backend/src/utils/piiRedactor.js
// Enmascarador automático de datos personales (PII) para logs técnicos conforme a la Ley N.° 8968.

const UUID_REGEX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const CEDULA_DASHED_REGEX = /\b\d-\d{4}-\d{4}\b/g;
const CEDULA_9_REGEX = /\b\d{9}\b/g;
const PHONE_REGEX = /(?:\+\d{1,3}[\s-]?)?\b\d{4}[\s-]?\d{4}\b/g;

export function redactarPII(textoOMensaje) {
  if (textoOMensaje === null || textoOMensaje === undefined) {
    return '';
  }

  let raw = '';
  if (typeof textoOMensaje === 'string') {
    raw = textoOMensaje;
  } else if (textoOMensaje instanceof Error) {
    raw = `${textoOMensaje.name || 'Error'}: ${textoOMensaje.message || ''}`;
  } else {
    try {
      raw = JSON.stringify(textoOMensaje);
    } catch {
      raw = String(textoOMensaje);
    }
  }

  return raw
    .replace(UUID_REGEX, '[uuid]')
    .replace(EMAIL_REGEX, '[email]')
    .replace(CEDULA_DASHED_REGEX, '[cedula]')
    .replace(CEDULA_9_REGEX, '[cedula]')
    .replace(PHONE_REGEX, '[phone]');
}

export default redactarPII;
