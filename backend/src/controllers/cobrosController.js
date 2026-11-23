import { pool, query, debugPayload } from '../config/db.js';

const DIA_SEMANA_ENUM = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

function cleanCedula9(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '').slice(0, 9);
  return digits.length === 9 ? digits : null;
}

function normalizeDiaSemana(dia) {
  if (!dia) return 'LUNES';
  const clean = String(dia)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const valid = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  return valid.includes(clean) ? clean : 'LUNES';
}

function getDiaSemanaEnum(dateStr) {
  if (!dateStr) return 'LUNES';
  const cleanStr = dateStr instanceof Date 
    ? dateStr.toISOString().slice(0, 10) 
    : String(dateStr).slice(0, 10);
  const [y, m, d] = cleanStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayIdx = dateObj.getUTCDay();
  return DIA_SEMANA_ENUM[dayIdx] || 'LUNES';
}

function addDaysISO(dateStr, days) {
  const cleanStr = dateStr instanceof Date
    ? dateStr.toISOString().slice(0, 10)
    : String(dateStr).slice(0, 10);
  const [y, m, d] = cleanStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dateObj.setUTCDate(dateObj.getUTCDate() + days);
  return dateObj.toISOString().slice(0, 10);
}

function getWeekRangeISO(dateStr) {
  const cleanStr = dateStr instanceof Date
    ? dateStr.toISOString().slice(0, 10)
    : String(dateStr).slice(0, 10);
  const [y, m, d] = cleanStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = dateObj.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = addDaysISO(cleanStr, diffToMonday);
  const sunday = addDaysISO(monday, 6);
  return { monday, sunday };
}

function getMondayOffsetForDiaSemana(diaFijo) {
  const clean = normalizeDiaSemana(diaFijo);
  const map = {
    LUNES: 0,
    MARTES: 1,
    MIERCOLES: 2,
    JUEVES: 3,
    VIERNES: 4,
    SABADO: 5,
    DOMINGO: 6
  };
  return map[clean] ?? 0;
}

function calculateNextChargeDate(currentDateStr, modalidad, diaMes1, diaMes2, diaFijoOriginal = null) {
  if (modalidad === 'SEMANAL') {
    if (diaFijoOriginal) {
      const week = getWeekRangeISO(currentDateStr);
      const nextMonday = addDaysISO(week.monday, 7);
      const offset = getMondayOffsetForDiaSemana(diaFijoOriginal);
      return addDaysISO(nextMonday, offset);
    }
    return addDaysISO(currentDateStr, 7);
  }
  // Modalidad QUINCENAL - Forma B: Cada 2 semanas (14 días) con día fijo de la semana
  if (diaFijoOriginal || (!diaMes1 && !diaMes2)) {
    if (diaFijoOriginal) {
      const week = getWeekRangeISO(currentDateStr);
      const nextBiweeklyMonday = addDaysISO(week.monday, 14);
      const offset = getMondayOffsetForDiaSemana(diaFijoOriginal);
      return addDaysISO(nextBiweeklyMonday, offset);
    }
    return addDaysISO(currentDateStr, 14);
  }
  // Modalidad QUINCENAL - Forma A: Día 15 y fin de mes
  const [y, m, d] = String(currentDateStr).slice(0, 10).split('-').map(Number);
  const day1 = Number(diaMes1) || 15;
  const day2 = Number(diaMes2) || 31;

  if (d < day1) {
    const nextD = Math.min(day1, new Date(y, m, 0).getDate());
    return `${y}-${String(m).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`;
  } else if (d < day2) {
    const nextD = Math.min(day2, new Date(y, m, 0).getDate());
    return `${y}-${String(m).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`;
  } else {
    // Siguiente mes diaMes1
    let nextY = y;
    let nextM = m + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const nextD = Math.min(day1, new Date(nextY, nextM, 0).getDate());
    return `${nextY}-${String(nextM).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`;
  }
}

async function getDelegadoNombre(client, usuarioId) {
  const { rows } = await client.query(
    `SELECT COALESCE(NULLIF(BTRIM(nombre_completo), ''), NULLIF(BTRIM(usuario), ''), 'Otro cobrador') AS nombre
       FROM usuarios
      WHERE id = $1::uuid
      LIMIT 1;`,
    [usuarioId]
  );
  return rows[0]?.nombre || 'Otro cobrador';
}

async function notifyOwnerWithSavepoint(client, { savepointName = 'sp_notif_delegado', ownerId, titulo, mensaje, montoResaltado = 0 }) {
  try {
    await client.query('SAVEPOINT sp_notif_delegado');
    await client.query(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, monto_resaltado, leida)
       VALUES ($1::uuid, $2, $3, $4, false);`,
      [ownerId, titulo, mensaje, Number(montoResaltado || 0)]
    );
    await client.query('RELEASE SAVEPOINT sp_notif_delegado');
  } catch (notifErr) {
    await client.query('ROLLBACK TO SAVEPOINT sp_notif_delegado').catch(() => {});
    console.warn(`[Notificaciones Delegación] Aviso no bloqueante (${savepointName}):`, notifErr.message);
  }
}

export async function getCobros(req, res) {
  try {
    const usuarioActualId = req.user?.id;
    if (!usuarioActualId) {
      return res.status(401).json({
        error: 'No autenticado',
        userMessage: 'Debes iniciar sesión para continuar.'
      });
    }

    // Fecha consultada (YYYY-MM-DD), por defecto hoy en Costa Rica
    const nowCR = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const fecha = req.query.fecha || nowCR;

    // 1. Total Prestado: suma exclusivamente el capital de los préstamos propios vigentes activos
    const sqlTotalPrestado = `
      SELECT
        COALESCE(SUM(p.monto_prestado), 0)::numeric AS total,
        COUNT(p.id)::int AS activos_count
      FROM prestamos p
      INNER JOIN clientes c ON c.id = p.cliente_id AND c.estado = 'ACTIVO'::public.estado_cliente
      WHERE p.cobrador_id = $1::uuid
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND COALESCE(p.saldo_por_pagar, 0) > 0
        AND COALESCE(p.periodos_pendientes, 0) > 0;
    `;
    const { rows: resTotalPrestado } = await query(sqlTotalPrestado, [usuarioActualId]);
    const totalPrestado = Number(resTotalPrestado[0]?.total || 0);
    const prestamosActivosCount = Number(resTotalPrestado[0]?.activos_count || 0);

    // 2. Esta Semana: incluye cuotas propias y cuotas compartidas recibidas para la semana consultada
    const sqlEstaSemana = `
      SELECT COALESCE(SUM(a.monto_cuota), 0)::numeric AS total
      FROM agenda_cobros a
      INNER JOIN prestamos p ON a.prestamo_id = p.id
      INNER JOIN clientes c ON c.id = p.cliente_id AND c.estado = 'ACTIVO'::public.estado_cliente
      WHERE (p.cobrador_id = $1::uuid OR a.compartido_con_usuario_id = $1::uuid)
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND COALESCE(p.saldo_por_pagar, 0) > 0
        AND COALESCE(p.periodos_pendientes, 0) > 0
        AND a.fecha_cobro_actual >= date_trunc('week', $2::date)::date
        AND a.fecha_cobro_actual <= (date_trunc('week', $2::date)::date + interval '6 days');
    `;
    const { rows: resEstaSemana } = await query(sqlEstaSemana, [usuarioActualId, fecha]);
    const estaSemana = Number(resEstaSemana[0]?.total || 0);

    // 3. Hoy: cuotas propias y compartidas pendientes para la fecha consultada (y rezagados propios si es hoy)
    const sqlHoy = `
      SELECT COALESCE(SUM(a.monto_cuota), 0)::numeric AS total
      FROM agenda_cobros a
      INNER JOIN prestamos p ON a.prestamo_id = p.id
      INNER JOIN clientes c ON c.id = p.cliente_id AND c.estado = 'ACTIVO'::public.estado_cliente
      WHERE (p.cobrador_id = $1::uuid OR a.compartido_con_usuario_id = $1::uuid)
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND COALESCE(p.saldo_por_pagar, 0) > 0
        AND COALESCE(p.periodos_pendientes, 0) > 0
        AND a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        AND (
          a.fecha_cobro_actual = $2::date
          OR ($2::date = $3::date AND a.fecha_cobro_actual < $3::date)
        );
    `;
    const { rows: resHoy } = await query(sqlHoy, [usuarioActualId, fecha, nowCR]);
    const hoy = Number(resHoy[0]?.total || 0);

    // 4. Lista de Pendientes (propios + recibidos por delegación compartida en esta fecha)
    const sqlPendientes = `
      SELECT 
        a.id,
        a.prestamo_id,
        a.cliente_id,
        a.numero_cobro,
        to_char(a.fecha_programada_original, 'YYYY-MM-DD') AS fecha_programada_original,
        to_char(a.fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_cobro_actual,
        (a.fecha_cobro_actual < $3::date) AS es_rezagado,
        a.dia_semana_actual,
        a.veces_pasado,
        a.monto_cuota,
        a.monto_moratoria,
        a.estado AS estado_cuota,
        (p.cobrador_id <> $1::uuid AND a.compartido_con_usuario_id = $1::uuid) AS es_cobro_recibido,
        (p.cobrador_id <> $1::uuid AND a.compartido_con_usuario_id = $1::uuid) AS es_compartido,
        (p.cobrador_id = $1::uuid AND a.compartido_con_usuario_id IS NOT NULL) AS es_cobro_enviado,
        u_prop.nombre_completo AS compartido_por_nombre,
        u_prop.usuario AS compartido_por_username,
        a.compartido_con_usuario_id,
        u_del.nombre_completo AS compartido_con_nombre,
        u_del.usuario AS compartido_con_username,
        to_char(a.compartido_en, 'YYYY-MM-DD HH24:MI') AS compartido_en,
        a.gestionado_por_usuario_id,
        u_gest.nombre_completo AS gestionado_por_nombre,
        a.gestionado_accion,
        to_char(a.gestionado_en, 'YYYY-MM-DD HH24:MI') AS gestionado_en,
        c.cedula,
        c.cedula AS cliente_cedula,
        c.nombre,
        c.nombre AS cliente_nombre,
        c.apellidos,
        c.apellidos AS cliente_apellidos,
        c.telefono,
        c.telefono AS cliente_telefono,
        c.telefono_secundario,
        c.telefono_secundario AS cliente_telefono_secundario,
        c.ubicacion,
        c.ubicacion AS cliente_ubicacion,
        c.detalles,
        c.detalles AS cliente_detalles,
        p.cuota,
        p.monto_prestado,
        p.saldo_por_pagar,
        p.modalidad,
        p.dia_fijo_original,
        p.periodos_atrasados_acumulados,
        p.periodos_pagados,
        p.total_periodos,
        p.estado AS estado_prestamo
      FROM agenda_cobros a
      INNER JOIN prestamos p ON a.prestamo_id = p.id
      INNER JOIN clientes c ON c.id = p.cliente_id AND c.estado = 'ACTIVO'::public.estado_cliente
      LEFT JOIN usuarios u_prop ON u_prop.id = p.cobrador_id
      LEFT JOIN usuarios u_del ON u_del.id = a.compartido_con_usuario_id
      LEFT JOIN usuarios u_gest ON u_gest.id = a.gestionado_por_usuario_id
      WHERE (p.cobrador_id = $1::uuid OR a.compartido_con_usuario_id = $1::uuid)
        AND a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND COALESCE(p.saldo_por_pagar, 0) > 0
        AND COALESCE(p.periodos_pendientes, 0) > 0
        AND (
          a.fecha_cobro_actual = $2::date
          OR ($2::date = $3::date AND a.fecha_cobro_actual < $3::date)
        )
      ORDER BY es_rezagado DESC, a.fecha_cobro_actual ASC, a.numero_cobro ASC, c.nombre ASC;
    `;
    const { rows: rowsPendientes } = await query(sqlPendientes, [usuarioActualId, fecha, nowCR]);

    // 4.1 Días anteriores con pendientes sin cerrar e indicadores semanales (incluye propios y compartidos recibidos)
    const sqlDiasSinCerrar = `
      SELECT 
        to_char(a.fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_pendiente,
        COUNT(*)::int AS total_pendientes,
        COALESCE(SUM(a.monto_cuota), 0)::numeric AS monto_total
      FROM agenda_cobros a
      INNER JOIN prestamos p ON a.prestamo_id = p.id
      INNER JOIN clientes c ON c.id = p.cliente_id AND c.estado = 'ACTIVO'::public.estado_cliente
      WHERE (p.cobrador_id = $1::uuid OR a.compartido_con_usuario_id = $1::uuid)
        AND a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND COALESCE(p.saldo_por_pagar, 0) > 0
        AND COALESCE(p.periodos_pendientes, 0) > 0
        AND a.fecha_cobro_actual < $2::date
      GROUP BY a.fecha_cobro_actual
      ORDER BY fecha_pendiente ASC;
    `;
    const { rows: rowsDiasSinCerrar } = await query(sqlDiasSinCerrar, [usuarioActualId, nowCR]);
    const diasConPendientesSinCerrar = rowsDiasSinCerrar.map(r => r.fecha_pendiente);

    const sqlDiasConCobrosSemana = `
      SELECT 
        to_char(a.fecha_cobro_actual, 'YYYY-MM-DD') AS fecha,
        COUNT(*)::int AS total_cobros
      FROM agenda_cobros a
      INNER JOIN prestamos p ON a.prestamo_id = p.id
      INNER JOIN clientes c ON c.id = p.cliente_id AND c.estado = 'ACTIVO'::public.estado_cliente
      WHERE (p.cobrador_id = $1::uuid OR a.compartido_con_usuario_id = $1::uuid)
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND COALESCE(p.saldo_por_pagar, 0) > 0
        AND COALESCE(p.periodos_pendientes, 0) > 0
        AND a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        AND a.fecha_cobro_actual >= date_trunc('week', $2::date)::date
        AND a.fecha_cobro_actual <= (date_trunc('week', $2::date)::date + interval '6 days')
      GROUP BY a.fecha_cobro_actual
      ORDER BY fecha ASC;
    `;
    const { rows: rowsDiasSemana } = await query(sqlDiasConCobrosSemana, [usuarioActualId, fecha]);

    // 5. Lista de Registrados (propios + compartidos recibidos o delegados ya gestionados en la fecha)
    const sqlRegistrados = `
      SELECT 
        a.id,
        a.prestamo_id,
        a.cliente_id,
        a.numero_cobro,
        to_char(a.fecha_programada_original, 'YYYY-MM-DD') AS fecha_programada_original,
        to_char(a.fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_cobro_actual,
        a.dia_semana_actual,
        a.veces_pasado,
        a.monto_cuota,
        a.monto_moratoria,
        a.monto_total_cobrado,
        a.estado AS estado_cuota,
        a.fecha_hora_registro_pago,
        to_char(a.fecha_proximo_cobro, 'YYYY-MM-DD') AS fecha_proximo_cobro,
        (p.cobrador_id <> $1::uuid AND a.compartido_con_usuario_id = $1::uuid) AS es_cobro_recibido,
        (p.cobrador_id <> $1::uuid AND a.compartido_con_usuario_id = $1::uuid) AS es_compartido,
        (p.cobrador_id = $1::uuid AND a.compartido_con_usuario_id IS NOT NULL) AS es_cobro_enviado,
        (a.gestionado_por_usuario_id IS NOT NULL AND a.gestionado_por_usuario_id <> p.cobrador_id) AS es_gestionado_por_otro,
        u_prop.nombre_completo AS compartido_por_nombre,
        u_prop.usuario AS compartido_por_username,
        a.compartido_con_usuario_id,
        to_char(a.compartido_en, 'YYYY-MM-DD HH24:MI') AS compartido_en,
        u_del.nombre_completo AS compartido_con_nombre,
        u_del.usuario AS compartido_con_username,
        a.gestionado_por_usuario_id,
        u_gest.nombre_completo AS gestionado_por_nombre,
        a.gestionado_accion,
        to_char(a.gestionado_en, 'YYYY-MM-DD HH24:MI') AS gestionado_en,
        c.cedula,
        c.cedula AS cliente_cedula,
        c.nombre,
        c.nombre AS cliente_nombre,
        c.apellidos,
        c.apellidos AS cliente_apellidos,
        c.telefono,
        c.telefono AS cliente_telefono,
        c.telefono_secundario,
        c.telefono_secundario AS cliente_telefono_secundario,
        c.ubicacion,
        c.ubicacion AS cliente_ubicacion,
        c.detalles,
        c.detalles AS cliente_detalles,
        p.cuota,
        p.monto_prestado,
        p.saldo_por_pagar,
        p.modalidad,
        p.dia_fijo_original,
        p.periodos_atrasados_acumulados,
        p.periodos_pagados,
        p.total_periodos
      FROM agenda_cobros a
      JOIN prestamos p ON a.prestamo_id = p.id
      JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN usuarios u_prop ON u_prop.id = p.cobrador_id
      LEFT JOIN usuarios u_del ON u_del.id = a.compartido_con_usuario_id
      LEFT JOIN usuarios u_gest ON u_gest.id = a.gestionado_por_usuario_id
      WHERE (p.cobrador_id = $1::uuid OR a.compartido_con_usuario_id = $1::uuid)
        AND (
          a.fecha_cobro_actual = $2::date 
          OR (a.fecha_hora_registro_pago AT TIME ZONE 'America/Costa_Rica')::date = $2::date
        )
        AND a.estado = 'REGISTRADO'
        AND p.estado NOT IN ('SUSPENDIDO')
        AND c.estado = 'ACTIVO'
      ORDER BY a.fecha_hora_registro_pago DESC;
    `;
    const { rows: rowsRegistrados } = await query(sqlRegistrados, [usuarioActualId, fecha]);

    // 6. Lista de Atrasados (Préstamos propios en estado ATRASADO)
    const sqlAtrasados = `
      SELECT 
        p.id AS prestamo_id,
        p.cliente_id,
        p.monto_prestado,
        p.porcentaje_interes,
        p.monto_total_financiar,
        p.monto_pagado_acumulado,
        p.saldo_por_pagar,
        p.cuota,
        p.modalidad,
        p.dia_fijo_original,
        to_char(p.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
        to_char(p.fecha_final, 'YYYY-MM-DD') AS fecha_final,
        p.total_periodos,
        p.periodos_pagados,
        p.periodos_pendientes,
        p.periodos_atrasados_acumulados,
        p.estado,
        c.cedula,
        c.nombre,
        c.apellidos,
        c.telefono,
        c.telefono_secundario,
        c.telefono_secundario AS cliente_telefono_secundario,
        c.ubicacion,
        c.detalles
      FROM prestamos p
      INNER JOIN clientes c ON p.cliente_id = c.id AND c.estado = 'ACTIVO'::public.estado_cliente
      WHERE p.cobrador_id = $1::uuid
        AND p.estado = 'ATRASADO'::public.estado_prestamo
        AND COALESCE(p.saldo_por_pagar, 0) > 0
        AND COALESCE(p.periodos_pendientes, 0) > 0
      ORDER BY p.periodos_atrasados_acumulados DESC, c.nombre ASC;
    `;
    const { rows: rowsAtrasados } = await query(sqlAtrasados, [usuarioActualId]);

    return res.json({
      fecha,
      es_vista_delegada: false,
      metricas: {
        totalPrestado,
        prestamosActivosCount,
        estaSemana,
        hoy
      },
      pendientes: rowsPendientes,
      registrados: rowsRegistrados,
      atrasados: rowsAtrasados,
      diasConPendientesSinCerrar,
      diasConCobros: rowsDiasSemana,
      compartidos_activos_dia: []
    });
  } catch (err) {
    console.error('[Error SQL detallado]: Error al consultar cobros:', err);
    return res.status(500).json({
      error: 'No se pudo consultar la agenda de cobros en este momento.',
      userMessage: 'No se pudo consultar la agenda de cobros en este momento.',
      ...debugPayload(err)
    });
  }
}

export async function registrarPago(req, res) {
  const usuarioActualId = req.user?.id;
  if (!usuarioActualId) {
    return res.status(401).json({
      error: 'No autenticado',
      userMessage: 'Debes iniciar sesión para continuar.'
    });
  }
  const client = await pool.connect();
  try {
    const { id } = req.params; // ID de agenda_cobros (o prestamo_id)
    const rawMonto = req.body.monto_pagado ?? req.body.monto;
    const montoRecibido = rawMonto !== undefined && rawMonto !== null && Number(rawMonto) > 0
      ? Number(rawMonto)
      : null;
    const rawMoratoria = req.body.monto_moratoria ?? req.body.moratoria;
    const moratoria = rawMoratoria !== undefined && rawMoratoria !== null
      ? Number(rawMoratoria)
      : 0;
    const rawPeriodosPagados = req.body.periodos_pagados ?? req.body.periodosPagados;

    await client.query('BEGIN');

    // Buscar la cuota de cobro (incluyendo cobrador real del préstamo y periodos_atrasados_acumulados)
    let cuotaRes = await client.query(
      `SELECT a.*,
              p.cobrador_id AS prestamo_cobrador_id,
              p.saldo_por_pagar,
              p.monto_pagado_acumulado,
              p.modalidad,
              p.dia_fijo_original,
              p.dia_mes_1,
              p.dia_mes_2,
              p.total_periodos,
              p.periodos_pagados,
              p.periodos_pendientes,
              p.periodos_atrasados_acumulados,
              p.estado AS estado_prestamo,
              c.cedula,
              c.nombre,
              c.apellidos
       FROM agenda_cobros a
       JOIN prestamos p ON a.prestamo_id = p.id
       JOIN clientes c ON a.cliente_id = c.id
       WHERE a.id = $1 FOR UPDATE`,
      [id]
    );

    let cuota = cuotaRes.rows[0];

    // Fallback: si pasaron el prestamo_id en vez de agenda_cobros.id
    if (!cuota) {
      cuotaRes = await client.query(
        `SELECT a.*,
                p.cobrador_id AS prestamo_cobrador_id,
                p.saldo_por_pagar,
                p.monto_pagado_acumulado,
                p.modalidad,
                p.dia_fijo_original,
                p.dia_mes_1,
                p.dia_mes_2,
                p.total_periodos,
                p.periodos_pagados,
                p.periodos_pendientes,
                p.periodos_atrasados_acumulados,
                p.estado AS estado_prestamo,
                c.cedula,
                c.nombre,
                c.apellidos
         FROM agenda_cobros a
         JOIN prestamos p ON a.prestamo_id = p.id
         JOIN clientes c ON a.cliente_id = c.id
         WHERE a.prestamo_id = $1 AND a.estado IN ('PENDIENTE', 'PASADO_DE_DIA')
         ORDER BY a.numero_cobro ASC
         LIMIT 1 FOR UPDATE`,
        [id]
      );
      cuota = cuotaRes.rows[0];
    }

    // Fallback adicional: si todas las cuotas estaban en NO_PAGO (ej. pago desde pestaña Atrasados)
    if (!cuota) {
      cuotaRes = await client.query(
        `SELECT a.*,
                p.cobrador_id AS prestamo_cobrador_id,
                p.saldo_por_pagar,
                p.monto_pagado_acumulado,
                p.modalidad,
                p.dia_fijo_original,
                p.dia_mes_1,
                p.dia_mes_2,
                p.total_periodos,
                p.periodos_pagados,
                p.periodos_pendientes,
                p.periodos_atrasados_acumulados,
                p.estado AS estado_prestamo,
                c.cedula,
                c.nombre,
                c.apellidos
         FROM agenda_cobros a
         JOIN prestamos p ON a.prestamo_id = p.id
         JOIN clientes c ON a.cliente_id = c.id
         WHERE a.prestamo_id = $1::uuid
         ORDER BY a.numero_cobro DESC
         LIMIT 1 FOR UPDATE`,
        [id]
      );
      cuota = cuotaRes.rows[0];
    }

    if (!cuota) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Registro de cobro no encontrado o ya procesado.' });
    }

    const ownerId = String(cuota.prestamo_cobrador_id || cuota.cobrador_id || usuarioActualId);
    const delegatedId = cuota.compartido_con_usuario_id ? String(cuota.compartido_con_usuario_id) : '';
    const isDelegado = ownerId !== String(usuarioActualId);
    if (isDelegado && delegatedId !== String(usuarioActualId)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        userMessage: 'No tienes permiso para gestionar este cobro.'
      });
    }

    const cuotaBase = Math.max(1, Number(cuota.monto_cuota || 1));
    const atrasosActuales = Math.max(0, Number(cuota.periodos_atrasados_acumulados || 0));
    const totalPeriodosDebidos = atrasosActuales + 1;

    const montoPago = montoRecibido !== null && Number(montoRecibido) > 0
      ? Number(montoRecibido)
      : (rawPeriodosPagados ? Number(rawPeriodosPagados) * cuotaBase : Number(cuota.monto_cuota));

    const montoTotalCobrado = montoPago + moratoria;

    const periodosCalculadosPorMonto = Math.max(1, Math.round(montoPago / cuotaBase));
    const cuotasCubiertasHoy = Math.max(
      1,
      Math.min(
        Math.max(totalPeriodosDebidos, periodosCalculadosPorMonto),
        Number(rawPeriodosPagados) > 0 ? Number(rawPeriodosPagados) : periodosCalculadosPorMonto
      )
    );
    const nuevosAtrasosRestantes = Math.max(0, totalPeriodosDebidos - cuotasCubiertasHoy);

    // 1. Insertar en pagos_prestamo acreditado al propietario del préstamo y auditando registrado_por
    const tipoPago = (cuota.estado_prestamo === 'ATRASADO' || atrasosActuales > 0 || cuotasCubiertasHoy > 1)
      ? 'PAGO_ATRASADO'
      : 'COBRO_NORMAL';

    const insertPagoSql = `
      INSERT INTO pagos_prestamo (
        cobrador_id,
        prestamo_id,
        agenda_cobro_id,
        registrado_por,
        tipo,
        monto_cobrado,
        monto_moratoria,
        periodos_cubiertos,
        fecha_hora_pago
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::public.tipo_pago, $6, $7, $8::int, now())
      RETURNING *;
    `;
    const { rows: pagoRows } = await client.query(insertPagoSql, [
      ownerId,
      cuota.prestamo_id,
      cuota.id,
      usuarioActualId,
      tipoPago,
      montoPago,
      moratoria,
      cuotasCubiertasHoy
    ]);
    const pago = pagoRows[0];

    // 2. Determinar fecha actual de la cuota y limpiar posibles colisiones en la misma semana
    const fechaActualStr = cuota.fecha_cobro_actual instanceof Date 
      ? cuota.fecha_cobro_actual.toISOString().slice(0, 10) 
      : String(cuota.fecha_cobro_actual).slice(0, 10);

    const weekActual = getWeekRangeISO(fechaActualStr);

    // Si el cliente pagó más de 1 cuota hoy, marcar como 'REGISTRADO' las (cuotasCubiertasHoy - 1) filas más antiguas en 'NO_PAGO'
    if (cuotasCubiertasHoy > 1) {
      const filasNoPagoACubrir = cuotasCubiertasHoy - 1;
      await client.query(
        `UPDATE agenda_cobros
            SET estado = 'REGISTRADO'::public.estado_cuota_cobro,
                fecha_hora_registro_pago = (fecha_cobro_actual::text || ' 12:00:00 -06:00')::timestamptz,
                monto_total_cobrado = COALESCE(NULLIF(monto_total_cobrado, 0), monto_cuota),
                version = COALESCE(version, 1) + 1
          WHERE id IN (
            SELECT id
              FROM agenda_cobros
             WHERE prestamo_id = $1::uuid
               AND estado = 'NO_PAGO'::public.estado_cuota_cobro
               AND id <> $2::uuid
             ORDER BY numero_cobro ASC, fecha_cobro_actual ASC
             LIMIT $3::int
          )`,
        [cuota.prestamo_id, cuota.id, filasNoPagoACubrir]
      );
    }

    // Asegurar que nunca quede otra cuota PENDIENTE/PASADO_DE_DIA en la misma semana ISO (evitar doble cobro semanal)
    if (cuota.modalidad === 'SEMANAL') {
      const sameWeekPendingRes = await client.query(
        `SELECT id, numero_cobro
           FROM agenda_cobros
          WHERE prestamo_id = $1::uuid
            AND id <> $2::uuid
            AND estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
            AND fecha_cobro_actual >= $3::date
            AND fecha_cobro_actual <= $4::date
          ORDER BY fecha_cobro_actual ASC, numero_cobro ASC
            FOR UPDATE`,
        [cuota.prestamo_id, cuota.id, weekActual.monday, weekActual.sunday]
      );

      for (const swRow of sameWeekPendingRes.rows) {
        await client.query(
          `UPDATE agenda_cobros
              SET estado = 'NO_PAGO'::public.estado_cuota_cobro,
                  version = COALESCE(version, 1) + 1
            WHERE id = $1::uuid`,
          [swRow.id]
        );
      }
    }

    // Buscar cuál es la próxima cuota pendiente futura real en agenda_cobros
    const nextPendingRes = await client.query(
      `SELECT id, numero_cobro, to_char(fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_cobro_actual
         FROM agenda_cobros
        WHERE prestamo_id = $1::uuid
          AND id <> $2::uuid
          AND estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
          AND fecha_cobro_actual > $3::date
        ORDER BY fecha_cobro_actual ASC, numero_cobro ASC
        LIMIT 1`,
      [cuota.prestamo_id, cuota.id, cuota.modalidad === 'SEMANAL' ? weekActual.sunday : fechaActualStr]
    );

    const proximaFechaCobro = nextPendingRes.rows.length > 0
      ? nextPendingRes.rows[0].fecha_cobro_actual
      : calculateNextChargeDate(
          fechaActualStr,
          cuota.modalidad,
          cuota.dia_mes_1,
          cuota.dia_mes_2,
          cuota.dia_fijo_original
        );

    // 3. Actualizar la cuota actual en agenda_cobros a 'REGISTRADO' conservando compartido_con_usuario_id intacto
    await client.query(
      `UPDATE agenda_cobros
       SET estado = 'REGISTRADO'::public.estado_cuota_cobro,
           fecha_hora_registro_pago = now(),
           monto_moratoria = $1,
           monto_total_cobrado = $2,
           fecha_proximo_cobro = $3::date,
           gestionado_por_usuario_id = $4::uuid,
           gestionado_accion = 'PAGO',
           gestionado_en = now(),
           version = COALESCE(version, 1) + 1
       WHERE id = $5::uuid`,
      [moratoria, montoTotalCobrado, proximaFechaCobro, usuarioActualId, cuota.id]
    );

    // 4. Actualizar saldo_por_pagar, periodos y conservar nuevosAtrasosRestantes en prestamos
    const nuevoSaldo = Math.max(0, Number(cuota.saldo_por_pagar) - montoPago);
    const nuevoPagadoAcumulado = Number(cuota.monto_pagado_acumulado) + montoPago;
    const periodosPagados = Math.min(
      Number(cuota.total_periodos || 999),
      Number(cuota.periodos_pagados) + cuotasCubiertasHoy
    );
    const periodosPendientes = nuevoSaldo <= 0
      ? 0
      : Math.max(1, Number(cuota.periodos_pendientes) - cuotasCubiertasHoy);
    const atrasosFinales = (nuevoSaldo <= 0 || periodosPendientes === 0) ? 0 : nuevosAtrasosRestantes;

    let nuevoEstado = 'ACTIVO';
    if (nuevoSaldo <= 0 || periodosPendientes === 0) {
      nuevoEstado = 'CANCELADO';
    } else if (cuota.modalidad === 'SEMANAL' && atrasosFinales >= 4) {
      nuevoEstado = 'ATRASADO';
    } else if (cuota.modalidad === 'QUINCENAL' && atrasosFinales >= 2) {
      nuevoEstado = 'ATRASADO';
    } else if (cuota.estado_prestamo === 'ARREGLO_PAGO' || cuota.estado_prestamo === 'RENOVADO') {
      nuevoEstado = cuota.estado_prestamo;
    }

    await client.query(
      `UPDATE prestamos
       SET saldo_por_pagar = $1,
           monto_pagado_acumulado = $2,
           periodos_pagados = $3::int,
           periodos_pendientes = $4::int,
           periodos_atrasados_acumulados = $5::int,
           estado = $6::public.estado_prestamo,
           actualizado_en = now(),
           version = COALESCE(version, 1) + 1
       WHERE id = $7::uuid`,
      [
        nuevoSaldo,
        nuevoPagadoAcumulado,
        periodosPagados,
        periodosPendientes,
        atrasosFinales,
        nuevoEstado,
        cuota.prestamo_id
      ]
    );

    // 5. Si aún queda saldo y ya no quedan cuotas PENDIENTE futuras en agenda_cobros, crear la siguiente para el propietario real
    const finalUsuarioId = ownerId || usuarioActualId;

    if (nuevoSaldo > 0 && nextPendingRes.rows.length === 0) {
      const maxNumRes = await client.query(
        `SELECT COALESCE(MAX(numero_cobro), 0)::int AS max_num
           FROM agenda_cobros
          WHERE prestamo_id = $1::uuid`,
        [cuota.prestamo_id]
      );
      const siguienteNumero = Number(maxNumRes.rows[0]?.max_num || cuota.numero_cobro) + 1;
      const diaSemanaProximo = normalizeDiaSemana(getDiaSemanaEnum(proximaFechaCobro));

      await client.query(
        `INSERT INTO agenda_cobros (
          cobrador_id,
          prestamo_id,
          cliente_id,
          numero_cobro,
          fecha_programada_original,
          fecha_cobro_actual,
          dia_semana_actual,
          veces_pasado,
          monto_cuota,
          monto_moratoria,
          monto_total_cobrado,
          estado
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::int, $5::date, $5::date, $6::public.dia_semana, 0, $7, 0, 0, 'PENDIENTE'::public.estado_cuota_cobro)
        ON CONFLICT (prestamo_id, numero_cobro) DO NOTHING;`,
        [
          finalUsuarioId,
          cuota.prestamo_id,
          cuota.cliente_id,
          siguienteNumero,
          proximaFechaCobro,
          diaSemanaProximo,
          cuota.monto_cuota
        ]
      );
    }

    // 6. Registrar en bitácora de actividad y notificar al propietario si fue un cobrador delegado
    const finalCedula = cleanCedula9(cuota.cliente_cedula || cuota.cedula);
    const nombreCliente = `${cuota.nombre || ''} ${cuota.apellidos || ''}`.trim() || 'Cliente';

    await client.query(
      `INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1::uuid, $2::uuid, 'PAGO_REGISTRADO'::public.accion_bitacora, 'pagos_prestamo', $3::uuid, $4, $5)`,
      [
        usuarioActualId,
        finalUsuarioId,
        pago.id,
        finalCedula,
        JSON.stringify({
          prestamo_id: cuota.prestamo_id,
          cliente: nombreCliente,
          monto_cobrado: montoPago,
          monto_moratoria: moratoria,
          periodos_cubiertos: cuotasCubiertasHoy,
          periodos_atrasados_restantes: atrasosFinales,
          saldo_restante: nuevoSaldo,
          proxima_fecha: proximaFechaCobro,
          gestionado_por_delegado: isDelegado
        })
      ]
    );

    if (isDelegado) {
      const nombreDelegado = await getDelegadoNombre(client, usuarioActualId);
      await notifyOwnerWithSavepoint(client, {
        savepointName: 'sp_notif_pago',
        ownerId,
        titulo: `Cobro realizado por ${nombreDelegado}`,
        mensaje: `${nombreDelegado} registró el pago de ${nombreCliente} por ₡${Number(montoTotalCobrado).toLocaleString('en-US')} en la fecha ${fechaActualStr}.`,
        montoResaltado: montoTotalCobrado
      });
    }

    await client.query('COMMIT');

    return res.json({
      message: 'Pago registrado con éxito',
      pago,
      nuevoSaldo,
      periodosCubiertos: cuotasCubiertasHoy,
      periodosAtrasadosRestantes: atrasosFinales,
      proximaFechaCobro
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Error SQL detallado]: Error al registrar pago:', err);
    return res.status(500).json({
      error: 'No se pudo registrar el pago en este momento. Por favor, inténtalo nuevamente.',
      userMessage: 'No se pudo registrar el pago en este momento. Por favor, inténtalo nuevamente.',
      ...debugPayload(err)
    });
  } finally {
    client.release();
  }
}

export async function pasarCobro(req, res) {
  const usuarioActualId = req.user?.id;
  if (!usuarioActualId) {
    return res.status(401).json({
      error: 'No autenticado',
      userMessage: 'Debes iniciar sesión para continuar.'
    });
  }
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const rawNuevaFecha = req.body.fecha_nueva || req.body.nuevaFecha;
    const nuevaFecha = rawNuevaFecha ? String(rawNuevaFecha).slice(0, 10) : '';
    const modoAcumulacion = String(
      req.body.modo_acumulacion || req.body.modoAcumulacion || 'ACUMULAR'
    ).toUpperCase();

    if (!nuevaFecha) {
      return res.status(400).json({ error: 'Se requiere la nueva fecha para reprogramar el cobro.' });
    }

    await client.query('BEGIN');

    // Buscar cuota actual y datos del préstamo (con bloqueo FOR UPDATE y fallback a prestamo_id)
    let cuotaRes = await client.query(
      `SELECT a.*,
              p.cobrador_id AS prestamo_cobrador_id,
              p.modalidad,
              p.dia_fijo_original,
              p.dia_mes_1,
              p.dia_mes_2,
              p.periodos_atrasados_acumulados,
              p.total_periodos,
              p.periodos_pendientes,
              p.saldo_por_pagar,
              p.estado AS prestamo_estado,
              c.cedula AS cliente_cedula,
              c.nombre,
              c.apellidos
       FROM agenda_cobros a
       JOIN prestamos p ON a.prestamo_id = p.id
       JOIN clientes c ON a.cliente_id = c.id
       WHERE a.id = $1 FOR UPDATE`,
      [id]
    );

    let cuota = cuotaRes.rows[0];

    // Fallback: si pasaron el prestamo_id en vez de agenda_cobros.id
    if (!cuota) {
      cuotaRes = await client.query(
        `SELECT a.*,
                p.cobrador_id AS prestamo_cobrador_id,
                p.modalidad,
                p.dia_fijo_original,
                p.dia_mes_1,
                p.dia_mes_2,
                p.periodos_atrasados_acumulados,
                p.total_periodos,
                p.periodos_pendientes,
                p.saldo_por_pagar,
                p.estado AS prestamo_estado,
                c.cedula AS cliente_cedula,
                c.nombre,
                c.apellidos
         FROM agenda_cobros a
         JOIN prestamos p ON a.prestamo_id = p.id
         JOIN clientes c ON a.cliente_id = c.id
         WHERE a.prestamo_id = $1 AND a.estado IN ('PENDIENTE', 'PASADO_DE_DIA')
         ORDER BY a.numero_cobro ASC
         LIMIT 1 FOR UPDATE`,
        [id]
      );
      cuota = cuotaRes.rows[0];
    }

    if (!cuota) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Registro de cobro no encontrado.' });
    }

    const ownerId = cuota.prestamo_cobrador_id || cuota.cobrador_id || usuarioActualId;
    const delegatedId = cuota.compartido_con_usuario_id || null;
    if (
      ownerId &&
      String(usuarioActualId) !== String(ownerId) &&
      String(usuarioActualId) !== String(delegatedId)
    ) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: 'No tienes autorizacion para reprogramar este cobro compartido.'
      });
    }
    const isDelegado = Boolean(
      delegatedId &&
        String(delegatedId) === String(usuarioActualId) &&
        String(ownerId) !== String(usuarioActualId)
    );

    const fechaAnteriorStr = cuota.fecha_cobro_actual instanceof Date 
      ? cuota.fecha_cobro_actual.toISOString().slice(0, 10) 
      : String(cuota.fecha_cobro_actual).slice(0, 10);
    const fechaCambio = nuevaFecha !== fechaAnteriorStr;

    const nuevoDiaSemana = normalizeDiaSemana(getDiaSemanaEnum(nuevaFecha));
    let nuevasVecesPasado = Number(cuota.veces_pasado || 0) + 1;
    let agendaTargetId = cuota.id;
    let modoAplicado = 'MISMA_SEMANA';
    let nuevosAtrasosAcumulados = Number(cuota.periodos_atrasados_acumulados || 0);

    // Obtener todas las cuotas pendientes o reprogramadas posteriores de este mismo préstamo
    const posterioresRes = await client.query(
      `SELECT id,
              numero_cobro,
              to_char(fecha_programada_original, 'YYYY-MM-DD') AS fecha_programada_original,
              to_char(fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_cobro_actual,
              dia_semana_actual,
              veces_pasado,
              monto_cuota,
              estado
         FROM agenda_cobros
        WHERE prestamo_id = $1::uuid
          AND id <> $2::uuid
          AND estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
          AND (numero_cobro > $3::int OR fecha_cobro_actual > $4::date)
        ORDER BY fecha_cobro_actual ASC, numero_cobro ASC
          FOR UPDATE`,
      [cuota.prestamo_id, cuota.id, Number(cuota.numero_cobro || 0), fechaAnteriorStr]
    );
    const cuotasPosteriores = posterioresRes.rows;

    // Detectar si nuevaFecha cae en una semana posterior o colisiona con una cuota futura programada
    const weekActual = getWeekRangeISO(fechaAnteriorStr);
    const weekNueva = getWeekRangeISO(nuevaFecha);
    const esOtraSemana = weekNueva.monday > weekActual.monday;

    const limiteSemanaDestino = cuota.modalidad === 'SEMANAL' || cuota.dia_fijo_original
      ? weekNueva.sunday
      : addDaysISO(nuevaFecha, 6);

    const cuotasEnRango = esOtraSemana
      ? cuotasPosteriores.filter((c) => c.fecha_cobro_actual <= limiteSemanaDestino)
      : [];

    if (cuotasEnRango.length === 0) {
      // CASO 1: Sin colisión (se pasó dentro de la misma semana o no hay otra cuota programada en esa semana)
      await client.query(
        `UPDATE agenda_cobros
         SET fecha_cobro_actual = $1::date,
             dia_semana_actual = $2::public.dia_semana,
             veces_pasado = $3::int,
             estado = 'PASADO_DE_DIA'::public.estado_cuota_cobro,
             gestionado_por_usuario_id = $5::uuid,
             gestionado_accion = 'PASAR',
             gestionado_en = now(),
             compartido_con_usuario_id = CASE WHEN $6::boolean THEN NULL ELSE compartido_con_usuario_id END,
             compartido_por_usuario_id = CASE WHEN $6::boolean THEN NULL ELSE compartido_por_usuario_id END,
             compartido_en = CASE WHEN $6::boolean THEN NULL ELSE compartido_en END,
             version = COALESCE(version, 1) + 1
         WHERE id = $4::uuid`,
        [nuevaFecha, nuevoDiaSemana, nuevasVecesPasado, cuota.id, usuarioActualId, fechaCambio]
      );
    } else if (modoAcumulacion === 'CORRER') {
      // CASO 2B: No acumular · Correr 1 periodo hacia adelante todas las cuotas siguientes
      modoAplicado = 'CORRER';
      await client.query(
        `UPDATE agenda_cobros
         SET fecha_cobro_actual = $1::date,
             dia_semana_actual = $2::public.dia_semana,
             veces_pasado = $3::int,
             estado = 'PASADO_DE_DIA'::public.estado_cuota_cobro,
             gestionado_por_usuario_id = $5::uuid,
             gestionado_accion = 'PASAR',
             gestionado_en = now(),
             compartido_con_usuario_id = CASE WHEN $6::boolean THEN NULL ELSE compartido_con_usuario_id END,
             compartido_por_usuario_id = CASE WHEN $6::boolean THEN NULL ELSE compartido_por_usuario_id END,
             compartido_en = CASE WHEN $6::boolean THEN NULL ELSE compartido_en END,
             version = COALESCE(version, 1) + 1
         WHERE id = $4::uuid`,
        [nuevaFecha, nuevoDiaSemana, nuevasVecesPasado, cuota.id, usuarioActualId, fechaCambio]
      );

      const periodosACorrer = Math.max(1, cuotasEnRango.length);
      let ultimaFechaDesplazada = nuevaFecha;

      for (const cPost of cuotasPosteriores) {
        let shiftedDate = cPost.fecha_programada_original || cPost.fecha_cobro_actual;
        for (let step = 0; step < periodosACorrer; step++) {
          shiftedDate = calculateNextChargeDate(
            shiftedDate,
            cuota.modalidad,
            cuota.dia_mes_1,
            cuota.dia_mes_2,
            cuota.dia_fijo_original
          );
        }
        const shiftedDia = normalizeDiaSemana(getDiaSemanaEnum(shiftedDate));
        ultimaFechaDesplazada = shiftedDate;

        await client.query(
          `UPDATE agenda_cobros
              SET fecha_cobro_actual = $1::date,
                  fecha_programada_original = $1::date,
                  dia_semana_actual = $2::public.dia_semana,
                  version = COALESCE(version, 1) + 1
            WHERE id = $3::uuid`,
          [shiftedDate, shiftedDia, cPost.id]
        );
      }

      await client.query(
        `UPDATE prestamos
            SET fecha_final = $1::date,
                actualizado_en = now(),
                version = COALESCE(version, 1) + 1
          WHERE id = $2::uuid`,
        [ultimaFechaDesplazada, cuota.prestamo_id]
      );
    } else {
      // CASO 2A (Por defecto): 'ACUMULAR' con esa semana
      // El día pasado (ej. Miércoles 9 dic) absorbe el turno del día fijo de esa semana (ej. Jueves 10 dic)
      // y suma la cuota anterior como periodo acumulado para que NO aparezca dos veces en esa semana.
      modoAplicado = 'ACUMULAR';
      const cuotaColision = cuotasEnRango[cuotasEnRango.length - 1];
      const cuotasParaNoPago = [cuota, ...cuotasEnRango.slice(0, -1)];

      for (const cNoPago of cuotasParaNoPago) {
        await client.query(
          `UPDATE agenda_cobros
              SET estado = 'NO_PAGO'::public.estado_cuota_cobro,
                  gestionado_por_usuario_id = $2::uuid,
                  gestionado_accion = 'PASAR',
                  gestionado_en = now(),
                  version = COALESCE(version, 1) + 1
            WHERE id = $1::uuid`,
          [cNoPago.id, usuarioActualId]
        );
      }

      nuevasVecesPasado = Math.max(
        Number(cuota.veces_pasado || 0),
        Number(cuotaColision.veces_pasado || 0)
      ) + 1;
      agendaTargetId = cuotaColision.id;

      await client.query(
        `UPDATE agenda_cobros
            SET fecha_cobro_actual = $1::date,
                dia_semana_actual = $2::public.dia_semana,
                veces_pasado = $3::int,
                estado = 'PASADO_DE_DIA'::public.estado_cuota_cobro,
                gestionado_por_usuario_id = $5::uuid,
                gestionado_accion = 'PASAR',
                gestionado_en = now(),
                compartido_con_usuario_id = CASE WHEN $6::boolean THEN NULL ELSE compartido_con_usuario_id END,
                compartido_por_usuario_id = CASE WHEN $6::boolean THEN NULL ELSE compartido_por_usuario_id END,
                compartido_en = CASE WHEN $6::boolean THEN NULL ELSE compartido_en END,
                version = COALESCE(version, 1) + 1
          WHERE id = $4::uuid`,
        [nuevaFecha, nuevoDiaSemana, nuevasVecesPasado, cuotaColision.id, usuarioActualId, fechaCambio]
      );

      nuevosAtrasosAcumulados = Number(cuota.periodos_atrasados_acumulados || 0) + cuotasParaNoPago.length;
      let nuevoEstadoPrestamo = 'ACTIVO';
      if (cuota.modalidad === 'SEMANAL' && nuevosAtrasosAcumulados >= 4) {
        nuevoEstadoPrestamo = 'ATRASADO';
      } else if (cuota.modalidad === 'QUINCENAL' && nuevosAtrasosAcumulados >= 2) {
        nuevoEstadoPrestamo = 'ATRASADO';
      } else if (cuota.prestamo_estado === 'ATRASADO') {
        nuevoEstadoPrestamo = 'ATRASADO';
      } else if (cuota.prestamo_estado === 'ARREGLO_PAGO' || cuota.prestamo_estado === 'RENOVADO') {
        nuevoEstadoPrestamo = cuota.prestamo_estado;
      }

      await client.query(
        `UPDATE prestamos
            SET periodos_atrasados_acumulados = $1::int,
                estado = CASE
                  WHEN estado = 'SUSPENDIDO'::public.estado_prestamo THEN 'SUSPENDIDO'::public.estado_prestamo
                  ELSE $2::public.estado_prestamo
                END,
                actualizado_en = now(),
                version = COALESCE(version, 1) + 1
          WHERE id = $3::uuid`,
        [nuevosAtrasosAcumulados, nuevoEstadoPrestamo, cuota.prestamo_id]
      );
    }

    // Insertar en historial_pasar_dia
    await client.query(
      `INSERT INTO historial_pasar_dia (
        agenda_cobro_id,
        prestamo_id,
        fecha_anterior,
        fecha_nueva,
        numero_reprogramacion
      ) VALUES ($1::uuid, $2::uuid, $3::date, $4::date, $5::int)`,
      [agendaTargetId, cuota.prestamo_id, fechaAnteriorStr, nuevaFecha, nuevasVecesPasado]
    );

    // Registrar en bitácora de actividad de forma segura
    const finalCedula = cleanCedula9(cuota.cliente_cedula || cuota.cedula);
    const clienteNombre = `${cuota.nombre || ''} ${cuota.apellidos || ''}`.trim();

    await client.query(
      `INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1::uuid, $2::uuid, 'COBRO_PASADO'::public.accion_bitacora, 'agenda_cobros', $3::uuid, $4, $5)`,
      [
        usuarioActualId,
        ownerId,
        agendaTargetId,
        finalCedula,
        JSON.stringify({
          prestamo_id: cuota.prestamo_id,
          cliente: clienteNombre,
          fecha_anterior: fechaAnteriorStr,
          fecha_nueva: nuevaFecha,
          modo_acumulacion: modoAplicado,
          periodos_atrasados_acumulados: nuevosAtrasosAcumulados,
          veces_pasado: nuevasVecesPasado,
          gestionado_por_usuario_id: usuarioActualId,
          es_delegado: isDelegado
        })
      ]
    );

    if (isDelegado) {
      const delegadoNombre = await getDelegadoNombre(client, usuarioActualId);
      await notifyOwnerWithSavepoint(client, {
        savepointName: 'sp_notif_pasar',
        ownerId,
        titulo: `Cobro reprogramado por ${delegadoNombre}`,
        mensaje: `${delegadoNombre} reprogramo el cobro de ${clienteNombre} de ${fechaAnteriorStr} para el ${nuevaFecha}.`,
        montoResaltado: cuota.monto_cuota
      });
    }

    await client.query('COMMIT');

    return res.json({
      message: 'Cobro pasado de día con éxito',
      fecha_anterior: fechaAnteriorStr,
      fecha_nueva: nuevaFecha,
      modo_acumulacion: modoAplicado,
      periodos_atrasados_acumulados: nuevosAtrasosAcumulados,
      veces_pasado: nuevasVecesPasado
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Error SQL detallado]: Error al pasar cobro:', err);
    return res.status(500).json({
      error: 'No se pudo reprogramar el cobro en este momento. Por favor, inténtalo nuevamente.',
      userMessage: 'No se pudo reprogramar el cobro en este momento. Por favor, inténtalo nuevamente.',
      ...debugPayload(err)
    });
  } finally {
    client.release();
  }
}

export async function registrarNoPago(req, res) {
  const usuarioActualId = req.user?.id;
  if (!usuarioActualId) {
    return res.status(401).json({
      error: 'No autenticado',
      userMessage: 'Debes iniciar sesión para continuar.'
    });
  }
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // 1. Obtener el cobro actual y su préstamo (con bloqueo FOR UPDATE y fallback a prestamo_id)
    let cuotaRes = await client.query(
      `SELECT a.*, p.cobrador_id AS prestamo_cobrador_id, p.modalidad, p.dia_fijo_original, p.dia_mes_1, p.dia_mes_2,
              p.periodos_atrasados_acumulados, p.total_periodos, p.periodos_pendientes,
              p.saldo_por_pagar, p.cuota AS prestamo_cuota, p.estado AS prestamo_estado,
              c.cedula AS cliente_cedula, c.nombre, c.apellidos
         FROM agenda_cobros a
         JOIN prestamos p ON a.prestamo_id = p.id
         JOIN clientes c ON a.cliente_id = c.id
        WHERE a.id = $1
        FOR UPDATE`,
      [id]
    );

    let cuota = cuotaRes.rows[0];

    // Fallback: si el frontend envió prestamo_id en lugar de agenda_cobros.id
    if (!cuota) {
      cuotaRes = await client.query(
        `SELECT a.*, p.cobrador_id AS prestamo_cobrador_id, p.modalidad, p.dia_fijo_original, p.dia_mes_1, p.dia_mes_2,
                p.periodos_atrasados_acumulados, p.total_periodos, p.periodos_pendientes,
                p.saldo_por_pagar, p.cuota AS prestamo_cuota, p.estado AS prestamo_estado,
                c.cedula AS cliente_cedula, c.nombre, c.apellidos
           FROM agenda_cobros a
           JOIN prestamos p ON a.prestamo_id = p.id
           JOIN clientes c ON a.cliente_id = c.id
          WHERE a.prestamo_id = $1 AND a.estado IN ('PENDIENTE', 'PASADO_DE_DIA')
          ORDER BY a.numero_cobro ASC
          LIMIT 1
          FOR UPDATE`,
        [id]
      );
      cuota = cuotaRes.rows[0];
    }

    if (!cuota) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Registro de cobro no encontrado.' });
    }

    const ownerId = cuota.prestamo_cobrador_id || cuota.cobrador_id || usuarioActualId;
    const delegatedId = cuota.compartido_con_usuario_id || null;
    if (
      ownerId &&
      String(usuarioActualId) !== String(ownerId) &&
      String(usuarioActualId) !== String(delegatedId)
    ) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: 'No tienes autorizacion para reportar este cobro compartido.'
      });
    }
    const isDelegado = Boolean(
      delegatedId &&
        String(delegatedId) === String(usuarioActualId) &&
        String(ownerId) !== String(usuarioActualId)
    );

    // 2. Marcar 'NO_PAGO' en agenda_cobros preservando compartido_con_usuario_id y registrando quien gestiono
    await client.query(
      `UPDATE agenda_cobros
          SET estado = 'NO_PAGO'::public.estado_cuota_cobro,
              gestionado_por_usuario_id = $2::uuid,
              gestionado_accion = 'NO_PAGO',
              gestionado_en = now(),
              version = COALESCE(version, 1) + 1
        WHERE id = $1::uuid`,
      [cuota.id, usuarioActualId]
    );

    // 3. Incrementar periodos_atrasados_acumulados en prestamos con casteo explícito de enum
    const nuevosAtrasos = Number(cuota.periodos_atrasados_acumulados || 0) + 1;
    let nuevoEstadoPrestamo = 'ACTIVO';

    // Regla de negocio: 4 semanas (semanal) o 2 quincenas (quincenal) = ATRASADO crítico
    if (cuota.modalidad === 'SEMANAL' && nuevosAtrasos >= 4) {
      nuevoEstadoPrestamo = 'ATRASADO';
    } else if (cuota.modalidad === 'QUINCENAL' && nuevosAtrasos >= 2) {
      nuevoEstadoPrestamo = 'ATRASADO';
    } else if (cuota.prestamo_estado === 'ATRASADO') {
      nuevoEstadoPrestamo = 'ATRASADO';
    }

    await client.query(
      `UPDATE prestamos
          SET periodos_atrasados_acumulados = $1::int,
              estado = CASE 
                WHEN estado = 'SUSPENDIDO'::public.estado_prestamo THEN 'SUSPENDIDO'::public.estado_prestamo 
                ELSE $2::public.estado_prestamo 
              END,
              actualizado_en = now(),
              version = COALESCE(version, 1) + 1
        WHERE id = $3::uuid`,
      [nuevosAtrasos, nuevoEstadoPrestamo, cuota.prestamo_id]
    );

    // 4. Determinar próxima fecha y gestionar siguiente cuota en agenda_cobros
    const siguienteNumero = Number(cuota.numero_cobro) + 1;

    // Verificar si la siguiente cuota YA está creada (calendario pre-generado de 1..total_periodos)
    const checkNext = await client.query(
      `SELECT id, to_char(fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_cobro_actual
         FROM agenda_cobros
        WHERE prestamo_id = $1::uuid AND numero_cobro = $2::int
        LIMIT 1`,
      [cuota.prestamo_id, siguienteNumero]
    );

    let proximaFecha;

    if (checkNext.rows.length > 0) {
      // La siguiente cuota ya existe pre-generada en la agenda: NO se inserta nada para no violar uq_agenda_prestamo_numero
      proximaFecha = checkNext.rows[0].fecha_cobro_actual;
    } else if (Number(cuota.saldo_por_pagar) > 0) {
      // Solo si rebasó el calendario pre-generado pero mantiene saldo pendiente, se crea cuota adicional
      const fechaActualStr = cuota.fecha_cobro_actual instanceof Date 
        ? cuota.fecha_cobro_actual.toISOString().slice(0, 10) 
        : String(cuota.fecha_cobro_actual).slice(0, 10);

      proximaFecha = calculateNextChargeDate(
        fechaActualStr,
        cuota.modalidad,
        cuota.dia_mes_1,
        cuota.dia_mes_2,
        cuota.dia_fijo_original
      );

      const diaSemanaProximo = normalizeDiaSemana(getDiaSemanaEnum(proximaFecha));

      await client.query(
        `INSERT INTO agenda_cobros (
          cobrador_id,
          prestamo_id,
          cliente_id,
          numero_cobro,
          fecha_programada_original,
          fecha_cobro_actual,
          dia_semana_actual,
          veces_pasado,
          monto_cuota,
          monto_moratoria,
          monto_total_cobrado,
          estado
        ) VALUES (
          $1::uuid, $2::uuid, $3::uuid, $4::int, $5::date, $5::date, $6::public.dia_semana, 0, $7, 0, 0, 'PENDIENTE'::public.estado_cuota_cobro
        )
        ON CONFLICT (prestamo_id, numero_cobro) DO NOTHING;`,
        [
          ownerId,
          cuota.prestamo_id,
          cuota.cliente_id,
          siguienteNumero,
          proximaFecha,
          diaSemanaProximo,
          cuota.monto_cuota
        ]
      );
    } else {
      const fechaActualStr = cuota.fecha_cobro_actual instanceof Date 
        ? cuota.fecha_cobro_actual.toISOString().slice(0, 10) 
        : String(cuota.fecha_cobro_actual).slice(0, 10);
      proximaFecha = calculateNextChargeDate(
        fechaActualStr,
        cuota.modalidad,
        cuota.dia_mes_1,
        cuota.dia_mes_2,
        cuota.dia_fijo_original
      );
    }

    // 5. Registrar en bitácora de actividad con tipos estrictos (usuario_id NOT NULL y cedula 9 dígitos o NULL)
    const finalCedula = cleanCedula9(cuota.cliente_cedula || cuota.cedula);
    const clienteNombre = `${cuota.nombre || ''} ${cuota.apellidos || ''}`.trim();
    const fechaCobroStr = cuota.fecha_cobro_actual instanceof Date
      ? cuota.fecha_cobro_actual.toISOString().slice(0, 10)
      : String(cuota.fecha_cobro_actual).slice(0, 10);

    await client.query(
      `INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1::uuid, $2::uuid, 'NO_PAGO_REGISTRADO'::public.accion_bitacora, 'agenda_cobros', $3::uuid, $4, $5)`,
      [
        usuarioActualId,
        ownerId,
        cuota.id,
        finalCedula,
        JSON.stringify({
          prestamo_id: cuota.prestamo_id,
          cliente: clienteNombre,
          periodos_atrasados: nuevosAtrasos,
          estado_prestamo: nuevoEstadoPrestamo,
          proxima_fecha: proximaFecha,
          gestionado_por_usuario_id: usuarioActualId,
          es_delegado: isDelegado
        })
      ]
    );

    if (isDelegado) {
      const delegadoNombre = await getDelegadoNombre(client, usuarioActualId);
      await notifyOwnerWithSavepoint(client, {
        savepointName: 'sp_notif_nopago',
        ownerId,
        titulo: `No pago reportado por ${delegadoNombre}`,
        mensaje: `${delegadoNombre} reporto ausencia de pago de ${clienteNombre} el ${fechaCobroStr}.`,
        montoResaltado: cuota.monto_cuota
      });
    }

    await client.query('COMMIT');

    return res.json({
      message: 'No pago registrado con éxito',
      periodosAtrasados: nuevosAtrasos,
      estadoPrestamo: nuevoEstadoPrestamo,
      proximaFecha
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Error SQL detallado]: Error al registrar no pago:', err);
    return res.status(500).json({
      error: 'No se pudo registrar la ausencia de pago en este momento. Por favor, inténtalo nuevamente.',
      userMessage: 'No se pudo registrar la ausencia de pago en este momento. Por favor, inténtalo nuevamente.',
      ...debugPayload(err)
    });
  } finally {
    client.release();
  }
}
