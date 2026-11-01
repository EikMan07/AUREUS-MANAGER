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

function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function toISODateString(val) {
  if (!val) return '';
  if (typeof val === 'string') return val.slice(0, 10);
  if (val instanceof Date) {
    const y = val.getUTCFullYear();
    const m = String(val.getUTCMonth() + 1).padStart(2, '0');
    const d = String(val.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).slice(0, 10);
}

/**
 * Genera el arreglo de cuotas programadas (fechas y días de la semana)
 * para un préstamo semanal o quincenal.
 */
function generateScheduleDates(fechaInput, modalidad, diaFijoOriginal, diaMes1, diaMes2, totalPeriodos) {
  const fechaInicioStr = toISODateString(fechaInput);
  const schedule = [];
  const n = parseInt(totalPeriodos, 10);

  if (modalidad === 'SEMANAL') {
    const targetDayIndex = DIA_SEMANA_ENUM.indexOf(diaFijoOriginal);
    if (targetDayIndex === -1) {
      throw new Error(`Día de la semana inválido: ${diaFijoOriginal}`);
    }

    const [y, m, d] = fechaInicioStr.split('-').map(Number);
    const startDateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const startDayIndex = startDateObj.getUTCDay();

    // Si la fecha de inicio ya es el día fijo, la primera cuota es +7 días después
    let daysToFirst = (targetDayIndex - startDayIndex + 7) % 7;
    if (daysToFirst === 0) {
      daysToFirst = 7;
    }

    let currentDateStr = addDaysISO(fechaInicioStr, daysToFirst);

    for (let i = 1; i <= n; i++) {
      schedule.push({
        numero_cobro: i,
        fecha: currentDateStr,
        dia_semana: diaFijoOriginal
      });
      currentDateStr = addDaysISO(currentDateStr, 7);
    }
  } else if (diaFijoOriginal) {
    // Modalidad QUINCENAL - Forma B: Cada 2 semanas (14 días) en un día fijo de la semana
    const targetDayIndex = DIA_SEMANA_ENUM.indexOf(diaFijoOriginal);
    if (targetDayIndex === -1) {
      throw new Error(`Día de la semana inválido para cobro quincenal: ${diaFijoOriginal}`);
    }

    const [y, m, d] = fechaInicioStr.split('-').map(Number);
    const startDateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const startDayIndex = startDateObj.getUTCDay();

    // Primera cuota en la segunda semana (entre 8 y 14 días desde fecha_inicio) y luego cada 14 días
    const daysToNextTarget = (targetDayIndex - startDayIndex + 7) % 7;
    const daysToFirst = (daysToNextTarget === 0 ? 7 : daysToNextTarget) + 7;

    let currentDateStr = addDaysISO(fechaInicioStr, daysToFirst);

    for (let i = 1; i <= n; i++) {
      schedule.push({
        numero_cobro: i,
        fecha: currentDateStr,
        dia_semana: diaFijoOriginal
      });
      currentDateStr = addDaysISO(currentDateStr, 14);
    }
  } else {
    // Modalidad QUINCENAL - Forma A: Por fechas del mes (Día 15 y fin de mes)
    const d1 = parseInt(diaMes1, 10);
    const d2 = parseInt(diaMes2, 10);
    if (isNaN(d1) || isNaN(d2) || d1 >= d2) {
      throw new Error('Días quincenales inválidos: el día 1 debe ser menor que el día 2.');
    }

    const [y, m, d] = fechaInicioStr.split('-').map(Number);
    let curY = y;
    let curM = m; // 1-12

    // Encontrar la primera fecha posterior a fechaInicio
    const dimCurrent = daysInMonth(curY, curM);
    const actD1 = Math.min(d1, dimCurrent);
    const actD2 = Math.min(d2, dimCurrent);

    let nextTargetD = null;
    if (d < actD1) {
      nextTargetD = actD1;
    } else if (d < actD2) {
      nextTargetD = actD2;
    } else {
      // Pasa al siguiente mes, día 1
      curM += 1;
      if (curM > 12) {
        curM = 1;
        curY += 1;
      }
      nextTargetD = Math.min(d1, daysInMonth(curY, curM));
    }

    for (let i = 1; i <= n; i++) {
      const dateStr = `${curY}-${String(curM).padStart(2, '0')}-${String(nextTargetD).padStart(2, '0')}`;
      schedule.push({
        numero_cobro: i,
        fecha: dateStr,
        dia_semana: getDiaSemanaEnum(dateStr)
      });

      // Calcular la siguiente cuota
      if (nextTargetD === Math.min(d1, daysInMonth(curY, curM))) {
        // La siguiente es día 2 del mismo mes
        nextTargetD = Math.min(d2, daysInMonth(curY, curM));
      } else {
        // La siguiente es día 1 del siguiente mes
        curM += 1;
        if (curM > 12) {
          curM = 1;
          curY += 1;
        }
        nextTargetD = Math.min(d1, daysInMonth(curY, curM));
      }
    }
  }

  return schedule;
}

/**
 * GET /api/prestamos
 * Devuelve todos los préstamos activos/atrasados/arreglo_pago/renovados
 * del cobrador con sus cuotas de agenda ordenadas cronológicamente.
 */
export async function getPrestamos(req, res) {
  try {
    const cobradorId = req.query.cobrador_id || await getDefaultCobradorId();

    const sql = `
      SELECT 
        p.id,
        p.cobrador_id,
        p.cliente_id,
        p.monto_prestado,
        p.porcentaje_interes,
        p.monto_total_financiar,
        p.monto_pagado_acumulado,
        p.saldo_por_pagar,
        p.cuota,
        p.modalidad,
        p.dia_fijo_original,
        p.dia_mes_1,
        p.dia_mes_2,
        to_char(p.fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
        to_char(p.fecha_final, 'YYYY-MM-DD') AS fecha_final,
        p.total_periodos,
        p.periodos_pagados,
        p.periodos_pendientes,
        p.periodos_atrasados_acumulados,
        p.estado,
        p.estado_previo_suspension,
        p.version,
        p.creado_en,
        p.actualizado_en,
        c.nombre AS cliente_nombre,
        c.apellidos AS cliente_apellidos,
        c.cedula AS cliente_cedula,
        c.telefono AS cliente_telefono,
        c.ubicacion AS cliente_ubicacion,
        c.detalles AS cliente_detalles,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', a.id,
                'numero_cobro', a.numero_cobro,
                'fecha_programada_original', a.fecha_programada_original,
                'fecha_cobro_actual', a.fecha_cobro_actual,
                'dia_semana_actual', a.dia_semana_actual,
                'veces_pasado', a.veces_pasado,
                'monto_cuota', a.monto_cuota,
                'monto_moratoria', a.monto_moratoria,
                'monto_total_cobrado', a.monto_total_cobrado,
                'estado', a.estado,
                'fecha_hora_registro_pago', a.fecha_hora_registro_pago,
                'fecha_proximo_cobro', a.fecha_proximo_cobro
              ) ORDER BY a.numero_cobro ASC
            )
            FROM agenda_cobros a
            WHERE a.prestamo_id = p.id
          ), '[]'::json
        ) AS cuotas
      FROM prestamos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.cobrador_id = $1
        AND p.estado IN ('ACTIVO', 'ATRASADO', 'ARREGLO_PAGO', 'RENOVADO')
      ORDER BY p.creado_en DESC;
    `;

    const { rows } = await query(sql, [cobradorId]);
    return res.json(rows);
  } catch (err) {
    console.error('[Préstamos] Error al obtener préstamos:', err);
    return res.status(500).json({ error: 'Error interno al consultar los préstamos.' });
  }
}

/**
 * POST /api/prestamos
 * Crea un préstamo en una transacción SQL y genera su agenda de cobros.
 */
export async function createPrestamo(req, res) {
  const client = await pool.connect();
  try {
    const {
      cliente_id,
      monto_prestado,
      porcentaje_interes,
      monto_total_financiar,
      cuota,
      modalidad,
      dia_fijo_original,
      dia_mes_1,
      dia_mes_2,
      fecha_inicio,
      total_periodos
    } = req.body;

    const cobradorId = req.body.cobrador_id || await getDefaultCobradorId();

    // 1. Validaciones básicas con mensaje formal unificado
    if (!cliente_id) {
      return res.status(400).json({
        error: 'No has completado los datos necesarios para registrar un nuevo préstamo.',
        field: 'cliente'
      });
    }

    const prestadoNum = Number(monto_prestado);
    const interesNum = Number(porcentaje_interes);
    const cuotaNum = Number(cuota);
    const periodosInt = parseInt(total_periodos, 10);

    if (
      isNaN(prestadoNum) ||
      prestadoNum <= 0 ||
      porcentaje_interes === '' ||
      porcentaje_interes === null ||
      porcentaje_interes === undefined ||
      isNaN(interesNum) ||
      interesNum < 0 ||
      isNaN(periodosInt) ||
      periodosInt <= 0 ||
      isNaN(cuotaNum) ||
      cuotaNum <= 0
    ) {
      return res.status(400).json({
        error: 'No has completado los datos necesarios para registrar un nuevo préstamo.'
      });
    }

    const modUpper = (modalidad || 'SEMANAL').toUpperCase();
    if (!['SEMANAL', 'QUINCENAL'].includes(modUpper)) {
      return res.status(400).json({
        error: 'No has completado los datos necesarios para registrar un nuevo préstamo.'
      });
    }

    // 2. Verificar existencia de cliente y lista negra
    const clienteCheck = await client.query(
      `SELECT id, cedula, nombre, apellidos, estado 
       FROM clientes 
       WHERE id = $1 AND cobrador_id = $2`,
      [cliente_id, cobradorId]
    );

    if (clienteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'El cliente seleccionado no se encuentra registrado.' });
    }
    const clienteObj = clienteCheck.rows[0];

    if (clienteObj.estado !== 'ACTIVO') {
      return res.status(400).json({ error: 'Solo se pueden crear préstamos para clientes activos.' });
    }

    // Comprobar si está en lista negra
    const blacklistCheck = await client.query(
      `SELECT id FROM lista_negra WHERE (cliente_id = $1 OR cedula = $2) AND activo = true`,
      [cliente_id, clienteObj.cedula]
    );
    if (blacklistCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'El cliente se encuentra en la lista negra y no puede recibir préstamos.'
      });
    }

    // 3. Validar y preparar campos según modalidad (cumpliendo ck_prestamos_dia_segun_modalidad)
    let finalDiaFijo = null;
    let finalDiaMes1 = null;
    let finalDiaMes2 = null;

    if (modUpper === 'SEMANAL') {
      const dfUpper = (dia_fijo_original || '').toUpperCase();
      if (!DIA_SEMANA_ENUM.includes(dfUpper)) {
        return res.status(400).json({ error: 'Día fijo de cobro semanal inválido.' });
      }
      finalDiaFijo = dfUpper;
    } else {
      // QUINCENAL: Forma B (Cada 2 semanas por día de la semana) o Forma A (Día 15 y fin de mes)
      const dfUpper = (dia_fijo_original || '').toUpperCase().trim();
      if (dfUpper) {
        if (!DIA_SEMANA_ENUM.includes(dfUpper)) {
          return res.status(400).json({ error: 'Día fijo de cobro quincenal (cada 2 semanas) inválido.' });
        }
        finalDiaFijo = dfUpper;
        finalDiaMes1 = null;
        finalDiaMes2 = null;
      } else {
        finalDiaFijo = null;
        finalDiaMes1 = parseInt(dia_mes_1, 10) || 15;
        finalDiaMes2 = parseInt(dia_mes_2, 10) || 31;
        if (isNaN(finalDiaMes1) || finalDiaMes1 < 1 || finalDiaMes1 > 31) {
          return res.status(400).json({ error: 'El día 1 de cobro quincenal debe estar entre 1 y 31.' });
        }
        if (isNaN(finalDiaMes2) || finalDiaMes2 < 1 || finalDiaMes2 > 31) {
          return res.status(400).json({ error: 'El día 2 de cobro quincenal debe estar entre 1 y 31.' });
        }
        if (finalDiaMes1 >= finalDiaMes2) {
          return res.status(400).json({ error: 'El día 1 de cobro debe ser estrictamente menor al día 2.' });
        }
      }
    }

    const fechaInicioStr = fecha_inicio || new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    // 4. Calcular calendario de cuotas y fecha final
    const schedule = generateScheduleDates(
      fechaInicioStr,
      modUpper,
      finalDiaFijo,
      finalDiaMes1,
      finalDiaMes2,
      periodosInt
    );

    const fechaFinalStr = schedule[schedule.length - 1].fecha;

    const totalFinanciarNum = Number(monto_total_financiar) || (prestadoNum * (1 + interesNum / 100));

    // 5. Iniciar Transacción
    await client.query('BEGIN');

    const insertPrestamoSql = `
      INSERT INTO prestamos (
        cobrador_id,
        cliente_id,
        monto_prestado,
        porcentaje_interes,
        monto_total_financiar,
        monto_pagado_acumulado,
        saldo_por_pagar,
        cuota,
        modalidad,
        dia_fijo_original,
        dia_mes_1,
        dia_mes_2,
        fecha_inicio,
        fecha_final,
        total_periodos,
        periodos_pagados,
        periodos_pendientes,
        periodos_atrasados_acumulados,
        estado
      ) VALUES (
        $1, $2, $3, $4, $5, 0, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, $13, 0, 'ACTIVO'
      )
      RETURNING *;
    `;

    const prestamoRes = await client.query(insertPrestamoSql, [
      cobradorId,
      cliente_id,
      prestadoNum,
      interesNum,
      totalFinanciarNum,
      cuotaNum,
      modUpper,
      finalDiaFijo,
      finalDiaMes1,
      finalDiaMes2,
      fechaInicioStr,
      fechaFinalStr,
      periodosInt
    ]);

    const nuevoPrestamo = prestamoRes.rows[0];

    // 6. Insertar todas las cuotas en agenda_cobros
    for (const item of schedule) {
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
          $1, $2, $3, $4, $5, $5, $6, 0, $7, 0, 0, 'PENDIENTE'
        );`,
        [
          cobradorId,
          nuevoPrestamo.id,
          cliente_id,
          item.numero_cobro,
          item.fecha,
          item.dia_semana,
          cuotaNum
        ]
      );
    }

    // 7. Bitácora de actividad
    await client.query(
      `INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1, $2, 'PRESTAMO_CREADO', 'prestamos', $3, $4, $5);`,
      [
        cobradorId,
        cobradorId,
        nuevoPrestamo.id,
        clienteObj.cedula,
        JSON.stringify({
          prestamo_id: nuevoPrestamo.id,
          cliente: `${clienteObj.nombre} ${clienteObj.apellidos}`.trim(),
          monto_prestado: prestadoNum,
          monto_total: totalFinanciarNum,
          modalidad: modUpper,
          cuotas: periodosInt,
          cuota: cuotaNum
        })
      ]
    );

    await client.query('COMMIT');

    console.log(`[Préstamos] Préstamo ${nuevoPrestamo.id} creado con éxito para ${clienteObj.nombre} ${clienteObj.apellidos}`);
    return res.status(201).json(nuevoPrestamo);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Préstamos] Error creando préstamo:', err);
    return res.status(500).json({ error: err.message || 'Error interno al registrar el préstamo.' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/prestamos/:id/renovar
 * Renueva un préstamo existente, sustituyendo cuotas pendientes futuras.
 */
export async function renovarPrestamo(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      nuevo_monto_prestado,
      porcentaje_interes,
      total_periodos,
      nueva_cuota
    } = req.body;

    const cobradorId = req.body.cobrador_id || await getDefaultCobradorId();

    const nuevoMontoNum = Number(nuevo_monto_prestado);
    const interesNum = Number(porcentaje_interes);
    const periodosInt = parseInt(total_periodos, 10);
    const cuotaNum = Number(nueva_cuota);

    if (
      isNaN(nuevoMontoNum) ||
      nuevoMontoNum <= 0 ||
      porcentaje_interes === '' ||
      porcentaje_interes === null ||
      porcentaje_interes === undefined ||
      isNaN(interesNum) ||
      interesNum < 0 ||
      isNaN(periodosInt) ||
      periodosInt <= 0 ||
      isNaN(cuotaNum) ||
      cuotaNum <= 0
    ) {
      return res.status(400).json({
        error: 'No has completado los datos necesarios para renovar el préstamo.'
      });
    }

    await client.query('BEGIN');

    // 1. Obtener préstamo actual
    const prestamoRes = await client.query(
      `SELECT p.*, c.cedula, c.nombre, c.apellidos
       FROM prestamos p
       JOIN clientes c ON p.cliente_id = c.id
       WHERE p.id = $1 AND p.cobrador_id = $2
       FOR UPDATE`,
      [id, cobradorId]
    );

    if (prestamoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Préstamo no encontrado.' });
    }

    const currentLoan = prestamoRes.rows[0];
    const nuevoTotalFinanciar = nuevoMontoNum * (1 + interesNum / 100);

    // 2. Determinar fecha de inicio del nuevo calendario:
    // Se toma la fecha del próximo cobro pendiente, o la fecha actual
    const nextPendingRes = await client.query(
      `SELECT to_char(fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_cobro_actual 
       FROM agenda_cobros 
       WHERE prestamo_id = $1 AND estado IN ('PENDIENTE', 'PASADO_DE_DIA') 
       ORDER BY numero_cobro ASC 
       LIMIT 1`,
      [id]
    );

    const nowCR = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const baseDateStr = nextPendingRes.rows.length > 0
      ? nextPendingRes.rows[0].fecha_cobro_actual
      : nowCR;

    // Generar nuevo calendario
    const schedule = generateScheduleDates(
      baseDateStr,
      currentLoan.modalidad,
      currentLoan.dia_fijo_original,
      currentLoan.dia_mes_1,
      currentLoan.dia_mes_2,
      periodosInt
    );

    const nuevaFechaFinalStr = schedule[schedule.length - 1].fecha;

    // 3. Registrar renovación en renovaciones_prestamo
    await client.query(
      `INSERT INTO renovaciones_prestamo (
        prestamo_id,
        monto_anterior,
        monto_nuevo,
        cuota_anterior,
        cuota_nueva,
        fecha_final_anterior,
        fecha_final_nueva
      ) VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [
        id,
        currentLoan.monto_prestado,
        nuevoMontoNum,
        currentLoan.cuota,
        cuotaNum,
        toISODateString(currentLoan.fecha_final),
        nuevaFechaFinalStr
      ]
    );

    // 4. Eliminar cuotas pendientes anteriores
    await client.query(
      `DELETE FROM agenda_cobros WHERE prestamo_id = $1 AND estado IN ('PENDIENTE', 'PASADO_DE_DIA')`,
      [id]
    );

    // 5. Insertar nuevas cuotas
    for (const item of schedule) {
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
          $1, $2, $3, $4, $5, $5, $6, 0, $7, 0, 0, 'PENDIENTE'
        );`,
        [
          cobradorId,
          id,
          currentLoan.cliente_id,
          item.numero_cobro,
          item.fecha,
          item.dia_semana,
          cuotaNum
        ]
      );
    }

    // 6. Actualizar préstamo
    const updatedPrestamoRes = await client.query(
      `UPDATE prestamos SET
        monto_prestado = $1,
        porcentaje_interes = $2,
        monto_total_financiar = $3,
        saldo_por_pagar = $3,
        cuota = $4,
        total_periodos = $5,
        periodos_pagados = 0,
        periodos_pendientes = $5,
        periodos_atrasados_acumulados = 0,
        fecha_final = $6,
        estado = 'RENOVADO',
        version = version + 1,
        actualizado_en = now()
      WHERE id = $7
      RETURNING *;`,
      [
        nuevoMontoNum,
        interesNum,
        nuevoTotalFinanciar,
        cuotaNum,
        periodosInt,
        nuevaFechaFinalStr,
        id
      ]
    );

    // 7. Bitácora de actividad
    await client.query(
      `INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1, $2, 'PRESTAMO_RENOVADO', 'prestamos', $3, $4, $5);`,
      [
        cobradorId,
        cobradorId,
        id,
        currentLoan.cedula,
        JSON.stringify({
          prestamo_id: id,
          cliente: `${currentLoan.nombre} ${currentLoan.apellidos}`.trim(),
          monto_anterior: currentLoan.monto_prestado,
          monto_nuevo: nuevoMontoNum,
          cuota_nueva: cuotaNum,
          periodos: periodosInt
        })
      ]
    );

    await client.query('COMMIT');
    return res.json(updatedPrestamoRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Préstamos] Error al renovar préstamo:', err);
    return res.status(500).json({ error: err.message || 'Error interno al renovar el préstamo.' });
  } finally {
    client.release();
  }
}

/**
 * POST /api/prestamos/:id/arreglo
 * Establece un acuerdo de pago reestructurado.
 */
export async function arregloPagoPrestamo(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      monto_fijo_acordado,
      cuota_especial,
      nuevo_dia_cobro,
      nuevo_dia_mes_1,
      nuevo_dia_mes_2
    } = req.body;

    const cobradorId = req.body.cobrador_id || await getDefaultCobradorId();

    const montoAcordadoNum = Number(monto_fijo_acordado);
    const cuotaEspecialNum = Number(cuota_especial);

    if (isNaN(montoAcordadoNum) || montoAcordadoNum <= 0 || isNaN(cuotaEspecialNum) || cuotaEspecialNum <= 0) {
      return res.status(400).json({
        error: 'No has completado los datos necesarios para registrar el arreglo de pago.'
      });
    }

    await client.query('BEGIN');

    // 1. Obtener préstamo
    const prestamoRes = await client.query(
      `SELECT p.*, c.cedula, c.nombre, c.apellidos
       FROM prestamos p
       JOIN clientes c ON p.cliente_id = c.id
       WHERE p.id = $1 AND p.cobrador_id = $2
       FOR UPDATE`,
      [id, cobradorId]
    );

    if (prestamoRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Préstamo no encontrado.' });
    }

    const currentLoan = prestamoRes.rows[0];
    const montoFijoReal = Number(currentLoan.saldo_por_pagar) > 0
      ? Number(currentLoan.saldo_por_pagar)
      : montoAcordadoNum;

    // Validar modalidad y días acordados
    let diaFijoAcordado = null;
    let diaMes1Acordado = null;
    let diaMes2Acordado = null;

    if (currentLoan.modalidad === 'SEMANAL') {
      const diaUp = (nuevo_dia_cobro || currentLoan.dia_fijo_original || 'SABADO').toUpperCase();
      if (!DIA_SEMANA_ENUM.includes(diaUp)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Nuevo día de cobro semanal inválido.' });
      }
      diaFijoAcordado = diaUp;
    } else {
      const diaUp = (nuevo_dia_cobro || '').toUpperCase().trim();
      if (diaUp) {
        if (!DIA_SEMANA_ENUM.includes(diaUp)) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Nuevo día de cobro quincenal inválido.' });
        }
        diaFijoAcordado = diaUp;
        diaMes1Acordado = null;
        diaMes2Acordado = null;
      } else if (nuevo_dia_mes_1 || nuevo_dia_mes_2 || !currentLoan.dia_fijo_original) {
        diaFijoAcordado = null;
        diaMes1Acordado = parseInt(nuevo_dia_mes_1, 10) || currentLoan.dia_mes_1 || 15;
        diaMes2Acordado = parseInt(nuevo_dia_mes_2, 10) || currentLoan.dia_mes_2 || 31;
        if (diaMes1Acordado >= diaMes2Acordado) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'El día 1 debe ser menor al día 2.' });
        }
      } else {
        diaFijoAcordado = currentLoan.dia_fijo_original;
        diaMes1Acordado = null;
        diaMes2Acordado = null;
      }
    }

    // 2. Desactivar acuerdos anteriores
    await client.query(
      `UPDATE arreglos_pago SET activo = false WHERE prestamo_id = $1`,
      [id]
    );

    // 3. Insertar nuevo acuerdo
    await client.query(
      `INSERT INTO arreglos_pago (
        prestamo_id,
        monto_fijo_acordado,
        cuota_especial,
        nuevo_dia_cobro,
        nuevo_dia_mes_1,
        nuevo_dia_mes_2,
        activo
      ) VALUES ($1, $2, $3, $4, $5, $6, true);`,
      [
        id,
        montoFijoReal,
        cuotaEspecialNum,
        diaFijoAcordado,
        diaMes1Acordado,
        diaMes2Acordado
      ]
    );

    // 4. Calcular cuotas restantes necesarias para saldar el monto acordado
    const cuotasRestantes = Math.ceil(montoFijoReal / cuotaEspecialNum);

    const nowCR = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Costa_Rica',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const schedule = generateScheduleDates(
      nowCR,
      currentLoan.modalidad,
      diaFijoAcordado,
      diaMes1Acordado,
      diaMes2Acordado,
      cuotasRestantes
    );

    const nuevaFechaFinalStr = schedule[schedule.length - 1].fecha;

    // 5. Eliminar cuotas pendientes anteriores
    await client.query(
      `DELETE FROM agenda_cobros WHERE prestamo_id = $1 AND estado IN ('PENDIENTE', 'PASADO_DE_DIA')`,
      [id]
    );

    // 6. Insertar nuevas cuotas del arreglo
    let saldoPorDistribuir = montoFijoReal;
    for (let i = 0; i < schedule.length; i++) {
      const item = schedule[i];
      const montoCuotaThis = i === schedule.length - 1
        ? saldoPorDistribuir
        : Math.min(cuotaEspecialNum, saldoPorDistribuir);

      saldoPorDistribuir -= montoCuotaThis;

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
          $1, $2, $3, $4, $5, $5, $6, 0, $7, 0, 0, 'PENDIENTE'
        );`,
        [
          cobradorId,
          id,
          currentLoan.cliente_id,
          item.numero_cobro,
          item.fecha,
          item.dia_semana,
          montoCuotaThis
        ]
      );
    }

    // 7. Actualizar préstamo
    const updatedPrestamoRes = await client.query(
      `UPDATE prestamos SET
        estado = 'ARREGLO_PAGO',
        saldo_por_pagar = $1,
        cuota = $2,
        periodos_atrasados_acumulados = 0,
        dia_fijo_original = $3,
        dia_mes_1 = $4,
        dia_mes_2 = $5,
        fecha_final = $6,
        total_periodos = $7,
        periodos_pendientes = $7,
        version = version + 1,
        actualizado_en = now()
      WHERE id = $8
      RETURNING *;`,
      [
        montoFijoReal,
        cuotaEspecialNum,
        diaFijoAcordado,
        diaMes1Acordado,
        diaMes2Acordado,
        nuevaFechaFinalStr,
        cuotasRestantes,
        id
      ]
    );

    // 8. Bitácora de actividad
    await client.query(
      `INSERT INTO bitacora_actividad (
        usuario_id,
        cobrador_id,
        accion,
        entidad,
        entidad_id,
        cedula,
        detalle
      ) VALUES ($1, $2, 'ARREGLO_PAGO_CREADO', 'prestamos', $3, $4, $5);`,
      [
        cobradorId,
        cobradorId,
        id,
        currentLoan.cedula,
        JSON.stringify({
          prestamo_id: id,
          cliente: `${currentLoan.nombre} ${currentLoan.apellidos}`.trim(),
          monto_fijo_acordado: montoFijoReal,
          cuota_especial: cuotaEspecialNum,
          cuotas_acordadas: cuotasRestantes
        })
      ]
    );

    await client.query('COMMIT');
    return res.json(updatedPrestamoRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Préstamos] Error al crear arreglo de pago:', err);
    return res.status(500).json({ error: err.message || 'Error interno al registrar el arreglo de pago.' });
  } finally {
    client.release();
  }
}
