import { pool } from '../config/db.js';

const ESTADO_PRESTAMO_VALIDOS = new Set([
  'ACTIVO',
  'ATRASADO',
  'ARREGLO_PAGO',
  'LIQUIDADO',
  'RENOVADO',
  'SUSPENDIDO',
  'CANCELADO',
]);

function formatPgDateYMD(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return null;
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function normalizeJsonArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

export function resolveCategoriaPreviaPrestamo(loanRow, agendaRows = [], fechaHoyCR = null) {
  const saldo = Number(loanRow?.saldo_por_pagar ?? 0);
  const estado = String(loanRow?.estado || '').toUpperCase();
  const estadoPrevio = String(loanRow?.estado_previo_suspension || '').toUpperCase();

  if (
    saldo <= 0 ||
    ['LIQUIDADO', 'RENOVADO', 'CANCELADO'].includes(estado) ||
    ['LIQUIDADO', 'RENOVADO', 'CANCELADO'].includes(estadoPrevio)
  ) {
    return 'REGISTRADO';
  }

  const tieneAtrasoAgenda = agendaRows.some((a) => {
    const estadoCuota = String(a?.estado || '').toUpperCase();
    const fechaCobro = formatPgDateYMD(a?.fecha_cobro_actual);
    return (
      estadoCuota === 'PASADO_DE_DIA' ||
      Number(a?.veces_pasado || 0) > 0 ||
      (estadoCuota === 'PENDIENTE' && fechaHoyCR && fechaCobro && fechaCobro < fechaHoyCR)
    );
  });

  if (
    estado === 'ATRASADO' ||
    estadoPrevio === 'ATRASADO' ||
    Number(loanRow?.periodos_atrasados_acumulados || 0) > 0 ||
    tieneAtrasoAgenda
  ) {
    return 'ATRASADO';
  }

  return 'PENDIENTE';
}

export async function snapshotPrestamoToBaneado(
  client,
  { loanRow, clienteRow, origenPapelera = 'PRESTAMO_ELIMINADO', fechaHoyCR = null }
) {
  const prestamoId = loanRow.id;
  const [agendaRes, pagosRes, arreglosRes, renovRes, histRes] = await Promise.all([
    client.query(
      `SELECT id, cobrador_id, prestamo_id, cliente_id, numero_cobro,
              to_char(fecha_programada_original, 'YYYY-MM-DD') AS fecha_programada_original,
              to_char(fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_cobro_actual,
              dia_semana_actual, veces_pasado, monto_cuota, monto_moratoria,
              monto_total_cobrado, estado, fecha_hora_registro_pago,
              to_char(fecha_proximo_cobro, 'YYYY-MM-DD') AS fecha_proximo_cobro,
              version
       FROM agenda_cobros
       WHERE prestamo_id = $1::uuid
       ORDER BY numero_cobro ASC`,
      [prestamoId]
    ),
    client.query(
      `SELECT id, cobrador_id, prestamo_id, agenda_cobro_id, registrado_por,
              tipo, monto_cobrado, monto_moratoria, periodos_cubiertos,
              fecha_hora_pago, sincronizado_en
       FROM pagos_prestamo
       WHERE prestamo_id = $1::uuid
       ORDER BY fecha_hora_pago ASC`,
      [prestamoId]
    ),
    client.query(
      `SELECT id, prestamo_id, monto_fijo_acordado, cuota_especial,
              nuevo_dia_cobro, nuevo_dia_mes_1, nuevo_dia_mes_2, activo,
              to_char(fecha_acuerdo, 'YYYY-MM-DD') AS fecha_acuerdo
       FROM arreglos_pago
       WHERE prestamo_id = $1::uuid
       ORDER BY fecha_acuerdo ASC`,
      [prestamoId]
    ),
    client.query(
      `SELECT id, prestamo_id, monto_anterior, monto_nuevo, cuota_anterior, cuota_nueva,
              to_char(fecha_final_anterior, 'YYYY-MM-DD') AS fecha_final_anterior,
              to_char(fecha_final_nueva, 'YYYY-MM-DD') AS fecha_final_nueva,
              fecha_renovacion
       FROM renovaciones_prestamo
       WHERE prestamo_id = $1::uuid
       ORDER BY fecha_renovacion ASC`,
      [prestamoId]
    ),
    client.query(
      `SELECT id, agenda_cobro_id, prestamo_id,
              to_char(fecha_anterior, 'YYYY-MM-DD') AS fecha_anterior,
              to_char(fecha_nueva, 'YYYY-MM-DD') AS fecha_nueva,
              numero_reprogramacion, creado_en
       FROM historial_pasar_dia
       WHERE prestamo_id = $1::uuid
       ORDER BY creado_en ASC`,
      [prestamoId]
    ),
  ]);

  let hoyCR = fechaHoyCR;
  if (!hoyCR) {
    const fechaRes = await client.query(
      `SELECT to_char((now() AT TIME ZONE 'America/Costa_Rica')::date, 'YYYY-MM-DD') AS hoy`
    );
    hoyCR = fechaRes.rows[0]?.hoy || null;
  }

  const categoriaPrevia = resolveCategoriaPreviaPrestamo(loanRow, agendaRes.rows, hoyCR);
  const estadoPrevioRaw = String(
    loanRow.estado_previo_suspension || loanRow.estado || 'ACTIVO'
  ).toUpperCase();
  const estadoPrevio = ESTADO_PRESTAMO_VALIDOS.has(estadoPrevioRaw) && estadoPrevioRaw !== 'SUSPENDIDO'
    ? estadoPrevioRaw
    : categoriaPrevia === 'ATRASADO'
      ? 'ATRASADO'
      : categoriaPrevia === 'REGISTRADO' && Number(loanRow.saldo_por_pagar ?? 0) <= 0
        ? 'LIQUIDADO'
        : 'ACTIVO';

  const datosPrestamo = {
    id: loanRow.id,
    cobrador_id: loanRow.cobrador_id,
    cliente_id: loanRow.cliente_id,
    monto_prestado: Number(loanRow.monto_prestado ?? 0),
    porcentaje_interes: Number(loanRow.porcentaje_interes ?? 0),
    monto_total_financiar: Number(loanRow.monto_total_financiar ?? 0),
    monto_pagado_acumulado: Number(loanRow.monto_pagado_acumulado ?? 0),
    saldo_por_pagar: Number(loanRow.saldo_por_pagar ?? 0),
    cuota: Number(loanRow.cuota ?? 0),
    modalidad: loanRow.modalidad,
    dia_fijo_original: loanRow.dia_fijo_original || null,
    dia_mes_1: loanRow.dia_mes_1 ?? null,
    dia_mes_2: loanRow.dia_mes_2 ?? null,
    fecha_inicio: formatPgDateYMD(loanRow.fecha_inicio),
    fecha_final: formatPgDateYMD(loanRow.fecha_final),
    total_periodos: Number(loanRow.total_periodos ?? 0),
    periodos_pagados: Number(loanRow.periodos_pagados ?? 0),
    periodos_pendientes: Number(
      loanRow.periodos_pendientes ??
        Math.max(0, Number(loanRow.total_periodos ?? 0) - Number(loanRow.periodos_pagados ?? 0))
    ),
    periodos_atrasados_acumulados: Number(loanRow.periodos_atrasados_acumulados ?? 0),
    estado: estadoPrevio,
    estado_previo_suspension: loanRow.estado_previo_suspension || null,
    version: Number(loanRow.version ?? 1),
    creado_en: loanRow.creado_en || new Date().toISOString(),
  };

  await client.query(
    `INSERT INTO prestamos_baneados (
       id, cobrador_id, cliente_id, cliente_nombre, cliente_apellidos,
       cliente_cedula, cliente_telefono, origen_papelera, categoria_previa,
       monto_prestado, porcentaje_interes, monto_total_financiar,
       monto_pagado_acumulado, saldo_por_pagar, cuota, modalidad,
       fecha_inicio, fecha_final, estado_previo,
       periodos_pagados, total_periodos, periodos_atrasados_acumulados,
       fecha_envio_papelera, fecha_borrado_definitivo,
       datos_prestamo_json, respaldo_agenda_cobros, respaldo_pagos,
       respaldo_arreglos, respaldo_renovaciones, respaldo_historial_pasar_dia
     ) VALUES (
       $1::uuid, $2::uuid, $3::uuid, $4, $5,
       $6, $7, $8, $9,
       $10, $11, $12,
       $13, $14, $15, $16::public.modalidad_prestamo,
       $17::date, $18::date, $19,
       $20, $21, $22,
       now(), now() + interval '30 days',
       $23::jsonb, $24::jsonb, $25::jsonb,
       $26::jsonb, $27::jsonb, $28::jsonb
     )
     ON CONFLICT (id) DO UPDATE SET
       cliente_nombre = EXCLUDED.cliente_nombre,
       cliente_apellidos = EXCLUDED.cliente_apellidos,
       cliente_cedula = EXCLUDED.cliente_cedula,
       cliente_telefono = EXCLUDED.cliente_telefono,
       origen_papelera = CASE
         WHEN prestamos_baneados.origen_papelera = 'PRESTAMO_ELIMINADO'
         THEN 'PRESTAMO_ELIMINADO'
         ELSE EXCLUDED.origen_papelera
       END,
       categoria_previa = EXCLUDED.categoria_previa,
       monto_prestado = EXCLUDED.monto_prestado,
       porcentaje_interes = EXCLUDED.porcentaje_interes,
       monto_total_financiar = EXCLUDED.monto_total_financiar,
       monto_pagado_acumulado = EXCLUDED.monto_pagado_acumulado,
       saldo_por_pagar = EXCLUDED.saldo_por_pagar,
       cuota = EXCLUDED.cuota,
       modalidad = EXCLUDED.modalidad,
       fecha_inicio = EXCLUDED.fecha_inicio,
       fecha_final = EXCLUDED.fecha_final,
       estado_previo = EXCLUDED.estado_previo,
       periodos_pagados = EXCLUDED.periodos_pagados,
       total_periodos = EXCLUDED.total_periodos,
       periodos_atrasados_acumulados = EXCLUDED.periodos_atrasados_acumulados,
       datos_prestamo_json = EXCLUDED.datos_prestamo_json,
       respaldo_agenda_cobros = EXCLUDED.respaldo_agenda_cobros,
       respaldo_pagos = EXCLUDED.respaldo_pagos,
       respaldo_arreglos = EXCLUDED.respaldo_arreglos,
       respaldo_renovaciones = EXCLUDED.respaldo_renovaciones,
       respaldo_historial_pasar_dia = EXCLUDED.respaldo_historial_pasar_dia`,
    [
      loanRow.id,
      loanRow.cobrador_id,
      loanRow.cliente_id,
      clienteRow?.nombre || '',
      clienteRow?.apellidos || '',
      clienteRow?.cedula || null,
      clienteRow?.telefono || '',
      origenPapelera,
      categoriaPrevia,
      Number(loanRow.monto_prestado ?? 0),
      Number(loanRow.porcentaje_interes ?? 0),
      Number(loanRow.monto_total_financiar ?? 0),
      Number(loanRow.monto_pagado_acumulado ?? 0),
      Number(loanRow.saldo_por_pagar ?? 0),
      Number(loanRow.cuota ?? 0),
      loanRow.modalidad,
      formatPgDateYMD(loanRow.fecha_inicio),
      formatPgDateYMD(loanRow.fecha_final),
      estadoPrevio,
      Number(loanRow.periodos_pagados ?? 0),
      Number(loanRow.total_periodos ?? 0),
      Number(loanRow.periodos_atrasados_acumulados ?? 0),
      JSON.stringify(datosPrestamo),
      JSON.stringify(agendaRes.rows || []),
      JSON.stringify(pagosRes.rows || []),
      JSON.stringify(arreglosRes.rows || []),
      JSON.stringify(renovRes.rows || []),
      JSON.stringify(histRes.rows || []),
    ]
  );
}

export async function restorePrestamoFromBaneado(client, baneadoRow) {
  const d = normalizeJsonObject(baneadoRow.datos_prestamo_json);
  const modalidad = d.modalidad || baneadoRow.modalidad || 'SEMANAL';
  const totalPeriodos = Number(d.total_periodos ?? baneadoRow.total_periodos ?? 1);
  const periodosPagados = Number(d.periodos_pagados ?? baneadoRow.periodos_pagados ?? 0);
  const periodosPendientes = Number(
    d.periodos_pendientes ?? Math.max(0, totalPeriodos - periodosPagados)
  );
  const diaFijoOriginal = d.dia_fijo_original || (d.dia_mes_1 ? null : 'LUNES');
  const diaMes1 = d.dia_mes_1 ?? null;
  const diaMes2 = d.dia_mes_2 ?? null;
  const fechaInicio = formatPgDateYMD(d.fecha_inicio || baneadoRow.fecha_inicio);
  const fechaFinalRaw = formatPgDateYMD(d.fecha_final || baneadoRow.fecha_final);
  const fechaFinal = fechaFinalRaw >= fechaInicio ? fechaFinalRaw : fechaInicio;

  let estadoRestaurado = String(
    d.estado_previo_suspension || d.estado || baneadoRow.estado_previo || 'ACTIVO'
  ).toUpperCase();
  if (!ESTADO_PRESTAMO_VALIDOS.has(estadoRestaurado) || estadoRestaurado === 'SUSPENDIDO') {
    estadoRestaurado =
      Number(baneadoRow.saldo_por_pagar ?? 0) <= 0
        ? 'LIQUIDADO'
        : Number(baneadoRow.periodos_atrasados_acumulados ?? 0) > 0
          ? 'ATRASADO'
          : 'ACTIVO';
  }

  await client.query(
    `INSERT INTO prestamos (
       id, cobrador_id, cliente_id, monto_prestado, porcentaje_interes,
       monto_total_financiar, monto_pagado_acumulado, saldo_por_pagar, cuota,
       modalidad, dia_fijo_original, dia_mes_1, dia_mes_2,
       fecha_inicio, fecha_final, total_periodos, periodos_pagados,
       periodos_pendientes, periodos_atrasados_acumulados, estado,
       estado_previo_suspension, version, creado_en, actualizado_en
     ) VALUES (
       $1::uuid, $2::uuid, $3::uuid, $4, $5,
       $6, $7, $8, $9,
       $10::public.modalidad_prestamo, $11::public.dia_semana, $12, $13,
       $14::date, $15::date, $16, $17,
       $18, $19, $20::public.estado_prestamo,
       NULL, $21, COALESCE($22::timestamptz, now()), now()
     )
     ON CONFLICT (id) DO NOTHING`,
    [
      baneadoRow.id,
      baneadoRow.cobrador_id,
      baneadoRow.cliente_id,
      Number(d.monto_prestado ?? baneadoRow.monto_prestado ?? 0),
      Number(d.porcentaje_interes ?? baneadoRow.porcentaje_interes ?? 0),
      Number(d.monto_total_financiar ?? baneadoRow.monto_total_financiar ?? 0),
      Number(d.monto_pagado_acumulado ?? baneadoRow.monto_pagado_acumulado ?? 0),
      Math.max(0, Number(d.saldo_por_pagar ?? baneadoRow.saldo_por_pagar ?? 0)),
      Number(d.cuota ?? baneadoRow.cuota ?? 0),
      modalidad,
      diaFijoOriginal,
      diaMes1,
      diaMes2,
      fechaInicio,
      fechaFinal,
      totalPeriodos,
      periodosPagados,
      periodosPendientes,
      Number(d.periodos_atrasados_acumulados ?? baneadoRow.periodos_atrasados_acumulados ?? 0),
      estadoRestaurado,
      Number(d.version ?? 1),
      d.creado_en || null,
    ]
  );

  const agendaRows = normalizeJsonArray(baneadoRow.respaldo_agenda_cobros);
  for (const ag of agendaRows) {
    await client.query(
      `INSERT INTO agenda_cobros (
         id, cobrador_id, prestamo_id, cliente_id, numero_cobro,
         fecha_programada_original, fecha_cobro_actual, dia_semana_actual,
         veces_pasado, monto_cuota, monto_moratoria, monto_total_cobrado,
         estado, fecha_hora_registro_pago, fecha_proximo_cobro, version
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5,
         $6::date, $7::date, $8::public.dia_semana,
         $9, $10, $11, $12,
         $13::public.estado_cuota_cobro, $14::timestamptz, $15::date, $16
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        ag.id,
        ag.cobrador_id || baneadoRow.cobrador_id,
        ag.prestamo_id || baneadoRow.id,
        ag.cliente_id || baneadoRow.cliente_id,
        Number(ag.numero_cobro ?? 1),
        formatPgDateYMD(ag.fecha_programada_original || fechaInicio),
        formatPgDateYMD(ag.fecha_cobro_actual || fechaInicio),
        ag.dia_semana_actual || diaFijoOriginal || 'LUNES',
        Number(ag.veces_pasado ?? 0),
        Number(ag.monto_cuota ?? baneadoRow.cuota ?? 0),
        Number(ag.monto_moratoria ?? 0),
        Number(ag.monto_total_cobrado ?? 0),
        ag.estado || 'PENDIENTE',
        ag.fecha_hora_registro_pago || null,
        ag.fecha_proximo_cobro ? formatPgDateYMD(ag.fecha_proximo_cobro) : null,
        Number(ag.version ?? 1),
      ]
    );
  }

  const arreglosRows = normalizeJsonArray(baneadoRow.respaldo_arreglos);
  for (const ar of arreglosRows) {
    await client.query(
      `INSERT INTO arreglos_pago (
         id, prestamo_id, monto_fijo_acordado, cuota_especial,
         nuevo_dia_cobro, nuevo_dia_mes_1, nuevo_dia_mes_2, activo, fecha_acuerdo
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4,
         $5::public.dia_semana, $6, $7, $8, COALESCE($9::date, CURRENT_DATE)
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        ar.id,
        ar.prestamo_id || baneadoRow.id,
        Number(ar.monto_fijo_acordado ?? 0),
        Number(ar.cuota_especial ?? 0),
        ar.nuevo_dia_cobro || null,
        ar.nuevo_dia_mes_1 ?? null,
        ar.nuevo_dia_mes_2 ?? null,
        ar.activo !== undefined ? Boolean(ar.activo) : true,
        ar.fecha_acuerdo ? formatPgDateYMD(ar.fecha_acuerdo) : null,
      ]
    );
  }

  const renovRows = normalizeJsonArray(baneadoRow.respaldo_renovaciones);
  for (const rv of renovRows) {
    await client.query(
      `INSERT INTO renovaciones_prestamo (
         id, prestamo_id, monto_anterior, monto_nuevo, cuota_anterior, cuota_nueva,
         fecha_final_anterior, fecha_final_nueva, fecha_renovacion
       ) VALUES (
         $1::uuid, $2::uuid, $3, $4, $5, $6,
         $7::date, $8::date, COALESCE($9::timestamptz, now())
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        rv.id,
        rv.prestamo_id || baneadoRow.id,
        Number(rv.monto_anterior ?? 0),
        Number(rv.monto_nuevo ?? 0),
        Number(rv.cuota_anterior ?? 0),
        Number(rv.cuota_nueva ?? 0),
        formatPgDateYMD(rv.fecha_final_anterior || fechaInicio),
        formatPgDateYMD(rv.fecha_final_nueva || fechaFinal),
        rv.fecha_renovacion || null,
      ]
    );
  }

  const pagosRows = normalizeJsonArray(baneadoRow.respaldo_pagos);
  for (const pgRow of pagosRows) {
    await client.query(
      `INSERT INTO pagos_prestamo (
         id, cobrador_id, prestamo_id, agenda_cobro_id, registrado_por,
         tipo, monto_cobrado, monto_moratoria, periodos_cubiertos,
         fecha_hora_pago, sincronizado_en
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid,
         $6::public.tipo_pago, $7, $8, $9,
         COALESCE($10::timestamptz, now()), COALESCE($11::timestamptz, now())
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        pgRow.id,
        pgRow.cobrador_id || baneadoRow.cobrador_id,
        pgRow.prestamo_id || baneadoRow.id,
        pgRow.agenda_cobro_id || null,
        pgRow.registrado_por || null,
        pgRow.tipo || 'COBRO_NORMAL',
        Number(pgRow.monto_cobrado ?? 0),
        Number(pgRow.monto_moratoria ?? 0),
        Number(pgRow.periodos_cubiertos ?? 1),
        pgRow.fecha_hora_pago || null,
        pgRow.sincronizado_en || null,
      ]
    );
  }

  const histRows = normalizeJsonArray(baneadoRow.respaldo_historial_pasar_dia);
  for (const hp of histRows) {
    await client.query(
      `INSERT INTO historial_pasar_dia (
         id, agenda_cobro_id, prestamo_id, fecha_anterior, fecha_nueva,
         numero_reprogramacion, creado_en
       ) VALUES (
         $1::uuid, $2::uuid, $3::uuid, $4::date, $5::date,
         $6, COALESCE($7::timestamptz, now())
       )
       ON CONFLICT (id) DO NOTHING`,
      [
        hp.id,
        hp.agenda_cobro_id,
        hp.prestamo_id || baneadoRow.id,
        formatPgDateYMD(hp.fecha_anterior || fechaInicio),
        formatPgDateYMD(hp.fecha_nueva || fechaInicio),
        Number(hp.numero_reprogramacion ?? 1),
        hp.creado_en || null,
      ]
    );
  }

  await client.query('DELETE FROM prestamos_baneados WHERE id = $1::uuid', [baneadoRow.id]);
}

export async function restoreClienteFromBaneadoRow(client, c) {
  await client.query(
    `INSERT INTO clientes (
       id, cobrador_id, cedula, nombre, apellidos, telefono, telefono_secundario,
       ubicacion, detalles, estado, fecha_envio_papelera, fecha_borrado_definitivo,
       version, creado_en, actualizado_en
     ) VALUES (
       $1::uuid, $2::uuid, $3, $4, $5, $6, $7,
       $8, $9, 'ACTIVO', NULL, NULL,
       COALESCE($10, 1) + 1, COALESCE($11, now()), now()
     )
     ON CONFLICT (id) DO UPDATE SET
       estado = 'ACTIVO',
       fecha_envio_papelera = NULL,
       fecha_borrado_definitivo = NULL,
       actualizado_en = now()`,
    [
      c.id,
      c.cobrador_id,
      c.cedula || null,
      c.nombre,
      c.apellidos || null,
      c.telefono || '',
      c.telefono_secundario || null,
      c.ubicacion || '',
      c.detalles || null,
      c.version || 1,
      c.creado_originalmente_en || new Date().toISOString(),
    ]
  );

  await client.query('DELETE FROM clientes_baneados WHERE id = $1::uuid', [c.id]);
}

function normalizeNameMatch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function toSafeNumber(val, fallback = 0) {
  if (val === undefined || val === null || val === '') return fallback;
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

let historialSchemaPromise = null;

export async function ensureHistorialArchivoSchema() {
  if (!historialSchemaPromise) {
    historialSchemaPromise = (async () => {
      await pool.query(`
        ALTER TABLE historial_clientes_archivo
          ADD COLUMN IF NOT EXISTS telefono_secundario varchar(40),
          ADD COLUMN IF NOT EXISTS ubicacion text,
          ADD COLUMN IF NOT EXISTS detalles text,
          ADD COLUMN IF NOT EXISTS total_prestamos_archivados integer NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS total_prestado_historico numeric(14,2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS total_pagado_historico numeric(14,2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS saldo_impago_historico numeric(14,2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS atrasos_acumulados_historico integer NOT NULL DEFAULT 0;
      `);

      await pool.query(`
        ALTER TABLE historial_prestamos_archivo
          ADD COLUMN IF NOT EXISTS monto_total_financiar numeric(14,2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS cuota numeric(14,2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS monto_pagado_acumulado numeric(14,2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS saldo_por_pagar numeric(14,2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS total_periodos integer NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS periodos_pagados integer NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS periodos_atrasados_acumulados integer NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS modalidad varchar(30),
          ADD COLUMN IF NOT EXISTS estado_al_eliminar varchar(30);
      `);
    })().catch((err) => {
      historialSchemaPromise = null;
      throw err;
    });
  }
  return historialSchemaPromise;
}

export async function syncArchivoClienteTotals(client, archivoId) {
  if (!archivoId) return;
  await client.query(
    `UPDATE historial_clientes_archivo hca
     SET
       total_prestamos_archivados = agg.cnt,
       total_prestado_historico = agg.sum_prestado,
       total_pagado_historico = agg.sum_pagado,
       saldo_impago_historico = agg.sum_saldo,
       atrasos_acumulados_historico = agg.sum_atrasos
     FROM (
       SELECT
         COUNT(*)::int AS cnt,
         COALESCE(SUM(monto_prestado), 0)::numeric(14,2) AS sum_prestado,
         COALESCE(SUM(
           CASE
             WHEN estado_al_eliminar IS NOT NULL THEN monto_pagado_acumulado
             ELSE COALESCE(monto_pagado, monto_pagado_acumulado, 0)
           END
         ), 0)::numeric(14,2) AS sum_pagado,
         COALESCE(SUM(
           CASE
             WHEN estado_al_eliminar IS NOT NULL THEN saldo_por_pagar
             ELSE COALESCE(saldo_pendiente, saldo_por_pagar, 0)
           END
         ), 0)::numeric(14,2) AS sum_saldo,
         COALESCE(SUM(GREATEST(COALESCE(periodos_atrasados_acumulados, 0), 0)), 0)::int AS sum_atrasos
       FROM historial_prestamos_archivo
       WHERE archivo_id = $1::uuid
     ) agg
     WHERE hca.id = $1::uuid;`,
    [archivoId]
  );
}

export async function ensureArchivoCliente(
  client,
  {
    cobradorId,
    cedula,
    nombre,
    apellidos,
    telefono,
    telefonoSecundario = null,
    ubicacion,
    detalles,
    clienteIdActual = null,
  }
) {
  const cedulaClean = cedula && String(cedula).trim() !== '' ? String(cedula).trim() : null;
  const telSecClean =
    telefonoSecundario && String(telefonoSecundario).trim() !== ''
      ? String(telefonoSecundario).trim()
      : null;

  if (cedulaClean) {
    const res = await client.query(
      `INSERT INTO historial_clientes_archivo
         (cobrador_id, cedula, nombre, apellidos, telefono, telefono_secundario,
          ubicacion, detalles, fecha_eliminacion, fecha_expiracion, cliente_id_actual)
       VALUES
         ($1::uuid, $2, $3, $4, $5, $6,
          $7, $8, now(), now() + interval '5 months', $9::uuid)
       ON CONFLICT (cobrador_id, cedula) DO UPDATE
         SET nombre = EXCLUDED.nombre,
             apellidos = EXCLUDED.apellidos,
             telefono = COALESCE(EXCLUDED.telefono, historial_clientes_archivo.telefono),
             telefono_secundario = COALESCE(EXCLUDED.telefono_secundario, historial_clientes_archivo.telefono_secundario),
             ubicacion = COALESCE(EXCLUDED.ubicacion, historial_clientes_archivo.ubicacion),
             detalles = COALESCE(EXCLUDED.detalles, historial_clientes_archivo.detalles),
             fecha_eliminacion = now(),
             fecha_expiracion = now() + interval '5 months',
             cliente_id_actual = $9::uuid
       RETURNING id`,
      [
        cobradorId,
        cedulaClean,
        nombre || 'Cliente',
        apellidos || null,
        telefono || null,
        telSecClean,
        ubicacion || null,
        detalles || null,
        clienteIdActual,
      ]
    );
    return res.rows[0].id;
  }

  // Para clientes extranjeros sin cédula, unificar por nombre y apellidos normalizados si ya existían en archivo
  const existingForeignRes = await client.query(
    `SELECT id, nombre, apellidos
     FROM historial_clientes_archivo
     WHERE cobrador_id = $1::uuid
       AND cedula IS NULL
     ORDER BY fecha_eliminacion DESC`,
    [cobradorId]
  );
  const targetNom = normalizeNameMatch(nombre || 'Cliente');
  const targetApe = normalizeNameMatch(apellidos || '');
  const matchedForeign = existingForeignRes.rows.find(
    (r) => normalizeNameMatch(r.nombre) === targetNom && normalizeNameMatch(r.apellidos) === targetApe
  );

  if (matchedForeign) {
    await client.query(
      `UPDATE historial_clientes_archivo
       SET nombre = $2,
           apellidos = $3,
           telefono = COALESCE($4, telefono),
           telefono_secundario = COALESCE($5, telefono_secundario),
           ubicacion = COALESCE($6, ubicacion),
           detalles = COALESCE($7, detalles),
           fecha_eliminacion = now(),
           fecha_expiracion = now() + interval '5 months',
           cliente_id_actual = $8::uuid
       WHERE id = $1::uuid`,
      [
        matchedForeign.id,
        nombre || 'Cliente',
        apellidos || null,
        telefono || null,
        telSecClean,
        ubicacion || null,
        detalles || null,
        clienteIdActual,
      ]
    );
    return matchedForeign.id;
  }

  const res = await client.query(
    `INSERT INTO historial_clientes_archivo
       (cobrador_id, cedula, nombre, apellidos, telefono, telefono_secundario,
        ubicacion, detalles, fecha_eliminacion, fecha_expiracion, cliente_id_actual)
     VALUES
       ($1::uuid, NULL, $2, $3, $4, $5,
        $6, $7, now(), now() + interval '5 months', $8::uuid)
     RETURNING id`,
    [
      cobradorId,
      nombre || 'Cliente',
      apellidos || null,
      telefono || null,
      telSecClean,
      ubicacion || null,
      detalles || null,
      clienteIdActual,
    ]
  );
  return res.rows[0].id;
}

export async function archivePrestamoBaneado(client, archivoId, b) {
  const agendaRows = normalizeJsonArray(b.respaldo_agenda_cobros);
  const pagosRows = normalizeJsonArray(b.respaldo_pagos);

  const vecesPasadoTotal = agendaRows.reduce((acc, a) => acc + toSafeNumber(a?.veces_pasado, 0), 0);
  const totalMoratorias = pagosRows.reduce((acc, p) => acc + toSafeNumber(p?.monto_moratoria, 0), 0);
  const pagosDetalle = pagosRows.map((g) => ({
    fecha: g.fecha_hora_pago || null,
    monto: toSafeNumber(g.monto_cobrado, 0),
    moratoria: toSafeNumber(g.monto_moratoria, 0),
    tipo: g.tipo || 'COBRO_NORMAL',
  }));

  const rawEstado = String(b.estado_previo || 'ACTIVO').toUpperCase();
  const estadoFinal = ESTADO_PRESTAMO_VALIDOS.has(rawEstado) ? rawEstado : 'ACTIVO';

  const montoPrestado = toSafeNumber(b.monto_prestado, 0);
  const porcentajeInteres = toSafeNumber(b.porcentaje_interes, 0);
  const montoTotalFinanciar = toSafeNumber(b.monto_total_financiar, 0);
  const montoPagadoAcumulado = toSafeNumber(b.monto_pagado_acumulado, 0);
  const saldoPorPagar = toSafeNumber(b.saldo_por_pagar, 0);
  const cuotaVal = toSafeNumber(b.cuota, 0);
  const periodosPagados = toSafeNumber(b.periodos_pagados, 0);
  const totalPeriodos = toSafeNumber(b.total_periodos, 0);
  const periodosAtrasados = toSafeNumber(b.periodos_atrasados_acumulados, 0);

  await client.query(
    `INSERT INTO historial_prestamos_archivo (
       archivo_id, prestamo_id_original, monto_prestado, porcentaje_interes,
       monto_total_financiar, monto_pagado, monto_pagado_acumulado,
       saldo_pendiente, saldo_por_pagar, cuota, modalidad,
       fecha_inicio, fecha_final, estado_final, estado_al_eliminar,
       periodos_pagados, total_periodos, periodos_atrasados_acumulados,
       veces_pasado_total, total_moratorias, pagos_detalle
     ) VALUES (
       $1::uuid, $2::uuid, $3, $4,
       $5, $6, $6,
       $7, $7, $8, $9::public.modalidad_prestamo,
       $10::date, $11::date, $12::public.estado_prestamo, $13,
       $14, $15, $16,
       $17, $18, $19::jsonb
     )`,
    [
      archivoId,
      b.id,
      montoPrestado,
      porcentajeInteres,
      montoTotalFinanciar,
      montoPagadoAcumulado,
      saldoPorPagar,
      cuotaVal,
      b.modalidad,
      formatPgDateYMD(b.fecha_inicio),
      formatPgDateYMD(b.fecha_final),
      estadoFinal,
      estadoFinal,
      periodosPagados,
      totalPeriodos,
      periodosAtrasados,
      vecesPasadoTotal,
      totalMoratorias,
      JSON.stringify(pagosDetalle),
    ]
  );

  await syncArchivoClienteTotals(client, archivoId);
}

export async function purgeExpiredPapeleraForCobrador(client, cobradorId) {
  // 1. Clientes expirados en clientes_baneados
  const expiredClients = await client.query(
    `SELECT * FROM clientes_baneados
     WHERE cobrador_id = $1::uuid AND fecha_borrado_definitivo <= now()
     FOR UPDATE`,
    [cobradorId]
  );

  for (const c of expiredClients.rows) {
    const archivoId = await ensureArchivoCliente(client, {
      cobradorId,
      cedula: c.cedula,
      nombre: c.nombre,
      apellidos: c.apellidos,
      telefono: c.telefono,
      telefonoSecundario: c.telefono_secundario ?? null,
      ubicacion: c.ubicacion,
      detalles: c.detalles,
      clienteIdActual: null,
    });

    const loansOfClient = await client.query(
      `SELECT * FROM prestamos_baneados
       WHERE cliente_id = $1::uuid AND cobrador_id = $2::uuid
       FOR UPDATE`,
      [c.id, cobradorId]
    );
    for (const loan of loansOfClient.rows) {
      await archivePrestamoBaneado(client, archivoId, loan);
    }
    await client.query(
      'DELETE FROM prestamos_baneados WHERE cliente_id = $1::uuid AND cobrador_id = $2::uuid',
      [c.id, cobradorId]
    );
    await client.query('DELETE FROM clientes_baneados WHERE id = $1::uuid', [c.id]);
  }

  // 2. Préstamos individuales expirados en prestamos_baneados
  const expiredLoans = await client.query(
    `SELECT * FROM prestamos_baneados
     WHERE cobrador_id = $1::uuid AND fecha_borrado_definitivo <= now()
     FOR UPDATE`,
    [cobradorId]
  );

  if (expiredLoans.rows.length > 0) {
    const clienteIds = [...new Set(expiredLoans.rows.map((r) => r.cliente_id))];
    const activosRes = await client.query(
      `SELECT id, cedula, nombre, apellidos, telefono, telefono_secundario, ubicacion, detalles
       FROM clientes WHERE id = ANY($1::uuid[]) AND cobrador_id = $2::uuid`,
      [clienteIds, cobradorId]
    );
    const activosMap = new Map(activosRes.rows.map((r) => [r.id, r]));

    for (const loan of expiredLoans.rows) {
      const cli = activosMap.get(loan.cliente_id);
      const archivoId = await ensureArchivoCliente(client, {
        cobradorId,
        cedula: cli?.cedula ?? loan.cliente_cedula,
        nombre: cli?.nombre ?? loan.cliente_nombre,
        apellidos: cli?.apellidos ?? loan.cliente_apellidos,
        telefono: cli?.telefono ?? loan.cliente_telefono,
        telefonoSecundario: cli?.telefono_secundario ?? null,
        ubicacion: cli?.ubicacion ?? null,
        detalles: cli?.detalles ?? null,
        clienteIdActual: cli ? cli.id : null,
      });
      await archivePrestamoBaneado(client, archivoId, loan);
      await client.query('DELETE FROM prestamos_baneados WHERE id = $1::uuid', [loan.id]);
    }
  }
}
