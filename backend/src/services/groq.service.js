import { getAiConfig } from '../config/env.js';

const REQUEST_TIMEOUT_MS = 20000;
const RETRY_DELAYS_MS = [800, 1600];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status) {
  return status === 429 || (status >= 500 && status <= 599);
}

function extractJsonContent(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('La respuesta de Groq llegó vacía.');
  }

  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      try {
        return JSON.parse(fencedMatch[1].trim());
      } catch {
        // continuar con extracción por llaves
      }
    }
    const braceMatch = trimmed.match(/\{[\s\S]*\}/);
    if (braceMatch?.[0]) {
      return JSON.parse(braceMatch[0]);
    }
    throw new Error('Groq no devolvió un objeto estructurado válido.');
  }
}

async function performGroqCall({ apiKey, endpoint, payload }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Unica capa de comunicación HTTPS con Groq Chat Completions (openai/gpt-oss-120b).
 */
export async function consultarGroq({ systemPrompt, historial = [], pregunta }) {
  const config = getAiConfig();
  if (!config.isConfigured) {
    const err = new Error('GROQ_API_KEY no configurada');
    err.code = 'GROQ_NOT_CONFIGURED';
    throw err;
  }

  const cleanHistory = Array.isArray(historial)
    ? historial
        .slice(-8)
        .filter(
          (m) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.content === 'string' &&
            m.content.trim()
        )
        .map((m) => ({ role: m.role, content: m.content.trim() }))
    : [];

  const messages = [
    { role: 'system', content: systemPrompt },
    ...cleanHistory,
    { role: 'user', content: pregunta },
  ];

  let lastError = null;
  let useJsonMode = true;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      const payload = {
        model: config.model,
        temperature: 0.15,
        max_tokens: 1200,
        messages,
      };
      if (useJsonMode) {
        payload.response_format = { type: 'json_object' };
      }

      const { response, data } = await performGroqCall({
        apiKey: config.apiKey,
        endpoint: config.endpoint,
        payload,
      });

      if (!response.ok) {
        const message = data?.error?.message || `HTTP ${response.status}`;

        // Si el modelo o formato rechaza json_object con 400, reintentar sin response_format
        if (response.status === 400 && useJsonMode) {
          useJsonMode = false;
          continue;
        }

        if (shouldRetryStatus(response.status) && attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }

        const err = new Error(`Error de Groq (${response.status}): ${message}`);
        err.status = response.status;
        throw err;
      }

      const usage = data?.usage;
      if (usage) {
        console.log(
          `[Séneca Groq] Modelo=${config.model} prompt_tokens=${usage.prompt_tokens || 0} completion_tokens=${usage.completion_tokens || 0} total_tokens=${usage.total_tokens || 0}`
        );
      }

      const content = data?.choices?.[0]?.message?.content || '';
      try {
        return extractJsonContent(content);
      } catch (parseErr) {
        // Si respondió texto plano en lugar de JSON y estábamos en json_object, intentar una vez sin él
        if (useJsonMode && attempt < RETRY_DELAYS_MS.length) {
          useJsonMode = false;
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }
        throw parseErr;
      }
    } catch (err) {
      lastError = err;
      const isRetryableError =
        err?.name === 'AbortError' ||
        err?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        err?.message?.includes('fetch failed');

      if (isRetryableError && attempt < RETRY_DELAYS_MS.length) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('No fue posible obtener respuesta de Groq.');
}

export default consultarGroq;

