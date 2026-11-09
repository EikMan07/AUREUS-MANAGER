import { pool, query, debugPayload } from '../config/db.js';
import { getDefaultCobradorId } from '../services/seedService.js';

const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const SPANISH_MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const SPANISH_WEEKDAYS = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

const SPANISH_WEEKDAYS_SHORT = [
  'Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'
];

/**
 * Obtiene la fecha actual en formato ISO 'YYYY-MM-DD' en la zona horaria de Costa Rica
 */
function getTodayCostaRicaISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Costa_Rica',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

/**
 * Suma o resta días a una fecha ISO 'YYYY-MM-DD'
 */
function addDaysISO(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dateObj.setUTCDate(dateObj.getUTCDate() + days);
  return dateObj.toISOString().slice(0, 10);
}

/**
 * Formatea una fecha ISO a texto completo en español:
 * Ej: 'Lunes, 2 de Noviembre de 2026'
 */
function formatFullSpanishDate(isoDateStr) {
  if (!isoDateStr) return '';
  const [y, m, d] = isoDateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayName = SPANISH_WEEKDAYS[dateObj.getUTCDay()];
  const monthName = SPANISH_MONTHS[m - 1];
  return `${dayName}, ${d} de ${monthName} de ${y}`;
}

/**
 * Obtiene el lunes de la semana para una fecha ISO dada
 */
function getMondayOfISOWeek(isoDateStr) {
  const [y, m, d] = isoDateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const dayOfWeek = dateObj.getUTCDay(); // 0 Dom, 1 Lun, ... 6 Sáb
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  dateObj.setUTCDate(dateObj.getUTCDate() + offsetToMonday);
  return dateObj.toISOString().slice(0, 10);
}

/**
 * 1. GET /api/resumen
 * Métricas generales y distribución circular de estado de clientes en tiempo real
 */
export async function getResumenMetricas(req, res) {
  try {
    const cobradorId = req.query.cobrador_id || req.user?.id || await getDefaultCobradorId();
    const todayISO = getTodayCostaRicaISO();

    // 1. Cobrado Hoy
    const sqlCobradoHoy = `
      SELECT 
        COALESCE(SUM(a.monto_total_cobrado), 0)::numeric AS monto,
        COUNT(DISTINCT a.id)::int AS clientes_cobrados_hoy
      FROM agenda_cobros a
      WHERE a.cobrador_id = $1 
        AND a.estado = 'REGISTRADO'
        AND (
          (a.fecha_hora_registro_pago AT TIME ZONE 'America/Costa_Rica')::date = $2::date
          OR a.fecha_cobro_actual = $2::date
        );
    `;

    const sqlProgramadosHoy = `
      SELECT COUNT(DISTINCT id)::int AS programados_hoy
      FROM agenda_cobros
      WHERE cobrador_id = $1
        AND fecha_cobro_actual = $2::date
        AND estado IN ('PENDIENTE', 'REGISTRADO', 'NO_PAGO');
    `;

    // 2. Cobrado este mes y mes anterior
    const sqlMeses = `
      SELECT
        COALESCE(SUM(CASE 
          WHEN date_trunc('month', COALESCE(fecha_hora_registro_pago, fecha_cobro_actual::timestamp with time zone) AT TIME ZONE 'America/Costa_Rica') 
             = date_trunc('month', $2::date)
          THEN monto_total_cobrado ELSE 0 END), 0)::numeric AS monto_este_mes,

        COALESCE(SUM(CASE 
          WHEN date_trunc('month', COALESCE(fecha_hora_registro_pago, fecha_cobro_actual::timestamp with time zone) AT TIME ZONE 'America/Costa_Rica') 
             = date_trunc('month', $2::date - INTERVAL '1 month')
          THEN monto_total_cobrado ELSE 0 END), 0)::numeric AS monto_mes_anterior
      FROM agenda_cobros
      WHERE cobrador_id = $1 AND estado = 'REGISTRADO';
    `;

    // 3. Total Prestado y Préstamos Vigentes
    const sqlPrestamosVigentes = `
      SELECT
        COALESCE(SUM(monto_prestado), 0)::numeric AS total_prestado,
        COUNT(id)::int AS prestamos_vigentes_count,
        COALESCE(SUM(monto_total_financiar - monto_prestado), 0)::numeric AS ganancia_proyectada,
        COALESCE(SUM(saldo_por_pagar), 0)::numeric AS saldo_por_cobrar,
        COUNT(CASE WHEN periodos_atrasados_acumulados > 0 OR estado = 'ATRASADO' THEN 1 END)::int AS prestamos_con_atraso
      FROM prestamos
      WHERE cobrador_id = $1
        AND estado IN ('ACTIVO', 'ATRASADO', 'ARREGLO_PAGO', 'RENOVADO');
    `;

    // 4. Moratorias acumuladas cobradas
    const sqlMoratorias = `
      SELECT COALESCE(SUM(monto_moratoria), 0)::numeric AS total_moratorias
      FROM agenda_cobros
      WHERE cobrador_id = $1 AND estado = 'REGISTRADO';
    `;

    // 5. Efectividad por modalidad (Semanal y Quincenal)
    const sqlEfectividadModalidades = `
      SELECT 
        p.modalidad,
        COUNT(CASE WHEN a.estado = 'REGISTRADO' THEN 1 END)::int AS cobradas,
        COUNT(a.id)::int AS evaluadas
      FROM agenda_cobros a
      JOIN prestamos p ON a.prestamo_id = p.id
      WHERE a.cobrador_id = $1
        AND (a.estado IN ('REGISTRADO', 'NO_PAGO') OR a.fecha_cobro_actual <= $2::date)
      GROUP BY p.modalidad;
    `;

    // 6. Capital en Arreglos de Pago
    const sqlArreglos = `
      SELECT 
        COALESCE(SUM(p.saldo_por_pagar), 0)::numeric AS capital_arreglos,
        COUNT(DISTINCT p.id)::int AS arreglos_count
      FROM prestamos p
      WHERE p.cobrador_id = $1
        AND (
          p.estado = 'ARREGLO_PAGO'
          OR EXISTS (SELECT 1 FROM arreglos_pago ap WHERE ap.prestamo_id = p.id AND ap.activo = true)
        );
    `;

    // 7. Distribución de Clientes (Gráfico Circular)
    const sqlDistribucion = `
      WITH clientes_prestamos_vigentes AS (
        SELECT DISTINCT
          c.id AS cliente_id,
          p.id AS prestamo_id,
          p.estado AS prestamo_estado,
          p.modalidad,
          p.periodos_atrasados_acumulados
        FROM clientes c
        JOIN prestamos p ON p.cliente_id = c.id
        WHERE c.cobrador_id = $1
          AND c.estado = 'ACTIVO'
          AND p.estado IN ('ACTIVO', 'ATRASADO', 'ARREGLO_PAGO', 'RENOVADO')
      ),
      clientes_clasificados AS (
        SELECT 
          cpv.cliente_id,
          CASE
            -- Categoría 1: Atrasados o con Arreglo de Pago
            WHEN cpv.prestamo_estado IN ('ATRASADO', 'ARREGLO_PAGO')
                 OR (cpv.modalidad = 'SEMANAL' AND cpv.periodos_atrasados_acumulados >= 4)
                 OR (cpv.modalidad = 'QUINCENAL' AND cpv.periodos_atrasados_acumulados >= 2)
            THEN 'atrasadosYArreglos'

            -- Categoría 2: Pasados de día esta semana
            WHEN EXISTS (
              SELECT 1 FROM agenda_cobros a
              WHERE a.cliente_id = cpv.cliente_id
                AND a.fecha_cobro_actual >= date_trunc('week', $2::date)::date
                AND a.fecha_cobro_actual < (date_trunc('week', $2::date) + INTERVAL '7 days')::date
                AND (a.veces_pasado > 0 OR a.estado = 'PASADO_DE_DIA')
            )
            THEN 'pasadosEstaSemana'

            -- Categoría 3: Al día
            ELSE 'clientesAlDia'
          END AS categoria
        FROM clientes_prestamos_vigentes cpv
      )
      SELECT 
        categoria,
        COUNT(DISTINCT cliente_id)::int AS cantidad
      FROM clientes_clasificados
      GROUP BY categoria;
    `;

    // Ejecutar todas las consultas en paralelo
    const [
      resHoy,
      resProg,
      resMeses,
      resPrestamos,
      resMoratorias,
      resModalidades,
      resArreglos,
      resDistribucion
    ] = await Promise.all([
      query(sqlCobradoHoy, [cobradorId, todayISO]),
      query(sqlProgramadosHoy, [cobradorId, todayISO]),
      query(sqlMeses, [cobradorId, todayISO]),
      query(sqlPrestamosVigentes, [cobradorId]),
      query(sqlMoratorias, [cobradorId]),
      query(sqlEfectividadModalidades, [cobradorId, todayISO]),
      query(sqlArreglos, [cobradorId]),
      query(sqlDistribucion, [cobradorId, todayISO])
    ]);

    // Procesar Cobrado Hoy
    const montoHoy = Number(resHoy.rows[0]?.monto || 0);
    const clientesCobradosHoy = Number(resHoy.rows[0]?.clientes_cobrados_hoy || 0);
    const clientesProgramadosHoy = Number(resProg.rows[0]?.programados_hoy || 0);
    const efectividadHoyPct = clientesProgramadosHoy > 0
      ? Math.min(100, Math.round((clientesCobradosHoy / clientesProgramadosHoy) * 100))
      : (clientesCobradosHoy > 0 ? 100 : 0);

    // Procesar Meses
    const montoEsteMes = Number(resMeses.rows[0]?.monto_este_mes || 0);
    const montoMesAnterior = Number(resMeses.rows[0]?.monto_mes_anterior || 0);
    let variacionMesPct = 0;
    if (montoMesAnterior > 0) {
      variacionMesPct = Math.round(((montoEsteMes - montoMesAnterior) / montoMesAnterior) * 100);
    } else if (montoEsteMes > 0) {
      variacionMesPct = 100;
    }

    // Procesar Préstamos
    const totalPrestado = Number(resPrestamos.rows[0]?.total_prestado || 0);
    const prestamosVigentesCount = Number(resPrestamos.rows[0]?.prestamos_vigentes_count || 0);
    const gananciaProyectada = Number(resPrestamos.rows[0]?.ganancia_proyectada || 0);
    const saldoPorCobrar = Number(resPrestamos.rows[0]?.saldo_por_cobrar || 0);
    const prestamosConAtrasoCount = Number(resPrestamos.rows[0]?.prestamos_con_atraso || 0);

    // Procesar Moratorias
    const totalMoratoriasCobradas = Number(resMoratorias.rows[0]?.total_moratorias || 0);

    // Procesar Efectividad Modalidades
    let semanalPct = 100;
    let quincenalPct = 100;
    resModalidades.rows.forEach(r => {
      const cov = Number(r.cobradas || 0);
      const evalTotal = Number(r.evaluadas || 0);
      const pct = evalTotal > 0 ? Math.min(100, Math.round((cov / evalTotal) * 100)) : 100;
      if (r.modalidad === 'SEMANAL') semanalPct = pct;
      if (r.modalidad === 'QUINCENAL') quincenalPct = pct;
    });

    // Procesar Arreglos
    const capitalEnArreglos = Number(resArreglos.rows[0]?.capital_arreglos || 0);
    const arreglosActivosCount = Number(resArreglos.rows[0]?.arreglos_count || 0);

    // Procesar Distribución de Clientes
    let cantAtrasados = 0;
    let cantPasados = 0;
    let cantAlDia = 0;

    resDistribucion.rows.forEach(r => {
      const c = Number(r.cantidad || 0);
      if (r.categoria === 'atrasadosYArreglos') cantAtrasados = c;
      if (r.categoria === 'pasadosEstaSemana') cantPasados = c;
      if (r.categoria === 'clientesAlDia') cantAlDia = c;
    });

    const totalClientesActivos = cantAtrasados + cantPasados + cantAlDia;
    const pctAtrasados = totalClientesActivos > 0 ? Math.round((cantAtrasados / totalClientesActivos) * 100) : 0;
    const pctPasados = totalClientesActivos > 0 ? Math.round((cantPasados / totalClientesActivos) * 100) : 0;
    const pctAlDia = totalClientesActivos > 0 ? Math.max(0, 100 - pctAtrasados - pctPasados) : 0;

    return res.json({
      fechaActual: todayISO,
      fechaActualTexto: formatFullSpanishDate(todayISO),
      cobradoHoy: {
        monto: montoHoy,
        clientesCobradosHoy,
        clientesProgramadosHoy,
        efectividadHoyPct
      },
      cobradoEsteMes: {
        monto: montoEsteMes,
        montoMesAnterior,
        variacionMesPct
      },
      totalPrestado: {
        monto: totalPrestado,
        prestamosVigentesCount
      },
      gananciaProyectada: {
        monto: gananciaProyectada,
        saldoPorCobrar
      },
      moratoriasYAtrasos: {
        totalMoratoriasCobradas,
        prestamosConAtrasoCount
      },
      efectividadPorModalidad: {
        semanalPct,
        quincenalPct
      },
      capitalEnArreglos: {
        monto: capitalEnArreglos,
        arreglosActivosCount
      },
      distribucionClientes: {
        totalClientesActivos,
        atrasadosYArreglos: {
          cantidad: cantAtrasados,
          porcentaje: pctAtrasados
        },
        pasadosEstaSemana: {
          cantidad: cantPasados,
          porcentaje: pctPasados
        },
        clientesAlDia: {
          cantidad: cantAlDia,
          porcentaje: pctAlDia
        }
      }
    });
  } catch (err) {
    console.error('[Error SQL detallado]: Error al obtener métricas generales de resumen:', err);
    return res.status(500).json({
      error: 'No se pudieron consultar las estadísticas generales en este momento.',
      userMessage: 'No se pudieron consultar las estadísticas generales en este momento.',
      ...debugPayload(err)
    });
  }
}

/**
 * 2. GET /api/resumen/tendencia?tipo=DIA|SEMANA|MES|ANIO|INICIO&cantidad=N
 * Construye la serie temporal de montos cobrados según el filtro elegido
 */
export async function getResumenTendencia(req, res) {
  try {
    const cobradorId = req.query.cobrador_id || req.user?.id || await getDefaultCobradorId();
    const todayISO = getTodayCostaRicaISO();
    const tipo = (req.query.tipo || 'DIA').toUpperCase();
    let cantidad = parseInt(req.query.cantidad, 10);

    const puntos = [];

    if (tipo === 'DIA') {
      // Días (límite de 1 a 7)
      if (isNaN(cantidad) || cantidad < 1) cantidad = 7;
      if (cantidad > 7) cantidad = 7;

      for (let i = cantidad - 1; i >= 0; i--) {
        const dISO = addDaysISO(todayISO, -i);
        const [y, m, d] = dISO.split('-').map(Number);
        const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        const dayShort = SPANISH_WEEKDAYS_SHORT[dateObj.getUTCDay()];

        const etiqueta = i === 0 ? 'Hoy' : `${dayShort} ${d}`;
        const fechaCompleta = formatFullSpanishDate(dISO);

        const sqlPunto = `
          SELECT COALESCE(SUM(monto_total_cobrado), 0)::numeric AS monto
          FROM agenda_cobros
          WHERE cobrador_id = $1 
            AND estado = 'REGISTRADO'
            AND (
              (fecha_hora_registro_pago AT TIME ZONE 'America/Costa_Rica')::date = $2::date
              OR fecha_cobro_actual = $2::date
            );
        `;
        const { rows } = await query(sqlPunto, [cobradorId, dISO]);
        puntos.push({
          etiqueta,
          fechaCompleta,
          fechaISO: dISO,
          monto: Number(rows[0]?.monto || 0)
        });
      }
    } else if (tipo === 'SEMANA') {
      // Semanas (límite de 1 a 4)
      if (isNaN(cantidad) || cantidad < 1) cantidad = 4;
      if (cantidad > 4) cantidad = 4;

      const currentMondayISO = getMondayOfISOWeek(todayISO);

      for (let w = cantidad - 1; w >= 0; w--) {
        const mondayISO = addDaysISO(currentMondayISO, -w * 7);
        const sundayISO = addDaysISO(mondayISO, 6);

        const [, m1, d1] = mondayISO.split('-').map(Number);
        const [, m2, d2] = sundayISO.split('-').map(Number);
        const month1Short = SPANISH_MONTHS_SHORT[m1 - 1];
        const month2Short = SPANISH_MONTHS_SHORT[m2 - 1];

        const etiqueta = w === 0 ? 'Esta sem' : `Sem ${cantidad - w}`;
        const fechaCompleta = `${d1} ${month1Short} a ${d2} ${month2Short}`;

        const sqlPunto = `
          SELECT COALESCE(SUM(monto_total_cobrado), 0)::numeric AS monto
          FROM agenda_cobros
          WHERE cobrador_id = $1 
            AND estado = 'REGISTRADO'
            AND COALESCE((fecha_hora_registro_pago AT TIME ZONE 'America/Costa_Rica')::date, fecha_cobro_actual) 
              BETWEEN $2::date AND $3::date;
        `;
        const { rows } = await query(sqlPunto, [cobradorId, mondayISO, sundayISO]);
        puntos.push({
          etiqueta,
          fechaCompleta,
          monto: Number(rows[0]?.monto || 0)
        });
      }
    } else if (tipo === 'MES') {
      // Meses (límite de 1 a 12)
      if (isNaN(cantidad) || cantidad < 1) cantidad = 6;
      if (cantidad > 12) cantidad = 12;

      const [curY, curM] = todayISO.split('-').map(Number);

      for (let m = cantidad - 1; m >= 0; m--) {
        let targetMonth = curM - m;
        let targetYear = curY;
        while (targetMonth <= 0) {
          targetMonth += 12;
          targetYear -= 1;
        }

        const monthShort = SPANISH_MONTHS_SHORT[targetMonth - 1];
        const monthFull = SPANISH_MONTHS[targetMonth - 1];
        const etiqueta = `${monthShort}`;
        const fechaCompleta = `${monthFull} de ${targetYear}`;

        const sqlPunto = `
          SELECT COALESCE(SUM(monto_total_cobrado), 0)::numeric AS monto
          FROM agenda_cobros
          WHERE cobrador_id = $1 
            AND estado = 'REGISTRADO'
            AND EXTRACT(YEAR FROM COALESCE(fecha_hora_registro_pago, fecha_cobro_actual::timestamp with time zone) AT TIME ZONE 'America/Costa_Rica') = $2
            AND EXTRACT(MONTH FROM COALESCE(fecha_hora_registro_pago, fecha_cobro_actual::timestamp with time zone) AT TIME ZONE 'America/Costa_Rica') = $3;
        `;
        const { rows } = await query(sqlPunto, [cobradorId, targetYear, targetMonth]);
        puntos.push({
          etiqueta,
          fechaCompleta,
          monto: Number(rows[0]?.monto || 0)
        });
      }
    } else if (tipo === 'ANIO') {
      // Años (sin límite fijo: 1, 2, 3, 5, 10...)
      if (isNaN(cantidad) || cantidad < 1) cantidad = 1;

      const [curY] = todayISO.split('-').map(Number);

      if (cantidad === 1) {
        // Si elige 1 año, muestra los meses del año actual hasta hoy
        const [, curM] = todayISO.split('-').map(Number);
        for (let m = 1; m <= curM; m++) {
          const monthShort = SPANISH_MONTHS_SHORT[m - 1];
          const monthFull = SPANISH_MONTHS[m - 1];
          const etiqueta = `${monthShort}`;
          const fechaCompleta = `${monthFull} de ${curY}`;

          const sqlPunto = `
            SELECT COALESCE(SUM(monto_total_cobrado), 0)::numeric AS monto
            FROM agenda_cobros
            WHERE cobrador_id = $1 
              AND estado = 'REGISTRADO'
              AND EXTRACT(YEAR FROM COALESCE(fecha_hora_registro_pago, fecha_cobro_actual::timestamp with time zone) AT TIME ZONE 'America/Costa_Rica') = $2
              AND EXTRACT(MONTH FROM COALESCE(fecha_hora_registro_pago, fecha_cobro_actual::timestamp with time zone) AT TIME ZONE 'America/Costa_Rica') = $3;
          `;
          const { rows } = await query(sqlPunto, [cobradorId, curY, m]);
          puntos.push({
            etiqueta,
            fechaCompleta,
            monto: Number(rows[0]?.monto || 0)
          });
        }
      } else {
        // Multi-año: agrupa por cada uno de los N años
        for (let a = cantidad - 1; a >= 0; a--) {
          const targetYear = curY - a;
          const etiqueta = `${targetYear}`;
          const fechaCompleta = `Año ${targetYear}`;

          const sqlPunto = `
            SELECT COALESCE(SUM(monto_total_cobrado), 0)::numeric AS monto
            FROM agenda_cobros
            WHERE cobrador_id = $1 
              AND estado = 'REGISTRADO'
              AND EXTRACT(YEAR FROM COALESCE(fecha_hora_registro_pago, fecha_cobro_actual::timestamp with time zone) AT TIME ZONE 'America/Costa_Rica') = $2;
          `;
          const { rows } = await query(sqlPunto, [cobradorId, targetYear]);
          puntos.push({
            etiqueta,
            fechaCompleta,
            monto: Number(rows[0]?.monto || 0)
          });
        }
      }
    } else if (tipo === 'INICIO') {
      // Todo el historial desde el primer registro hasta hoy
      const sqlMinDate = `
        SELECT MIN(fecha_min)::date AS min_date
        FROM (
          SELECT MIN(fecha_cobro_actual) AS fecha_min FROM agenda_cobros WHERE cobrador_id = $1 AND estado = 'REGISTRADO'
          UNION ALL
          SELECT MIN(fecha_inicio) AS fecha_min FROM prestamos WHERE cobrador_id = $1
        ) t;
      `;
      const { rows: minRows } = await query(sqlMinDate, [cobradorId]);
      const minDateISO = minRows[0]?.min_date ? minRows[0].min_date.toISOString().slice(0, 10) : addDaysISO(todayISO, -30);

      // Si la historia abarca menos de 60 días, agrupa por semanas o días
      const [y1, m1, d1] = minDateISO.split('-').map(Number);
      const [y2, m2, d2] = todayISO.split('-').map(Number);
      const diffDays = Math.max(1, Math.round((new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / (1000 * 60 * 60 * 24)));

      if (diffDays <= 14) {
        // Menos de 2 semanas: mostrar día a día
        for (let i = diffDays; i >= 0; i--) {
          const dISO = addDaysISO(todayISO, -i);
          const [y, m, d] = dISO.split('-').map(Number);
          const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
          const dayShort = SPANISH_WEEKDAYS_SHORT[dateObj.getUTCDay()];

          const etiqueta = i === 0 ? 'Hoy' : `${dayShort} ${d}`;
          const fechaCompleta = formatFullSpanishDate(dISO);

          const sqlPunto = `
            SELECT COALESCE(SUM(monto_total_cobrado), 0)::numeric AS monto
            FROM agenda_cobros
            WHERE cobrador_id = $1 
              AND estado = 'REGISTRADO'
              AND (
                (fecha_hora_registro_pago AT TIME ZONE 'America/Costa_Rica')::date = $2::date
                OR fecha_cobro_actual = $2::date
              );
          `;
          const { rows } = await query(sqlPunto, [cobradorId, dISO]);
          puntos.push({
            etiqueta,
            fechaCompleta,
            monto: Number(rows[0]?.monto || 0)
          });
        }
      } else {
        // Agrupar por meses desde el inicio
        let curYearIter = y1;
        let curMonthIter = m1;

        while (curYearIter < y2 || (curYearIter === y2 && curMonthIter <= m2)) {
          const monthShort = SPANISH_MONTHS_SHORT[curMonthIter - 1];
          const monthFull = SPANISH_MONTHS[curMonthIter - 1];
          const etiqueta = `${monthShort}`;
          const fechaCompleta = `${monthFull} de ${curYearIter}`;

          const sqlPunto = `
            SELECT COALESCE(SUM(monto_total_cobrado), 0)::numeric AS monto
            FROM agenda_cobros
            WHERE cobrador_id = $1 
              AND estado = 'REGISTRADO'
              AND EXTRACT(YEAR FROM COALESCE(fecha_hora_registro_pago, fecha_cobro_actual::timestamp with time zone) AT TIME ZONE 'America/Costa_Rica') = $2
              AND EXTRACT(MONTH FROM COALESCE(fecha_hora_registro_pago, fecha_cobro_actual::timestamp with time zone) AT TIME ZONE 'America/Costa_Rica') = $3;
          `;
          const { rows } = await query(sqlPunto, [cobradorId, curYearIter, curMonthIter]);
          puntos.push({
            etiqueta,
            fechaCompleta,
            monto: Number(rows[0]?.monto || 0)
          });

          curMonthIter++;
          if (curMonthIter > 12) {
            curMonthIter = 1;
            curYearIter++;
          }
        }
      }
    }

    // Calcular los 3 indicadores analíticos del período
    let puntoMasAlto = puntos[0] || { etiqueta: '', fechaCompleta: '', monto: 0 };
    let puntoMasBajo = puntos[0] || { etiqueta: '', fechaCompleta: '', monto: 0 };
    let totalCobradoPeriodo = 0;

    puntos.forEach(p => {
      totalCobradoPeriodo += p.monto;
      if (p.monto > puntoMasAlto.monto) {
        puntoMasAlto = p;
      }
      if (p.monto < puntoMasBajo.monto) {
        puntoMasBajo = p;
      }
    });

    const promedio = puntos.length > 0 ? Math.round(totalCobradoPeriodo / puntos.length) : 0;
    let variacionPct = 0;
    if (puntos.length >= 2) {
      const primero = puntos[0].monto;
      const ultimo = puntos[puntos.length - 1].monto;
      if (primero > 0) {
        variacionPct = Math.round(((ultimo - primero) / primero) * 100);
      } else if (ultimo > 0) {
        variacionPct = 100;
      }
    }

    return res.json({
      tipo,
      cantidad,
      puntos,
      puntoMasAlto,
      puntoMasBajo,
      promedioYVariacion: {
        promedio,
        variacionPct
      }
    });
  } catch (err) {
    console.error('[Error SQL detallado]: Error al obtener tendencia de cobros:', err);
    return res.status(500).json({
      error: 'No se pudo consultar la tendencia de cobros en este momento.',
      userMessage: 'No se pudo consultar la tendencia de cobros en este momento.',
      ...debugPayload(err)
    });
  }
}

