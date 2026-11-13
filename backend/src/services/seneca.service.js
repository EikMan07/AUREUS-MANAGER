import { query } from '../config/db.js';
import { getDefaultCobradorId } from './seedService.js';
import { getAiConfig } from '../config/env.js';
import { buildSenecaSystemPrompt } from '../prompts/seneca.prompt.js';
import { consultarGroq } from './groq.service.js';
import {
  formatearColones,
  normalizarRespuestaSeneca,
  sanitizarTextoVisible,
} from '../schemas/seneca.schema.js';

const DIAS_ESPANOL = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

const WEEKDAYS_LIST = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const STOPWORDS = new Set([
  'para', 'como', 'esta', 'este', 'estos', 'estas', 'cuanto', 'cuantos', 'cuantas',
  'quien', 'quienes', 'cual', 'cuales', 'donde', 'cuando', 'sobre', 'entre', 'desde',
  'hasta', 'tiene', 'tienen', 'debe', 'deben', 'dinero', 'colones', 'cobro', 'cobros',
  'cliente', 'clientes', 'prestamo', 'prestamos', 'zona', 'zonas', 'ubicacion',
  'ubicaciones', 'atraso', 'atrasos', 'atrasado', 'atrasados', 'hola', 'seneca',
  'muestrame', 'dime', 'dame', 'quiero', 'saber', 'todos', 'todas', 'actualmente',
  'pendiente', 'pendientes', 'pagar', 'pago', 'pagos', 'lista', 'negra', 'papelera',
  'semana', 'mes', 'resumen', 'general', 'por', 'favor', 'cada', 'persona', 'faltan',
  'programados', 'tengo', 'hay', 'del', 'los', 'las', 'una', 'uno', 'con', 'sin',
  'telefono', 'celular', 'contacto', 'numero', 'historial', 'abonado', 'manana',
  'exactamente', 'registrado', 'registrados', 'detalle', 'cuotas', 'pagadas',
]);

function getTodayCostaRicaISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDaysISO(dateStr, days) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function getSpanishWeekdayFromISO(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return WEEKDAYS_LIST[dt.getUTCDay()] || 'Día';
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanPersonName(nombre, apellidos) {
  const parts = [nombre, apellidos]
    .map((part) => (part && String(part).trim().toLowerCase() !== 'null' ? String(part).trim() : ''))
    .filter(Boolean);
  return sanitizarTextoVisible(parts.join(' ')) || 'Cliente sin nombre';
}

function formatDiasCobro(prestamos) {
  const days = new Set();
  for (const p of prestamos) {
    if (p.dia_fijo_original && DIAS_ESPANOL[p.dia_fijo_original]) {
      days.add(DIAS_ESPANOL[p.dia_fijo_original]);
    } else if (p.dia_mes_1 && p.dia_mes_2) {
      days.add(`Días ${p.dia_mes_1} y ${p.dia_mes_2}`);
    }
  }
  return days.size > 0 ? Array.from(days).join(', ') : 'Según agenda';
}

/**
 * Ejecuta consultas de solo lectura (SELECT) sobre cobro_firme_db para construir
 * la radiografía financiera en vivo de zonas, clientes, cobros, próximos días,
 * teléfonos, atrasos, Lista Negra y Papelera.
 */
export async function obtenerRadiografiaCompleta(cobradorId) {
  const resolvedCobradorId = cobradorId || (await getDefaultCobradorId());
  const fechaHoyCR = getTodayCostaRicaISO();
  const fechaMananaCR = addDaysISO(fechaHoyCR, 1);
  const fechaLimite7Dias = addDaysISO(fechaHoyCR, 7);

  const sqlClientesPrestamos = `
    SELECT
      c.id AS cliente_id,
      c.cedula,
      c.nombre,
      c.apellidos,
      c.telefono,
      c.telefono_secundario,
      c.ubicacion,
      c.detalles,
      p.id AS prestamo_id,
      p.monto_prestado,
      p.monto_total_financiar,
      p.monto_pagado_acumulado,
      p.saldo_por_pagar,
      p.cuota,
      p.modalidad::text AS modalidad,
      p.dia_fijo_original::text AS dia_fijo_original,
      p.dia_mes_1,
      p.dia_mes_2,
      p.total_periodos,
      p.periodos_pagados,
      p.periodos_pendientes,
      p.periodos_atrasados_acumulados,
      p.estado::text AS estado_prestamo,
      COALESCE(ag.veces_pasado_total, 0)::int AS veces_pasado_prestamo,
      to_char(ag.proximo_cobro_fecha, 'YYYY-MM-DD') AS proximo_cobro_fecha
    FROM clientes c
    LEFT JOIN prestamos p
      ON p.cliente_id = c.id
      AND p.cobrador_id = $1
      AND p.estado IN (
        'ACTIVO'::public.estado_prestamo,
        'ATRASADO'::public.estado_prestamo,
        'ARREGLO_PAGO'::public.estado_prestamo,
        'RENOVADO'::public.estado_prestamo
      )
      AND p.saldo_por_pagar > 0
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(SUM(a.veces_pasado), 0)::int AS veces_pasado_total,
        MIN(
          CASE
            WHEN a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
            THEN a.fecha_cobro_actual
            ELSE NULL
          END
        ) AS proximo_cobro_fecha
      FROM agenda_cobros a
      WHERE a.prestamo_id = p.id
    ) ag ON true
    WHERE c.cobrador_id = $1
      AND c.estado = 'ACTIVO'::public.estado_cliente
    ORDER BY c.nombre ASC, c.apellidos ASC;
  `;

  const sqlAgendaPendienteRango = `
    SELECT
      a.id AS agenda_id,
      a.cliente_id,
      a.prestamo_id,
      to_char(a.fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_cobro_actual,
      (a.fecha_cobro_actual < $2::date) AS es_rezagado,
      (a.fecha_cobro_actual = $2::date) AS es_hoy_exacto,
      (a.fecha_cobro_actual <= (date_trunc('week', $2::date)::date + interval '6 days')::date) AS en_semana_actual,
      a.monto_cuota,
      a.veces_pasado,
      a.estado::text AS estado_cuota,
      c.nombre,
      c.apellidos,
      c.ubicacion,
      p.modalidad::text AS modalidad,
      p.saldo_por_pagar
    FROM agenda_cobros a
    JOIN prestamos p ON a.prestamo_id = p.id
    JOIN clientes c ON a.cliente_id = c.id
    WHERE a.cobrador_id = $1
      AND c.estado = 'ACTIVO'::public.estado_cliente
      AND p.estado IN (
        'ACTIVO'::public.estado_prestamo,
        'ATRASADO'::public.estado_prestamo,
        'ARREGLO_PAGO'::public.estado_prestamo,
        'RENOVADO'::public.estado_prestamo
      )
      AND a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
      AND a.fecha_cobro_actual <= GREATEST(
        (date_trunc('week', $2::date)::date + interval '6 days')::date,
        ($2::date + interval '7 days')::date
      )
    ORDER BY a.fecha_cobro_actual ASC, c.nombre ASC;
  `;

  const sqlRecaudadoHoy = `
    SELECT
      COUNT(a.id)::int AS cantidad_registrados,
      COALESCE(SUM(a.monto_total_cobrado), 0)::numeric AS monto_recaudado
    FROM agenda_cobros a
    WHERE a.cobrador_id = $1
      AND a.estado = 'REGISTRADO'::public.estado_cuota_cobro
      AND (
        (a.fecha_hora_registro_pago AT TIME ZONE 'America/Costa_Rica')::date = $2::date
        OR a.fecha_cobro_actual = $2::date
      );
  `;

  const sqlListaNegra = `
    SELECT
      id,
      cedula,
      nombre,
      apellidos,
      to_char(fecha_registro, 'YYYY-MM-DD') AS fecha_registro
    FROM lista_negra
    WHERE cobrador_id = $1
      AND activo = true
    ORDER BY fecha_registro DESC;
  `;

  const sqlClientesPapelera = `
    SELECT id, nombre, apellidos, cedula, ubicacion
    FROM clientes_baneados
    WHERE cobrador_id = $1
    ORDER BY fecha_envio_papelera DESC;
  `;

  const sqlPrestamosPapelera = `
    SELECT id, cliente_nombre, cliente_apellidos, monto_prestado, saldo_por_pagar
    FROM prestamos_baneados
    WHERE cobrador_id = $1
    ORDER BY fecha_envio_papelera DESC;
  `;

  const sqlArchivoEliminados = `
    SELECT
      hca.id,
      hca.cliente_id_actual,
      hca.cedula,
      TRIM(CONCAT_WS(' ', hca.nombre, NULLIF(hca.apellidos, ''))) AS nombre_completo,
      hca.telefono,
      hca.telefono_secundario,
      hca.ubicacion,
      hca.detalles,
      hca.fecha_eliminacion,
      GREATEST(COALESCE(hca.total_prestamos_archivados, 0), COUNT(hpa.id)::int) AS total_prestamos,
      GREATEST(COALESCE(hca.total_prestado_historico, 0), COALESCE(SUM(hpa.monto_prestado), 0))::numeric(14,2) AS total_prestado,
      GREATEST(COALESCE(hca.total_pagado_historico, 0), COALESCE(SUM(COALESCE(hpa.monto_pagado_acumulado, hpa.monto_pagado, 0)), 0))::numeric(14,2) AS total_pagado,
      GREATEST(COALESCE(hca.saldo_impago_historico, 0), COALESCE(SUM(COALESCE(hpa.saldo_por_pagar, hpa.saldo_pendiente, 0)), 0))::numeric(14,2) AS saldo_impago,
      GREATEST(COALESCE(hca.atrasos_acumulados_historico, 0), COALESCE(SUM(COALESCE(hpa.periodos_atrasados_acumulados, 0)), 0))::int AS atrasos_totales
    FROM historial_clientes_archivo hca
    LEFT JOIN historial_prestamos_archivo hpa
      ON hpa.archivo_id = hca.id
    WHERE hca.cobrador_id = $1::uuid
    GROUP BY hca.id
    ORDER BY hca.fecha_eliminacion DESC NULLS LAST, hca.creado_en DESC
    LIMIT 100
  `;

  const [
    resClientesPrestamos,
    resAgendaRango,
    resRecaudadoHoy,
    resListaNegra,
    resClientesPapelera,
    resPrestamosPapelera,
    resArchivoEliminados,
  ] = await Promise.all([
    query(sqlClientesPrestamos, [resolvedCobradorId]),
    query(sqlAgendaPendienteRango, [resolvedCobradorId, fechaHoyCR]),
    query(sqlRecaudadoHoy, [resolvedCobradorId, fechaHoyCR]),
    query(sqlListaNegra, [resolvedCobradorId]),
    query(sqlClientesPapelera, [resolvedCobradorId]),
    query(sqlPrestamosPapelera, [resolvedCobradorId]),
    query(sqlArchivoEliminados, [resolvedCobradorId]),
  ]);

  const clientMap = new Map();
  for (const row of resClientesPrestamos.rows) {
    if (!clientMap.has(row.cliente_id)) {
      clientMap.set(row.cliente_id, {
        cliente_id: row.cliente_id,
        nombre_completo: cleanPersonName(row.nombre, row.apellidos),
        cedula: row.cedula || '',
        telefono: row.telefono || '',
        telefono_secundario: row.telefono_secundario || '',
        ubicacion: sanitizarTextoVisible(row.ubicacion || 'Sin ubicación'),
        detalles: sanitizarTextoVisible(row.detalles || ''),
        prestamos: [],
        total_prestado: 0,
        total_pagado: 0,
        saldo_total_pendiente: 0,
        cuota_total: 0,
        cantidad_pagos_realizados: 0,
        total_cuotas_combinadas: 0,
        atrasos_acumulados: 0,
        veces_pasado_total: 0,
        proximo_cobro_fecha: null,
      });
    }

    const clientEntry = clientMap.get(row.cliente_id);
    if (row.prestamo_id) {
      const montoPrestado = Number(row.monto_prestado || 0);
      const montoPagado = Number(row.monto_pagado_acumulado || 0);
      const saldoPorPagar = Number(row.saldo_por_pagar || 0);
      const cuota = Number(row.cuota || 0);
      const pagados = Number(row.periodos_pagados || 0);
      const totalPeriodos = Number(row.total_periodos || 0);
      const atrasos = Number(row.periodos_atrasados_acumulados || 0);
      const vecesPasado = Number(row.veces_pasado_prestamo || 0);

      clientEntry.prestamos.push({
        prestamo_id: row.prestamo_id,
        monto_prestado: montoPrestado,
        monto_total_financiar: Number(row.monto_total_financiar || 0),
        monto_pagado_acumulado: montoPagado,
        saldo_por_pagar: saldoPorPagar,
        cuota,
        modalidad: row.modalidad || 'SEMANAL',
        dia_fijo_original: row.dia_fijo_original || null,
        dia_mes_1: row.dia_mes_1 || null,
        dia_mes_2: row.dia_mes_2 || null,
        total_periodos: totalPeriodos,
        periodos_pagados: pagados,
        periodos_pendientes: Number(row.periodos_pendientes || 0),
        periodos_atrasados_acumulados: atrasos,
        veces_pasado: vecesPasado,
        estado: row.estado_prestamo || 'ACTIVO',
        proximo_cobro_fecha: row.proximo_cobro_fecha || null,
      });

      clientEntry.total_prestado += montoPrestado;
      clientEntry.total_pagado += montoPagado;
      clientEntry.saldo_total_pendiente += saldoPorPagar;
      clientEntry.cuota_total += cuota;
      clientEntry.cantidad_pagos_realizados += pagados;
      clientEntry.total_cuotas_combinadas += totalPeriodos;
      clientEntry.atrasos_acumulados += atrasos;
      clientEntry.veces_pasado_total += vecesPasado;

      if (
        row.proximo_cobro_fecha &&
        (!clientEntry.proximo_cobro_fecha || row.proximo_cobro_fecha < clientEntry.proximo_cobro_fecha)
      ) {
        clientEntry.proximo_cobro_fecha = row.proximo_cobro_fecha;
      }
    }
  }

  const todosClientesActivos = Array.from(clientMap.values()).map((c) => ({
    ...c,
    cantidad_prestamos_activos: c.prestamos.length,
    modalidades: Array.from(new Set(c.prestamos.map((p) => p.modalidad))).join(', ') || 'Sin préstamo activo',
    dias_cobro: formatDiasCobro(c.prestamos),
  }));

  const clientesConDeuda = todosClientesActivos
    .filter((c) => c.cantidad_prestamos_activos > 0 && c.saldo_total_pendiente > 0)
    .sort((a, b) => b.saldo_total_pendiente - a.saldo_total_pendiente);

  const pendientesHoy = [];
  const pendientesSemana = [];
  const cobrosManana = [];
  const agendaProximosDias = [];

  for (const row of resAgendaRango.rows) {
    const item = {
      agenda_id: row.agenda_id,
      cliente_id: row.cliente_id,
      prestamo_id: row.prestamo_id,
      nombre_completo: cleanPersonName(row.nombre, row.apellidos),
      ubicacion: sanitizarTextoVisible(row.ubicacion || 'Sin ubicación'),
      fecha_cobro_actual: row.fecha_cobro_actual,
      dia_semana: getSpanishWeekdayFromISO(row.fecha_cobro_actual),
      es_rezagado: Boolean(row.es_rezagado),
      monto_cuota: Number(row.monto_cuota || 0),
      veces_pasado: Number(row.veces_pasado || 0),
      modalidad: row.modalidad || 'SEMANAL',
      saldo_por_pagar: Number(row.saldo_por_pagar || 0),
    };

    if (row.en_semana_actual) {
      pendientesSemana.push(item);
    }
    if (row.fecha_cobro_actual <= fechaHoyCR) {
      pendientesHoy.push(item);
    }
    if (row.fecha_cobro_actual === fechaMananaCR) {
      cobrosManana.push(item);
    }
    if (row.fecha_cobro_actual >= fechaHoyCR && row.fecha_cobro_actual <= fechaLimite7Dias) {
      agendaProximosDias.push(item);
    }
  }

  const cobrosHoyPorCliente = new Map();
  for (const item of pendientesHoy) {
    const current = cobrosHoyPorCliente.get(item.cliente_id) || { cantidad: 0, monto: 0 };
    current.cantidad += 1;
    current.monto += item.monto_cuota;
    cobrosHoyPorCliente.set(item.cliente_id, current);
  }

  const zonasMap = new Map();
  for (const cliente of clientesConDeuda) {
    const rawZona = cliente.ubicacion || 'Sin ubicación';
    const zonaKey = normalizeText(rawZona) || 'sin ubicacion';
    if (!zonasMap.has(zonaKey)) {
      zonasMap.set(zonaKey, {
        ubicacion: rawZona,
        total_clientes: 0,
        total_prestamos: 0,
        cobros_hoy_zona: 0,
        monto_cobros_hoy_zona: 0,
        saldo_por_cobrar_zona: 0,
        clientes_zona: [],
      });
    }

    const zona = zonasMap.get(zonaKey);
    const hoyInfo = cobrosHoyPorCliente.get(cliente.cliente_id) || { cantidad: 0, monto: 0 };
    zona.total_clientes += 1;
    zona.total_prestamos += cliente.cantidad_prestamos_activos;
    zona.cobros_hoy_zona += hoyInfo.cantidad;
    zona.monto_cobros_hoy_zona += hoyInfo.monto;
    zona.saldo_por_cobrar_zona += cliente.saldo_total_pendiente;
    zona.clientes_zona.push({
      cliente_id: cliente.cliente_id,
      nombre: cliente.nombre_completo,
      saldo: cliente.saldo_total_pendiente,
      cuota: cliente.cuota_total,
      atrasos: cliente.atrasos_acumulados,
    });
  }

  const zonas = Array.from(zonasMap.values()).sort(
    (a, b) => b.saldo_por_cobrar_zona - a.saldo_por_cobrar_zona
  );

  const atrasos = clientesConDeuda
    .filter((c) => c.atrasos_acumulados > 0 || c.prestamos.some((p) => p.estado === 'ATRASADO'))
    .sort((a, b) => b.atrasos_acumulados - a.atrasos_acumulados || b.saldo_total_pendiente - a.saldo_total_pendiente);

  const montoPendienteHoy = pendientesHoy.reduce((sum, item) => sum + item.monto_cuota, 0);
  const montoPendienteSemana = pendientesSemana.reduce((sum, item) => sum + item.monto_cuota, 0);
  const montoManana = cobrosManana.reduce((sum, item) => sum + item.monto_cuota, 0);
  const recaudadoHoyRow = resRecaudadoHoy.rows[0] || {};

  const agendaHoy = {
    cantidadPendientes: pendientesHoy.length,
    montoPendienteHoy,
    cantidadRegistradosHoy: Number(recaudadoHoyRow.cantidad_registrados || 0),
    montoRecaudadoHoy: Number(recaudadoHoyRow.monto_recaudado || 0),
    cantidadSemana: pendientesSemana.length,
    montoPendienteSemana,
    montoManana,
    pendientes: pendientesHoy,
    pendientesSemana,
    cobros_manana: cobrosManana,
    agenda_proximos_dias: agendaProximosDias,
  };

  const listaNegra = resListaNegra.rows.map((ln) => ({
    id: ln.id,
    cedula: ln.cedula || '',
    nombre_completo: cleanPersonName(ln.nombre, ln.apellidos),
    fecha_registro: ln.fecha_registro || '',
  }));

  const papelera = {
    clientes: resClientesPapelera.rows.map((cb) => ({
      id: cb.id,
      nombre_completo: cleanPersonName(cb.nombre, cb.apellidos),
      cedula: cb.cedula || '',
      ubicacion: sanitizarTextoVisible(cb.ubicacion || ''),
    })),
    prestamos: resPrestamosPapelera.rows.map((pb) => ({
      id: pb.id,
      cliente_nombre_completo: cleanPersonName(pb.cliente_nombre, pb.cliente_apellidos),
      monto_prestado: Number(pb.monto_prestado || 0),
      saldo_por_pagar: Number(pb.saldo_por_pagar || 0),
    })),
  };

  const archivoEliminados = (resArchivoEliminados.rows || []).map((a) => ({
    id: a.id,
    cliente_id_actual: a.cliente_id_actual || null,
    cedula: a.cedula || '',
    nombre_completo: cleanPersonName(a.nombre_completo, ''),
    telefono: a.telefono || '',
    telefono_secundario: a.telefono_secundario || '',
    ubicacion: sanitizarTextoVisible(a.ubicacion || ''),
    detalles: sanitizarTextoVisible(a.detalles || ''),
    fecha_eliminacion: a.fecha_eliminacion || null,
    total_prestamos: a.total_prestamos !== null && a.total_prestamos !== undefined ? Number(a.total_prestamos) : 0,
    total_prestado: a.total_prestado !== null && a.total_prestado !== undefined ? Number(a.total_prestado) : 0,
    total_pagado: a.total_pagado !== null && a.total_pagado !== undefined ? Number(a.total_pagado) : 0,
    saldo_impago: a.saldo_impago !== null && a.saldo_impago !== undefined ? Number(a.saldo_impago) : 0,
    atrasos_totales: a.atrasos_totales !== null && a.atrasos_totales !== undefined ? Number(a.atrasos_totales) : 0,
  }));

  const resumenGeneral = {
    totalClientesActivos: todosClientesActivos.length,
    totalClientesConDeuda: clientesConDeuda.length,
    totalPrestamosVigentes: clientesConDeuda.reduce((sum, c) => sum + c.cantidad_prestamos_activos, 0),
    totalPrestadoVigente: clientesConDeuda.reduce((sum, c) => sum + c.total_prestado, 0),
    totalPorCobrar: clientesConDeuda.reduce((sum, c) => sum + c.saldo_total_pendiente, 0),
  };

  return {
    fechaHoyCR,
    fechaMananaCR,
    resumenGeneral,
    zonas,
    clientes: clientesConDeuda,
    todosClientesActivos,
    agendaHoy,
    atrasos,
    listaNegra,
    papelera,
    archivoEliminados,
  };
}

/**
 * Construye un catálogo dinámico de consultas informativas reales basadas en
 * ubicaciones, clientes y estados actuales de cobro_firme_db.
 */
export function construirPoolAlternativoSeneca(radiografia) {
  const pool = [];
  const { zonas = [], todosClientesActivos = [] } = radiografia || {};

  const seenUbicaciones = new Set();
  for (const z of zonas) {
    if (!z?.ubicacion || seenUbicaciones.has(z.ubicacion)) continue;
    seenUbicaciones.add(z.ubicacion);
    pool.push(`¿Cuántos cobros y qué monto tengo en ${z.ubicacion}?`);
  }

  for (const cli of todosClientesActivos) {
    if (cli?.ubicacion && !seenUbicaciones.has(cli.ubicacion)) {
      seenUbicaciones.add(cli.ubicacion);
      pool.push(`¿Cuántos cobros y qué monto tengo en ${cli.ubicacion}?`);
    }
  }

  for (const cli of todosClientesActivos.slice(0, 3)) {
    if (!cli?.nombre_completo) continue;
    pool.push(`¿Cuánto debe en total ${cli.nombre_completo} y cuál es su cuota?`);
    pool.push(`¿Cuál es el teléfono y ubicación de ${cli.nombre_completo}?`);
    pool.push(`¿Cuál es el historial de pagos de ${cli.nombre_completo}?`);
  }

  pool.push('¿Cuáles cobros están programados para mañana y los próximos días?');
  pool.push('¿Cuántos cobros tengo programados para hoy?');
  pool.push('¿Cuáles clientes tienen cuotas atrasadas acumuladas?');
  pool.push('¿Cuánto dinero me debe actualmente cada cliente?');
  pool.push('¿Cuántas personas hay en Lista Negra y en Papelera?');

  return pool;
}

function findMatchingClientes(preguntaNorm, radiografia) {
  const cedulaDigits = preguntaNorm.replace(/\D/g, '');
  const queryTokens = preguntaNorm
    .split(' ')
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

  const scored = [];
  for (const cliente of radiografia.todosClientesActivos) {
    const fullNorm = normalizeText(cliente.nombre_completo);
    let score = 0;

    if (cedulaDigits.length >= 5 && cliente.cedula && cliente.cedula.includes(cedulaDigits)) {
      score += 100;
    }
    if (fullNorm && preguntaNorm.includes(fullNorm)) {
      score += 90;
    }

    const nameTokens = fullNorm.split(' ').filter((t) => t.length >= 3);
    let matchedTokens = 0;
    for (const qt of queryTokens) {
      if (nameTokens.some((nt) => nt === qt || nt.startsWith(qt) || qt.startsWith(nt))) {
        matchedTokens += 1;
      }
    }

    if (matchedTokens > 0) {
      score += matchedTokens * 25;
      if (matchedTokens === nameTokens.length) score += 20;
    }

    if (score >= 25) {
      scored.push({ cliente, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((item) => item.cliente);
}

function resolveClientFromHistory(historial, radiografia) {
  if (!Array.isArray(historial) || historial.length === 0) return null;
  for (let i = historial.length - 1; i >= 0; i -= 1) {
    const textNorm = normalizeText(historial[i]?.content || '');
    if (!textNorm) continue;
    const matches = findMatchingClientes(textNorm, radiografia);
    if (matches.length > 0) return matches[0];
  }
  return null;
}

function findMatchingZonas(preguntaNorm, radiografia) {
  const queryTokens = preguntaNorm
    .split(' ')
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));

  const zonasPool = [...radiografia.zonas];
  const existingKeys = new Set(zonasPool.map((z) => normalizeText(z.ubicacion)));

  for (const cli of radiografia.todosClientesActivos) {
    const uKey = normalizeText(cli.ubicacion);
    if (!uKey || existingKeys.has(uKey)) continue;
    existingKeys.add(uKey);
    const clientesEnUbicacion = radiografia.todosClientesActivos.filter(
      (item) => normalizeText(item.ubicacion) === uKey
    );
    zonasPool.push({
      ubicacion: cli.ubicacion,
      total_clientes: clientesEnUbicacion.length,
      total_prestamos: 0,
      cobros_hoy_zona: 0,
      monto_cobros_hoy_zona: 0,
      saldo_por_cobrar_zona: 0,
      solo_clientes_sin_deuda: true,
      clientes_zona: clientesEnUbicacion.map((c) => ({
        cliente_id: c.cliente_id,
        nombre: c.nombre_completo,
        saldo: 0,
        cuota: 0,
        atrasos: 0,
      })),
    });
  }

  const matched = [];
  for (const zona of zonasPool) {
    const zonaNorm = normalizeText(zona.ubicacion);
    if (!zonaNorm) continue;

    if (preguntaNorm.includes(zonaNorm)) {
      matched.push({ zona, score: 100 });
      continue;
    }

    const zonaTokens = zonaNorm.split(' ').filter((w) => w.length >= 4);
    const hits = queryTokens.filter((qt) =>
      zonaTokens.some((zt) => zt.includes(qt) || qt.includes(zt))
    );
    if (hits.length > 0) {
      matched.push({ zona, score: hits.length * 30 });
    }
  }

  matched.sort((a, b) => b.score - a.score);
  return matched.map((m) => m.zona);
}

/**
 * Analizador determinista local sobre la radiografía real de cobro_firme_db.
 * Diferencia preguntas puntuales de teléfono, historial, agenda de mañana y días
 * específicos, zonas, deudas, atrasos, Lista Negra y Papelera.
 */
export function analizarRadiografiaLocal({ pregunta, historial = [], radiografia }) {
  const preguntaNorm = normalizeText(pregunta);
  const {
    fechaMananaCR,
    resumenGeneral,
    zonas,
    clientes,
    todosClientesActivos,
    agendaHoy,
    atrasos,
    listaNegra,
    papelera,
    archivoEliminados = [],
  } = radiografia;

  const poolAlternativo = construirPoolAlternativoSeneca(radiografia);
  const respond = (payload) =>
    normalizarRespuestaSeneca(payload, {}, {
      preguntaActual: pregunta,
      poolAlternativo,
      historial,
    });

  const matchedClientes = findMatchingClientes(preguntaNorm, radiografia);
  const matchedZonas = findMatchingZonas(preguntaNorm, radiografia);
  const matchedArchivo = archivoEliminados.filter((a) => {
    const nom = normalizeText(a.nombre_completo);
    const ced = String(a.cedula || '').replace(/\D+/g, '');
    const qDigits = String(pregunta || '').replace(/\D+/g, '');
    if (ced && qDigits && qDigits.includes(ced)) return true;
    const tokens = nom.split(/\s+/).filter((t) => t.length >= 3);
    if (tokens.length === 0) return false;
    const matchedTokens = tokens.filter((t) => preguntaNorm.includes(t));
    return matchedTokens.length >= Math.min(2, tokens.length) || (tokens.length === 1 && matchedTokens.length === 1);
  });

  const buildArchivoResponse = (items) => {
    const first = items[0];
    if (items.length === 1) {
      const saldoTexto =
        first.saldo_impago > 0
          ? `, dejando un saldo sin pagar de ${formatearColones(first.saldo_impago)}`
          : ', sin saldo pendiente al cierre';
      const atrasosTexto =
        first.atrasos_totales > 0 ? ` y ${first.atrasos_totales} atrasos registrados` : '';
      return respond({
        respuesta: `${first.nombre_completo} ya no figura entre tus clientes activos porque fue eliminado definitivamente${saldoTexto}. En su historial anterior tuvo ${first.total_prestamos} ${first.total_prestamos === 1 ? 'préstamo' : 'préstamos'} por ${formatearColones(first.total_prestado)} con ${formatearColones(first.total_pagado)} abonados en total${atrasosTexto}.`,
        tarjetas: [
          {
            titulo: first.nombre_completo,
            subtitulo: `Eliminado definitivamente · ${first.cedula || first.telefono || 'Sin identificador'}`,
            monto: formatearColones(first.saldo_impago),
            estado: first.saldo_impago > 0 ? 'Dejó saldo pendiente' : 'Sin saldo pendiente',
            detalle: `${first.total_prestamos} préstamos · Abonó ${formatearColones(first.total_pagado)}`,
          },
        ],
        confianza: 'alta',
      });
    }

    return respond({
      respuesta: `Encontré ${items.length} coincidencias entre personas eliminadas definitivamente: ${items
        .slice(0, 4)
        .map(
          (a) =>
            `${a.nombre_completo} con ${formatearColones(a.saldo_impago)} sin pagar y ${formatearColones(a.total_pagado)} abonados`
        )
        .join('. ')}.`,
      tarjetas: items.slice(0, 4).map((a) => ({
        titulo: a.nombre_completo,
        subtitulo: `Eliminado definitivamente · ${a.cedula || a.telefono || 'Sin identificador'}`,
        monto: formatearColones(a.saldo_impago),
        estado: a.saldo_impago > 0 ? 'Dejó saldo pendiente' : 'Sin saldo pendiente',
        detalle: `${a.total_prestamos} préstamos · Abonó ${formatearColones(a.total_pagado)}`,
      })),
      confianza: 'alta',
    });
  };

  const isPhoneQuery = /\b(telefono|celular|contacto|numero|whatsapp|llamar)\b/.test(preguntaNorm);
  const isHistoryQuery = /\b(historial|abonado|cuotas pagadas|lleva pagadas|detalle de pagos|cuantos pagos)\b/.test(preguntaNorm);
  const isTomorrowOrWeekdayQuery =
    /\b(manana|pasado manana|lunes|martes|miercoles|jueves|viernes|sabado|domingo|proximos dias)\b/.test(
      preguntaNorm
    );

  // 1A. Teléfono o contacto puntual de un cliente
  if (isPhoneQuery) {
    const cli =
      matchedClientes[0] ||
      resolveClientFromHistory(historial, radiografia) ||
      (todosClientesActivos.length === 1 ? todosClientesActivos[0] : null);

    if (cli) {
      const telSec = cli.telefono_secundario
        ? ` y teléfono secundario ${cli.telefono_secundario}`
        : '';
      return respond({
        respuesta: `El contacto registrado de ${cli.nombre_completo} es el teléfono principal ${cli.telefono || 'no registrado'}${telSec}, ubicado en ${cli.ubicacion}.`,
        tarjetas: [
          {
            titulo: cli.nombre_completo,
            subtitulo: cli.ubicacion,
            monto: cli.telefono || 'Sin teléfono',
            estado: cli.telefono_secundario ? `Alt. ${cli.telefono_secundario}` : 'Contacto directo',
            detalle: `Cédula ${cli.cedula || 'sin cédula'}`,
          },
        ],
        confianza: 'alta',
      });
    }
  }

  // 1B. Historial o detalle de pagos de un cliente
  if (isHistoryQuery) {
    if (matchedClientes.length === 0 && matchedArchivo.length > 0) {
      return buildArchivoResponse(matchedArchivo);
    }
    const cli =
      matchedClientes[0] ||
      resolveClientFromHistory(historial, radiografia) ||
      (todosClientesActivos.length === 1 ? todosClientesActivos[0] : null);

    if (cli) {
      if (cli.cantidad_prestamos_activos === 0) {
        return respond({
          respuesta: `${cli.nombre_completo}, ubicado en ${cli.ubicacion}, actualmente no registra préstamos vigentes ni historial de cuotas activas por abonar, con saldo pendiente ₡0.`,
          tarjetas: [
            {
              titulo: cli.nombre_completo,
              subtitulo: cli.ubicacion,
              monto: formatearColones(0),
              estado: 'Sin préstamos activos',
              detalle: 'No tiene cuotas pendientes ni atrasos en curso.',
            },
          ],
          confianza: 'alta',
        });
      }

      return respond({
        respuesta: `${cli.nombre_completo} registra ${cli.cantidad_pagos_realizados} cuotas pagadas de ${cli.total_cuotas_combinadas}, con un total abonado de ${formatearColones(cli.total_pagado)}. Mantiene un saldo pendiente de ${formatearColones(cli.saldo_total_pendiente)} y ${cli.atrasos_acumulados} cuotas atrasadas acumuladas.`,
        tarjetas: [
          {
            titulo: cli.nombre_completo,
            subtitulo: `${cli.ubicacion} · ${cli.cantidad_prestamos_activos} ${cli.cantidad_prestamos_activos === 1 ? 'préstamo' : 'préstamos'}`,
            monto: formatearColones(cli.total_pagado),
            estado: `${cli.cantidad_pagos_realizados} de ${cli.total_cuotas_combinadas} cuotas`,
            detalle: `Saldo restante ${formatearColones(cli.saldo_total_pendiente)} · Atrasos ${cli.atrasos_acumulados}`,
          },
        ],
        confianza: 'alta',
      });
    }
  }

  // 1C. Consulta por mañana o día específico de la semana / próximos 7 días
  if (isTomorrowOrWeekdayQuery) {
    const cobrosManana = agendaHoy.cobros_manana || [];
    const proximosDias = agendaHoy.agenda_proximos_dias || [];

    const requestedWeekday = WEEKDAYS_LIST.find((day) =>
      preguntaNorm.includes(normalizeText(day))
    );

    if (requestedWeekday && !preguntaNorm.includes('manana')) {
      const matchesDay = proximosDias.filter(
        (item) => normalizeText(item.dia_semana) === normalizeText(requestedWeekday)
      );
      if (matchesDay.length === 0) {
        const proximo = proximosDias[0];
        return respond({
          respuesta: `Para el ${requestedWeekday} no tienes cobros programados en los próximos días.${proximo ? ` El próximo cobro más cercano es el ${proximo.dia_semana} ${proximo.fecha_cobro_actual} con ${proximo.nombre_completo}.` : ''}`,
          tarjetas: [],
          confianza: 'alta',
        });
      }

      const sumaDia = matchesDay.reduce((s, item) => s + item.monto_cuota, 0);
      return respond({
        respuesta: `Para el ${requestedWeekday} tienes ${matchesDay.length} ${matchesDay.length === 1 ? 'cobro programado' : 'cobros programados'} por ${formatearColones(sumaDia)}: ${matchesDay.slice(0, 5).map((m) => `${m.nombre_completo} en ${m.ubicacion} por ${formatearColones(m.monto_cuota)}`).join(', ')}.`,
        tarjetas: matchesDay.slice(0, 4).map((m) => ({
          titulo: m.nombre_completo,
          subtitulo: `${m.ubicacion} · ${m.dia_semana} ${m.fecha_cobro_actual}`,
          monto: formatearColones(m.monto_cuota),
          estado: m.modalidad,
          detalle: `Saldo ${formatearColones(m.saldo_por_pagar)}`,
        })),
        confianza: 'alta',
      });
    }

    if (cobrosManana.length === 0) {
      const futuroCercano = proximosDias.find((p) => p.fecha_cobro_actual > fechaMananaCR);
      const extraProximo = futuroCercano
        ? ` Tu próximo cobro programado es el ${futuroCercano.dia_semana} ${futuroCercano.fecha_cobro_actual} con ${futuroCercano.nombre_completo} por ${formatearColones(futuroCercano.monto_cuota)}.`
        : proximosDias.length > 0
        ? ` En los próximos días solo figuran cobros para hoy por ${formatearColones(agendaHoy.montoPendienteHoy)}.`
        : ' Tampoco tienes otros cobros programados en los próximos días.';

      return respond({
        respuesta: `Para mañana no tienes ningún cobro programado.${extraProximo}`,
        tarjetas: [],
        confianza: 'alta',
      });
    }

    return respond({
      respuesta: `Para mañana ${fechaMananaCR} tienes ${cobrosManana.length} ${cobrosManana.length === 1 ? 'cobro programado' : 'cobros programados'} por ${formatearColones(agendaHoy.montoManana)}: ${cobrosManana.slice(0, 5).map((c) => `${c.nombre_completo} en ${c.ubicacion} por ${formatearColones(c.monto_cuota)}`).join(', ')}.`,
      tarjetas: cobrosManana.slice(0, 4).map((c) => ({
        titulo: c.nombre_completo,
        subtitulo: `${c.ubicacion} · ${c.dia_semana} ${c.fecha_cobro_actual}`,
        monto: formatearColones(c.monto_cuota),
        estado: 'Programado mañana',
        detalle: `Saldo pendiente ${formatearColones(c.saldo_por_pagar)}`,
      })),
      confianza: 'alta',
    });
  }

  const asksSpecificPerson =
    /\b(debe|saldo|cuota|prestamos?|pagado|atrasos?|proximo cobro)\s+(de\s+)?[a-záéíóúñ]{3,}/i.test(
      pregunta
    ) && !/\b(cada cliente|clientes|todos|hoy|zona|zonas|ubicacion)\b/i.test(preguntaNorm);

  const asksSpecificZone =
    /\b(en|de|zona|ubicacion|sector)\s+[a-záéíóúñ]{4,}/i.test(pregunta) &&
    !/\b(cada zona|cada ubicacion|zonas|ubicaciones|hoy|semana|atraso|lista negra|papelera)\b/i.test(
      preguntaNorm
    );

  // 1. Consulta puntual por uno o más clientes registrados
  if (matchedClientes.length > 0 && matchedZonas.length === 0) {
    const principal = matchedClientes[0];
    if (principal.cantidad_prestamos_activos === 0) {
      return respond({
        respuesta: `${principal.nombre_completo}, ubicado en ${principal.ubicacion}, no mantiene préstamos vigentes ni saldo pendiente en este momento.`,
        tarjetas: [
          {
            titulo: principal.nombre_completo,
            subtitulo: principal.ubicacion,
            monto: formatearColones(0),
            estado: 'Sin deuda vigente',
            detalle: 'No registra cuotas pendientes ni atrasos activos.',
          },
        ],
        confianza: 'alta',
      });
    }

    const resumenDeuda = `${principal.nombre_completo} debe en total ${formatearColones(principal.saldo_total_pendiente)} distribuidos en ${principal.cantidad_prestamos_activos} ${principal.cantidad_prestamos_activos === 1 ? 'préstamo activo' : 'préstamos activos'} en ${principal.ubicacion}. Su cuota ${principal.modalidades.toLowerCase()} es de ${formatearColones(principal.cuota_total)}, registra ${principal.atrasos_acumulados} atrasos acumulados, ha pedido pasar de día ${principal.veces_pasado_total} ${principal.veces_pasado_total === 1 ? 'vez' : 'veces'} y su próximo cobro es el ${principal.proximo_cobro_fecha || 'pendiente por definir'}.`;

    const tarjetas = matchedClientes.slice(0, 4).map((cli) => {
      const pagadasTotal = cli.prestamos.reduce((s, p) => s + p.periodos_pagados, 0);
      const periodosTotal = cli.prestamos.reduce((s, p) => s + p.total_periodos, 0);
      return {
        titulo: cli.nombre_completo,
        subtitulo: `${cli.ubicacion} · ${cli.cantidad_prestamos_activos} ${cli.cantidad_prestamos_activos === 1 ? 'préstamo' : 'préstamos'}`,
        monto: formatearColones(cli.saldo_total_pendiente),
        estado: cli.atrasos_acumulados > 0 ? `${cli.atrasos_acumulados} atrasos` : 'Al día',
        detalle: `Cuota ${formatearColones(cli.cuota_total)} · Pagadas ${pagadasTotal} de ${periodosTotal} · Pasado de día ${cli.veces_pasado_total} veces · Próximo cobro ${cli.proximo_cobro_fecha || 'sin fecha'}`,
      };
    });

    return respond({
      respuesta: resumenDeuda,
      tarjetas,
      confianza: 'alta',
    });
  }

  // 2. Consulta puntual por una zona o ubicación registrada
  if (matchedZonas.length > 0) {
    const zona = matchedZonas[0];
    if (zona.solo_clientes_sin_deuda) {
      const listaSinDeuda = zona.clientes_zona.map((c) => c.nombre).join(', ');
      return respond({
        respuesta: `En ${zona.ubicacion} tienes ${zona.total_clientes} ${zona.total_clientes === 1 ? 'cliente registrado' : 'clientes registrados'}: ${listaSinDeuda}, sin préstamos activos ni cobros pendientes en este momento.`,
        tarjetas: [
          {
            titulo: zona.ubicacion,
            subtitulo: `${zona.total_clientes} ${zona.total_clientes === 1 ? 'cliente registrado' : 'clientes registrados'}`,
            monto: formatearColones(0),
            estado: 'Sin cobros pendientes',
            detalle: `Clientes en esta ubicación: ${listaSinDeuda}`,
          },
        ],
        confianza: 'alta',
      });
    }

    const nombresClientes = zona.clientes_zona
      .slice(0, 5)
      .map((c) => `${c.nombre} con ${formatearColones(c.saldo)}`)
      .join(', ');

    const respuesta = `En ${zona.ubicacion} registras ${zona.total_clientes} ${zona.total_clientes === 1 ? 'cliente activo' : 'clientes activos'} con ${zona.total_prestamos} ${zona.total_prestamos === 1 ? 'préstamo vigente' : 'préstamos vigentes'} por un saldo total de ${formatearColones(zona.saldo_por_cobrar_zona)}. Para hoy tienes ${zona.cobros_hoy_zona} ${zona.cobros_hoy_zona === 1 ? 'cobro pendiente' : 'cobros pendientes'} que suman ${formatearColones(zona.monto_cobros_hoy_zona)}. Clientes en esta zona: ${nombresClientes}.`;

    const tarjetas = [
      {
        titulo: zona.ubicacion,
        subtitulo: `${zona.total_clientes} clientes · ${zona.total_prestamos} préstamos`,
        monto: formatearColones(zona.saldo_por_cobrar_zona),
        estado: `${zona.cobros_hoy_zona} cobros hoy`,
        detalle: `Por recaudar hoy en esta zona: ${formatearColones(zona.monto_cobros_hoy_zona)}`,
      },
      ...zona.clientes_zona.slice(0, 3).map((c) => ({
        titulo: c.nombre,
        subtitulo: zona.ubicacion,
        monto: formatearColones(c.saldo),
        estado: c.atrasos > 0 ? `${c.atrasos} atrasos` : 'Vigente',
        detalle: `Cuota ${formatearColones(c.cuota)}`,
      })),
    ];

    return respond({
      respuesta,
      tarjetas,
      confianza: 'alta',
    });
  }

  // 3. Consulta general sobre zonas o ubicaciones
  if (/\b(zona|zonas|ubicacion|ubicaciones|sector|sectores|barrio|provincia|lugar|lugares)\b/.test(preguntaNorm)) {
    if (zonas.length === 0) {
      const ubicacionesRegistradas = Array.from(
        new Set(todosClientesActivos.map((c) => c.ubicacion).filter(Boolean))
      );
      const notaUbicaciones =
        ubicacionesRegistradas.length > 0
          ? ` Tus clientes registrados figuran en: ${ubicacionesRegistradas.join(', ')}, todos actualmente sin deuda activa.`
          : '';
      return respond({
        respuesta: `Actualmente no hay zonas ni ubicaciones con préstamos activos pendientes de cobro.${notaUbicaciones}`,
        tarjetas: [],
        confianza: 'alta',
      });
    }

    const listadoZonas = zonas
      .slice(0, 6)
      .map(
        (z) =>
          `${z.ubicacion}: ${z.total_clientes} clientes, ${z.cobros_hoy_zona} cobros hoy por ${formatearColones(z.monto_cobros_hoy_zona)} y saldo total ${formatearColones(z.saldo_por_cobrar_zona)}`
      )
      .join('. ');

    return respond({
      respuesta: `Tienes ${zonas.length} ${zonas.length === 1 ? 'zona activa' : 'zonas activas'} por un saldo total de ${formatearColones(resumenGeneral.totalPorCobrar)}. Desglose por ubicación: ${listadoZonas}.`,
      tarjetas: zonas.slice(0, 4).map((z) => ({
        titulo: z.ubicacion,
        subtitulo: `${z.total_clientes} clientes · ${z.total_prestamos} préstamos`,
        monto: formatearColones(z.saldo_por_cobrar_zona),
        estado: `${z.cobros_hoy_zona} cobros hoy`,
        detalle: `Cuotas de hoy: ${formatearColones(z.monto_cobros_hoy_zona)}`,
      })),
      confianza: 'alta',
    });
  }

  // 4. Lista Negra
  if (/\b(lista negra|vetado|vetados|bloqueado|bloqueados)\b/.test(preguntaNorm)) {
    if (listaNegra.length === 0) {
      return respond({
        respuesta: 'Tu Lista Negra no tiene personas registradas activamente en este momento.',
        tarjetas: [],
        confianza: 'alta',
      });
    }

    return respond({
      respuesta: `Actualmente hay ${listaNegra.length} ${listaNegra.length === 1 ? 'persona registrada' : 'personas registradas'} en Lista Negra: ${listaNegra.slice(0, 5).map((l) => l.nombre_completo).join(', ')}.`,
      tarjetas: listaNegra.slice(0, 4).map((l) => ({
        titulo: l.nombre_completo,
        subtitulo: `Cédula ${l.cedula || 'sin registro'}`,
        monto: 'Lista Negra',
        estado: 'Activo',
        detalle: `Ingresado el ${l.fecha_registro || 'sin fecha'}`,
      })),
      confianza: 'alta',
    });
  }

  // 5. Papelera y personas eliminadas definitivamente
  if (matchedClientes.length === 0 && matchedArchivo.length > 0) {
    return buildArchivoResponse(matchedArchivo);
  }

  if (/\b(definitiv\w*|permanente\w*)\b/.test(preguntaNorm) && /\b(eliminad\w*|borrad\w*|persona\w*|cliente\w*|historial|pasad\w*)\b/.test(preguntaNorm)) {
    if (archivoEliminados.length === 0) {
      return respond({
        respuesta: 'No tienes personas eliminadas definitivamente registradas hasta ahora.',
        tarjetas: [],
        confianza: 'alta',
      });
    }
    const conSaldoPendiente = archivoEliminados.filter((a) => a.saldo_impago > 0);
    const resumenListado = archivoEliminados
      .slice(0, 4)
      .map(
        (a) =>
          `${a.nombre_completo}${a.saldo_impago > 0 ? ` dejó ${formatearColones(a.saldo_impago)} sin pagar` : ' quedó sin saldo pendiente'}`
      )
      .join('. ');
    return respond({
      respuesta: `Tienes ${archivoEliminados.length} ${archivoEliminados.length === 1 ? 'persona eliminada definitivamente' : 'personas eliminadas definitivamente'}, de las cuales ${conSaldoPendiente.length} dejaron saldo pendiente al salir. Principales registros: ${resumenListado}.`,
      tarjetas: archivoEliminados.slice(0, 4).map((a) => ({
        titulo: a.nombre_completo,
        subtitulo: `Eliminado definitivamente · ${a.cedula || a.telefono || 'Sin identificador'}`,
        monto: formatearColones(a.saldo_impago),
        estado: a.saldo_impago > 0 ? 'Dejó saldo pendiente' : 'Sin saldo pendiente',
        detalle: `${a.total_prestamos} préstamos · Abonó ${formatearColones(a.total_pagado)}`,
      })),
      confianza: 'alta',
    });
  }

  if (/\b(papelera|eliminado|eliminados|borrado|borrados|baneado)\b/.test(preguntaNorm)) {
    const totalCli = papelera.clientes.length;
    const totalPres = papelera.prestamos.length;
    if (totalCli === 0 && totalPres === 0) {
      const notaArchivo =
        archivoEliminados.length > 0
          ? ` Aparte, contabilizas ${archivoEliminados.length} ${archivoEliminados.length === 1 ? 'persona eliminada definitivamente' : 'personas eliminadas definitivamente'} en registros pasados.`
          : '';
      return respond({
        respuesta: `La Papelera está completamente vacía: no hay clientes ni préstamos pendientes de eliminación.${notaArchivo}`,
        tarjetas: [],
        confianza: 'alta',
      });
    }

    const cards = [
      ...papelera.clientes.slice(0, 2).map((c) => ({
        titulo: c.nombre_completo,
        subtitulo: `Cliente en Papelera · ${c.ubicacion || 'Sin ubicación'}`,
        monto: c.cedula || 'Sin cédula',
        estado: 'En Papelera',
        detalle: 'Cliente resguardado en Papelera.',
      })),
      ...papelera.prestamos.slice(0, 2).map((p) => ({
        titulo: p.cliente_nombre_completo,
        subtitulo: 'Préstamo en Papelera',
        monto: formatearColones(p.saldo_por_pagar),
        estado: 'En Papelera',
        detalle: `Monto original ${formatearColones(p.monto_prestado)}`,
      })),
    ];

    return respond({
      respuesta: `En Papelera hay ${totalCli} ${totalCli === 1 ? 'cliente' : 'clientes'} y ${totalPres} ${totalPres === 1 ? 'préstamo' : 'préstamos'} resguardados actualmente.`,
      tarjetas: cards,
      confianza: 'alta',
    });
  }

  // 6. Clientes con atrasos acumulados
  if (/\b(atraso|atrasos|atrasado|atrasados|mora|morosos|rezagado|rezagados|retraso)\b/.test(preguntaNorm)) {
    if (atrasos.length === 0) {
      return respond({
        respuesta: 'No tienes clientes con cuotas atrasadas acumuladas en este momento. Todos tus préstamos activos están al día.',
        tarjetas: [],
        confianza: 'alta',
      });
    }

    const saldoAtrasados = atrasos.reduce((s, a) => s + a.saldo_total_pendiente, 0);
    const resumenNombres = atrasos
      .slice(0, 5)
      .map(
        (a) =>
          `${a.nombre_completo} en ${a.ubicacion} con ${a.atrasos_acumulados} ${a.atrasos_acumulados === 1 ? 'atraso' : 'atrasos'} y saldo de ${formatearColones(a.saldo_total_pendiente)}`
      )
      .join('. ');

    return respond({
      respuesta: `Registras ${atrasos.length} ${atrasos.length === 1 ? 'cliente con cuotas atrasadas' : 'clientes con cuotas atrasadas'} por un saldo acumulado de ${formatearColones(saldoAtrasados)}. Detalle: ${resumenNombres}.`,
      tarjetas: atrasos.slice(0, 4).map((a) => ({
        titulo: a.nombre_completo,
        subtitulo: `${a.ubicacion} · Cuota ${formatearColones(a.cuota_total)}`,
        monto: formatearColones(a.saldo_total_pendiente),
        estado: `${a.atrasos_acumulados} atrasos`,
        detalle: `Pasado de día ${a.veces_pasado_total} veces · Próximo cobro ${a.proximo_cobro_fecha || 'sin fecha'}`,
      })),
      confianza: 'alta',
    });
  }

  // 7. Agenda de cobros de hoy y de la semana
  if (/\b(hoy|agenda|programados|toca|faltan|recaudado|semana|cobrado)\b/.test(preguntaNorm)) {
    const pendientes = agendaHoy.pendientes;
    const detallePendientes =
      pendientes.length > 0
        ? ` Pendientes principales: ${pendientes
            .slice(0, 5)
            .map((p) => `${p.nombre_completo} en ${p.ubicacion} por ${formatearColones(p.monto_cuota)}`)
            .join(', ')}.`
        : ' No quedan cobros pendientes por realizar hoy.';

    return respond({
      respuesta: `Para hoy tienes ${agendaHoy.cantidadPendientes} ${agendaHoy.cantidadPendientes === 1 ? 'cobro pendiente' : 'cobros pendientes'} que suman ${formatearColones(agendaHoy.montoPendienteHoy)}, y ya recaudaste ${agendaHoy.cantidadRegistradosHoy} ${agendaHoy.cantidadRegistradosHoy === 1 ? 'pago' : 'pagos'} por ${formatearColones(agendaHoy.montoRecaudadoHoy)}. En toda esta semana hay ${agendaHoy.cantidadSemana} cobros programados por ${formatearColones(agendaHoy.montoPendienteSemana)}.${detallePendientes}`,
      tarjetas: pendientes.slice(0, 4).map((p) => ({
        titulo: p.nombre_completo,
        subtitulo: `${p.ubicacion} · ${p.modalidad}`,
        monto: formatearColones(p.monto_cuota),
        estado: p.es_rezagado ? 'Rezagado' : 'Programado hoy',
        detalle: `Saldo total ${formatearColones(p.saldo_por_pagar)} · Pasado ${p.veces_pasado} veces`,
      })),
      confianza: 'alta',
    });
  }

  // 8. Consulta específica por persona o ubicación no existente en registros
  if (asksSpecificPerson || asksSpecificZone) {
    if (matchedArchivo.length > 0) {
      return buildArchivoResponse(matchedArchivo);
    }
    const zonasDisponibles =
      zonas.length > 0
        ? ` Las ubicaciones activas registradas son: ${zonas.map((z) => z.ubicacion).join(', ')}.`
        : '';

    return respond({
      respuesta: `No aparece ningún registro activo que coincida con esa persona o ubicación en tus registros actuales.${zonasDisponibles}`,
      tarjetas: [],
      confianza: 'alta',
    });
  }

  // 9. Consulta general sobre cuánto debe cada cliente o panorama completo
  if (clientes.length === 0) {
    const registradosResumen =
      todosClientesActivos.length > 0
        ? ` Tienes ${todosClientesActivos.length} ${todosClientesActivos.length === 1 ? 'cliente registrado' : 'clientes registrados'} actualmente con saldo pendiente ₡0.`
        : '';
    return respond({
      respuesta: `No tienes clientes con saldo pendiente de cobro en este momento.${registradosResumen}`,
      tarjetas: [],
      confianza: 'alta',
    });
  }

  const listadoClientes = clientes
    .slice(0, 6)
    .map(
      (c) =>
        `${c.nombre_completo} en ${c.ubicacion} debe ${formatearColones(c.saldo_total_pendiente)} con cuota de ${formatearColones(c.cuota_total)}`
    )
    .join('. ');

  return respond({
    respuesta: `Tus préstamos activos suman ${formatearColones(resumenGeneral.totalPorCobrar)} por cobrar entre ${resumenGeneral.totalClientesConDeuda} ${resumenGeneral.totalClientesConDeuda === 1 ? 'cliente' : 'clientes'} y ${resumenGeneral.totalPrestamosVigentes} ${resumenGeneral.totalPrestamosVigentes === 1 ? 'préstamo vigente' : 'préstamos vigentes'}. Principales saldos: ${listadoClientes}.`,
    tarjetas: clientes.slice(0, 4).map((c) => ({
      titulo: c.nombre_completo,
      subtitulo: `${c.ubicacion} · ${c.cantidad_prestamos_activos} ${c.cantidad_prestamos_activos === 1 ? 'préstamo' : 'préstamos'}`,
      monto: formatearColones(c.saldo_total_pendiente),
      estado: c.atrasos_acumulados > 0 ? `${c.atrasos_acumulados} atrasos` : 'Al día',
      detalle: `Cuota ${formatearColones(c.cuota_total)} · Próximo cobro ${c.proximo_cobro_fecha || 'sin fecha'}`,
    })),
    confianza: 'alta',
  });
}

/**
 * Devuelve un resumen ejecutivo rápido para la pantalla de bienvenida de Séneca.
 */
export async function obtenerResumenRapido(cobradorId) {
  const radiografia = await obtenerRadiografiaCompleta(cobradorId);
  const aiConfig = getAiConfig();

  const topZonasHoy = [...radiografia.zonas]
    .sort((a, b) => b.cobros_hoy_zona - a.cobros_hoy_zona || b.saldo_por_cobrar_zona - a.saldo_por_cobrar_zona)
    .slice(0, 3)
    .map((z) => ({
      ubicacion: z.ubicacion,
      cobrosHoy: z.cobros_hoy_zona,
      montoHoy: z.monto_cobros_hoy_zona,
      saldoTotal: z.saldo_por_cobrar_zona,
    }));

  return {
    fechaHoy: radiografia.fechaHoyCR,
    cobrosHoyCount: radiografia.agendaHoy.cantidadPendientes,
    cobrosHoyMonto: radiografia.agendaHoy.montoPendienteHoy,
    recaudadoHoyMonto: radiografia.agendaHoy.montoRecaudadoHoy,
    zonasActivasCount: radiografia.zonas.length,
    clientesConDeudaCount: radiografia.resumenGeneral.totalClientesConDeuda,
    clientesConAtrasoCount: radiografia.atrasos.length,
    totalPorCobrar: radiografia.resumenGeneral.totalPorCobrar,
    topZonasHoy,
    iaActiva: aiConfig.isConfigured,
    modelo: aiConfig.isConfigured ? aiConfig.model : 'Motor analítico local',
  };
}

/**
 * Ejecuta una consulta a Séneca usando Groq (openai/gpt-oss-120b) cuando está
 * configurado y disponible, con filtrado lógico de sugerencias y respaldo local.
 */
export async function consultarSeneca({ cobradorId, pregunta, historial = [] }) {
  const radiografia = await obtenerRadiografiaCompleta(cobradorId);
  const poolAlternativo = construirPoolAlternativoSeneca(radiografia);
  const fallbackLocal = analizarRadiografiaLocal({ pregunta, historial, radiografia });
  const aiConfig = getAiConfig();

  if (!aiConfig.isConfigured) {
    return {
      ...fallbackLocal,
      fuente: 'local',
      modelo: 'Motor analítico local',
    };
  }

  try {
    const systemPrompt = buildSenecaSystemPrompt(radiografia);
    const groqRaw = await consultarGroq({
      systemPrompt,
      historial,
      pregunta,
    });
    const normalized = normalizarRespuestaSeneca(groqRaw, fallbackLocal, {
      preguntaActual: pregunta,
      poolAlternativo,
      historial,
    });
    return {
      ...normalized,
      fuente: 'groq',
      modelo: aiConfig.model,
    };
  } catch (err) {
    console.warn(`[Séneca] Respaldo analítico local activado: ${err.message}`);
    return {
      ...fallbackLocal,
      fuente: 'local-fallback',
      modelo: 'Motor analítico local',
    };
  }
}
