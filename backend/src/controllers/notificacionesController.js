import { query, debugPayload } from '../config/db.js';
import { getDefaultCobradorId } from '../services/seedService.js';

// Almacén en memoria sincronizado con PostgreSQL (tabla notificaciones_revisadas)
const seenNotificationIds = new Set();
let isTableInitialized = false;

async function ensureTableAndLoadSeen() {
  try {
    if (!isTableInitialized) {
      await query(`
        CREATE TABLE IF NOT EXISTS notificaciones_revisadas (
          notificacion_id text PRIMARY KEY,
          revisada_en timestamptz DEFAULT now()
        );
      `);
      isTableInitialized = true;
    }
    const { rows } = await query('SELECT notificacion_id FROM notificaciones_revisadas;');
    rows.forEach((r) => {
      if (r.notificacion_id) {
        seenNotificationIds.add(r.notificacion_id);
      }
    });
  } catch (err) {
    console.warn('[Notificaciones] Advertencia al sincronizar notificaciones_revisadas con PostgreSQL:', err.message);
  }
}

// Carga inicial no bloqueante
ensureTableAndLoadSeen().catch(() => {});

const SPANISH_WEEKDAYS = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
];

const SPANISH_MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function getTodayCostaRicaISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function formatReadableDate(dateStr) {
  if (!dateStr) return '';
  const cleanStr = String(dateStr).slice(0, 10);
  const [y, m, d] = cleanStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayName = SPANISH_WEEKDAYS[dateObj.getUTCDay()];
  const monthName = SPANISH_MONTHS[dateObj.getUTCMonth()];
  return `${dayName} ${d} de ${monthName}`;
}

export async function getNotificaciones(req, res) {
  try {
    await ensureTableAndLoadSeen();
    const cobradorId = req.query.cobrador_id || req.user?.id || await getDefaultCobradorId();
    const todayISO = req.query.fecha || getTodayCostaRicaISO();

    // 1. Resumen de Cobros de Hoy (COBROS_HOY)
    const sqlCobrosHoy = `
      SELECT 
        COUNT(*)::int AS total_cobros,
        COALESCE(SUM(a.monto_cuota), 0)::numeric AS monto_total
      FROM agenda_cobros a
      JOIN prestamos p ON a.prestamo_id = p.id
      JOIN clientes c ON a.cliente_id = c.id
      WHERE a.cobrador_id = $1
        AND a.fecha_cobro_actual = $2::date
        AND a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND c.estado = 'ACTIVO'::public.estado_cliente;
    `;
    const { rows: rowsHoy } = await query(sqlCobrosHoy, [cobradorId, todayISO]);
    const totalCobrosHoy = Number(rowsHoy[0]?.total_cobros || 0);
    const montoCobrosHoy = Number(rowsHoy[0]?.monto_total || 0);

    const notificacionesHoy = [];
    if (totalCobrosHoy > 0) {
      const hoyId = `hoy-${todayISO}`;
      notificacionesHoy.push({
        id: hoyId,
        categoria: 'COBROS_HOY',
        titulo: 'Cobros programados de hoy',
        mensaje: totalCobrosHoy === 1
          ? 'Tienes 1 cliente pendiente de cobro para el día de hoy.'
          : `Tienes ${totalCobrosHoy} clientes pendientes de cobro para el día de hoy.`,
        monto: montoCobrosHoy,
        fecha: todayISO,
        fecha_texto: 'Hoy',
        tab: 'pendientes',
        icono: 'Calendar',
        prioridad: 2,
        accion: 'Ver cobros de hoy',
        vista: seenNotificationIds.has(hoyId)
      });
    }

    // 2. Clientes Reprogramados para Hoy (PASADOS_PARA_HOY)
    const sqlPasadosHoy = `
      SELECT 
        a.id AS agenda_id,
        a.prestamo_id,
        a.cliente_id,
        to_char(a.fecha_programada_original, 'YYYY-MM-DD') AS fecha_original,
        to_char(a.fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_cobro,
        a.monto_cuota,
        a.veces_pasado,
        c.nombre,
        c.apellidos,
        a.dia_semana_actual
      FROM agenda_cobros a
      JOIN prestamos p ON a.prestamo_id = p.id
      JOIN clientes c ON a.cliente_id = c.id
      WHERE a.cobrador_id = $1
        AND a.fecha_cobro_actual = $2::date
        AND a.estado = 'PASADO_DE_DIA'::public.estado_cuota_cobro
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND c.estado = 'ACTIVO'::public.estado_cliente
      ORDER BY a.numero_cobro ASC, c.nombre ASC;
    `;
    const { rows: rowsPasados } = await query(sqlPasadosHoy, [cobradorId, todayISO]);
    const notificacionesPasados = rowsPasados.map((row) => {
      const clienteNombre = [row.nombre, row.apellidos].filter(Boolean).join(' ').trim();
      const pasadoId = `pasado-${row.agenda_id}`;
      return {
        id: pasadoId,
        categoria: 'PASADOS_PARA_HOY',
        titulo: `Reprogramado para hoy: ${clienteNombre}`,
        mensaje: 'Pospuesto de una fecha anterior para cobrar en la ruta de hoy.',
        monto: Number(row.monto_cuota || 0),
        fecha: todayISO,
        fecha_texto: 'Hoy',
        tab: 'pendientes',
        cliente_id: row.cliente_id,
        prestamo_id: row.prestamo_id,
        icono: 'Clock',
        prioridad: 3,
        accion: 'Ver en cobros de hoy',
        vista: seenNotificationIds.has(pasadoId)
      };
    });

    // 3. Cobros de Días Pasados sin Marcar (COBROS_PENDIENTES_ANTERIORES)
    const sqlCobrosAnteriores = `
      SELECT 
        a.id AS agenda_id,
        a.prestamo_id,
        a.cliente_id,
        to_char(a.fecha_cobro_actual, 'YYYY-MM-DD') AS fecha_cobro,
        a.monto_cuota,
        c.nombre,
        c.apellidos,
        p.modalidad
      FROM agenda_cobros a
      JOIN prestamos p ON a.prestamo_id = p.id
      JOIN clientes c ON a.cliente_id = c.id
      WHERE a.cobrador_id = $1
        AND a.fecha_cobro_actual < $2::date
        AND a.estado IN ('PENDIENTE'::public.estado_cuota_cobro, 'PASADO_DE_DIA'::public.estado_cuota_cobro)
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND c.estado = 'ACTIVO'::public.estado_cliente
      ORDER BY a.fecha_cobro_actual ASC, c.nombre ASC;
    `;
    const { rows: rowsAnteriores } = await query(sqlCobrosAnteriores, [cobradorId, todayISO]);
    const notificacionesAnteriores = rowsAnteriores.map((row) => {
      const clienteNombre = [row.nombre, row.apellidos].filter(Boolean).join(' ').trim();
      const fechaLegible = formatReadableDate(row.fecha_cobro);
      const pendienteId = `pendiente-${row.agenda_id}`;
      return {
        id: pendienteId,
        categoria: 'COBROS_PENDIENTES_ANTERIORES',
        titulo: `Cobro pendiente de ${clienteNombre}`,
        mensaje: `Cuota pendiente del ${fechaLegible} sin registrar.`,
        monto: Number(row.monto_cuota || 0),
        fecha: row.fecha_cobro,
        fecha_texto: fechaLegible,
        tab: 'pendientes',
        cliente_id: row.cliente_id,
        prestamo_id: row.prestamo_id,
        icono: 'Clock',
        prioridad: 1,
        accion: 'Revisar este cobro',
        vista: seenNotificationIds.has(pendienteId)
      };
    });

    // 4. Clientes con Atraso Acumulado (ATRASOS_ACUMULADOS) - periodos_atrasados_acumulados >= 1
    const sqlAtrasados = `
      SELECT 
        p.id AS prestamo_id,
        p.cliente_id,
        p.cuota,
        p.modalidad,
        p.periodos_atrasados_acumulados,
        (p.cuota * p.periodos_atrasados_acumulados)::numeric AS monto_atrasado,
        c.nombre,
        c.apellidos,
        c.telefono
      FROM prestamos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.cobrador_id = $1
        AND p.periodos_atrasados_acumulados >= 1
        AND p.estado IN ('ACTIVO'::public.estado_prestamo, 'ATRASADO'::public.estado_prestamo, 'ARREGLO_PAGO'::public.estado_prestamo, 'RENOVADO'::public.estado_prestamo)
        AND c.estado = 'ACTIVO'::public.estado_cliente
      ORDER BY p.periodos_atrasados_acumulados DESC, c.nombre ASC;
    `;
    const { rows: rowsAtrasados } = await query(sqlAtrasados, [cobradorId]);
    const notificacionesAtrasados = rowsAtrasados.map((row) => {
      const clienteNombre = [row.nombre, row.apellidos].filter(Boolean).join(' ').trim();
      const nPeriodos = Number(row.periodos_atrasados_acumulados || 0);
      const unidad = row.modalidad === 'SEMANAL'
        ? (nPeriodos === 1 ? 'semana' : 'semanas')
        : (nPeriodos === 1 ? 'quincena' : 'quincenas');
      const atrasoId = `atraso-${row.prestamo_id}-${nPeriodos}`;

      return {
        id: atrasoId,
        categoria: 'ATRASOS_ACUMULADOS',
        titulo: `Atraso acumulado de ${clienteNombre}`,
        mensaje: `Acumula ${nPeriodos} ${unidad} sin abonar cuotas.`,
        monto: Number(row.monto_atrasado || 0),
        periodos_atrasados: nPeriodos,
        modalidad: row.modalidad,
        fecha: todayISO,
        fecha_texto: 'Atraso activo',
        tab: 'atrasados',
        cliente_id: row.cliente_id,
        prestamo_id: row.prestamo_id,
        icono: 'AlertTriangle',
        prioridad: 4,
        accion: 'Ver en lista de atrasados',
        vista: seenNotificationIds.has(atrasoId)
      };
    });

    // 5. Notificaciones directas registradas en la tabla notificaciones (ej. cobros compartidos)
    const sqlDirectas = `
      SELECT id, titulo, mensaje, monto_resaltado, fecha_creacion, leida
      FROM notificaciones
      WHERE usuario_id = $1::uuid
      ORDER BY fecha_creacion DESC
      LIMIT 15;
    `;
    const { rows: rowsDirectas } = await query(sqlDirectas, [cobradorId]);
    const notificacionesDirectas = rowsDirectas.map((row) => {
      const notifId = `dbnotif-${row.id}`;
      return {
        id: notifId,
        categoria: 'COBROS_COMPARTIDOS',
        titulo: row.titulo,
        mensaje: row.mensaje,
        monto: Number(row.monto_resaltado || 0),
        fecha: todayISO,
        fecha_texto: 'Aviso directo',
        tab: 'pendientes',
        icono: 'Share2',
        prioridad: 1,
        accion: 'Ver cobros',
        vista: seenNotificationIds.has(notifId) || Boolean(row.leida)
      };
    });

    // Combinar en orden de atención prioritaria:
    // 1. Avisos y cobros compartidos asignados
    // 2. Cobros anteriores sin marcar (urgente ponerse al día)
    // 3. Resumen de cobros de hoy
    // 4. Clientes reprogramados para hoy
    // 5. Atrasos acumulados
    const todas = [
      ...notificacionesDirectas,
      ...notificacionesAnteriores,
      ...notificacionesHoy,
      ...notificacionesPasados,
      ...notificacionesAtrasados
    ];

    const nuevasList = todas.filter((n) => !n.vista);
    const vistasList = todas.filter((n) => n.vista);

    return res.json({
      success: true,
      fecha: todayISO,
      total: todas.length,
      total_nuevas: nuevasList.length,
      total_vistas: vistasList.length,
      categorias: {
        COBROS_HOY: notificacionesHoy,
        PASADOS_PARA_HOY: notificacionesPasados,
        COBROS_PENDIENTES_ANTERIORES: notificacionesAnteriores,
        COBROS_OLVIDADOS: notificacionesAnteriores, // Compatibilidad retroactiva
        ATRASOS_ACUMULADOS: notificacionesAtrasados
      },
      notificaciones: todas
    });
  } catch (err) {
    console.error('[Notificaciones Controller] Error al obtener notificaciones:', err);
    return res.status(500).json({
      success: false,
      error: 'No se pudieron consultar las notificaciones en este momento.',
      userMessage: 'No se pudieron consultar las notificaciones en este momento.',
      ...debugPayload(err),
      total: 0,
      notificaciones: []
    });
  }
}

export async function marcarNotificacionVista(req, res) {
  try {
    await ensureTableAndLoadSeen();
    const { id, ids } = req.body || {};
    const toMark = [];

    if (id && typeof id === 'string') {
      toMark.push(id.trim());
    }
    if (Array.isArray(ids)) {
      for (const item of ids) {
        if (item && typeof item === 'string') {
          toMark.push(item.trim());
        }
      }
    }

    if (toMark.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No se enviaron identificadores válidos.',
        userMessage: 'Debes indicar la notificación que deseas marcar como revisada.'
      });
    }

    for (const nId of toMark) {
      seenNotificationIds.add(nId);
      await query(
        `INSERT INTO notificaciones_revisadas (notificacion_id)
         VALUES ($1)
         ON CONFLICT (notificacion_id) DO NOTHING;`,
        [nId]
      );
    }

    return res.json({
      success: true,
      marcados: toMark,
      total_vistos: seenNotificationIds.size
    });
  } catch (err) {
    console.error('[Notificaciones Controller] Error al marcar revisada:', err);
    return res.status(500).json({
      success: false,
      error: 'Error interno al registrar notificación como revisada.',
      userMessage: 'No se pudo actualizar el estado de la notificación.',
      ...debugPayload(err)
    });
  }
}

export default { getNotificaciones, marcarNotificacionVista };
