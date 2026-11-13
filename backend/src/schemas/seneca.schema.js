const DEFAULT_SUGGESTIONS = [
  '¿Cuáles cobros están programados para mañana y los próximos días?',
  '¿Cuántos cobros tengo programados para hoy?',
  '¿Cuáles clientes tienen cuotas atrasadas acumuladas?',
  '¿Cuánto dinero me debe actualmente cada cliente?',
  '¿Cuántas personas hay en Lista Negra y en Papelera?',
];

const VALID_CONFIDENCES = new Set(['alta', 'media', 'baja']);

const FORBIDDEN_SUGGESTION_RX =
  /\b(desea|deseas|desean|quiere|quieres|quieren|necesita|necesitas|necesitan|gustar[ií]a|le gustaria|te gustaria|prefiere|prefieres|programar un cobro|agendar un cobro|contactar|llamar a|enviar mensaje|mandar mensaje|registrar un pago|cobrar ahora|modificar el pr[eé]stamo)\b/i;

export function normalizeQuestionKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isNearDuplicateQuestion(candidateKey, excludedSet) {
  if (!candidateKey) return true;
  if (excludedSet.has(candidateKey)) return true;

  const candidateWords = candidateKey.split(' ').filter((w) => w.length >= 3);
  if (candidateWords.length < 3) return false;

  for (const prev of excludedSet) {
    if (!prev) continue;
    if (prev.includes(candidateKey) || candidateKey.includes(prev)) return true;
    const prevWords = prev.split(' ').filter((w) => w.length >= 3);
    if (prevWords.length < 3) continue;
    const prevSet = new Set(prevWords);
    const shared = candidateWords.filter((w) => prevSet.has(w)).length;
    const union = new Set([...candidateWords, ...prevWords]).size;
    if (union > 0 && shared / union >= 0.78) {
      return true;
    }
  }
  return false;
}

/**
 * Limpia texto visible para el usuario eliminando barras diagonales, paréntesis
 * y vocabulario técnico prohibido sin alterar montos ni nombres reales.
 */
export function sanitizarTextoVisible(input) {
  if (input === null || input === undefined) return '';
  let text = String(input);

  // Evitar palabras técnicas y términos prohibidos en la interfaz de usuario
  text = text
    .replace(/\bPostgreSQL\b/gi, 'registro financiero')
    .replace(/\bbases de datos\b/gi, 'registros financieros')
    .replace(/\bbase de datos\b/gi, 'registro financiero')
    .replace(/\b(backend|frontend|servidor|aplicativo)\b/gi, 'Aureus Manager')
    .replace(/\b(endpoint|API)\b/gi, 'conexión')
    .replace(/\bSQL\b/gi, 'consulta')
    .replace(/\bJSON\b/gi, 'resumen')
    .replace(/\bsistemas?\b/gi, 'control de cobros')
    .replace(/\bcarteras?\b/gi, 'registros activos');

  // Reemplazar paréntesis de forma natural sin cortar el sentido
  text = text
    .replace(/\s*\(([^()]*)\)/g, (_, inner) => {
      const cleaned = inner.trim();
      return cleaned ? `, ${cleaned}` : '';
    })
    .replace(/[()]/g, ' ');

  // Reemplazar fechas o proporciones numéricas con barra diagonal y luego cualquier barra restante
  text = text
    .replace(/(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/g, '$1-$2-$3')
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1 de $2')
    .replace(/\s*\/\s*/g, ' y ');

  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,+/g, ',')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatearColones(value) {
  const num = Number(value || 0);
  const rounded = Math.round(Number.isFinite(num) ? num : 0);
  return `₡${rounded.toLocaleString('en-US')}`;
}

/**
 * Valida la carga útil recibida en POST /api/seneca/consultar.
 */
export function validarConsultaSeneca(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      error: 'La consulta debe enviarse como un objeto de datos válido.',
    };
  }

  const rawPregunta = body.pregunta;
  if (typeof rawPregunta !== 'string') {
    return {
      ok: false,
      error: 'Debes escribir una pregunta válida para consultar a Séneca.',
    };
  }

  const pregunta = rawPregunta.trim();
  if (pregunta.length < 1 || pregunta.length > 600) {
    return {
      ok: false,
      error: 'La pregunta debe tener entre 1 y 600 caracteres.',
    };
  }

  const historial = [];
  if (Array.isArray(body.historial)) {
    const recentItems = body.historial.slice(-8);
    for (const item of recentItems) {
      if (!item || typeof item !== 'object') continue;
      const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
      const content = typeof item.content === 'string' ? item.content.trim() : '';
      if (role && content) {
        historial.push({
          role,
          content: content.slice(0, 1200),
        });
      }
    }
  }

  return {
    ok: true,
    data: {
      pregunta,
      historial,
    },
  };
}

/**
 * Filtra y reemplaza sugerencias invertidas o repetidas garantizando 3 consultas
 * informativas reales formuladas desde el prestamista hacia Séneca.
 */
export function limpiarSugerenciasSeneca(
  sugerenciasRaw = [],
  preguntaActual = '',
  poolAlternativo = [],
  historial = []
) {
  const excludedSet = new Set();
  const currentKey = normalizeQuestionKey(preguntaActual);
  if (currentKey) excludedSet.add(currentKey);

  if (Array.isArray(historial)) {
    for (const msg of historial) {
      if (msg?.role === 'user' && typeof msg.content === 'string') {
        const key = normalizeQuestionKey(msg.content);
        if (key) excludedSet.add(key);
      }
    }
  }

  const candidates = [
    ...(Array.isArray(sugerenciasRaw) ? sugerenciasRaw : []),
    ...(Array.isArray(poolAlternativo) ? poolAlternativo : []),
    ...DEFAULT_SUGGESTIONS,
  ];

  const selected = [];
  const selectedKeys = new Set();

  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const cleaned = sanitizarTextoVisible(raw);
    if (!cleaned || cleaned.length < 8) continue;

    // Descartar preguntas en segunda persona o acciones operativas no soportadas
    if (FORBIDDEN_SUGGESTION_RX.test(cleaned)) continue;

    const key = normalizeQuestionKey(cleaned);
    if (!key) continue;
    if (isNearDuplicateQuestion(key, excludedSet)) continue;
    if (isNearDuplicateQuestion(key, selectedKeys)) continue;

    selected.push(cleaned);
    selectedKeys.add(key);

    if (selected.length === 3) break;
  }

  return selected;
}

function normalizarTarjeta(card) {
  if (!card || typeof card !== 'object') return null;
  const titulo = sanitizarTextoVisible(card.titulo || '');
  if (!titulo) return null;

  return {
    titulo,
    subtitulo: sanitizarTextoVisible(card.subtitulo || ''),
    monto: sanitizarTextoVisible(card.monto || ''),
    estado: sanitizarTextoVisible(card.estado || ''),
    detalle: sanitizarTextoVisible(card.detalle || ''),
  };
}

/**
 * Garantiza una estructura JSON uniforme y limpia para el frontend.
 */
export function normalizarRespuestaSeneca(rawResponse, fallbackData = {}, options = {}) {
  let parsed = rawResponse;

  if (typeof rawResponse === 'string') {
    const trimmed = rawResponse.trim();
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          parsed = { respuesta: trimmed };
        }
      } else {
        parsed = { respuesta: trimmed };
      }
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    parsed = {};
  }

  const rawRespuesta =
    typeof parsed.respuesta === 'string' && parsed.respuesta.trim()
      ? parsed.respuesta
      : typeof fallbackData.respuesta === 'string' && fallbackData.respuesta.trim()
      ? fallbackData.respuesta
      : 'No fue posible generar una respuesta con los datos disponibles en este momento.';

  const respuesta = sanitizarTextoVisible(rawRespuesta);

  const sourceCards = Array.isArray(parsed.tarjetas)
    ? parsed.tarjetas
    : Array.isArray(fallbackData.tarjetas)
    ? fallbackData.tarjetas
    : [];

  const tarjetas = sourceCards
    .map(normalizarTarjeta)
    .filter(Boolean)
    .slice(0, 6);

  const rawSug = Array.isArray(parsed.sugerencias) ? parsed.sugerencias : [];
  const fallbackSug = Array.isArray(fallbackData.sugerencias) ? fallbackData.sugerencias : [];
  const combinedAlternativas = [
    ...(Array.isArray(options.poolAlternativo) ? options.poolAlternativo : []),
    ...fallbackSug,
  ];

  const sugerencias = limpiarSugerenciasSeneca(
    rawSug,
    options.preguntaActual || '',
    combinedAlternativas,
    options.historial || []
  );

  const rawConf = typeof parsed.confianza === 'string' ? parsed.confianza.toLowerCase().trim() : '';
  const confianza = VALID_CONFIDENCES.has(rawConf)
    ? rawConf
    : VALID_CONFIDENCES.has(fallbackData.confianza)
    ? fallbackData.confianza
    : 'alta';

  return {
    respuesta,
    tarjetas,
    sugerencias,
    confianza,
  };
}
