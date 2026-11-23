import { validarConsultaSeneca } from '../schemas/seneca.schema.js';
import { consultarSeneca, obtenerResumenRapido } from '../services/seneca.service.js';
import {
  MENSAJE_BLOQUEO_TECNICO_PRESTAMISTA,
  MENSAJE_FUERA_DE_DOMINIO,
  esPreguntaTecnicaInterna,
  esPreguntaFueraDeDominio,
  resolverCalculoConDatosReales
} from '../services/senecaCalculos.service.js';
import {
  embed,
  recuperarFragmentosSimilares
} from '../services/embeddings.service.js';
import { pool } from '../config/db.js';
import { asegurarDocumentosBaseParaConsulta } from '../middlewares/ragLimites.js';

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
    const rolUsuario = String(req.user?.rol || '').trim().toUpperCase();
    const esAdmin = rolUsuario === 'ADMINISTRADOR';

    if (esAdmin) {
      const [{ rows: statsRows }] = await Promise.all([
        pool
          .query(
            `SELECT
               (SELECT COUNT(*)::int FROM usuarios) AS total_usuarios,
               (SELECT COUNT(*)::int FROM prestamos) AS total_prestamos,
               (SELECT COUNT(*)::int FROM documentos_rag WHERE empresa_id = $1::uuid) AS total_documentos`,
            [req.user?.id]
          )
          .catch(() => ({
            rows: [{ total_usuarios: 0, total_prestamos: 0, total_documentos: 0 }]
          }))
      ]);
      const st = statsRows[0] || {};
      return res.json({
        ok: true,
        success: true,
        resumen: {
          rol: 'ADMINISTRADOR',
          total_usuarios: Number(st.total_usuarios ?? 0),
          total_prestamos: Number(st.total_prestamos ?? 0),
          total_documentos: Number(st.total_documentos ?? 0)
        }
      });
    }

    const cobradorId = req.user?.id;
    if (!cobradorId) {
      return res.status(401).json({
        ok: false,
        success: false,
        error: 'No autenticado',
        userMessage: 'Debes iniciar sesión para continuar.',
      });
    }
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
 * Valida la pregunta, aplica guardrails por rol, motor determinista y consulta segura.
 */
export async function postConsultarSeneca(req, res, next) {
  try {
    const cobradorId = req.user?.id;
    if (!cobradorId) {
      return res.status(401).json({
        ok: false,
        success: false,
        error: 'No autenticado',
        userMessage: 'Debes iniciar sesión para continuar.',
      });
    }
    const rolUsuario = String(req.user?.rol || '').trim().toUpperCase();
    const esAdmin = rolUsuario === 'ADMINISTRADOR';
    const userKey = String(cobradorId);

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

    const pregunta = validation.data.pregunta;

    if (!esAdmin && esPreguntaTecnicaInterna(pregunta)) {
      return res.json({
        ok: true,
        success: true,
        respuesta: MENSAJE_BLOQUEO_TECNICO_PRESTAMISTA,
        fuente: 'guardrail_seguridad',
        bloqueado: true,
      });
    }

    if (esPreguntaFueraDeDominio(pregunta)) {
      return res.json({
        ok: true,
        success: true,
        respuesta: MENSAJE_FUERA_DE_DOMINIO,
        fuente: 'guardrail_dominio',
        bloqueado: true,
      });
    }

    const calculoDeterminista = await resolverCalculoConDatosReales({
      pregunta,
      cobradorId: esAdmin ? null : cobradorId,
      esAdmin,
    });

    if (calculoDeterminista?.respuesta) {
      return res.json({
        ok: true,
        success: true,
        respuesta: calculoDeterminista.respuesta,
        fuente: 'motor_calculo_determinista',
        tipoCalculo: calculoDeterminista.tipo,
        datosCalculo: calculoDeterminista.datos || null,
      });
    }

    if (esAdmin) {
      const empresaAdminId = req.user?.id;
      await asegurarDocumentosBaseParaConsulta(empresaAdminId).catch(() => {});
      const [vq] = await embed([pregunta], 'query');
      const fragments = await recuperarFragmentosSimilares(
        pool,
        empresaAdminId,
        pregunta,
        vq,
        4,
        ['PRESTAMISTA', 'ADMIN']
      );

      const fragmentosTexto = fragments
        .filter((f) => f.score >= 0.08)
        .map((f, idx) => `[${idx + 1} - ${f.nombre}] ${f.texto.slice(0, 420)}`);

      const [{ rows: statsRows }] = await Promise.all([
        pool
          .query(
            `SELECT
               (SELECT COUNT(*)::int FROM usuarios) AS total_usuarios,
               (SELECT COUNT(*)::int FROM prestamos) AS total_prestamos,
               (SELECT COUNT(*)::int FROM documentos_rag WHERE empresa_id = $1::uuid) AS total_documentos`,
            [empresaAdminId]
          )
          .catch(() => ({
            rows: [{ total_usuarios: 0, total_prestamos: 0, total_documentos: 0 }]
          }))
      ]);
      const st = statsRows[0] || {};
      const resumenAdmin = `Resumen agregado de plataforma sin datos personales de deudores: ${st.total_usuarios ?? 0} cuentas registradas, ${st.total_prestamos ?? 0} prestamos en sistema y ${st.total_documentos ?? 0} documentos RAG activos.`;

      const respuesta =
        fragmentosTexto.length > 0
          ? `${fragmentosTexto.join('\n\n')}\n\n${resumenAdmin}`
          : resumenAdmin;

      return res.json({
        ok: true,
        success: true,
        respuesta,
        fuente: 'admin_rag_agregado',
        fuentes: fragments.slice(0, 3).map((f) => ({
          nombre: f.nombre,
          nivel_acceso: f.nivel_acceso,
          ruta_carpeta: f.ruta_carpeta,
        })),
      });
    }

    const result = await consultarSeneca({
      cobradorId,
      pregunta,
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

