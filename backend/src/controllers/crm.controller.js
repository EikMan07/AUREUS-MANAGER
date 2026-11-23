// backend/src/controllers/crm.controller.js
// Controlador REST del CRM Crediticio de Prestamistas (Aislamiento por cobrador_id)

import { query, withTransaction, debugPayload } from '../config/db.js';
import { redactarMensajeProspectoPrestamista } from '../services/crmIa.service.js';

const ETAPAS_VALIDAS_PRESTAMISTA = [
  'PROSPECTO',
  'EVALUACION_RIESGO',
  'PROPUESTA_APROBADA',
  'PRESTAMO_ACTIVO',
  'ALERTA_ATRASO',
  'ARREGLO_PAGO',
  'FINIQUITADO_RENOVABLE',
];

const ETIQUETAS_ETAPAS = {
  PROSPECTO: 'Prospectos Nuevos',
  EVALUACION_RIESGO: 'Evaluación de Riesgo',
  PROPUESTA_APROBADA: 'Propuesta Aprobada',
  PRESTAMO_ACTIVO: 'Préstamo Activo',
  ALERTA_ATRASO: 'Alerta de Atraso',
  ARREGLO_PAGO: 'Arreglo de Pago',
  FINIQUITADO_RENOVABLE: 'Finiquitado Renovable',
};

function normalizarTelefono8Digitos(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
}

/**
 * POST /api/crm/prospectos
 * Registra un nuevo prospecto en etapa PROSPECTO con su historial inicial.
 */
export async function crearProspecto(req, res) {
  try {
    const cobradorId = req.user?.id;
    const {
      nombre,
      apellidos,
      telefono,
      ubicacion,
      canal_origen = 'REFERIDO',
      monto_estimado,
      notas,
      cliente_id = null,
    } = req.body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'El nombre del prospecto es obligatorio.',
      });
    }

    if (/[0-9]/.test(nombre)) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'El nombre no debe contener números.',
      });
    }

    if (apellidos && typeof apellidos === 'string' && /[0-9]/.test(apellidos)) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'Los apellidos no deben contener números.',
      });
    }

    const telefonoFormateado = normalizarTelefono8Digitos(telefono);
    if (!telefonoFormateado) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'Ingresa un teléfono válido de 8 dígitos.',
      });
    }

    if (!ubicacion || typeof ubicacion !== 'string' || !ubicacion.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'La ubicación del prospecto es obligatoria.',
      });
    }

    const montoNum = Number(monto_estimado ?? 0);
    const montoValido = !isNaN(montoNum) && montoNum >= 0 ? montoNum : 0;

    const prospecto = await withTransaction(async (client) => {
      const sqlProspecto = `
        INSERT INTO crm_prospectos (
          cobrador_id, cliente_id, nombre, apellidos, telefono, ubicacion, canal_origen, monto_estimado, etapa, revisado, notas
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PROSPECTO'::etapa_crm_prestamista, false, $9)
        RETURNING *;
      `;
      const { rows: rowsP } = await client.query(sqlProspecto, [
        cobradorId,
        cliente_id,
        nombre.trim(),
        apellidos ? apellidos.trim() : null,
        telefonoFormateado,
        ubicacion.trim(),
        canal_origen ? canal_origen.trim() : 'REFERIDO',
        montoValido,
        notas ? notas.trim() : null,
      ]);

      const nuevoProspecto = rowsP[0];

      const sqlHistorial = `
        INSERT INTO crm_historial_etapas (
          prospecto_id, etapa_anterior, etapa_nueva, dias_en_etapa_anterior, nota_cambio
        ) VALUES ($1, NULL, 'PROSPECTO'::etapa_crm_prestamista, 0, 'Ingreso inicial como prospecto');
      `;
      await client.query(sqlHistorial, [nuevoProspecto.id]);

      return nuevoProspecto;
    });

    return res.status(201).json({
      ok: true,
      prospecto,
    });
  } catch (err) {
    console.error('[crm.controller] Error al crear prospecto:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_REGISTRO',
      userMessage: 'No fue posible registrar el prospecto en este momento. Inténtalo de nuevo.',
      ...debugPayload(err),
    });
  }
}

/**
 * GET /api/crm/prospectos
 * Lista los prospectos del prestamista con filtros y conteos de actividad.
 */
export async function listarProspectos(req, res) {
  try {
    const cobradorId = req.user?.id;
    const { etapa, canal_origen, busqueda } = req.query;

    const conditions = ['cobrador_id = $1'];
    const values = [cobradorId];
    let paramIndex = 2;

    if (etapa && ETAPAS_VALIDAS_PRESTAMISTA.includes(etapa.toUpperCase())) {
      conditions.push(`etapa = $${paramIndex}::etapa_crm_prestamista`);
      values.push(etapa.toUpperCase());
      paramIndex += 1;
    }

    if (canal_origen && typeof canal_origen === 'string' && canal_origen.trim()) {
      conditions.push(`canal_origen = $${paramIndex}`);
      values.push(canal_origen.trim());
      paramIndex += 1;
    }

    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      conditions.push(
        `(nombre ILIKE $${paramIndex} OR apellidos ILIKE $${paramIndex} OR telefono ILIKE $${paramIndex} OR ubicacion ILIKE $${paramIndex})`
      );
      values.push(`%${busqueda.trim()}%`);
      paramIndex += 1;
    }

    const whereClause = conditions.join(' AND ');

    const sqlProspectos = `
      SELECT 
        p.*,
        ROUND(EXTRACT(EPOCH FROM (now() - p.fecha_ultimo_cambio_etapa)) / 86400, 1) AS dias_en_etapa_actual
      FROM crm_prospectos p
      WHERE ${whereClause}
      ORDER BY p.revisado ASC, p.fecha_ultimo_cambio_etapa ASC, p.creado_en DESC;
    `;
    const { rows: prospectos } = await query(sqlProspectos, values);

    // Resumen de actividad
    const sqlResumen = `
      SELECT 
        COUNT(*)::int AS total_general,
        COUNT(*) FILTER (WHERE fecha_ingreso >= now() - interval '7 days')::int AS ingresos_ultimos_7_dias,
        COUNT(*) FILTER (WHERE revisado = false)::int AS sin_revisar
      FROM crm_prospectos
      WHERE cobrador_id = $1;
    `;
    const { rows: resResumen } = await query(sqlResumen, [cobradorId]);
    const resumen = resResumen[0] || {
      total_general: 0,
      ingresos_ultimos_7_dias: 0,
      sin_revisar: 0,
    };

    return res.json({
      ok: true,
      prospectos,
      resumen: {
        total: prospectos.length,
        total_general: resumen.total_general,
        ingresos_ultimos_7_dias: resumen.ingresos_ultimos_7_dias,
        sin_revisar: resumen.sin_revisar,
      },
    });
  } catch (err) {
    console.error('[crm.controller] Error al listar prospectos:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_CONSULTA',
      userMessage: 'No fue posible consultar la lista de prospectos en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * PATCH /api/crm/prospectos/:id/etapa
 * Mueve un prospecto a una nueva etapa con cálculo de días y registro en historial.
 */
export async function moverEtapaProspecto(req, res) {
  try {
    const cobradorId = req.user?.id;
    const { id } = req.params;
    const { etapa_nueva, nota_cambio = null } = req.body;

    const etapaNuevaLimpia = String(etapa_nueva || '').toUpperCase();
    if (!ETAPAS_VALIDAS_PRESTAMISTA.includes(etapaNuevaLimpia)) {
      return res.status(400).json({
        ok: false,
        error: 'ETAPA_INVALIDA',
        userMessage: 'La etapa indicada no es válida para el embudo crediticio.',
      });
    }

    const { rows: rowsActual } = await query(
      'SELECT * FROM crm_prospectos WHERE id = $1 AND cobrador_id = $2;',
      [id, cobradorId]
    );

    if (rowsActual.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        userMessage: 'El prospecto indicado no fue encontrado.',
      });
    }

    const prospectoActual = rowsActual[0];
    const etapaAnterior = prospectoActual.etapa;

    // Calcular días en la etapa anterior con precisión
    const fechaCambioPrev = new Date(prospectoActual.fecha_ultimo_cambio_etapa || prospectoActual.creado_en);
    const msDiferencia = Date.now() - fechaCambioPrev.getTime();
    const diasEnEtapaAnterior = Math.max(0, Number((msDiferencia / (1000 * 60 * 60 * 24)).toFixed(2)));

    const prospectoActualizado = await withTransaction(async (client) => {
      const sqlUpdate = `
        UPDATE crm_prospectos
        SET etapa = $1::etapa_crm_prestamista,
            revisado = true,
            fecha_ultimo_cambio_etapa = now(),
            actualizado_en = now()
        WHERE id = $2 AND cobrador_id = $3
        RETURNING *;
      `;
      const { rows: rowsU } = await client.query(sqlUpdate, [
        etapaNuevaLimpia,
        id,
        cobradorId,
      ]);

      const sqlHistorial = `
        INSERT INTO crm_historial_etapas (
          prospecto_id, etapa_anterior, etapa_nueva, dias_en_etapa_anterior, nota_cambio
        ) VALUES ($1, $2::etapa_crm_prestamista, $3::etapa_crm_prestamista, $4, $5);
      `;
      await client.query(sqlHistorial, [
        id,
        etapaAnterior,
        etapaNuevaLimpia,
        diasEnEtapaAnterior,
        nota_cambio ? nota_cambio.trim() : null,
      ]);

      return rowsU[0];
    });

    return res.json({
      ok: true,
      prospecto: prospectoActualizado,
      impacto: {
        etapa_anterior: etapaAnterior,
        etapa_nueva: etapaNuevaLimpia,
        dias_en_etapa_anterior: diasEnEtapaAnterior,
        mensaje: `Prospecto trasladado de ${ETIQUETAS_ETAPAS[etapaAnterior] || etapaAnterior} a ${ETIQUETAS_ETAPAS[etapaNuevaLimpia] || etapaNuevaLimpia}.`,
      },
    });
  } catch (err) {
    console.error('[crm.controller] Error al mover etapa de prospecto:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_CAMBIO_ETAPA',
      userMessage: 'No fue posible actualizar la etapa del prospecto en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * GET /api/crm/embudo
 * Calcula métricas en vivo para las 7 etapas del embudo del prestamista.
 */
export async function consultarEmbudo(req, res) {
  try {
    const cobradorId = req.user?.id;

    // Metas configuradas
    const { rows: rowsMetas } = await query(
      'SELECT etapa, meta_conversion, dias_alerta_estancado FROM crm_metas_etapa WHERE cobrador_id = $1;',
      [cobradorId]
    );
    const mapaMetas = {};
    rowsMetas.forEach((m) => {
      mapaMetas[m.etapa] = {
        meta_conversion: Number(m.meta_conversion ?? 75.0),
        dias_alerta_estancado: Number(m.dias_alerta_estancado ?? 3),
      };
    });

    // Conteo por etapa y promedio de días
    const sqlConteoEtapas = `
      SELECT 
        etapa,
        COUNT(*)::int AS total,
        COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (now() - fecha_ultimo_cambio_etapa)) / 86400), 1), 0)::numeric AS dias_promedio
      FROM crm_prospectos
      WHERE cobrador_id = $1
      GROUP BY etapa;
    `;
    const { rows: rowsEtapas } = await query(sqlConteoEtapas, [cobradorId]);
    const mapaEtapas = {};
    let totalGeneral = 0;
    rowsEtapas.forEach((r) => {
      const tot = Number(r.total ?? 0);
      totalGeneral += tot;
      mapaEtapas[r.etapa] = {
        total: tot,
        dias_promedio: Number(r.dias_promedio ?? 0),
      };
    });

    // Construcción del embudo en las 7 etapas en orden estricto
    const embudo = ETAPAS_VALIDAS_PRESTAMISTA.map((etapaKey) => {
      const datos = mapaEtapas[etapaKey] || { total: 0, dias_promedio: 0 };
      const configMeta = mapaMetas[etapaKey] || { meta_conversion: 75.0, dias_alerta_estancado: 3 };

      const totalEtapa = Number(datos.total ?? 0);
      const metaConversion = Number(configMeta.meta_conversion ?? 75.0);
      const sinDatos = totalEtapa === 0;
      const conversionReal =
        !sinDatos && totalGeneral > 0
          ? Number(((totalEtapa / totalGeneral) * 100).toFixed(1))
          : 0;
      const fuga = !sinDatos
        ? Math.max(0, Number((metaConversion - conversionReal).toFixed(1)))
        : 0;

      return {
        etapa: etapaKey,
        etiqueta: ETIQUETAS_ETAPAS[etapaKey] || etapaKey,
        total: totalEtapa,
        conversion_real: conversionReal,
        meta_conversion: metaConversion,
        dias_promedio: sinDatos ? 0 : Number(datos.dias_promedio ?? 0),
        dias_alerta_estancado: Number(configMeta.dias_alerta_estancado ?? 3),
        fuga,
        sin_datos: sinDatos,
      };
    });

    // Distribución por canal de origen
    const sqlCanales = `
      SELECT 
        canal_origen,
        COUNT(*)::int AS total
      FROM crm_prospectos
      WHERE cobrador_id = $1
      GROUP BY canal_origen
      ORDER BY total DESC;
    `;
    const { rows: rowsCanales } = await query(sqlCanales, [cobradorId]);
    const distribucionCanales = rowsCanales.map((c) => {
      const totalCanal = Number(c.total ?? 0);
      const porcentaje = totalGeneral > 0 ? Number(((totalCanal / totalGeneral) * 100).toFixed(2)) : 0;
      return {
        canal_origen: c.canal_origen,
        total: totalCanal,
        porcentaje,
      };
    });

    return res.json({
      ok: true,
      embudo,
      distribucion_canales: distribucionCanales,
      total_general: totalGeneral,
    });
  } catch (err) {
    console.error('[crm.controller] Error al consultar embudo:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_EMBUDO',
      userMessage: 'No fue posible calcular el embudo en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * GET /api/crm/atencion
 * Lista priorizada "Qué atender hoy" ordenada de mayor a menor días sin avance.
 */
export async function listarAtencionHoy(req, res) {
  try {
    const cobradorId = req.user?.id;
    const diasParam = parseInt(req.query.dias, 10);
    const diasMinimos = !isNaN(diasParam) && diasParam >= 1 ? diasParam : 3;

    const sqlAtencion = `
      SELECT 
        p.*,
        ROUND(EXTRACT(EPOCH FROM (now() - p.fecha_ultimo_cambio_etapa)) / 86400, 1) AS dias_sin_avance,
        COALESCE(m.dias_alerta_estancado, 3) AS dias_limite_alerta
      FROM crm_prospectos p
      LEFT JOIN crm_metas_etapa m ON m.cobrador_id = p.cobrador_id AND m.etapa = p.etapa
      WHERE p.cobrador_id = $1
        AND EXTRACT(EPOCH FROM (now() - p.fecha_ultimo_cambio_etapa)) / 86400 >= $2
      ORDER BY dias_sin_avance DESC, p.revisado ASC;
    `;

    const { rows } = await query(sqlAtencion, [cobradorId, diasMinimos]);

    const prospectosAtencion = rows.map((p) => {
      const dias = Number(p.dias_sin_avance ?? 0);
      const limite = Number(p.dias_limite_alerta ?? 3);
      let motivo = `Lleva ${dias} días en etapa ${ETIQUETAS_ETAPAS[p.etapa] || p.etapa} sin registrar avance.`;
      if (dias >= limite * 2) {
        motivo = `Prioridad alta: lleva ${dias} días estancado en ${ETIQUETAS_ETAPAS[p.etapa] || p.etapa} superando el doble del límite de ${limite} días.`;
      }

      return {
        ...p,
        dias_sin_avance: dias,
        motivo_prioridad: motivo,
      };
    });

    return res.json({
      ok: true,
      total: prospectosAtencion.length,
      dias_filtro: diasMinimos,
      prospectos_atencion: prospectosAtencion,
    });
  } catch (err) {
    console.error('[crm.controller] Error al consultar atención hoy:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_ATENCION',
      userMessage: 'No fue posible consultar la lista de atención en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * POST /api/crm/prospectos/:id/mensaje
 * Redacción asistida con Séneca IA guardando borrador en PENDIENTE_APROBACION.
 */
export async function generarMensajeProspecto(req, res) {
  try {
    const cobradorId = req.user?.id;
    const { id } = req.params;

    const { rows: rowsP } = await query(
      `SELECT p.*,
              ROUND(EXTRACT(EPOCH FROM (now() - p.fecha_ultimo_cambio_etapa)) / 86400, 1) AS dias_sin_avance
       FROM crm_prospectos p
       WHERE p.id = $1 AND p.cobrador_id = $2;`,
      [id, cobradorId]
    );

    if (rowsP.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        userMessage: 'El prospecto indicado no fue encontrado.',
      });
    }

    const prospecto = rowsP[0];

    // Obtener configuración del cerebro o valores por defecto
    const { rows: rowsC } = await query(
      'SELECT * FROM crm_cerebro_config WHERE cobrador_id = $1;',
      [cobradorId]
    );
    const cerebroConfig = rowsC[0] || {
      tono: 'EJECUTIVO_CERCANO',
      instruccion_base:
        'Hola [Nombre], le saludamos cordialmente sobre su solicitud en [Ubicación]. Su monto estimado es [Monto estimado]. Quedamos a su disposición.',
      reglas_adicionales: '',
    };

    const mensajePropuesto = await redactarMensajeProspectoPrestamista({
      prospecto,
      cerebroConfig,
    });

    const sqlInsert = `
      INSERT INTO crm_mensajes_ia (
        cobrador_id, prospecto_id, etapa_momento, mensaje_propuesto, estado
      ) VALUES ($1, $2, $3::etapa_crm_prestamista, $4, 'PENDIENTE_APROBACION')
      RETURNING *;
    `;
    const { rows: rowsM } = await query(sqlInsert, [
      cobradorId,
      prospecto.id,
      prospecto.etapa,
      mensajePropuesto,
    ]);

    return res.status(201).json({
      ok: true,
      mensaje: rowsM[0],
    });
  } catch (err) {
    console.error('[crm.controller] Error al generar mensaje con IA:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_GENERACION_IA',
      userMessage: err.userMessage || 'No fue posible redactar la propuesta en este momento. Inténtalo de nuevo en unos segundos.',
      ...debugPayload(err),
    });
  }
}

/**
 * PATCH /api/crm/mensajes/:mensajeId/estado
 * Permite al prestamista aprobar o descartar un mensaje propuesto por la IA.
 */
export async function actualizarEstadoMensaje(req, res) {
  try {
    const cobradorId = req.user?.id;
    const { mensajeId } = req.params;
    const { estado } = req.body;

    const estadoLimpio = String(estado || '').toUpperCase();
    if (!['APROBADO', 'DESCARTADO', 'PENDIENTE_APROBACION'].includes(estadoLimpio)) {
      return res.status(400).json({
        ok: false,
        error: 'ESTADO_INVALIDO',
        userMessage: 'El estado del mensaje debe ser APROBADO o DESCARTADO.',
      });
    }

    const sql = `
      UPDATE crm_mensajes_ia
      SET estado = $1::estado_aprobacion_ia,
          actualizado_en = now()
      WHERE id = $2 AND cobrador_id = $3
      RETURNING *;
    `;
    const { rows } = await query(sql, [estadoLimpio, mensajeId, cobradorId]);

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        userMessage: 'El mensaje indicado no fue encontrado.',
      });
    }

    return res.json({
      ok: true,
      mensaje: rows[0],
    });
  } catch (err) {
    console.error('[crm.controller] Error al actualizar estado de mensaje:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_ACTUALIZACION',
      userMessage: 'No fue posible actualizar el estado del mensaje en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * GET /api/crm/cerebro
 * Consulta la configuración de Séneca CRM para el prestamista.
 */
export async function obtenerCerebroConfig(req, res) {
  try {
    const cobradorId = req.user?.id;
    const { rows } = await query(
      'SELECT * FROM crm_cerebro_config WHERE cobrador_id = $1;',
      [cobradorId]
    );

    if (rows.length === 0) {
      return res.json({
        ok: true,
        cerebro: {
          cobrador_id: cobradorId,
          tono: 'EJECUTIVO_CERCANO',
          instruccion_base:
            'Hola [Nombre], le saludamos cordialmente sobre su solicitud en [Ubicación]. Su monto estimado es [Monto estimado]. Quedamos a su disposición.',
          reglas_adicionales: '',
          es_default: true,
        },
      });
    }

    return res.json({
      ok: true,
      cerebro: rows[0],
    });
  } catch (err) {
    console.error('[crm.controller] Error al consultar cerebro config:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_CEREBRO',
      userMessage: 'No fue posible consultar la configuración de redacción en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * PUT /api/crm/cerebro
 * Actualiza la configuración visible del Cerebro de Séneca CRM para el prestamista.
 */
export async function actualizarCerebroConfig(req, res) {
  try {
    const cobradorId = req.user?.id;
    const { tono = 'EJECUTIVO_CERCANO', instruccion_base, reglas_adicionales = '' } = req.body;

    if (!instruccion_base || typeof instruccion_base !== 'string' || !instruccion_base.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'El mensaje guía para Séneca es obligatorio.',
      });
    }

    const sql = `
      INSERT INTO crm_cerebro_config (cobrador_id, tono, instruccion_base, reglas_adicionales, actualizado_en)
      VALUES ($1, $2, $3, $4, now())
      ON CONFLICT (cobrador_id) DO UPDATE
      SET tono = EXCLUDED.tono,
          instruccion_base = EXCLUDED.instruccion_base,
          reglas_adicionales = EXCLUDED.reglas_adicionales,
          actualizado_en = now()
      RETURNING *;
    `;
    const { rows } = await query(sql, [
      cobradorId,
      tono.trim(),
      instruccion_base.trim(),
      reglas_adicionales ? reglas_adicionales.trim() : null,
    ]);

    return res.json({
      ok: true,
      cerebro: rows[0],
    });
  } catch (err) {
    console.error('[crm.controller] Error al actualizar cerebro config:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_CEREBRO',
      userMessage: 'No fue posible guardar la configuración del cerebro en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * PUT /api/crm/metas
 * Actualiza metas de conversión y alertas de estancamiento para el prestamista.
 */
export async function actualizarMetasEtapas(req, res) {
  try {
    const cobradorId = req.user?.id;
    const { metas } = req.body;

    if (!Array.isArray(metas) || metas.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'Se requiere un arreglo con las metas de conversión a actualizar.',
      });
    }

    const metasGuardadas = await withTransaction(async (client) => {
      const resultados = [];
      for (const item of metas) {
        const etapa = String(item.etapa || '').toUpperCase();
        if (!ETAPAS_VALIDAS_PRESTAMISTA.includes(etapa)) continue;

        const metaNum = Number(item.meta_conversion ?? 75.0);
        const diasNum = parseInt(item.dias_alerta_estancado, 10);
        const metaValida = !isNaN(metaNum) && metaNum >= 0 && metaNum <= 100 ? metaNum : 75.0;
        const diasValidos = !isNaN(diasNum) && diasNum >= 1 ? diasNum : 3;

        const sqlUpsert = `
          INSERT INTO crm_metas_etapa (cobrador_id, etapa, meta_conversion, dias_alerta_estancado)
          VALUES ($1, $2::etapa_crm_prestamista, $3, $4)
          ON CONFLICT (cobrador_id, etapa) DO UPDATE
          SET meta_conversion = EXCLUDED.meta_conversion,
              dias_alerta_estancado = EXCLUDED.dias_alerta_estancado
          RETURNING *;
        `;
        const { rows } = await client.query(sqlUpsert, [
          cobradorId,
          etapa,
          metaValida,
          diasValidos,
        ]);
        resultados.push(rows[0]);
      }
      return resultados;
    });

    return res.json({
      ok: true,
      metas: metasGuardadas,
    });
  } catch (err) {
    console.error('[crm.controller] Error al actualizar metas de etapa:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_METAS',
      userMessage: 'No fue posible guardar las metas en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * PUT /api/crm/prospectos/:id
 * Actualiza los datos editables de un prospecto del prestamista autenticado.
 */
export async function actualizarProspecto(req, res) {
  try {
    const cobradorId = req.user?.id;
    const { id } = req.params;
    const {
      nombre,
      apellidos,
      telefono,
      ubicacion,
      canal_origen = 'REFERIDO',
      monto_estimado,
      notas,
    } = req.body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'El nombre del prospecto es obligatorio.',
      });
    }

    if (/[0-9]/.test(nombre)) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'El nombre no debe contener números.',
      });
    }

    if (apellidos && typeof apellidos === 'string' && /[0-9]/.test(apellidos)) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'Los apellidos no deben contener números.',
      });
    }

    const telefonoFormateado = normalizarTelefono8Digitos(telefono);
    if (!telefonoFormateado) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'Ingresa un teléfono válido de 8 dígitos.',
      });
    }

    if (!ubicacion || typeof ubicacion !== 'string' || !ubicacion.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'La ubicación del prospecto es obligatoria.',
      });
    }

    const montoNum = Number(monto_estimado ?? 0);
    const montoValido = Number.isFinite(montoNum) && montoNum >= 0 ? montoNum : 0;

    const sql = `
      UPDATE crm_prospectos
      SET nombre = $1,
          apellidos = $2,
          telefono = $3,
          ubicacion = $4,
          canal_origen = $5,
          monto_estimado = $6,
          notas = $7,
          actualizado_en = now()
      WHERE id = $8 AND cobrador_id = $9
      RETURNING *;
    `;
    const { rows } = await query(sql, [
      nombre.trim(),
      apellidos && typeof apellidos === 'string' && apellidos.trim() ? apellidos.trim() : null,
      telefonoFormateado,
      ubicacion.trim(),
      canal_origen && typeof canal_origen === 'string' && canal_origen.trim() ? canal_origen.trim() : 'REFERIDO',
      montoValido,
      notas && typeof notas === 'string' && notas.trim() ? notas.trim() : null,
      id,
      cobradorId,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        userMessage: 'El prospecto indicado no fue encontrado.',
      });
    }

    return res.json({
      ok: true,
      prospecto: rows[0],
    });
  } catch (err) {
    console.error('[crm.controller] Error al actualizar prospecto:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_ACTUALIZACION',
      userMessage: 'No fue posible actualizar los datos del prospecto en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * DELETE /api/crm/prospectos/:id
 * Elimina un prospecto perteneciente al prestamista autenticado.
 */
export async function eliminarProspecto(req, res) {
  try {
    const cobradorId = req.user?.id;
    const { id } = req.params;

    const { rows } = await query(
      'DELETE FROM crm_prospectos WHERE id = $1 AND cobrador_id = $2 RETURNING id;',
      [id, cobradorId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        userMessage: 'El prospecto indicado no fue encontrado.',
      });
    }

    return res.json({
      ok: true,
      id: rows[0].id,
    });
  } catch (err) {
    console.error('[crm.controller] Error al eliminar prospecto:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_ELIMINACION',
      userMessage: 'No fue posible eliminar el prospecto en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * POST /api/crm/prospectos/:id/convertir-cliente
 * Registra al prospecto en clientes si aún no existe por teléfono y guarda cliente_id.
 */
export async function convertirProspectoACliente(req, res) {
  try {
    const cobradorId = req.user?.id;
    const { id } = req.params;

    const resultado = await withTransaction(async (client) => {
      const { rows: rowsP } = await client.query(
        'SELECT * FROM crm_prospectos WHERE id = $1 AND cobrador_id = $2 FOR UPDATE;',
        [id, cobradorId]
      );

      if (rowsP.length === 0) {
        return { notFound: true };
      }

      const prospecto = rowsP[0];

      if (prospecto.cliente_id) {
        return {
          yaExistia: true,
          clienteId: prospecto.cliente_id,
          prospecto,
        };
      }

      // Buscar si ya existe un cliente activo con el mismo teléfono para este prestamista
      const { rows: existingClients } = await client.query(
        `SELECT * FROM clientes
         WHERE cobrador_id = $1
           AND estado = 'ACTIVO'::public.estado_cliente
           AND regexp_replace(telefono, '[^0-9]', '', 'g') = regexp_replace($2, '[^0-9]', '', 'g')
         LIMIT 1;`,
        [cobradorId, prospecto.telefono]
      );

      let clienteFinal = existingClients[0] || null;
      let yaExistia = Boolean(clienteFinal);

      if (!clienteFinal) {
        const { rows: insertedClients } = await client.query(
          `INSERT INTO clientes (
             cobrador_id, cedula, nombre, apellidos, telefono, ubicacion, detalles, estado
           ) VALUES ($1::uuid, NULL, $2, $3, $4, $5, $6, 'ACTIVO'::public.estado_cliente)
           RETURNING *;`,
          [
            cobradorId,
            prospecto.nombre,
            prospecto.apellidos || null,
            prospecto.telefono,
            prospecto.ubicacion,
            prospecto.notas || null,
          ]
        );
        clienteFinal = insertedClients[0];

        await client.query(
          `INSERT INTO bitacora_actividad (
             usuario_id, cobrador_id, accion, entidad, entidad_id, cedula, detalle
           ) VALUES ($1::uuid, $2::uuid, 'CLIENTE_CREADO'::public.accion_bitacora, 'clientes', $3::uuid, NULL, $4);`,
          [
            cobradorId,
            cobradorId,
            clienteFinal.id,
            JSON.stringify({
              origen: 'CRM_PROSPECTO',
              prospecto_id: prospecto.id,
              nombre: clienteFinal.nombre,
              apellidos: clienteFinal.apellidos,
            }),
          ]
        );
      }

      const { rows: updatedProspectos } = await client.query(
        `UPDATE crm_prospectos
         SET cliente_id = $1::uuid,
             revisado = true,
             actualizado_en = now()
         WHERE id = $2 AND cobrador_id = $3
         RETURNING *;`,
        [clienteFinal.id, prospecto.id, cobradorId]
      );

      return {
        yaExistia,
        cliente: clienteFinal,
        prospecto: updatedProspectos[0],
      };
    });

    if (resultado.notFound) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        userMessage: 'El prospecto indicado no fue encontrado.',
      });
    }

    return res.status(resultado.yaExistia ? 200 : 201).json({
      ok: true,
      ya_existia: resultado.yaExistia,
      cliente: resultado.cliente || null,
      prospecto: resultado.prospecto,
    });
  } catch (err) {
    console.error('[crm.controller] Error al convertir prospecto a cliente:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_CONVERSION_CLIENTE',
      userMessage: 'No fue posible trasladar el prospecto al directorio de clientes en este momento.',
      ...debugPayload(err),
    });
  }
}
