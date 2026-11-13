import { validarConsultaSeneca } from '../schemas/seneca.schema.js';
import { consultarSeneca, obtenerResumenRapido } from '../services/seneca.service.js';
import { getDefaultCobradorId } from '../services/seedService.js';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestLogByUser = new Map();

function checkRateLimit(userKey) {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (requestLogByUser.get(userKey) || []).filter((ts) => ts > cutoff);

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLogByUser.set(userKey, timestamps);
    return false;
  }

  timestamps.push(now);
  requestLogByUser.set(userKey, timestamps);
  return true;
}

/**
 * GET /api/seneca/resumen-rapido
 * Devuelve las métricas rápidas de bienvenida para el panel de Séneca.
 */
export async function getResumenRapido(req, res, next) {
  try {
    const cobradorId = req.query.cobrador_id || req.user?.id || (await getDefaultCobradorId());
    const resumen = await obtenerResumenRapido(cobradorId);
    return res.json({
      ok: true,
      success: true,
      resumen,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/seneca/consultar
 * Valida la pregunta, aplica límite por minuto y responde con los datos en vivo.
 */
export async function postConsultarSeneca(req, res, next) {
  try {
    const cobradorId = req.body?.cobrador_id || req.user?.id || (await getDefaultCobradorId());
    const userKey = String(cobradorId || req.ip || 'anon');

    if (!checkRateLimit(userKey)) {
      return res.status(429).json({
        ok: false,
        success: false,
        status: 429,
        error: 'Límite de consultas alcanzado',
        userMessage: 'Has realizado demasiadas consultas en el último minuto. Espera unos segundos antes de continuar.',
      });
    }

    const validation = validarConsultaSeneca(req.body);
    if (!validation.ok) {
      return res.status(400).json({
        ok: false,
        success: false,
        status: 400,
        error: 'Consulta inválida',
        userMessage: validation.error,
      });
    }

    const result = await consultarSeneca({
      cobradorId,
      pregunta: validation.data.pregunta,
      historial: validation.data.historial,
    });

    return res.json({
      ok: true,
      success: true,
      ...result,
    });
  } catch (err) {
    return next(err);
  }
}

