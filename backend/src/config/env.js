import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(__dirname, '../../.env');

dotenv.config({ path: ENV_PATH });

const PLACEHOLDER_KEYS = new Set([
  'gsk_PEGA_AQUI_TU_API_KEY_DE_GROQ',
  'gsk_xxxxxxxx',
  'gsk_tu_api_key_aqui',
]);

/**
 * Lee en tiempo real la configuración de IA desde las variables de entorno del servidor.
 * La clave de Groq vive exclusivamente en backend/.env.
 */
export function getAiConfig() {
  const apiKey = String(process.env.GROQ_API_KEY || '').trim();
  const model = String(process.env.GROQ_MODEL || '').trim() || 'openai/gpt-oss-120b';

  const isConfigured =
    apiKey.startsWith('gsk_') &&
    apiKey.length > 16 &&
    !PLACEHOLDER_KEYS.has(apiKey);

  return {
    provider: 'groq',
    apiKey,
    model,
    isConfigured,
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
  };
}

export default getAiConfig;

