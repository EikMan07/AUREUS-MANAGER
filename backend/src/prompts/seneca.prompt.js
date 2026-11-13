import { formatearColones, sanitizarTextoVisible } from '../schemas/seneca.schema.js';

function formatContextBlock(contextoCartera) {
  const {
    fechaHoyCR = '',
    fechaMananaCR = '',
    resumenGeneral = {},
    zonas = [],
    clientes = [],
    todosClientesActivos = [],
    agendaHoy = {},
    atrasos = [],
    listaNegra = [],
    papelera = {},
    archivoEliminados = [],
  } = contextoCartera || {};

  const clientesSinDeuda = todosClientesActivos.filter(
    (c) => c.cantidad_prestamos_activos === 0 || Number(c.saldo_total_pendiente || 0) <= 0
  );

  const ubicacionesClientesSinDeuda = Array.from(
    new Set(clientesSinDeuda.map((c) => sanitizarTextoVisible(c.ubicacion || 'Sin ubicación')))
  );

  const zonasText =
    zonas.length > 0
      ? zonas
          .map((z) => {
            const listaClientes = z.clientes_zona
              .map((c) => `${sanitizarTextoVisible(c.nombre)} debe ${formatearColones(c.saldo)}`)
              .join(', ');
            return `- Zona ${sanitizarTextoVisible(z.ubicacion)}: ${z.total_clientes} clientes activos, ${z.total_prestamos} préstamos vigentes, ${z.cobros_hoy_zona} cobros hoy por ${formatearColones(z.monto_cobros_hoy_zona)}, saldo total por cobrar ${formatearColones(z.saldo_por_cobrar_zona)}. Detalle clientes: ${listaClientes || 'sin detalle'}`;
          })
          .join('\n')
      : ubicacionesClientesSinDeuda.length > 0
      ? `- No hay zonas con deuda activa. Ubicaciones con clientes registrados sin préstamos vigentes: ${ubicacionesClientesSinDeuda.join(', ')}.`
      : '- No hay zonas registradas con deuda activa.';

  const clientesDeudaText =
    clientes.length > 0
      ? clientes
          .map((c) => {
            const prestamosDetalle = c.prestamos
              .map(
                (p, idx) =>
                  `Préstamo ${idx + 1}: monto ${formatearColones(p.monto_prestado)}, pagado acumulado ${formatearColones(p.monto_pagado_acumulado)}, saldo ${formatearColones(p.saldo_por_pagar)}, cuota ${formatearColones(p.cuota)} modalidad ${p.modalidad}, pagadas ${p.periodos_pagados} de ${p.total_periodos}, atrasos ${p.periodos_atrasados_acumulados}, veces pasado ${p.veces_pasado}, estado ${p.estado}`
              )
              .join(' | ');
            return `- ${sanitizarTextoVisible(c.nombre_completo)}, cédula ${c.cedula || 'no registrada'}, teléfono principal ${c.telefono || 'no registrado'}, teléfono secundario ${c.telefono_secundario || 'no registrado'}, ubicación ${sanitizarTextoVisible(c.ubicacion || 'Sin ubicación')}: debe en total ${formatearColones(c.saldo_total_pendiente)}, total abonado ${formatearColones(c.total_pagado)} en ${c.cantidad_prestamos_activos} préstamos vigentes, cuota combinada ${formatearColones(c.cuota_total)}, atrasos acumulados ${c.atrasos_acumulados}, veces que pidió pasar de día ${c.veces_pasado_total}, próximo cobro ${c.proximo_cobro_fecha || 'sin fecha pendiente'}. Desglose: ${prestamosDetalle || 'sin préstamos vigentes'}`;
          })
          .join('\n')
      : '- Ningún cliente mantiene préstamos vigentes con saldo pendiente en este momento.';

  const clientesSinDeudaText =
    clientesSinDeuda.length > 0
      ? `\nCLIENTES REGISTRADOS ACTUALMENTE SIN DEUDA ACTIVA:\n${clientesSinDeuda
          .map(
            (c) =>
              `- ${sanitizarTextoVisible(c.nombre_completo)}, cédula ${c.cedula || 'no registrada'}, teléfono principal ${c.telefono || 'no registrado'}, teléfono secundario ${c.telefono_secundario || 'no registrado'}, ubicación ${sanitizarTextoVisible(c.ubicacion || 'Sin ubicación')}: saldo pendiente ₡0, 0 préstamos vigentes`
          )
          .join('\n')}`
      : '';

  const clientesText = `${clientesDeudaText}${clientesSinDeudaText}`;

  const pendientesHoyText =
    Array.isArray(agendaHoy.pendientes) && agendaHoy.pendientes.length > 0
      ? agendaHoy.pendientes
          .map(
            (item) =>
              `- ${sanitizarTextoVisible(item.nombre_completo)} en ${sanitizarTextoVisible(item.ubicacion)}, cuota ${formatearColones(item.monto_cuota)}, estado ${item.es_rezagado ? 'rezagado de días anteriores' : 'programado hoy'}, veces pasado ${item.veces_pasado}`
          )
          .join('\n')
      : '- No quedan cobros pendientes para hoy.';

  const cobrosManana = Array.isArray(agendaHoy.cobros_manana) ? agendaHoy.cobros_manana : [];
  const proximosDias = Array.isArray(agendaHoy.agenda_proximos_dias) ? agendaHoy.agenda_proximos_dias : [];

  const mananaText =
    cobrosManana.length > 0
      ? cobrosManana
          .map(
            (item) =>
              `- ${sanitizarTextoVisible(item.nombre_completo)} en ${sanitizarTextoVisible(item.ubicacion)}, fecha ${item.fecha_cobro_actual}, cuota ${formatearColones(item.monto_cuota)}`
          )
          .join('\n')
      : `- Ningún cobro programado para mañana ${fechaMananaCR || 'siguiente día'}.`;

  const proximosDiasText =
    proximosDias.length > 0
      ? proximosDias
          .map(
            (item) =>
              `- ${item.dia_semana} ${item.fecha_cobro_actual}: ${sanitizarTextoVisible(item.nombre_completo)} en ${sanitizarTextoVisible(item.ubicacion)}, cuota ${formatearColones(item.monto_cuota)}`
          )
          .join('\n')
      : '- Ningún cobro programado en los próximos 7 días.';

  const atrasosText =
    atrasos.length > 0
      ? atrasos
          .map(
            (a) =>
              `- ${sanitizarTextoVisible(a.nombre_completo)} en ${sanitizarTextoVisible(a.ubicacion)}: ${a.atrasos_acumulados} cuotas atrasadas, saldo pendiente ${formatearColones(a.saldo_total_pendiente)}, cuota ${formatearColones(a.cuota_total)}, veces pasado ${a.veces_pasado_total}`
          )
          .join('\n')
      : '- Ningún cliente registra cuotas atrasadas acumuladas.';

  const listaNegraText =
    listaNegra.length > 0
      ? listaNegra
          .map(
            (ln) =>
              `- ${sanitizarTextoVisible(ln.nombre_completo)}, cédula ${ln.cedula || 'sin cédula'}, ingreso ${ln.fecha_registro || 'sin fecha'}`
          )
          .join('\n')
      : '- Lista Negra sin registros activos.';

  const papeleraClientes = Array.isArray(papelera.clientes) ? papelera.clientes : [];
  const papeleraPrestamos = Array.isArray(papelera.prestamos) ? papelera.prestamos : [];

  return `DATOS REALES VERIFICADOS AL CORTE ${fechaHoyCR}:

RESUMEN GENERAL:
- Clientes activos totales: ${todosClientesActivos.length}
- Clientes activos con deuda: ${resumenGeneral.totalClientesConDeuda || 0}
- Préstamos vigentes: ${resumenGeneral.totalPrestamosVigentes || 0}
- Capital prestado vigente: ${formatearColones(resumenGeneral.totalPrestadoVigente || 0)}
- Saldo total por cobrar: ${formatearColones(resumenGeneral.totalPorCobrar || 0)}
- Cobros pendientes hoy: ${agendaHoy.cantidadPendientes || 0} por ${formatearColones(agendaHoy.montoPendienteHoy || 0)}
- Cobros programados para mañana ${fechaMananaCR || ''}: ${cobrosManana.length} por ${formatearColones(agendaHoy.montoManana || 0)}
- Cobros ya recaudados hoy: ${agendaHoy.cantidadRegistradosHoy || 0} por ${formatearColones(agendaHoy.montoRecaudadoHoy || 0)}
- Zonas activas con deuda: ${zonas.length}
- Clientes con atrasos acumulados: ${atrasos.length}
- Registros en Lista Negra: ${listaNegra.length}
- Registros en Papelera: ${papeleraClientes.length} clientes y ${papeleraPrestamos.length} préstamos

POR ZONA O UBICACION:
${zonasText}

AGENDA DE COBROS PENDIENTES HOY:
${pendientesHoyText}

COBROS PROGRAMADOS PARA MAÑANA:
${mananaText}

AGENDA DE PROXIMOS 7 DIAS:
${proximosDiasText}

CLIENTES CON DEUDA ACTIVA Y DESGLOSE DE PRESTAMOS:
${clientesText}

CLIENTES CON ATRASOS ACUMULADOS:
${atrasosText}

LISTA NEGRA:
${listaNegraText}

PAPELERA:
- Clientes en papelera: ${papeleraClientes.length > 0 ? papeleraClientes.map((c) => sanitizarTextoVisible(c.nombre_completo)).join(', ') : 'ninguno'}
- Préstamos en papelera: ${papeleraPrestamos.length > 0 ? papeleraPrestamos.map((p) => `${sanitizarTextoVisible(p.cliente_nombre_completo)} por ${formatearColones(p.saldo_por_pagar)}`).join(', ') : 'ninguno'}

PERSONAS ELIMINADAS DEFINITIVAMENTE (${archivoEliminados.length}):
${
  archivoEliminados.length > 0
    ? archivoEliminados
        .slice(0, 35)
        .map(
          (a) =>
            `- ${sanitizarTextoVisible(a.nombre_completo)} | Cédula: ${a.cedula || 'sin cédula'} | Teléfono: ${a.telefono || 'sin teléfono'} | Préstamos: ${a.total_prestamos} | Total abonado: ${formatearColones(a.total_pagado)} | Saldo sin pagar al eliminar: ${formatearColones(a.saldo_impago)} | Atrasos: ${a.atrasos_totales}`
        )
        .join('\n')
    : '- ninguno'
}`;
}

/**
 * Construye el prompt de sistema de Séneca con reglas anti-alucinación,
 * diferenciación por consulta y reglas estrictas sobre sugerencias.
 */
export function buildSenecaSystemPrompt(contextoCartera) {
  const verifiedBlock = formatContextBlock(contextoCartera);

  return `Eres Séneca, el asesor e inteligencia informativa de Aureus Manager. Tu misión es brindar al prestamista información exacta, inmediata y verificada sobre sus cobros por zona o ubicación, cuánto dinero debe cada cliente, teléfonos y ubicaciones reales, historial de pagos, agenda de hoy y próximos días, atrasos acumulados y registros en Lista Negra o Papelera.

REGLAS ESTRICTAS DE FORMATO Y VERACIDAD:
1. Responde en español claro, formal y directo.
2. Usa siempre el símbolo de colones ₡ con separador de miles, por ejemplo ₡150,000.
3. PROHIBIDO inventar nombres, teléfonos, montos, fechas, cantidades o ubicaciones que no estén en el bloque DATOS REALES VERIFICADOS adjunto. Si preguntan por una persona o zona que no figura en los datos, responde con honestidad que no hay registros para esa consulta.
4. Eres 100 por ciento informativo y consultivo. PROHIBIDO ejecutar, ofrecer o sugerir acciones operativas como programar cobros, llamar por teléfono, enviar mensajes, registrar pagos o modificar préstamos.
5. PROHIBIDO usar barras diagonales, paréntesis curvos ni palabras prohibidas como base de datos, PostgreSQL, SQL, API, endpoint, backend, frontend, JSON, sistema, servidor, aplicativo o cartera en ningún campo de tu respuesta.

REGLA CRITICA DE DIFERENCIACION DE RESPUESTAS:
- Lee con atención exactamente lo que preguntó el usuario y responde de forma específica sin repetir respuestas genéricas anteriores:
  a. Si pregunta por mañana o por un día específico de la semana, revisa COBROS PROGRAMADOS PARA MAÑANA y AGENDA DE PROXIMOS 7 DIAS. Si nadie tiene cobro mañana, responde claramente: Para mañana no tienes ningún cobro programado, e indica cuándo es el próximo cobro registrado si existe alguno.
  b. Si pregunta por el teléfono o contacto de un cliente, entrega directamente su nombre completo, número de teléfono principal y secundario si tiene, junto con su ubicación exacta.
  c. Si pregunta por el historial o detalle de pagos de un cliente, entrega cuántas cuotas lleva pagadas del total de cuotas, cuánto dinero ha abonado hasta hoy, cuánto saldo le falta por pagar y cuántas cuotas atrasadas acumula.

REGLA CRITICA SOBRE LAS 3 SUGERENCIAS:
- Las 3 frases del arreglo sugerencias serán botones que el prestamista tocará para preguntarte a ti, Séneca.
- SIEMPRE deben estar redactadas como consultas informativas directas del prestamista hacia Séneca. Ejemplos correctos: ¿Cuántos cobros tengo en Esparza?, ¿Cuál es el teléfono y ubicación de Eiker Manuel Abarca Murillo?, ¿Cuáles cobros están programados para mañana y los próximos días?, ¿Quiénes están registrados en Lista Negra?
- ESTA ESTRICTAMENTE PROHIBIDO redactar sugerencias en segunda persona preguntándole al usuario qué desea hacer. Nunca escribas frases como ¿Desea programar un cobro para mañana?, ¿Quiere ver el historial de pagos?, ¿Necesita contactar al cliente por teléfono? ni ¿Le gustaría registrar un pago?
- Las 3 sugerencias deben ser distintas entre sí y distintas a lo que el usuario ya preguntó en el historial reciente.

Devuelve únicamente un objeto con exactamente estas cuatro claves:
- respuesta: cadena de texto clara y ejecutiva para el prestamista.
- tarjetas: arreglo de hasta 4 objetos, cada uno con las claves titulo, subtitulo, monto, estado y detalle.
- sugerencias: arreglo de exactamente 3 preguntas cortas informativas formuladas del prestamista hacia Séneca.
- confianza: alta, media o baja.

${verifiedBlock}`;
}

export default buildSenecaSystemPrompt;
