import { pool, query } from '../config/db.js';
import { getDefaultCobradorId } from '../services/seedService.js';

const DIA_SEMANA_ENUM = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

function getDiaSemanaEnum(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return DIA_SEMANA_ENUM[dateObj.getUTCDay()];
}

function addDaysISO(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dateObj.setUTCDate(dateObj.getUTCDate() + days);
  return dateObj.toISOString().slice(0, 10);
}

function calculateNextChargeDate(currentDateStr, modalidad, diaMes1, diaMes2, diaFijoOriginal = null) {
  if (modalidad === 'SEMANAL') {
    return addDaysISO(currentDateStr, 7);
  }
  // Modalidad QUINCENAL - Forma B: Cada 2 semanas (14 días) con día fijo de la semana
  if (diaFijoOriginal || (!diaMes1 && !diaMes2)) {
    return addDaysISO(currentDateStr, 14);
  }
  // Modalidad QUINCENAL - Forma A: Día 15 y fin de mes
  const [y, m, d] = currentDateStr.split('-').map(Number);
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
    const cobradorId = req.query.cobrador_id || await getDefaultCobradorId();

    // Fecha consultada (YYYY-MM-DD), por defecto hoy en Costa Rica
    const nowCR = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const fecha = req.query.fecha || nowCR;

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
        AND p.estado NOT IN ('SUSPENDIDO', 'LIQUIDADO', 'ATRASADO')
        AND c.estado = 'ACTIVO'
        AND a.estado IN ('PENDIENTE', 'PASADO_DE_DIA')
        AND (
          a.fecha_cobro_actual = $2::date
          OR ($2::date = $3::date AND a.fecha_cobro_actual < $3::date)
        );
    `;
    const { rows: resHoy } = await query(sqlHoy, [cobradorId, fecha, nowCR]);
    const hoy = Number(resHoy[0]?.total || 0);

    // 4. Lista de Pendientes (Para la fecha consultada + arrastre de días anteriores sin cerrar cuando fecha == hoy)
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
        c.cedula,
        c.nombre,
        c.apellidos,
        c.telefono,
        c.ubicacion,
        c.detalles,
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
      WHERE a.cobrador_id = $1
        AND a.estado IN ('PENDIENTE', 'PASADO_DE_DIA')
        AND p.estado NOT IN ('SUSPENDIDO', 'LIQUIDADO', 'ATRASADO')
        AND c.estado = 'ACTIVO'
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
        AND a.estado IN ('PENDIENTE', 'PASADO_DE_DIA')
        AND p.estado NOT IN ('SUSPENDIDO', 'LIQUIDADO', 'ATRASADO')
        AND c.estado = 'ACTIVO'
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
        c.ubicacion,
        c.detalles,
        p.monto_prestado,
        p.saldo_por_pagar,
        p.modalidad,
        p.dia_fijo_original,
        p.periodos_pagados,
        p.total_periodos
      FROM agenda_cobros a
      JOIN prestamos p ON a.prestamo_id = p.id
      JOIN clientes c ON a.cliente_id = c.id
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
        c.ubicacion,
        c.detalles
      FROM prestamos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.cobrador_id = $1
        AND p.estado = 'ATRASADO'
        AND c.estado = 'ACTIVO'
      ORDER BY p.periodos_atrasados_acumulados DESC, c.nombre ASC;
    `;
    const { rows: rowsAtrasados } = await query(sqlAtrasados, [cobradorId]);

    return res.json({
      fecha,
      metricas: {
        totalPrestado,
        estaSemana,
        hoy
      },
      pendientes: rowsPendientes,
      registrados: rowsRegistrados,
      atrasados: rowsAtrasados,
      diasConPendientesSinCerrar
    });
  } catch (err) {
    console.error('Error al consultar cobros:', err);
    return res.status(500).json({ error: 'Error interno al consultar agenda de cobros' });
  }
}

export async function registrarPago(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params; // ID de agenda_cobros (o prestamo_id)
    const cobradorId = req.body.cobrador_id || await getDefaultCobradorId();
    const montoRecibido = req.body.monto ? Number(req.body.monto) : null;
    const moratoria = req.body.moratoria ? Number(req.body.moratoria) : 0;

    await client.query('BEGIN');

    // Buscar la cuota de cobro
    let cuotaRes = await client.query(
      `SELECT a.*, p.saldo_por_pagar, p.monto_pagado_acumulado, p.modalidad, p.dia_fijo_original, p.dia_mes_1, p.dia_mes_2, p.total_periodos, p.periodos_pagados, p.periodos_pendientes, p.estado AS estado_prestamo, c.cedula, c.nombre, c.apellidos
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
        `SELECT a.*, p.saldo_por_pagar, p.monto_pagado_acumulado, p.modalidad, p.dia_fijo_original, p.dia_mes_1, p.dia_mes_2, p.total_periodos, p.periodos_pagados, p.periodos_pendientes, p.estado AS estado_prestamo, c.cedula, c.nombre, c.apellidos
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
      return res.status(404).json({ error: 'Registro de cobro no encontrado o ya procesado.' });
    }

    const montoPago = montoRecibido !== null ? montoRecibido : Number(cuota.monto_cuota);
    const montoTotalCobrado = montoPago + moratoria;

    // 1. Insertar en pagos_prestamo
    const tipoPago = cuota.estado_prestamo === 'ATRASADO' ? 'PAGO_ATRASADO' : 'COBRO_NORMAL';
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
      ) VALUES ($1, $2, $3, $1, $4, $5, $6, 1, now())
      RETURNING *;
    `;
    const { rows: pagoRows } = await client.query(insertPagoSql, [
      cobradorId,
      cuota.prestamo_id,
      cuota.id,
      tipoPago,
      montoPago,
      moratoria
    ]);
    const pago = pagoRows[0];

    // 2. Calcular próxima fecha de cobro según dia_fijo_original o dia_mes_1/dia_mes_2
    const fechaActualStr = cuota.fecha_cobro_actual instanceof Date 
      ? cuota.fecha_cobro_actual.toISOString().slice(0, 10) 
      : String(cuota.fecha_cobro_actual);

    const proximaFechaCobro = calculateNextChargeDate(
      fechaActualStr,
      cuota.modalidad,
      cuota.dia_mes_1,
      cuota.dia_mes_2,
      cuota.dia_fijo_original
    );

    // 3. Actualizar la cuota en agenda_cobros a 'REGISTRADO'
    await client.query(
      `UPDATE agenda_cobros
       SET estado = 'REGISTRADO',
           fecha_hora_registro_pago = now(),
           monto_moratoria = $1,
           monto_total_cobrado = $2,
           fecha_proximo_cobro = $3,
           version = version + 1
       WHERE id = $4`,
      [moratoria, montoTotalCobrado, proximaFechaCobro, cuota.id]
    );

    // 4. Descontar saldo_por_pagar en prestamos, reiniciar periodos_atrasados_acumulados = 0
    const nuevoSaldo = Math.max(0, Number(cuota.saldo_por_pagar) - montoPago);
    const nuevoPagadoAcumulado = Number(cuota.monto_pagado_acumulado) + montoPago;
    const nuevoEstado = nuevoSaldo === 0 ? 'LIQUIDADO' : 'ACTIVO';
    const periodosPagados = Number(cuota.periodos_pagados) + 1;
    const periodosPendientes = Math.max(0, Number(cuota.periodos_pendientes) - 1);

    await client.query(
      `UPDATE prestamos
       SET saldo_por_pagar = $1,
           monto_pagado_acumulado = $2,
           periodos_pagados = $3,
           periodos_pendientes = $4,
           periodos_atrasados_acumulados = 0,
           estado = $5,
           actualizado_en = now(),
           version = version + 1
       WHERE id = $6`,
      [nuevoSaldo, nuevoPagadoAcumulado, periodosPagados, periodosPendientes, nuevoEstado, cuota.prestamo_id]
    );

    // 5. Si aún queda saldo, programar el próximo cobro en agenda_cobros
    if (nuevoSaldo > 0) {
      const siguienteNumero = Number(cuota.numero_cobro) + 1;
      const diaSemanaProximo = getDiaSemanaEnum(proximaFechaCobro);

      // Verificar si ya existe agenda para esa fecha
      const checkExist = await client.query(
        `SELECT id FROM agenda_cobros WHERE prestamo_id = $1 AND numero_cobro = $2`,
        [cuota.prestamo_id, siguienteNumero]
      );

      if (checkExist.rows.length === 0) {
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
            estado
          ) VALUES ($1, $2, $3, $4, $5, $5, $6, 0, $7, 'PENDIENTE')`,
          [
            cobradorId,
            cuota.prestamo_id,
            cuota.cliente_id,
            siguienteNumero,
            proximaFechaCobro,
            diaSemanaProximo,
            cuota.monto_cuota
          ]
        );
      }
    }

    // 6. Registrar en bitácora de actividad
    await client.query(
      `INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1, $2, 'PAGO_REGISTRADO', 'pagos_prestamo', $3, $4, $5)`,
      [
        cobradorId,
        cobradorId,
        pago.id,
        cuota.cedula,
        JSON.stringify({
          prestamo_id: cuota.prestamo_id,
          cliente: `${cuota.nombre} ${cuota.apellidos}`.trim(),
          monto_cobrado: montoPago,
          monto_moratoria: moratoria,
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
      proximaFechaCobro
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar pago:', err);
    return res.status(500).json({ error: 'Error interno al registrar el pago' });
  } finally {
    client.release();
  }
}

export async function pasarCobro(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { nuevaFecha } = req.body;
    const cobradorId = req.body.cobrador_id || await getDefaultCobradorId();

    if (!nuevaFecha) {
      return res.status(400).json({ error: 'Se requiere la nueva fecha para reprogramar el cobro.' });
    }

    await client.query('BEGIN');

    // Buscar cuota
    const cuotaRes = await client.query(
      `SELECT a.*, c.cedula, c.nombre, c.apellidos
       FROM agenda_cobros a
       JOIN clientes c ON a.cliente_id = c.id
       WHERE a.id = $1 FOR UPDATE`,
      [id]
    );

    const cuota = cuotaRes.rows[0];
    if (!cuota) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Registro de cobro no encontrado.' });
    }

    const fechaAnteriorStr = cuota.fecha_cobro_actual instanceof Date 
      ? cuota.fecha_cobro_actual.toISOString().slice(0, 10) 
      : String(cuota.fecha_cobro_actual);

    const nuevoDiaSemana = getDiaSemanaEnum(nuevaFecha);
    const nuevasVecesPasado = Number(cuota.veces_pasado) + 1;

    // Actualizar agenda_cobros
    await client.query(
      `UPDATE agenda_cobros
       SET fecha_cobro_actual = $1,
           dia_semana_actual = $2,
           veces_pasado = $3,
           estado = 'PASADO_DE_DIA',
           version = version + 1
       WHERE id = $4`,
      [nuevaFecha, nuevoDiaSemana, nuevasVecesPasado, cuota.id]
    );

    // Insertar en historial_pasar_dia
    await client.query(
      `INSERT INTO historial_pasar_dia (
        agenda_cobro_id,
        prestamo_id,
        fecha_anterior,
        fecha_nueva,
        numero_reprogramacion
      ) VALUES ($1, $2, $3, $4, $5)`,
      [cuota.id, cuota.prestamo_id, fechaAnteriorStr, nuevaFecha, nuevasVecesPasado]
    );

    // Registrar en bitácora
    await client.query(
      `INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1, $2, 'COBRO_PASADO', 'agenda_cobros', $3, $4, $5)`,
      [
        cobradorId,
        cobradorId,
        cuota.id,
        cuota.cedula,
        JSON.stringify({
          prestamo_id: cuota.prestamo_id,
          cliente: `${cuota.nombre} ${cuota.apellidos}`.trim(),
          fecha_anterior: fechaAnteriorStr,
          fecha_nueva: nuevaFecha,
          veces_pasado: nuevasVecesPasado
        })
      ]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Cobro pasado de día con éxito',
      fecha_anterior: fechaAnteriorStr,
      fecha_nueva: nuevaFecha,
      veces_pasado: nuevasVecesPasado
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al pasar cobro:', err);
    return res.status(500).json({ error: 'Error interno al reprogramar cobro' });
  } finally {
    client.release();
  }
}

export async function registrarNoPago(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const cobradorId = req.body.cobrador_id || await getDefaultCobradorId();

    await client.query('BEGIN');

    // Buscar cuota
    const cuotaRes = await client.query(
      `SELECT a.*, p.modalidad, p.dia_fijo_original, p.dia_mes_1, p.dia_mes_2, p.periodos_atrasados_acumulados, c.cedula, c.nombre, c.apellidos
       FROM agenda_cobros a
       JOIN prestamos p ON a.prestamo_id = p.id
       JOIN clientes c ON a.cliente_id = c.id
       WHERE a.id = $1 FOR UPDATE`,
      [id]
    );

    const cuota = cuotaRes.rows[0];
    if (!cuota) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Registro de cobro no encontrado.' });
    }

    // 1. Marcar 'NO_PAGO' en agenda_cobros
    await client.query(
      `UPDATE agenda_cobros
       SET estado = 'NO_PAGO',
           version = version + 1
       WHERE id = $1`,
      [cuota.id]
    );

    // 2. Incrementar periodos_atrasados_acumulados en prestamos
    const nuevosAtrasos = Number(cuota.periodos_atrasados_acumulados) + 1;
    let nuevoEstadoPrestamo = 'ACTIVO';

    // Regla de negocio: 4 semanas (semanal) o 2 quincenas (quincenal) = ATRASADO crítico
    if (cuota.modalidad === 'SEMANAL' && nuevosAtrasos >= 4) {
      nuevoEstadoPrestamo = 'ATRASADO';
    } else if (cuota.modalidad === 'QUINCENAL' && nuevosAtrasos >= 2) {
      nuevoEstadoPrestamo = 'ATRASADO';
    }

    await client.query(
      `UPDATE prestamos
       SET periodos_atrasados_acumulados = $1,
           estado = CASE WHEN estado = 'SUSPENDIDO' THEN 'SUSPENDIDO' ELSE $2 END,
           actualizado_en = now(),
           version = version + 1
       WHERE id = $3`,
      [nuevosAtrasos, nuevoEstadoPrestamo, cuota.prestamo_id]
    );

    // 3. Programar el siguiente periodo en agenda_cobros
    const fechaActualStr = cuota.fecha_cobro_actual instanceof Date 
      ? cuota.fecha_cobro_actual.toISOString().slice(0, 10) 
      : String(cuota.fecha_cobro_actual);

    const proximaFecha = calculateNextChargeDate(
      fechaActualStr,
      cuota.modalidad,
      cuota.dia_mes_1,
      cuota.dia_mes_2,
      cuota.dia_fijo_original
    );

    const diaSemanaProximo = getDiaSemanaEnum(proximaFecha);
    const siguienteNumero = Number(cuota.numero_cobro) + 1;

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
        estado
      ) VALUES ($1, $2, $3, $4, $5, $5, $6, 0, $7, 'PENDIENTE')
      ON CONFLICT (prestamo_id, numero_cobro) DO NOTHING;`,
      [
        cobradorId,
        cuota.prestamo_id,
        cuota.cliente_id,
        siguienteNumero,
        proximaFecha,
        diaSemanaProximo,
        cuota.monto_cuota
      ]
    );

    // 4. Registrar en bitácora
    await client.query(
      `INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1, $2, 'NO_PAGO_REGISTRADO', 'agenda_cobros', $3, $4, $5)`,
      [
        cobradorId,
        cobradorId,
        cuota.id,
        cuota.cedula,
        JSON.stringify({
          prestamo_id: cuota.prestamo_id,
          cliente: `${cuota.nombre} ${cuota.apellidos}`.trim(),
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
    console.error('Error al registrar no pago:', err);
    return res.status(500).json({ error: 'Error interno al registrar no pago' });
  } finally {
    client.release();
  }
}
