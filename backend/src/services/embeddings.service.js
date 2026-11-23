const VECTOR_DIMENSIONS = 1024;

const SPANISH_STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al',
  'a', 'ante', 'bajo', 'con', 'contra', 'desde', 'en', 'entre', 'hacia', 'hasta',
  'para', 'por', 'segun', 'sin', 'sobre', 'tras', 'y', 'o', 'u', 'e', 'ni',
  'que', 'cual', 'cuales', 'quien', 'quienes', 'como', 'cuando', 'donde',
  'cuanto', 'cuanta', 'cuantos', 'cuantas', 'es', 'son', 'era', 'fue', 'ser',
  'estar', 'esta', 'estan', 'tiene', 'tienen', 'se', 'su', 'sus', 'mi', 'mis',
  'tu', 'tus', 'lo', 'le', 'les', 'me', 'te', 'nos', 'este', 'esta', 'estos',
  'estas', 'ese', 'esa', 'esos', 'esas', 'si', 'no', 'mas', 'menos', 'muy', 'ya'
]);

function normalizeTextForEmbedding(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stemSpanishToken(token) {
  if (token.length <= 4) return token;
  return token
    .replace(/(aciones|iciones|amientos|imientos|idades)$/i, '')
    .replace(/(acion|icion|amiento|imiento|antes|entes|mente|anzas)$/i, '')
    .replace(/(es|os|as|ar|er|ir)$/i, '');
}

function extractKeyTerms(text) {
  const norm = normalizeTextForEmbedding(text);
  if (!norm) return [];
  const rawTokens = norm.split(' ').filter((t) => t.length >= 2);
  return rawTokens.filter((t) => !SPANISH_STOPWORDS.has(t));
}

function fnv1aHash(str, seed = 2166136261) {
  let hash = seed >>> 0;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

function addHashedFeature(vec, feature, weight) {
  const idx = fnv1aHash(feature, 2166136261) % VECTOR_DIMENSIONS;
  const sign = (fnv1aHash(feature, 2654435761) & 1) === 0 ? 1 : -1;
  vec[idx] += sign * weight;
}

/**
 * Vectorizador semántico determinista de 1024 dimensiones para español
 * con unigramas, raíces léxicas, bigramas, números exactos y trigramas de caracteres,
 * ponderación TF sublineal y normalización L2 unitaria.
 */
function buildLocalSemanticVector(texto) {
  const vec = new Array(VECTOR_DIMENSIONS).fill(0);
  const terms = extractKeyTerms(texto);

  if (terms.length === 0) {
    vec[0] = 1;
    return vec;
  }

  const tfCounts = new Map();
  for (let i = 0; i < terms.length; i += 1) {
    const t = terms[i];
    const stem = stemSpanishToken(t);
    tfCounts.set(`u:${t}`, (tfCounts.get(`u:${t}`) || 0) + 1);
    if (stem && stem !== t) {
      tfCounts.set(`s:${stem}`, (tfCounts.get(`s:${stem}`) || 0) + 1);
    }
    if (i + 1 < terms.length) {
      const bi = `b:${t}_${terms[i + 1]}`;
      tfCounts.set(bi, (tfCounts.get(bi) || 0) + 1);
    }
    if (t.length >= 4) {
      for (let j = 0; j <= t.length - 3; j += 1) {
        const tri = `c:${t.slice(j, j + 3)}`;
        tfCounts.set(tri, (tfCounts.get(tri) || 0) + 0.35);
      }
    }
  }

  for (const [feat, count] of tfCounts.entries()) {
    const tfWeight = 1 + Math.log(Math.max(1, count));
    const baseWeight = feat.startsWith('u:')
      ? 2.2
      : feat.startsWith('s:')
        ? 1.8
        : feat.startsWith('b:')
          ? 2.4
          : 0.55;
    addHashedFeature(vec, feat, tfWeight * baseWeight);
  }

  let normSq = 0;
  for (let i = 0; i < VECTOR_DIMENSIONS; i += 1) {
    normSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(normSq);
  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIMENSIONS; i += 1) {
      vec[i] = Number((vec[i] / norm).toFixed(6));
    }
  } else {
    vec[0] = 1;
  }

  return vec;
}

/**
 * Genera embeddings semánticos de 1024 dimensiones mediante el motor vectorial
 * local determinista para español sin dependencias externas.
 *
 * @param {string[]} textos
 * @param {'document'|'query'} [_tipo='document']
 * @returns {Promise<number[][]>}
 */
export async function embed(textos, _tipo = 'document') {
  const lista = (Array.isArray(textos) ? textos : [textos]).map((t) =>
    String(t || '')
  );
  if (lista.length === 0) return [];

  return lista.map((t) => buildLocalSemanticVector(t));
}

export function similitudCoseno(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0) {
    return 0;
  }
  const len = Math.min(vecA.length, vecB.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i += 1) {
    const a = Number(vecA[i]) || 0;
    const b = Number(vecB[i]) || 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Recupera los fragmentos más similares de la organización (`empresa_id`) combinando
 * similitud coseno sobre vectores de 1024 dimensiones y coincidencia léxica de términos clave.
 *
 * @param {{ query: Function }} db
 * @param {string} empresaId
 * @param {string} pregunta
 * @param {number[]} vectorPregunta
 * @param {number} [limite=6]
 */
export async function recuperarFragmentosSimilares(
  db,
  empresaId,
  pregunta,
  vectorPregunta,
  limite = 6,
  nivelesPermitidos = ['PRESTAMISTA']
) {
  const nivelesValidos =
    Array.isArray(nivelesPermitidos) && nivelesPermitidos.length > 0
      ? nivelesPermitidos
      : ['PRESTAMISTA'];

  const { rows } = await db.query(
    `SELECT f.id, f.documento_id, d.nombre, d.origen, d.nivel_acceso, d.ruta_carpeta,
            f.orden, f.texto, f.embedding
     FROM fragmentos_rag f
     JOIN documentos_rag d ON d.id = f.documento_id AND d.empresa_id = f.empresa_id
     WHERE f.empresa_id = $1::uuid
       AND d.nivel_acceso = ANY($2::varchar[])`,
    [empresaId, nivelesValidos]
  );

  if (rows.length === 0) {
    return [];
  }

  const queryTerms = Array.from(
    new Set(extractKeyTerms(pregunta).map(stemSpanishToken).filter(Boolean))
  );

  const scored = rows.map((row) => {
    const cos = similitudCoseno(vectorPregunta, row.embedding);
    const normChunk = normalizeTextForEmbedding(row.texto);
    const normTitle = normalizeTextForEmbedding(row.nombre);
    let lexicalHits = 0;

    for (const term of queryTerms) {
      if (normChunk.includes(term)) lexicalHits += 1;
      else if (normTitle.includes(term)) lexicalHits += 0.5;
    }

    const lexicalRatio =
      queryTerms.length > 0 ? lexicalHits / queryTerms.length : 0;
    const score = cos * 0.65 + lexicalRatio * 0.35;

    return {
      id: row.id,
      documento_id: row.documento_id,
      nombre: row.nombre,
      origen: row.origen,
      nivel_acceso: row.nivel_acceso,
      ruta_carpeta: row.ruta_carpeta,
      orden: row.orden,
      texto: row.texto,
      score
    };
  });

  scored.sort((a, b) => b.score - a.score || a.orden - b.orden);
  return scored.slice(0, Math.max(1, Number(limite) || 6));
}

export default {
  VECTOR_DIMENSIONS,
  embed,
  similitudCoseno,
  recuperarFragmentosSimilares
};
