import { pool, query, debugPayload } from '../config/db.js';
import { getDefaultCobradorId } from '../services/seedService.js';

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

export async function getCobros(req, res) {
  try {
    const cobradorId = req.query.cobrador_id || req.user?.id || await getDefaultCobradorId();
    const vistaUsuarioId = req.query.vista_usuario_id || null;
    const esVistaDelegada = Boolean(vistaUsuarioId && String(vistaUsuarioId) !== String(cobradorId));

    // Fecha consultada (YYYY-MM-DD), por defecto hoy en Costa Rica
    const nowCR = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const fecha = req.query.fecha || nowCR;

    // =========================================================================
    // CASO A: VISTA DELEGADA (COBROS COMPARTIDOS CON OTRA PERSONA)
    // =========================================================================
    if (esVistaDelegada) {
      const { rows: destRows } = await query(
        `SELECT id, usuario, nombre_completo, ('CF-' || UPPER(SUBSTRING(id::text, 1, 8))) AS codigo_id FROM usuarios WHERE id = $1::uuid;`,
        [vistaUsuarioId]
      );
      const destinatarioInfo = destRows[0] || { id: vistaUsuarioId, nombre_completo: 'Persona vinculada' };

      const sqlPendientesDelegados = `
        SELECT 
          a.id,
          a.prestamo_id,
          a.cliente_id,
          a.numero_cobro,
          to_char(a.fecha_programada_original, 'YYYY-MM-DD') AS fecha_programada_original,
          to_char(a.fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_cobro_actual,
          false AS es_rezagado,
          a.dia_semana_actual,
          a.veces_pasado,
          a.monto_cuota,
          a.monto_moratoria,
          a.estado AS estado_cuota,
          c.cedula,
          c.nombre,
          c.apellidos,
          c.telefono,
          c.telefono_secundario,
          c.telefono_secundario AS cliente_telefono_secundario,
          c.ubicacion,
          c.detalles,
          p.monto_prestado,
          p.saldo_por_pagar,
          p.modalidad,
          p.dia_fijo_original,
          p.periodos_atrasados_acumulados,
          p.periodos_pagados,
          p.total_periodos,
          p.estado AS estado_prestamo,
          true AS es_compartido,
          u_prop.nombre_completo AS compartido_por_nombre,
          u_prop.usuario AS compartido_por_usuario,
          a.compartido_con_usuario_id,
          to_char(a.compartido_en, 'YYYY-MM-DD HH24:MI') AS compartido_en
        FROM agenda_cobros a
        JOIN prestamos p ON a.prestamo_id = p.id
        JOIN clientes c ON a.cliente_id = c.id
        JOIN usuarios u_prop ON a.cobrador_id = u_prop.id
        WHERE a.compartido_con_usuario_id = $1::uuid
          AND a.fecha_cobro_actual = $2::date
          AND a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        ORDER BY a.numero_cobro ASC, c.nombre ASC;
      `;
      const { rows: pendientesDelegados } = await query(sqlPendientesDelegados, [vistaUsuarioId, fecha]);

      const sqlRegistradosDelegados = `
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
          c.cedula,
          c.nombre,
          c.apellidos,
          c.telefono,
          c.telefono_secundario,
          c.telefono_secundario AS cliente_telefono_secundario,
          c.ubicacion,
          c.detalles,
          p.monto_prestado,
          p.saldo_por_pagar,
          p.modalidad,
          p.dia_fijo_original,
          p.periodos_pagados,
          p.total_periodos,
          true AS es_compartido,
          u_prop.nombre_completo AS compartido_por_nombre
        FROM agenda_cobros a
        JOIN prestamos p ON a.prestamo_id = p.id
        JOIN clientes c ON a.cliente_id = c.id
        JOIN usuarios u_prop ON a.cobrador_id = u_prop.id
        WHERE a.compartido_con_usuario_id = $1::uuid
          AND (
            a.fecha_cobro_actual = $2::date 
            OR (a.fecha_hora_registro_pago AT TIME ZONE 'America/Costa_Rica')::date = $2::date
          )
          AND a.estado = 'REGISTRADO'
        ORDER BY a.fecha_hora_registro_pago DESC;
      `;
      const { rows: registradosDelegados } = await query(sqlRegistradosDelegados, [vistaUsuarioId, fecha]);

      const montoHoyDelegado = pendientesDelegados.reduce((acc, r) => acc + Number(r.monto_cuota || 0), 0);
      const montoTotalPrestadoDelegado = pendientesDelegados.reduce((acc, r) => acc + Number(r.monto_prestado || 0), 0);

      return res.json({
        fecha,
        es_vista_delegada: true,
        destinatario: destinatarioInfo,
        metricas: {
          totalPrestado: montoTotalPrestadoDelegado,
          estaSemana: montoHoyDelegado,
          hoy: montoHoyDelegado
        },
        pendientes: pendientesDelegados,
        registrados: registradosDelegados,
        atrasados: [],
        diasConPendientesSinCerrar: [],
        compartidos_activos_dia: []
      });
    }

    // =========================================================================
    // CASO B: VISTA NORMAL COMO PROPIETARIO
    // =========================================================================

    // 1. Total Prestado (Monto acumulado prestado en cartera activa / no liquidada ni suspendida)
    const sqlTotalPrestado = `
      SELECT COALESCE(SUM(monto_prestado), 0)::numeric AS total
      FROM prestamos
      WHERE cobrador_id = $1 AND estado NOT IN ('SUSPENDIDO', 'LIQUIDADO');
    `;
    const { rows: resTotalPrestado } = await query(sqlTotalPrestado, [cobradorId]);
    const totalPrestado = Number(resTotalPrestado[0]?.total || 0);

    // 2. Esta Semana (Cuotas programadas en la semana de lunes a domingo de la fecha consultada)
    const sqlEstaSemana = `
      SELECT COALESCE(SUM(a.monto_cuota), 0)::numeric AS total
      FROM agenda_cobros a
      JOIN prestamos p ON a.prestamo_id = p.id
      WHERE a.cobrador_id = $1
        AND p.estado NOT IN ('SUSPENDIDO', 'LIQUIDADO')
        AND a.fecha_cobro_actual >= date_trunc('week', $2::date)::date
        AND a.fecha_cobro_actual <= (date_trunc('week', $2::date)::date + interval '6 days');
    `;
    const { rows: resEstaSemana } = await query(sqlEstaSemana, [cobradorId, fecha]);
    const estaSemana = Number(resEstaSemana[0]?.total || 0);

    // 3. Hoy (Monto programado pendiente para la fecha consultada + rezagados si es hoy)
    const sqlHoy = `
      SELECT COALESCE(SUM(a.monto_cuota), 0)::numeric AS total
      FROM agenda_cobros a
      JOIN prestamos p ON a.prestamo_id = p.id
      JOIN clientes c ON a.cliente_id = c.id
      WHERE a.cobrador_id = $1
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND c.estado = 'ACTIVO'::public.estado_cliente
        AND a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        AND (
          a.fecha_cobro_actual = $2::date
          OR ($2::date = $3::date AND a.fecha_cobro_actual < $3::date)
        );
    `;
    const { rows: resHoy } = await query(sqlHoy, [cobradorId, fecha, nowCR]);
    const hoy = Number(resHoy[0]?.total || 0);

    // 4. Lista de Pendientes (Para la fecha consultada + arrastre de días anteriores sin cerrar cuando fecha == hoy)
    // Permite que préstamos en estado ATRASADO sigan apareciendo en sus cuotas futuras programadas
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
        a.compartido_con_usuario_id,
        to_char(a.compartido_en, 'YYYY-MM-DD HH24:MI') AS compartido_en,
        u_comp.nombre_completo AS compartido_con_nombre,
        u_comp.usuario AS compartido_con_usuario,
        c.cedula,
        c.nombre,
        c.apellidos,
        c.telefono,
        c.telefono_secundario,
        c.telefono_secundario AS cliente_telefono_secundario,
        c.ubicacion,
        c.detalles,
        p.monto_prestado,
        p.saldo_por_pagar,
        p.modalidad,
        p.dia_fijo_original,
        p.periodos_atrasados_acumulados,
        p.periodos_pagados,
        p.total_periodos,
        p.estado AS estado_prestamo
      FROM agenda_cobros a
      JOIN prestamos p ON a.prestamo_id = p.id
      JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN usuarios u_comp ON a.compartido_con_usuario_id = u_comp.id
      WHERE a.cobrador_id = $1
        AND a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND c.estado = 'ACTIVO'::public.estado_cliente
        AND (
          a.fecha_cobro_actual = $2::date
          OR ($2::date = $3::date AND a.fecha_cobro_actual < $3::date)
        )
      ORDER BY es_rezagado DESC, a.fecha_cobro_actual ASC, a.numero_cobro ASC, c.nombre ASC;
    `;
    const { rows: rowsPendientes } = await query(sqlPendientes, [cobradorId, fecha, nowCR]);

    // 4.1 Días anteriores que aún tienen cobros pendientes sin cerrar (para indicador en barra de 7 días y notificaciones)
    const sqlDiasSinCerrar = `
      SELECT 
        to_char(a.fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_pendiente,
        COUNT(*)::int AS total_pendientes,
        COALESCE(SUM(a.monto_cuota), 0)::numeric AS monto_total
      FROM agenda_cobros a
      JOIN prestamos p ON a.prestamo_id = p.id
      JOIN clientes c ON a.cliente_id = c.id
      WHERE a.cobrador_id = $1
        AND a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND c.estado = 'ACTIVO'::public.estado_cliente
        AND a.fecha_cobro_actual < $2::date
      GROUP BY a.fecha_cobro_actual
      ORDER BY fecha_pendiente ASC;
    `;
    const { rows: rowsDiasSinCerrar } = await query(sqlDiasSinCerrar, [cobradorId, nowCR]);
    const diasConPendientesSinCerrar = rowsDiasSinCerrar.map(r => r.fecha_pendiente);

    if (rowsDiasSinCerrar.length > 0) {
      const totalRezagados = rowsDiasSinCerrar.reduce((acc, r) => acc + Number(r.total_pendientes || 0), 0);
      const montoRezagado = rowsDiasSinCerrar.reduce((acc, r) => acc + Number(r.monto_total || 0), 0);
      const checkNotifSql = `
        SELECT id FROM notificaciones
        WHERE usuario_id = $1
          AND titulo = 'Cobros pendientes sin cerrar'
          AND leida = false
          AND (fecha_creacion AT TIME ZONE 'America/Costa_Rica')::date = $2::date
        LIMIT 1;
      `;
      const { rows: existingNotif } = await query(checkNotifSql, [cobradorId, nowCR]);
      if (existingNotif.length === 0) {
        const msgNotif = totalRezagados === 1
          ? 'Tienes 1 cobro de días anteriores sin registrar. Indica si el cliente pagó, pasó de día o no pagó.'
          : `Tienes ${totalRezagados} cobros de días anteriores sin registrar. Indica si el cliente pagó, pasó de día o no pagó.`;
        await query(
          `INSERT INTO notificaciones (usuario_id, titulo, mensaje, monto_resaltado, leida)
           VALUES ($1, 'Cobros pendientes sin cerrar', $2, $3, false)`,
          [cobradorId, msgNotif, montoRezagado]
        );
      }
    }

    // 5. Lista de Registrados (Filtrados estrictamente por la fecha consultada)
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
        c.cedula,
        c.nombre,
        c.apellidos,
        c.telefono,
        c.telefono_secundario,
        c.telefono_secundario AS cliente_telefono_secundario,
        c.ubicacion,
        c.detalles,
        p.monto_prestado,
        p.saldo_por_pagar,
        p.modalidad,
        p.dia_fijo_original,
        p.periodos_pagados,
        p.total_periodos,
        a.compartido_con_usuario_id,
        to_char(a.compartido_en, 'YYYY-MM-DD HH24:MI') AS compartido_en,
        u_comp.nombre_completo AS compartido_con_nombre,
        u_comp.usuario AS compartido_con_usuario
      FROM agenda_cobros a
      JOIN prestamos p ON a.prestamo_id = p.id
      JOIN clientes c ON a.cliente_id = c.id
      LEFT JOIN usuarios u_comp ON a.compartido_con_usuario_id = u_comp.id
      WHERE a.cobrador_id = $1
        AND (
          a.fecha_cobro_actual = $2::date 
          OR (a.fecha_hora_registro_pago AT TIME ZONE 'America/Costa_Rica')::date = $2::date
        )
        AND a.estado = 'REGISTRADO'
        AND p.estado NOT IN ('SUSPENDIDO')
        AND c.estado = 'ACTIVO'
      ORDER BY a.fecha_hora_registro_pago DESC;
    `;
    const { rows: rowsRegistrados } = await query(sqlRegistrados, [cobradorId, fecha]);

    // 6. Lista de Atrasados (Préstamos en estado ATRASADO)
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
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.cobrador_id = $1
        AND p.estado = 'ATRASADO'::public.estado_prestamo
        AND c.estado = 'ACTIVO'::public.estado_cliente
      ORDER BY p.periodos_atrasados_acumulados DESC, c.nombre ASC;
    `;
    const { rows: rowsAtrasados } = await query(sqlAtrasados, [cobradorId]);

    // 7. Personas con cobros compartidos activos en esta fecha
    const sqlCompartidosActivos = `
      SELECT 
        u.id AS usuario_id,
        ('CF-' || UPPER(SUBSTRING(u.id::text, 1, 8))) AS codigo_id,
        u.usuario,
        u.nombre_completo,
        COUNT(a.id)::int AS cantidad_cobros,
        COALESCE(SUM(a.monto_cuota), 0)::numeric AS monto_total
      FROM agenda_cobros a
      JOIN usuarios u ON a.compartido_con_usuario_id = u.id
      WHERE a.cobrador_id = $1::uuid
        AND a.fecha_cobro_actual = $2::date
      GROUP BY u.id, u.usuario, u.nombre_completo
      ORDER BY u.nombre_completo ASC;
    `;
    const { rows: compartidosActivosDia } = await query(sqlCompartidosActivos, [cobradorId, fecha]);

    return res.json({
      fecha,
      es_vista_delegada: false,
      metricas: {
        totalPrestado,
        estaSemana,
        hoy
      },
      pendientes: rowsPendientes,
      registrados: rowsRegistrados,
      atrasados: rowsAtrasados,
      diasConPendientesSinCerrar,
      compartidos_activos_dia: compartidosActivosDia
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
  const client = await pool.connect();
  try {
    const { id } = req.params; // ID de agenda_cobros (o prestamo_id)
    const cobradorId = req.body.cobrador_id || await getDefaultCobradorId();
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

    // Buscar la cuota de cobro (incluyendo periodos_atrasados_acumulados del préstamo)
    let cuotaRes = await client.query(
      `SELECT a.*,
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

    // 1. Insertar en pagos_prestamo
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
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $1::uuid, $4::public.tipo_pago, $5, $6, $7::int, now())
      RETURNING *;
    `;
    const { rows: pagoRows } = await client.query(insertPagoSql, [
      cobradorId,
      cuota.prestamo_id,
      cuota.id,
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

    // 3. Actualizar la cuota actual en agenda_cobros a 'REGISTRADO'
    await client.query(
      `UPDATE agenda_cobros
       SET estado = 'REGISTRADO'::public.estado_cuota_cobro,
           fecha_hora_registro_pago = now(),
           monto_moratoria = $1,
           monto_total_cobrado = $2,
           fecha_proximo_cobro = $3::date,
           version = COALESCE(version, 1) + 1
       WHERE id = $4::uuid`,
      [moratoria, montoTotalCobrado, proximaFechaCobro, cuota.id]
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

    // 5. Si aún queda saldo y ya no quedan cuotas PENDIENTE futuras en agenda_cobros, crear la siguiente en su día fijo
    const finalUsuarioId = cobradorId || cuota.cobrador_id || (await getDefaultCobradorId());

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

    // 6. Registrar en bitácora de actividad de forma segura
    const finalCedula = cleanCedula9(cuota.cliente_cedula || cuota.cedula);

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
        finalUsuarioId,
        finalUsuarioId,
        pago.id,
        finalCedula,
        JSON.stringify({
          prestamo_id: cuota.prestamo_id,
          cliente: `${cuota.nombre || ''} ${cuota.apellidos || ''}`.trim(),
          monto_cobrado: montoPago,
          monto_moratoria: moratoria,
          periodos_cubiertos: cuotasCubiertasHoy,
          periodos_atrasados_restantes: atrasosFinales,
          saldo_restante: nuevoSaldo,
          proxima_fecha: proximaFechaCobro
        })
      ]
    );

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
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const rawNuevaFecha = req.body.fecha_nueva || req.body.nuevaFecha;
    const nuevaFecha = rawNuevaFecha ? String(rawNuevaFecha).slice(0, 10) : '';
    const modoAcumulacion = String(
      req.body.modo_acumulacion || req.body.modoAcumulacion || 'ACUMULAR'
    ).toUpperCase();
    const defaultCobrador = await getDefaultCobradorId();
    const cobradorId = req.body.cobrador_id || defaultCobrador;

    if (!nuevaFecha) {
      return res.status(400).json({ error: 'Se requiere la nueva fecha para reprogramar el cobro.' });
    }

    await client.query('BEGIN');

    // Buscar cuota actual y datos del préstamo (con bloqueo FOR UPDATE y fallback a prestamo_id)
    let cuotaRes = await client.query(
      `SELECT a.*,
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

    const fechaAnteriorStr = cuota.fecha_cobro_actual instanceof Date 
      ? cuota.fecha_cobro_actual.toISOString().slice(0, 10) 
      : String(cuota.fecha_cobro_actual).slice(0, 10);

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
             version = COALESCE(version, 1) + 1
         WHERE id = $4::uuid`,
        [nuevaFecha, nuevoDiaSemana, nuevasVecesPasado, cuota.id]
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
             version = COALESCE(version, 1) + 1
         WHERE id = $4::uuid`,
        [nuevaFecha, nuevoDiaSemana, nuevasVecesPasado, cuota.id]
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
                  version = COALESCE(version, 1) + 1
            WHERE id = $1::uuid`,
          [cNoPago.id]
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
                version = COALESCE(version, 1) + 1
          WHERE id = $4::uuid`,
        [nuevaFecha, nuevoDiaSemana, nuevasVecesPasado, cuotaColision.id]
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
    const finalUsuarioId = cobradorId || cuota.cobrador_id || defaultCobrador;
    const finalCedula = cleanCedula9(cuota.cliente_cedula || cuota.cedula);

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
        finalUsuarioId,
        finalUsuarioId,
        agendaTargetId,
        finalCedula,
        JSON.stringify({
          prestamo_id: cuota.prestamo_id,
          cliente: `${cuota.nombre || ''} ${cuota.apellidos || ''}`.trim(),
          fecha_anterior: fechaAnteriorStr,
          fecha_nueva: nuevaFecha,
          modo_acumulacion: modoAplicado,
          periodos_atrasados_acumulados: nuevosAtrasosAcumulados,
          veces_pasado: nuevasVecesPasado
        })
      ]
    );

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
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const defaultCobrador = await getDefaultCobradorId();
    const cobradorId = req.body.cobrador_id || defaultCobrador;

    await client.query('BEGIN');

    // 1. Obtener el cobro actual y su préstamo (con bloqueo FOR UPDATE y fallback a prestamo_id)
    let cuotaRes = await client.query(
      `SELECT a.*, p.modalidad, p.dia_fijo_original, p.dia_mes_1, p.dia_mes_2,
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
        `SELECT a.*, p.modalidad, p.dia_fijo_original, p.dia_mes_1, p.dia_mes_2,
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

    // 2. Marcar 'NO_PAGO' en agenda_cobros con casteo explícito de enum
    await client.query(
      `UPDATE agenda_cobros
          SET estado = 'NO_PAGO'::public.estado_cuota_cobro,
              version = COALESCE(version, 1) + 1
        WHERE id = $1::uuid`,
      [cuota.id]
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
      const finalCobradorId = cobradorId || cuota.cobrador_id || defaultCobrador;

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
          finalCobradorId,
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
    const finalUsuarioId = cobradorId || cuota.cobrador_id || defaultCobrador;
    const finalCedula = cleanCedula9(cuota.cliente_cedula || cuota.cedula);

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
        finalUsuarioId,
        finalUsuarioId,
        cuota.id,
        finalCedula,
        JSON.stringify({
          prestamo_id: cuota.prestamo_id,
          cliente: `${cuota.nombre || ''} ${cuota.apellidos || ''}`.trim(),
          periodos_atrasados: nuevosAtrasos,
          estado_prestamo: nuevoEstadoPrestamo,
          proxima_fecha: proximaFecha
        })
      ]
    );

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
