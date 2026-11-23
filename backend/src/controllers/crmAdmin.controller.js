// backend/src/controllers/crmAdmin.controller.js
// Controlador REST del CRM Comercial y Flujo de Campañas para Administración
// Exclusivo para rol 'ADMINISTRADOR'

import { query, withTransaction, debugPayload } from '../config/db.js';
import { redactarMensajeProspectoAdmin, generarPiezasCampanaAdmin } from '../services/crmIa.service.js';

const ETAPAS_VALIDAS_ADMIN = [
  'VISITANTE_LANDING',
  'REGISTRO_INICIADO',
  'CONSENTIMIENTO_LEY_8968',
  'CUENTA_ACTIVA',
  'PRIMER_PRESTAMO',
  'PRESTAMISTA_ACTIVO',
  'EN_RIESGO_BAJA',
];

const ETIQUETAS_ETAPAS_ADMIN = {
  VISITANTE_LANDING: 'Visitante en Landing',
  REGISTRO_INICIADO: 'Registro Iniciado',
  CONSENTIMIENTO_LEY_8968: 'Consentimiento Ley 8968',
  CUENTA_ACTIVA: 'Cuenta Activa',
  PRIMER_PRESTAMO: 'Primer Préstamo',
  PRESTAMISTA_ACTIVO: 'Prestamista Activo',
  EN_RIESGO_BAJA: 'En Riesgo de Baja',
};

const EMAIL_FORMAT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizarTelefonoOpcionalAdmin(raw) {
  if (raw === null || raw === undefined) return { valid: true, value: null };
  const trimmed = String(raw).trim();
  if (!trimmed) return { valid: true, value: null };
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length !== 8) return { valid: false, value: null };
  return { valid: true, value: `${digits.slice(0, 4)}-${digits.slice(4)}` };
}

/**
 * POST /api/admin/crm/prospectos
 * Registra un prospecto de nuevo prestamista en el CRM comercial.
 */
export async function crearProspectoAdmin(req, res) {
  try {
    const {
      nombre,
      correo,
      telefono,
      zona = '',
      canal_origen = 'LANDING_PAGE',
      etapa = 'VISITANTE_LANDING',
      notas,
    } = req.body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'El nombre del prospecto es obligatorio.',
      });
    }

    if (/\d/.test(nombre)) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'El nombre no debe contener números.',
      });
    }

    const correoLimpio =
      correo !== undefined && correo !== null ? String(correo).trim().toLowerCase() : '';
    if (correoLimpio !== '' && !EMAIL_FORMAT_REGEX.test(correoLimpio)) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'Ingresa un correo electrónico válido.',
      });
    }

    const telCheck = normalizarTelefonoOpcionalAdmin(telefono);
    if (!telCheck.valid) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'Ingresa un teléfono válido de 8 dígitos.',
      });
    }

    const etapaLimpia = String(etapa || 'VISITANTE_LANDING').toUpperCase();
    const etapaValida = ETAPAS_VALIDAS_ADMIN.includes(etapaLimpia) ? etapaLimpia : 'VISITANTE_LANDING';

    const prospecto = await withTransaction(async (client) => {
      const sqlP = `
        INSERT INTO crm_admin_prospectos (
          nombre, correo, telefono, zona, canal_origen, etapa, revisado, notas
        ) VALUES ($1, $2, $3, $4, $5, $6::etapa_crm_admin, false, $7)
        RETURNING *;
      `;
      const { rows: rowsP } = await client.query(sqlP, [
        nombre.trim(),
        correoLimpio !== '' ? correoLimpio : null,
        telCheck.value,
        zona && typeof zona === 'string' ? zona.trim() : '',
        canal_origen ? canal_origen.trim() : 'LANDING_PAGE',
        etapaValida,
        notas ? notas.trim() : null,
      ]);

      const nuevoProspecto = rowsP[0];

      const sqlH = `
        INSERT INTO crm_admin_historial_etapas (
          prospecto_admin_id, etapa_anterior, etapa_nueva, dias_en_etapa_anterior
        ) VALUES ($1, NULL, $2::etapa_crm_admin, 0);
      `;
      await client.query(sqlH, [nuevoProspecto.id, etapaValida]);

      return nuevoProspecto;
    });

    return res.status(201).json({
      ok: true,
      prospecto,
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error al crear prospecto admin:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_REGISTRO',
      userMessage: 'No fue posible registrar el prospecto en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * GET /api/admin/crm/prospectos
 * Lista prospectos de prestamistas para la administración.
 */
export async function listarProspectosAdmin(req, res) {
  try {
    const { etapa, canal_origen, busqueda } = req.query;

    const conditions = ['1=1'];
    const values = [];
    let paramIndex = 1;

    if (etapa && ETAPAS_VALIDAS_ADMIN.includes(etapa.toUpperCase())) {
      conditions.push(`etapa = $${paramIndex}::etapa_crm_admin`);
      values.push(etapa.toUpperCase());
      paramIndex += 1;
    }

    if (canal_origen && typeof canal_origen === 'string' && canal_origen.trim()) {
      conditions.push(`canal_origen = $${paramIndex}`);
      values.push(canal_origen.trim());
      paramIndex += 1;
    }

    if (busqueda && typeof busqueda === 'string' && busqueda.trim()) {
      conditions.push(`(nombre ILIKE $${paramIndex} OR correo ILIKE $${paramIndex} OR telefono ILIKE $${paramIndex} OR zona ILIKE $${paramIndex})`);
      values.push(`%${busqueda.trim()}%`);
      paramIndex += 1;
    }

    const whereClause = conditions.join(' AND ');

    const sql = `
      SELECT 
        p.*,
        ROUND(EXTRACT(EPOCH FROM (now() - p.fecha_ultimo_cambio_etapa)) / 86400, 1) AS dias_en_etapa_actual
      FROM crm_admin_prospectos p
      WHERE ${whereClause}
      ORDER BY p.revisado ASC, p.fecha_ultimo_cambio_etapa ASC, p.creado_en DESC;
    `;
    const { rows: prospectos } = await query(sql, values);

    return res.json({
      ok: true,
      total: prospectos.length,
      prospectos,
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error al listar prospectos admin:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_CONSULTA',
      userMessage: 'No fue posible consultar la lista de prospectos en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * PATCH /api/admin/crm/prospectos/:id/etapa
 * Cambia la etapa de un prospecto de prestamista registrando historial.
 */
export async function moverEtapaProspectoAdmin(req, res) {
  try {
    const { id } = req.params;
    const { etapa_nueva } = req.body;

    const etapaNuevaLimpia = String(etapa_nueva || '').toUpperCase();
    if (!ETAPAS_VALIDAS_ADMIN.includes(etapaNuevaLimpia)) {
      return res.status(400).json({
        ok: false,
        error: 'ETAPA_INVALIDA',
        userMessage: 'La etapa indicada no es válida para el embudo comercial.',
      });
    }

    const { rows: rowsActual } = await query(
      'SELECT * FROM crm_admin_prospectos WHERE id = $1;',
      [id]
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

    const fechaCambioPrev = new Date(prospectoActual.fecha_ultimo_cambio_etapa || prospectoActual.creado_en);
    const msDiferencia = Date.now() - fechaCambioPrev.getTime();
    const diasEnEtapaAnterior = Math.max(0, Number((msDiferencia / (1000 * 60 * 60 * 24)).toFixed(2)));

    const prospectoActualizado = await withTransaction(async (client) => {
      const sqlUpdate = `
        UPDATE crm_admin_prospectos
        SET etapa = $1::etapa_crm_admin,
            revisado = true,
            fecha_ultimo_cambio_etapa = now(),
            actualizado_en = now()
        WHERE id = $2
        RETURNING *;
      `;
      const { rows: rowsU } = await client.query(sqlUpdate, [etapaNuevaLimpia, id]);

      const sqlHistorial = `
        INSERT INTO crm_admin_historial_etapas (
          prospecto_admin_id, etapa_anterior, etapa_nueva, dias_en_etapa_anterior
        ) VALUES ($1, $2::etapa_crm_admin, $3::etapa_crm_admin, $4);
      `;
      await client.query(sqlHistorial, [
        id,
        etapaAnterior,
        etapaNuevaLimpia,
        diasEnEtapaAnterior,
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
      },
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error al mover etapa admin:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_CAMBIO_ETAPA',
      userMessage: 'No fue posible actualizar la etapa del prospecto en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * GET /api/admin/crm/embudo
 * Métricas de conversión y fuga para las 7 etapas de captación de prestamistas.
 */
export async function consultarEmbudoAdmin(req, res) {
  try {
    const sqlConteo = `
      SELECT 
        etapa,
        COUNT(*)::int AS total,
        COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (now() - fecha_ultimo_cambio_etapa)) / 86400), 1), 0)::numeric AS dias_promedio
      FROM crm_admin_prospectos
      GROUP BY etapa;
    `;
    const { rows } = await query(sqlConteo);

    let totalGeneral = 0;
    const mapaEtapas = {};
    rows.forEach((r) => {
      const tot = Number(r.total ?? 0);
      totalGeneral += tot;
      mapaEtapas[r.etapa] = {
        total: tot,
        dias_promedio: Number(r.dias_promedio ?? 0),
      };
    });

    const embudo = ETAPAS_VALIDAS_ADMIN.map((etapaKey) => {
      const datos = mapaEtapas[etapaKey] || { total: 0, dias_promedio: 0 };
      const totalEtapa = Number(datos.total ?? 0);
      const metaConversion = 75.0;
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
        etiqueta: ETIQUETAS_ETAPAS_ADMIN[etapaKey] || etapaKey,
        total: totalEtapa,
        conversion_real: conversionReal,
        meta_conversion: metaConversion,
        dias_promedio: sinDatos ? 0 : Number(datos.dias_promedio ?? 0),
        fuga,
        sin_datos: sinDatos,
      };
    });

    return res.json({
      ok: true,
      embudo,
      total_general: totalGeneral,
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error al consultar embudo admin:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_EMBUDO',
      userMessage: 'No fue posible calcular el embudo comercial en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * GET /api/admin/crm/atencion
 * Prospectos de prestamistas sin avance en N días.
 */
export async function listarAtencionAdmin(req, res) {
  try {
    const diasParam = parseInt(req.query.dias, 10);
    const diasMinimos = !isNaN(diasParam) && diasParam >= 1 ? diasParam : 3;

    const sql = `
      SELECT 
        p.*,
        ROUND(EXTRACT(EPOCH FROM (now() - p.fecha_ultimo_cambio_etapa)) / 86400, 1) AS dias_sin_avance
      FROM crm_admin_prospectos p
      WHERE EXTRACT(EPOCH FROM (now() - p.fecha_ultimo_cambio_etapa)) / 86400 >= $1
      ORDER BY dias_sin_avance DESC;
    `;
    const { rows } = await query(sql, [diasMinimos]);

    const lista = rows.map((p) => ({
      ...p,
      dias_sin_avance: Number(p.dias_sin_avance ?? 0),
      motivo_prioridad: `Lleva ${Number(p.dias_sin_avance ?? 0)} días en etapa ${ETIQUETAS_ETAPAS_ADMIN[p.etapa] || p.etapa} sin registrar avance.`,
    }));

    return res.json({
      ok: true,
      total: lista.length,
      dias_filtro: diasMinimos,
      prospectos_atencion: lista,
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error al consultar atención admin:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_ATENCION',
      userMessage: 'No fue posible consultar la lista de atención en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * POST /api/admin/crm/prospectos/:id/mensaje
 * Redacta mensaje comercial con IA para un prestamista prospecto.
 */
export async function generarMensajeProspectoAdminCtrl(req, res) {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT * FROM crm_admin_prospectos WHERE id = $1;', [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        userMessage: 'El prospecto indicado no fue encontrado.',
      });
    }

    const prospecto = rows[0];
    const mensajeTexto = await redactarMensajeProspectoAdmin({ prospecto });

    return res.json({
      ok: true,
      mensaje: mensajeTexto,
      prospecto,
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error en generarMensajeProspectoAdminCtrl:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_GENERACION_IA',
      userMessage: err.userMessage || 'No fue posible redactar la propuesta en este momento. Inténtalo de nuevo en unos segundos.',
      ...debugPayload(err),
    });
  }
}

/**
 * GET /api/admin/crm/campanas
 * Lista campañas con cálculo automático de costo_por_inscrito (respetando valor 0 sin ||).
 */
export async function listarCampanasAdmin(req, res) {
  try {
    const sql = `
      SELECT 
        c.*,
        (SELECT COUNT(*)::int FROM crm_admin_campana_piezas p WHERE p.campana_id = c.id) AS total_piezas,
        (SELECT COUNT(*)::int FROM crm_admin_campana_piezas p WHERE p.campana_id = c.id AND p.estado = 'APROBADO'::estado_aprobacion_ia) AS piezas_aprobadas,
        COALESCE(
          (
            SELECT json_agg(p ORDER BY p.creado_en ASC)
            FROM crm_admin_campana_piezas p
            WHERE p.campana_id = c.id
          ),
          '[]'::json
        ) AS piezas
      FROM crm_admin_campanas c
      ORDER BY c.creado_en DESC;
    `;
    const { rows } = await query(sql);

    const campanas = rows.map((c) => {
      const presupuesto = Number(c.presupuesto ?? 0);
      const inscritos = Number(c.inscritos_logrados ?? 0);
      const costoPorInscrito = inscritos > 0 ? Number((presupuesto / inscritos).toFixed(2)) : 0;

      return {
        ...c,
        presupuesto,
        inscritos_logrados: inscritos,
        costo_por_inscrito: costoPorInscrito,
        total_piezas: Number(c.total_piezas ?? 0),
        piezas_aprobadas: Number(c.piezas_aprobadas ?? 0),
        piezas: Array.isArray(c.piezas) ? c.piezas : [],
      };
    });

    return res.json({
      ok: true,
      total: campanas.length,
      campanas,
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error al listar campañas:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_CAMPANAS',
      userMessage: 'No fue posible consultar las campañas en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * POST /api/admin/crm/campanas
 * Registra una nueva campaña comercial.
 */
export async function crearCampanaAdmin(req, res) {
  try {
    const {
      nombre,
      objetivo,
      publico_objetivo,
      mensaje_central,
      canales = 'Facebook e Instagram',
      presupuesto,
      inscritos_logrados,
      fecha_inicio = null,
      fecha_fin = null,
    } = req.body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'El nombre de la campaña es obligatorio.',
      });
    }

    if (!objetivo || typeof objetivo !== 'string' || !objetivo.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'El objetivo de la campaña es obligatorio.',
      });
    }

    const presupuestoNum = Number(presupuesto ?? 0);
    const presupuestoValido = !isNaN(presupuestoNum) && presupuestoNum >= 0 ? presupuestoNum : 0;

    const inscritosNum = parseInt(inscritos_logrados ?? 0, 10);
    const inscritosValido = !isNaN(inscritosNum) && inscritosNum >= 0 ? inscritosNum : 0;

    const sql = `
      INSERT INTO crm_admin_campanas (
        nombre, objetivo, publico_objetivo, mensaje_central, canales, presupuesto, inscritos_logrados, estado, fecha_inicio, fecha_fin
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'OBJETIVO'::estado_campana_crm, $8, $9)
      RETURNING *;
    `;
    const { rows } = await query(sql, [
      nombre.trim(),
      objetivo.trim(),
      publico_objetivo ? publico_objetivo.trim() : null,
      mensaje_central ? mensaje_central.trim() : null,
      canales ? canales.trim() : 'Facebook e Instagram',
      presupuestoValido,
      inscritosValido,
      fecha_inicio || null,
      fecha_fin || null,
    ]);

    const nuevaCampana = rows[0];
    const costoPorInscrito = inscritosValido > 0 ? Number((presupuestoValido / inscritosValido).toFixed(2)) : 0;
    return res.status(201).json({
      ok: true,
      campana: {
        ...nuevaCampana,
        presupuesto: presupuestoValido,
        inscritos_logrados: inscritosValido,
        costo_por_inscrito: costoPorInscrito,
        total_piezas: 0,
        piezas_aprobadas: 0,
        piezas: [],
      },
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error al crear campaña:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_CREACION_CAMPANA',
      userMessage: 'No fue posible registrar la campaña en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * PATCH /api/admin/crm/campanas/:id
 * Actualiza campos y métricas de una campaña.
 */
export async function actualizarCampanaAdmin(req, res) {
  try {
    const { id } = req.params;
    const {
      nombre,
      objetivo,
      publico_objetivo,
      mensaje_central,
      canales,
      presupuesto,
      inscritos_logrados,
      estado,
      fecha_inicio,
      fecha_fin,
    } = req.body;

    const { rows: rowsActual } = await query('SELECT * FROM crm_admin_campanas WHERE id = $1;', [id]);
    if (rowsActual.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        userMessage: 'La campaña indicada no fue encontrada.',
      });
    }

    const campanaActual = rowsActual[0];

    const nuevoNombre = nombre !== undefined ? String(nombre).trim() : campanaActual.nombre;
    const nuevoObjetivo = objetivo !== undefined ? String(objetivo).trim() : campanaActual.objetivo;
    const nuevoPublico = publico_objetivo !== undefined ? String(publico_objetivo).trim() : campanaActual.publico_objetivo;
    const nuevoMensaje = mensaje_central !== undefined ? String(mensaje_central).trim() : campanaActual.mensaje_central;
    const nuevosCanales = canales !== undefined ? String(canales).trim() : campanaActual.canales;

    let nuevoPresupuesto = campanaActual.presupuesto;
    if (presupuesto !== undefined) {
      const pNum = Number(presupuesto);
      if (!isNaN(pNum) && pNum >= 0) nuevoPresupuesto = pNum;
    }

    let nuevosInscritos = campanaActual.inscritos_logrados;
    if (inscritos_logrados !== undefined) {
      const iNum = parseInt(inscritos_logrados, 10);
      if (!isNaN(iNum) && iNum >= 0) nuevosInscritos = iNum;
    }

    const nuevoEstado = estado !== undefined ? String(estado).toUpperCase() : campanaActual.estado;

    const sql = `
      UPDATE crm_admin_campanas
      SET nombre = $1,
          objetivo = $2,
          publico_objetivo = $3,
          mensaje_central = $4,
          canales = $5,
          presupuesto = $6,
          inscritos_logrados = $7,
          estado = $8::estado_campana_crm,
          fecha_inicio = $9,
          fecha_fin = $10,
          actualizado_en = now()
      WHERE id = $11
      RETURNING *;
    `;
    const { rows: rowsU } = await query(sql, [
      nuevoNombre,
      nuevoObjetivo,
      nuevoPublico,
      nuevoMensaje,
      nuevosCanales,
      nuevoPresupuesto,
      nuevosInscritos,
      nuevoEstado,
      fecha_inicio !== undefined ? fecha_inicio : campanaActual.fecha_inicio,
      fecha_fin !== undefined ? fecha_fin : campanaActual.fecha_fin,
      id,
    ]);

    const actualizada = rowsU[0];
    const presNum = Number(actualizada.presupuesto ?? 0);
    const inscNum = Number(actualizada.inscritos_logrados ?? 0);
    const costoPorInscrito = inscNum > 0 ? Number((presNum / inscNum).toFixed(2)) : 0;

    return res.json({
      ok: true,
      campana: {
        ...actualizada,
        costo_por_inscrito: costoPorInscrito,
      },
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error al actualizar campaña:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_ACTUALIZACION_CAMPANA',
      userMessage: 'No fue posible actualizar la campaña en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * POST /api/admin/crm/campanas/:id/generar-piezas
 * Genera exactamente 3 piezas de contenido con IA en estado PENDIENTE_APROBACION.
 */
export async function generarPiezasCampanaAdminCtrl(req, res) {
  try {
    const { id } = req.params;
    const { rows: rowsC } = await query('SELECT * FROM crm_admin_campanas WHERE id = $1;', [id]);

    if (rowsC.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        userMessage: 'La campaña indicada no fue encontrada.',
      });
    }

    const campana = rowsC[0];
    const piezasGeneradas = await generarPiezasCampanaAdmin({ campana });

    const piezasGuardadas = await withTransaction(async (client) => {
      const guardadas = [];
      for (const p of piezasGeneradas) {
        const sql = `
          INSERT INTO crm_admin_campana_piezas (
            campana_id, titulo, canal, copy_propuesto, formato, estado
          ) VALUES ($1, $2, $3, $4, $5, 'PENDIENTE_APROBACION')
          RETURNING *;
        `;
        const { rows } = await client.query(sql, [
          id,
          p.titulo,
          p.canal,
          p.copy_propuesto,
          p.formato,
        ]);
        guardadas.push(rows[0]);
      }

      await client.query(
        "UPDATE crm_admin_campanas SET estado = 'PLAN_PIEZAS'::estado_campana_crm, actualizado_en = now() WHERE id = $1;",
        [id]
      );

      return guardadas;
    });

    return res.status(201).json({
      ok: true,
      campana_id: id,
      piezas: piezasGuardadas,
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error al generar piezas con IA:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_GENERACION_PIEZAS',
      userMessage: err.userMessage || 'No fue posible redactar las piezas de la campaña en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * PATCH /api/admin/crm/piezas/:piezaId/estado
 * Permite al administrador aprobar o descartar una pieza publicitaria.
 */
export async function actualizarEstadoPiezaAdmin(req, res) {
  try {
    const { piezaId } = req.params;
    const { estado } = req.body;

    const estadoLimpio = String(estado || '').toUpperCase();
    if (!['APROBADO', 'DESCARTADO', 'PENDIENTE_APROBACION'].includes(estadoLimpio)) {
      return res.status(400).json({
        ok: false,
        error: 'ESTADO_INVALIDO',
        userMessage: 'El estado de la pieza debe ser APROBADO o DESCARTADO.',
      });
    }

    const sql = `
      UPDATE crm_admin_campana_piezas
      SET estado = $1::estado_aprobacion_ia
      WHERE id = $2
      RETURNING *;
    `;
    const { rows } = await query(sql, [estadoLimpio, piezaId]);

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        userMessage: 'La pieza indicada no fue encontrada.',
      });
    }

    return res.json({
      ok: true,
      pieza: rows[0],
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error al actualizar estado de pieza:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_ACTUALIZACION',
      userMessage: 'No fue posible actualizar el estado de la pieza en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * PUT /api/admin/crm/prospectos/:id
 * Actualiza los datos de un interesado en el CRM comercial administrativo.
 */
export async function actualizarProspectoAdmin(req, res) {
  try {
    const { id } = req.params;
    const {
      nombre,
      correo,
      telefono,
      zona = '',
      canal_origen = 'LANDING_PAGE',
      notas,
    } = req.body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'El nombre del interesado es obligatorio.',
      });
    }

    if (/\d/.test(nombre)) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'El nombre no debe contener números.',
      });
    }

    const correoLimpio =
      correo !== undefined && correo !== null ? String(correo).trim().toLowerCase() : '';
    if (correoLimpio !== '' && !EMAIL_FORMAT_REGEX.test(correoLimpio)) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'Ingresa un correo electrónico válido.',
      });
    }

    const telCheck = normalizarTelefonoOpcionalAdmin(telefono);
    if (!telCheck.valid) {
      return res.status(400).json({
        ok: false,
        error: 'DATOS_INVALIDOS',
        userMessage: 'Ingresa un teléfono válido de 8 dígitos.',
      });
    }

    const sql = `
      UPDATE crm_admin_prospectos
      SET nombre = $1,
          correo = $2,
          telefono = $3,
          zona = $4,
          canal_origen = $5,
          notas = $6,
          actualizado_en = now()
      WHERE id = $7
      RETURNING *;
    `;
    const { rows } = await query(sql, [
      nombre.trim(),
      correoLimpio !== '' ? correoLimpio : null,
      telCheck.value,
      zona && typeof zona === 'string' ? zona.trim() : '',
      canal_origen && typeof canal_origen === 'string' && canal_origen.trim() ? canal_origen.trim() : 'LANDING_PAGE',
      notas && typeof notas === 'string' && notas.trim() ? notas.trim() : null,
      id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        userMessage: 'El interesado indicado no fue encontrado.',
      });
    }

    return res.json({
      ok: true,
      prospecto: rows[0],
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error al actualizar prospecto admin:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_ACTUALIZACION',
      userMessage: 'No fue posible actualizar los datos del interesado en este momento.',
      ...debugPayload(err),
    });
  }
}

/**
 * DELETE /api/admin/crm/prospectos/:id
 * Elimina un interesado del CRM comercial administrativo.
 */
export async function eliminarProspectoAdmin(req, res) {
  try {
    const { id } = req.params;
    const { rows } = await query(
      'DELETE FROM crm_admin_prospectos WHERE id = $1 RETURNING id;',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'NOT_FOUND',
        userMessage: 'El interesado indicado no fue encontrado.',
      });
    }

    return res.json({
      ok: true,
      id: rows[0].id,
    });
  } catch (err) {
    console.error('[crmAdmin.controller] Error al eliminar prospecto admin:', err);
    return res.status(500).json({
      ok: false,
      error: 'ERROR_ELIMINACION',
      userMessage: 'No fue posible eliminar el interesado en este momento.',
      ...debugPayload(err),
    });
  }
}
