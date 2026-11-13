import { parseStoredPhone, formatDigitsByGroups, normalizePhoneKey } from './phoneCountries.js';

// Formatting utilities for Costa Rican Colones and financial dates
// Sincronización precisa con huso horario de Costa Rica (America/Costa_Rica)

export function formatColones(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₡0';
  // Formatea con comas separadoras de miles y millones (ej. ₡1,000 · ₡132,000 · ₡1,000,000)
  const rounded = Math.round(Number(amount));
  const parts = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `₡${parts}`;
}

/**
 * Extrae únicamente los dígitos numéricos (0-9) y aplica comas (,) separadoras
 * de miles y millones en tiempo real mientras el usuario escribe:
 * - 1 a 3 dígitos: "100" -> "100"
 * - 4+ dígitos: "1000" -> "1,000", "23000" -> "23,000", "1000000" -> "1,000,000"
 */
export function formatAmountWithCommas(value = '') {
  if (value === undefined || value === null || value === '') return '';
  const rawDigits = String(value).replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!rawDigits) return '';
  return rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formatea un monto numérico proveniente de PostgreSQL (ej. "120000.00" o 120000)
 * para inicializar un input sin decimales ".00" y con comas separadoras de miles.
 */
export function formatInitialAmountInput(dbValue) {
  const num = Math.round(Number(dbValue || 0));
  if (!num || num <= 0) return '';
  return formatAmountWithCommas(String(num));
}

/**
 * Convierte un texto formateado con comas (ej. "120,000") a su valor numérico puro (120000).
 */
export function parseFormattedAmount(formattedValue = '') {
  if (typeof formattedValue === 'number') return Math.round(formattedValue);
  const rawDigits = String(formattedValue || '').replace(/,/g, '').replace(/\D/g, '');
  if (!rawDigits) return 0;
  return Number(rawDigits) || 0;
}

export function cleanNamePart(val) {
  if (!val || val === 'null' || val === 'undefined') return '';
  return String(val)
    .replace(/\bnull\b/gi, '')
    .replace(/\bundefined\b/gi, '')
    .trim();
}

export function formatFullName(nombre = '', apellidos = '') {
  const n = cleanNamePart(nombre);
  const a = cleanNamePart(apellidos);
  return [n, a].filter(Boolean).join(' ') || 'Cliente';
}

export function getInitials(nombre = '', apellidos = '') {
  const n = cleanNamePart(nombre).charAt(0).toUpperCase() || 'C';
  const a = cleanNamePart(apellidos).charAt(0).toUpperCase() || '';
  return `${n}${a}`;
}

export const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const SPANISH_MONTHS_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'set', 'oct', 'nov', 'dic'
];

export const SPANISH_WEEKDAYS = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

export const SPANISH_WEEKDAYS_SHORT = [
  'Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'
];

export const SPANISH_DAY_KEYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export function getDayNameFromKey(key) {
  const map = {
    'LUN': 'Lunes',
    'MAR': 'Martes',
    'MIÉ': 'Miércoles',
    'JUE': 'Jueves',
    'VIE': 'Viernes',
    'SÁB': 'Sábado',
    'DOM': 'Domingo'
  };
  return map[key] || key;
}

/**
 * Obtiene la fecha actual en la zona horaria de Costa Rica (America/Costa_Rica, UTC-6)
 * Garantiza que siempre devuelva la medianoche del día calendario costarricense.
 */
export function getCostaRicaNow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const partMap = {};
  parts.forEach(p => { partMap[p.type] = p.value; });
  return new Date(
    parseInt(partMap.year, 10),
    parseInt(partMap.month, 10) - 1,
    parseInt(partMap.day, 10)
  );
}

/**
 * Formatea un objeto Date al estándar ISO YYYY-MM-DD
 */
export function formatDateToISO(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Extrae de forma segura la parte YYYY-MM-DD de cualquier cadena ISO (ej. 2026-10-25T06:00:00.000Z)
 * o instancia Date, evitando desfases de zona horaria.
 */
export function extractISODatePart(dateInput) {
  if (!dateInput) return '';
  if (dateInput instanceof Date) {
    return formatDateToISO(dateInput);
  }
  const str = String(dateInput).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return str.slice(0, 10);
}

/**
 * Parsea un string YYYY-MM-DD o timestamp ISO a un objeto Date local en Costa Rica
 */
export function parseISODate(isoString) {
  const cleanISO = extractISODatePart(isoString);
  if (!cleanISO) return getCostaRicaNow();
  const [y, m, d] = cleanISO.split('-').map(Number);
  if (!y || !m || !d) return getCostaRicaNow();
  return new Date(y, m - 1, d);
}

/**
 * Formatea cualquier fecha YYYY-MM-DD o ISO (ej. 2026-10-25T06:00:00.000Z)
 * en español corto ejecutivo sin desfase de zona horaria:
 * - Con año (por defecto): "Dom, 25 de oct 2026" / "Sáb, 7 de nov 2026"
 * - Sin año (includeYear = false): "Sáb, 7 de nov"
 */
export function formatShortSpanishDate(dateInput, includeYear = true) {
  const cleanISO = extractISODatePart(dateInput);
  if (!cleanISO) return '';
  const [y, m, d] = cleanISO.split('-').map(Number);
  if (!y || !m || !d) return cleanISO;
  const dateObj = new Date(y, m - 1, d);
  const weekdayShort = SPANISH_WEEKDAYS_SHORT[dateObj.getDay()];
  const monthShort = SPANISH_MONTHS_SHORT[m - 1];
  if (!includeYear) {
    return `${weekdayShort}, ${d} de ${monthShort}`;
  }
  return `${weekdayShort}, ${d} de ${monthShort} ${y}`;
}

/**
 * Compara si dos fechas corresponden al mismo día calendario
 */
export function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function formatDateToFullSpanish(year, monthIndex, day) {
  const d = new Date(year, monthIndex, day);
  const weekday = SPANISH_WEEKDAYS[d.getDay()];
  const monthName = SPANISH_MONTHS[monthIndex];
  return `${weekday}, ${day} de ${monthName} de ${year}`;
}

export function formatDateObjectToFullSpanish(date) {
  if (!date) return '';
  return formatDateToFullSpanish(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatISODateToFullSpanish(isoString) {
  const cleanISO = extractISODatePart(isoString);
  if (!cleanISO) return '';
  const [y, m, d] = cleanISO.split('-').map(Number);
  if (!y || !m || !d) return cleanISO;
  return formatDateToFullSpanish(y, m - 1, d);
}

export function getDayKeyFromISO(isoString) {
  const cleanISO = extractISODatePart(isoString);
  if (!cleanISO) return 'SÁB';
  const [y, m, d] = cleanISO.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return SPANISH_DAY_KEYS[date.getDay()];
}

export function getDayKeyFromDate(date) {
  if (!date) return 'SÁB';
  return SPANISH_DAY_KEYS[date.getDay()];
}

/**
 * Calcula los 7 días de la semana (Lunes a Domingo) para cualquier fecha base dada.
 * Devuelve un array de 7 objetos listos para la barra semanal y cálculos de cobro.
 */
export function getWeekDaysForDate(dateInput = getCostaRicaNow()) {
  const d = dateInput instanceof Date ? new Date(dateInput.getTime()) : parseISODate(dateInput);
  d.setHours(0, 0, 0, 0);

  const dayOfWeek = d.getDay(); // 0 es Domingo, 1 es Lunes, ..., 6 es Sábado
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const today = getCostaRicaNow();
  const keys = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
  const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const days = [];

  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const y = current.getFullYear();
    const m = current.getMonth();
    const dayNum = current.getDate();
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    days.push({
      key: keys[i],
      name: names[i],
      dayNum,
      dateISO: iso,
      dateObj: current,
      isToday: isSameDay(current, today),
      fullDate: `${names[i]}, ${dayNum} de ${SPANISH_MONTHS[m]} de ${y}`
    });
  }

  return days;
}

export function calculateNextCobroDate(client, currentDateISO) {
  const baseDate = currentDateISO ? parseISODate(currentDateISO) : getCostaRicaNow();
  const daysToAdd = client.frecuencia === 'quincenal' ? 14 : 7;
  baseDate.setDate(baseDate.getDate() + daysToAdd);

  const dayOfWeekName = SPANISH_WEEKDAYS[baseDate.getDay()];
  const dayNum = baseDate.getDate();
  const monthName = SPANISH_MONTHS[baseDate.getMonth()];
  const year = baseDate.getFullYear();

  if (client.frecuencia === 'quincenal') {
    return `Siguiente quincena · ${dayNum} de ${monthName} de ${year}`;
  }
  return `Siguiente ${dayOfWeekName} · ${dayNum} de ${monthName} de ${year}`;
}

export function cleanCedulaDigits(value = '') {
  return (value || '').toString().replace(/\D/g, '').slice(0, 9);
}

export function formatCedulaCR(value = '') {
  // Estrictamente 9 dígitos numéricos puros con ceros y SIN guiones en todos los módulos
  return cleanCedulaDigits(value);
}

export function formatPhone(value = '') {
  if (!value) return '';
  const parsed = parseStoredPhone(value);
  if (!parsed.digits) return String(value).trim();
  return `${parsed.country.code} ${parsed.formatted}`.trim();
}

export function formatTelefonoCR(value = '') {
  return formatPhone(value);
}

export const normalizeName = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function namesMatchSamePerson(nomA, apeA, nomB, apeB) {
  const nA = normalizeName(nomA);
  const aA = normalizeName(apeA);
  const nB = normalizeName(nomB);
  const aB = normalizeName(apeB);
  if (!nA || !nB) return false;
  const fullA = `${nA} ${aA}`.trim();
  const fullB = `${nB} ${aB}`.trim();
  if (fullA === fullB) return true;
  if (fullA.includes(fullB) || fullB.includes(fullA)) return true;
  const firstTokenA = nA.split(' ')[0];
  const firstTokenB = nB.split(' ')[0];
  if (firstTokenA && firstTokenB && firstTokenA === firstTokenB) {
    if (!aA || !aB) return true;
    const firstApeA = aA.split(' ')[0];
    const firstApeB = aB.split(' ')[0];
    if (aA.includes(aB) || aB.includes(aA) || firstApeA === firstApeB) return true;
  }
  return false;
}

/**
 * Normaliza un texto para búsquedas inteligentes convirtiendo a minúsculas
 * y eliminando tildes y diacríticos (ej. "San José" -> "san jose", "Puntarenas" -> "puntarenas").
 */
export function normalizeSearchText(str = '') {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Evalúa en tiempo real si un cliente coincide con el término de búsqueda multi-criterio:
 * - Nombre y Apellidos
 * - Número de Cédula (con o sin guiones)
 * - Teléfono (con código de país ej. +506 8888-8888, con guion 8888-8888 o dígitos continuos 88888888)
 * - Ubicación (ej. Puntarenas, Chacarita, Barranca, etc. sin importar tildes o mayúsculas)
 * - Detalles
 */
export function matchesClientSearch(cliente, rawSearch = '') {
  const normalizedQuery = normalizeSearchText(rawSearch);
  if (!normalizedQuery) return true;

  const rawTel = cliente?.telefono || cliente?.cliente_telefono || '';
  const telefonoFormatted = formatPhone(rawTel);
  const telefonoKey = normalizePhoneKey(rawTel);

  const rawTelSec = cliente?.telefono_secundario || cliente?.cliente_telefono_secundario || '';
  const telSecFormatted = formatPhone(rawTelSec);
  const telSecKey = normalizePhoneKey(rawTelSec);
  const telSecDigits = String(rawTelSec).replace(/\D/g, '');
  const telSecNorm = normalizeSearchText(rawTelSec);
  const telSecFormattedNorm = normalizeSearchText(telSecFormatted);

  const nombreNorm = normalizeSearchText(cliente?.nombre || cliente?.cliente_nombre);
  const apellidosNorm = normalizeSearchText(cliente?.apellidos || cliente?.cliente_apellidos);
  const nombreCompletoNorm = `${nombreNorm} ${apellidosNorm}`.trim();
  const cedulaNorm = normalizeSearchText(cliente?.cedula || cliente?.cliente_cedula);
  const cedulaDigits = cleanCedulaDigits(cliente?.cedula || cliente?.cliente_cedula);
  const telefonoNorm = normalizeSearchText(rawTel);
  const telefonoFormattedNorm = normalizeSearchText(telefonoFormatted);
  const telefonoDigits = String(rawTel).replace(/\D/g, '');
  const ubicacionNorm = normalizeSearchText(cliente?.ubicacion || cliente?.cliente_ubicacion || cliente?.address);
  const detallesNorm = normalizeSearchText(cliente?.detalles || cliente?.cliente_detalles || cliente?.motivo);

  const combinedSearchable = [
    nombreCompletoNorm,
    cedulaNorm,
    cedulaDigits,
    telefonoNorm,
    telefonoFormattedNorm,
    telefonoKey,
    telefonoDigits,
    telSecNorm,
    telSecFormattedNorm,
    telSecKey,
    telSecDigits,
    ubicacionNorm,
    detallesNorm
  ].join(' ');

  // Verificar coincidencia directa o por cada palabra escrita
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const queryDigits = rawSearch.replace(/\D/g, '');

  const allTokensMatch = tokens.every((token) => {
    const tokenDigits = token.replace(/\D/g, '');
    if (
      tokenDigits.length > 0 &&
      tokenDigits === token &&
      (cedulaDigits.includes(tokenDigits) || telefonoDigits.includes(tokenDigits) || (telSecDigits && telSecDigits.includes(tokenDigits)))
    ) {
      return true;
    }
    return combinedSearchable.includes(token);
  });

  if (allTokensMatch) return true;

  if (queryDigits.length > 0 && (cedulaDigits.includes(queryDigits) || telefonoDigits.includes(queryDigits) || (telSecDigits && telSecDigits.includes(queryDigits)))) {
    return true;
  }

  return false;
}

const DIA_SEMANA_ENUM_ORDER = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

function addDaysToISO(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dateObj.setUTCDate(dateObj.getUTCDate() + days);
  return dateObj.toISOString().slice(0, 10);
}

function getDaysInMonthUTC(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Genera el arreglo completo de fechas ISO de cobro de un préstamo
 * idéntico a la lógica del backend.
 */
export function calculateLoanScheduleDates({
  fechaInicio,
  modalidad = 'SEMANAL',
  quincenalTipo = 'DIAS_MES', // 'DIAS_MES' | 'CADA_2_SEMANAS'
  diaFijoSemanal = 'SABADO',
  totalPeriodos = 10
}) {
  const cleanStart = extractISODatePart(fechaInicio) || formatDateToISO(getCostaRicaNow());
  const n = Math.max(1, parseInt(totalPeriodos, 10) || 1);
  const dates = [];

  if (modalidad === 'SEMANAL') {
    const targetDayIndex = DIA_SEMANA_ENUM_ORDER.indexOf(diaFijoSemanal);
    const [y, m, d] = cleanStart.split('-').map(Number);
    const startDateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const startDayIndex = startDateObj.getUTCDay();

    let daysToFirst = (targetDayIndex - startDayIndex + 7) % 7;
    if (daysToFirst === 0) daysToFirst = 7;

    let currentDateStr = addDaysToISO(cleanStart, daysToFirst);
    for (let i = 1; i <= n; i++) {
      dates.push(currentDateStr);
      currentDateStr = addDaysToISO(currentDateStr, 7);
    }
  } else if (quincenalTipo === 'CADA_2_SEMANAS') {
    const targetDayIndex = DIA_SEMANA_ENUM_ORDER.indexOf(diaFijoSemanal);
    const [y, m, d] = cleanStart.split('-').map(Number);
    const startDateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const startDayIndex = startDateObj.getUTCDay();

    const daysToNextTarget = (targetDayIndex - startDayIndex + 7) % 7;
    const daysToFirst = (daysToNextTarget === 0 ? 7 : daysToNextTarget) + 7;

    let currentDateStr = addDaysToISO(cleanStart, daysToFirst);
    for (let i = 1; i <= n; i++) {
      dates.push(currentDateStr);
      currentDateStr = addDaysToISO(currentDateStr, 14);
    }
  } else {
    // QUINCENAL - Día 15 y fin de mes
    const d1 = 15;
    const d2 = 31;
    const [y, m, d] = cleanStart.split('-').map(Number);
    let curY = y;
    let curM = m;

    const dimCurrent = getDaysInMonthUTC(curY, curM);
    const actD1 = Math.min(d1, dimCurrent);
    const actD2 = Math.min(d2, dimCurrent);

    let nextTargetD = null;
    if (d < actD1) {
      nextTargetD = actD1;
    } else if (d < actD2) {
      nextTargetD = actD2;
    } else {
      curM += 1;
      if (curM > 12) {
        curM = 1;
        curY += 1;
      }
      nextTargetD = Math.min(d1, getDaysInMonthUTC(curY, curM));
    }

    for (let i = 1; i <= n; i++) {
      const dateStr = `${curY}-${String(curM).padStart(2, '0')}-${String(nextTargetD).padStart(2, '0')}`;
      dates.push(dateStr);

      if (nextTargetD === Math.min(d1, getDaysInMonthUTC(curY, curM))) {
        nextTargetD = Math.min(d2, getDaysInMonthUTC(curY, curM));
      } else {
        curM += 1;
        if (curM > 12) {
          curM = 1;
          curY += 1;
        }
        nextTargetD = Math.min(d1, getDaysInMonthUTC(curY, curM));
      }
    }
  }

  return dates;
}

/**
 * Calcula la fecha de inicio estimada hacia atrás al registrar un préstamo avanzado
 */
export function calculateShiftedStartDateForAdvancedLoan({
  baseDateISO,
  paidCount,
  modalidad = 'SEMANAL',
  quincenalTipo = 'DIAS_MES'
}) {
  const cleanBase = extractISODatePart(baseDateISO) || formatDateToISO(getCostaRicaNow());
  const count = Math.max(0, parseInt(paidCount, 10) || 0);
  if (count === 0) return cleanBase;

  if (modalidad === 'SEMANAL') {
    return addDaysToISO(cleanBase, -(count * 7));
  } else if (quincenalTipo === 'CADA_2_SEMANAS') {
    return addDaysToISO(cleanBase, -(count * 14));
  } else {
    return addDaysToISO(cleanBase, -(count * 15));
  }
}

/**
 * Calcula en vivo el calendario de fechas de un préstamo (idéntico al backend)
 * y retorna la fecha del primer cobro y del último cobro formateadas en español claro.
 */
export function calculateLoanSchedulePreview(params) {
  const dates = calculateLoanScheduleDates(params);
  const primerCobroISO = dates[0] || '';
  const ultimoCobroISO = dates[dates.length - 1] || '';

  return {
    primerCobroISO,
    ultimoCobroISO,
    primerCobroTexto: primerCobroISO ? formatShortSpanishDate(primerCobroISO, true) : '—',
    ultimoCobroTexto: ultimoCobroISO ? formatShortSpanishDate(ultimoCobroISO, true) : '—'
  };
}

