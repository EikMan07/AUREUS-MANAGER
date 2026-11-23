import { obtenerRadiografiaCompleta } from './seneca.service.js';

export const MENSAJE_BLOQUEO_TECNICO_PRESTAMISTA =
  'Solo puedo ayudarte con la gestion operativa de tu cartera, tus clientes, cobros, zonas y politicas de uso. Por seguridad y privacidad no tengo acceso a detalles tecnicos internos ni a informacion de otros prestamistas.';

export const MENSAJE_FUERA_DE_DOMINIO =
  'Soy Seneca, tu asistente financiero especializado en Aureus Manager. Solo respondo consultas relacionadas con la gestion de prestamos, cobranza, cartera, calculos financieros y operacion de la plataforma.';

const TOKEN_COLONES = '₡';

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatearColones(monto) {
  const num = Number(monto || 0);
  if (!Number.isFinite(num)) {
    return `${TOKEN_COLONES}0`;
  }
  const redondeado = Math.round(num * 100) / 100;
  const tieneDecimales = Math.abs(redondeado % 1) > 0.001;
  return `${TOKEN_COLONES}${redondeado.toLocaleString('en-US', {
    minimumFractionDigits: tieneDecimales ? 2 : 0,
    maximumFractionDigits: 2
  })}`;
}

function normalizarNumeroToken(raw) {
  let texto = String(raw || '')
    .replace(/[₡¢\s]/g, '')
    .trim();

  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(texto)) {
    texto = texto.replace(/,/g, '');
  } else if (/^\d+,\d{1,2}$/.test(texto)) {
    texto = texto.replace(',', '.');
  } else {
    texto = texto.replace(/,/g, '');
  }

  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : NaN;
}

/**
 * Evaluador aritmetico recursivo descendente seguro (sin eval ni Function).
 * Soporta +, -, *, /, %, ^ y parentesis con precedencia estandar.
 */
export function evaluarExpresionAritmetica(expresion) {
  const fuente = String(expresion || '')
    .replace(/[₡¢]/g, '')
    .replace(/\u00d7|x(?=\s*[\d(])/gi, '*')
    .replace(/\u00f7/g, '/')
    .replace(/(\d{1,3}(?:,\d{3})+)/g, (m) => m.replace(/,/g, ''))
    .replace(/(\d+),(\d+)/g, '$1.$2')
    .replace(/\bmas\b/gi, '+')
    .replace(/\bmenos\b/gi, '-')
    .replace(/\bpor\b/gi, '*')
    .replace(/\bentre\b/gi, '/')
    .replace(/\bdividido entre\b/gi, '/')
    .trim();

  if (!fuente || fuente.length > 200) {
    throw new Error('Expresion aritmetica invalida');
  }

  const tokens = [];
  let i = 0;

  while (i < fuente.length) {
    const ch = fuente[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (/\d|\./.test(ch)) {
      let numStr = '';
      let puntos = 0;
      while (i < fuente.length && /[\d.]/.test(fuente[i])) {
        if (fuente[i] === '.') {
          puntos += 1;
          if (puntos > 1) {
            throw new Error('Numero decimal invalido');
          }
        }
        numStr += fuente[i];
        i += 1;
      }
      const valor = Number(numStr);
      if (!Number.isFinite(valor)) {
        throw new Error('Numero fuera de rango');
      }
      tokens.push({ tipo: 'NUM', valor });
      continue;
    }

    if ('+-*/()%^'.includes(ch)) {
      tokens.push({ tipo: ch, valor: ch });
      i += 1;
      continue;
    }

    throw new Error(`Caracter no permitido en expresion: ${ch}`);
  }

  if (tokens.length === 0) {
    throw new Error('Expresion vacia');
  }

  let pos = 0;
  const peek = () => tokens[pos] || null;
  const consume = () => {
    const t = tokens[pos];
    pos += 1;
    return t;
  };

  function parseExpresion() {
    let izquierda = parseTermino();
    while (peek() && (peek().tipo === '+' || peek().tipo === '-')) {
      const op = consume().tipo;
      const derecha = parseTermino();
      izquierda = op === '+' ? izquierda + derecha : izquierda - derecha;
    }
    return izquierda;
  }

  function parseTermino() {
    let izquierda = parsePotencia();
    while (peek() && (peek().tipo === '*' || peek().tipo === '/')) {
      const op = consume().tipo;
      const derecha = parsePotencia();
      if (op === '/' && Math.abs(derecha) < 1e-12) {
        throw new Error('Division por cero');
      }
      izquierda = op === '*' ? izquierda * derecha : izquierda / derecha;
    }
    return izquierda;
  }

  function parsePotencia() {
    let base = parsePostfijo();
    if (peek() && peek().tipo === '^') {
      consume();
      const exponente = parsePotencia();
      base = Math.pow(base, exponente);
    }
    return base;
  }

  function parsePostfijo() {
    let valor = parseUnario();
    while (peek() && peek().tipo === '%') {
      consume();
      valor = valor / 100;
    }
    return valor;
  }

  function parseUnario() {
    if (peek() && (peek().tipo === '+' || peek().tipo === '-')) {
      const op = consume().tipo;
      const val = parseUnario();
      return op === '-' ? -val : val;
    }
    return parsePrimario();
  }

  function parsePrimario() {
    const token = peek();
    if (!token) {
      throw new Error('Expresion incompleta');
    }
    if (token.tipo === 'NUM') {
      consume();
      return token.valor;
    }
    if (token.tipo === '(') {
      consume();
      const interno = parseExpresion();
      if (!peek() || peek().tipo !== ')') {
        throw new Error('Falta parentesis de cierre');
      }
      consume();
      return interno;
    }
    throw new Error('Token inesperado en expresion');
  }

  const resultado = parseExpresion();
  if (pos !== tokens.length || !Number.isFinite(resultado)) {
    throw new Error('Expresion mal formada');
  }
  return resultado;
}

/**
 * Guardrail 1: Bloquea consultas tecnicas internas o de otros prestamistas para COBRADOR.
 */
export function esPreguntaTecnicaInterna(pregunta) {
  const texto = normalizarTexto(pregunta);
  if (!texto) {
    return false;
  }

  const patronesTecnicos = [
    /\b(postgresql|postgres|pgvector|sequelize|node\.?js|nodejs|express|react|vite|groq|openai|gpt-oss)\b/i,
    /\b(backend|frontend|servidor|codigo fuente|repositorio|base de datos|tablas?\s+sql|consultas?\s+sql|esquema\s+sql|migracion(es)?)\b/i,
    /\b(endpoint(s)?|api\s*rest|rest\s*api|webhook|jwt|__host-sid|cookie\s+sid|csrf|bcrypt|hmac|rag|embeddings?|vectores?|fragmentos_rag|documentos_rag)\b/i,
    /\b(arquitectura tecnica|gobernanza|matriz de roles|adr-000|carpetas?\s+admin|carpeta administracion|nivel\s+admin)\b/i,
    /\b(otros?\s+prestamistas?|demas\s+prestamistas?|otros?\s+cobradores?|demas\s+cobradores?|otra\s+cartera|todos\s+los\s+prestamistas?|cuantos\s+prestamistas\s+hay)\b/i,
    /\b(que\s+(stack|tecnologia|base de datos|lenguaje|framework|motor\s+ia)\s+usa)\b/i
  ];

  return patronesTecnicos.some((regex) => regex.test(texto));
}

/**
 * Guardrail 2: Bloquea preguntas completamente ajenas al dominio financiero y operativo de Aureus.
 */
export function esPreguntaFueraDeDominio(pregunta) {
  const texto = normalizarTexto(pregunta);
  if (!texto) {
    return false;
  }

  const senalesDominio =
    /\b(aureus|seneca|prestamo|prestamista|credito|cuota|abono|pago|mora|atraso|cartera|cliente|cobro|cobranza|zona|ruta|saldo|interes|porcentaje|tasa|papelera|lista negra|ley\s*8968|privacidad|politica|regla|modulo|simul|calcul|cuanto es|sum[ae]|por ciento|rol|permiso|admin|seguridad|gobernanza|arquitectura|documento|drive)\b/i;

  if (senalesDominio.test(texto)) {
    return false;
  }

  if (/^\s*[\d\s+\-*/()%.,₡]+\s*=?\s*$/.test(pregunta)) {
    return false;
  }

  const patronesFueraDominio = [
    /\b(receta|cocinar|hornear|ingredientes?|pasta|pizza|hamburguesa|arroz con)\b/i,
    /\b(futbol|mundial|champions|partido|gol|messi|ronaldo|nba|tenis|olimpiadas?)\b/i,
    /\b(clima|pronostico del tiempo|va a llover|temperatura en|capital de|quien descubrio|presidente de|historia universal)\b/i,
    /\b(pelicula|serie|netflix|spotify|cancion|letra de|videojuego|minecraft|fortnite|anime|horoscopo|signo zodiacal)\b/i,
    /\b(chiste|poema|cuento corto|ensayo escolar|tarea de|traduce al ingles|bajar de peso|receta medica|dolor de cabeza)\b/i,
    /\b(python|c\+\+|java\s+code|html\s+para\s+mi|css\s+para\s+mi)\b/i
  ];

  return patronesFueraDominio.some((regex) => regex.test(texto));
}

function intentarSimulacionPrestamo(pregunta) {
  const texto = normalizarTexto(pregunta);
  const esSimulacion =
    /\b(simul|calcula|proyecta|prestamo|credito|cuanto seria|cuanto pagaria)\b/i.test(texto) &&
    /\d/.test(texto);

  if (!esSimulacion) {
    return null;
  }

  const matchPrincipal =
    pregunta.match(
      /(?:prestamo|credito|monto|capital|simula(?:r)?(?:\s+un)?(?:\s+prestamo|\s+credito)?)\s+(?:(?:de|por)\s+)?(?:₡|CRC)?\s*([\d.,]+)(?:\s*(mil))?/i
    ) ||
    pregunta.match(/(?:₡|CRC)\s*([\d.,]+)(?:\s*(mil))?/i);

  const matchTasa = pregunta.match(
    /(?:al|con|tasa(?:\s+de)?|interes(?:\s+de)?|un)\s*([\d.,]+)\s*(?:%|por\s*ciento)/i
  ) || pregunta.match(/([\d.,]+)\s*(?:%|por\s*ciento)/i);

  if (!matchPrincipal || !matchTasa) {
    return null;
  }

  let principal = normalizarNumeroToken(matchPrincipal[1]);
  if (matchPrincipal[2]) {
    principal *= 1000;
  }
  const tasa = normalizarNumeroToken(matchTasa[1]);

  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(tasa) || tasa < 0) {
    return null;
  }

  const matchCuotas =
    pregunta.match(/(?:a|en|por|de)\s*(\d+)\s*(?:cuotas?|pagos?|abonos?|semanas?|quincenas?|meses?|dias?)/i) ||
    pregunta.match(/(\d+)\s*(?:cuotas?|pagos?)/i);
  const numCuotas = matchCuotas ? Number.parseInt(matchCuotas[1], 10) : 0;

  const interesGenerado = principal * (tasa / 100);
  const totalPagar = principal + interesGenerado;

  const lineas = [
    `Resultado de la simulacion financiera en Aureus Manager:`,
    `- Capital principal: ${formatearColones(principal)}`,
    `- Tasa de interes aplicada: ${tasa}%`,
    `- Interes generado: ${formatearColones(interesGenerado)}`,
    `- Total a pagar: ${formatearColones(totalPagar)}`
  ];

  if (Number.isInteger(numCuotas) && numCuotas > 0) {
    const valorCuota = totalPagar / numCuotas;
    lineas.push(`- Plan a ${numCuotas} cuotas: cada cuota seria de ${formatearColones(valorCuota)}`);
  }

  return {
    tipo: 'simulacion_prestamo',
    respuesta: lineas.join('\n'),
    datos: {
      principal,
      tasa,
      interesGenerado,
      totalPagar,
      numCuotas: numCuotas || null,
      valorCuota: numCuotas > 0 ? totalPagar / numCuotas : null
    }
  };
}

function buscarClienteEnPregunta(pregunta, listaClientes = []) {
  const qNorm = normalizarTexto(pregunta);
  let mejorMatch = null;
  let mejorLongitud = 0;

  for (const c of listaClientes) {
    const nombreCompleto = normalizarTexto(c.nombre_completo || c.nombre || '');
    if (!nombreCompleto) {
      continue;
    }

    if (qNorm.includes(nombreCompleto) && nombreCompleto.length > mejorLongitud) {
      mejorMatch = c;
      mejorLongitud = nombreCompleto.length;
      continue;
    }

    const partes = nombreCompleto.split(/\s+/).filter((p) => p.length >= 4);
    for (const parte of partes) {
      const regex = new RegExp(`\\b${parte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(qNorm) && parte.length > mejorLongitud) {
        mejorMatch = c;
        mejorLongitud = parte.length;
      }
    }
  }

  return mejorMatch;
}

function intentarCalculoClienteReal(pregunta, contextoOperativo) {
  const listaClientes =
    contextoOperativo?.todosClientesActivos || contextoOperativo?.clientes || [];
  if (!Array.isArray(listaClientes) || listaClientes.length === 0) {
    return null;
  }

  const cliente = buscarClienteEnPregunta(pregunta, listaClientes);
  if (!cliente) {
    return null;
  }

  const qNorm = normalizarTexto(pregunta);
  const saldoPendiente = Number(cliente.saldo_total_pendiente || 0);
  const matchPorcentaje = pregunta.match(/([\d.,]+)\s*(?:%|por\s*ciento)/i);
  const matchAbonoMonto = pregunta.match(
    /(?:abona|abonara|paga|pagara|entrega|entregara)\s*(?:₡|CRC)?\s*([\d.,]+)(?:\s*(mil))?/i
  );

  if (matchPorcentaje && /(debe|saldo|adeuda|pendiente|abona|paga|porcentaje|cuanto)/i.test(qNorm)) {
    const porcentaje = normalizarNumeroToken(matchPorcentaje[1]);
    if (Number.isFinite(porcentaje) && porcentaje >= 0) {
      const montoPorcentaje = saldoPendiente * (porcentaje / 100);
      const saldoRestante = Math.max(0, saldoPendiente - montoPorcentaje);

      return {
        tipo: 'calculo_cliente_porcentaje',
        respuesta: [
          `Calculo exacto sobre el saldo real de ${cliente.nombre_completo}:`,
          `- Saldo pendiente actual: ${formatearColones(saldoPendiente)}`,
          `- Equivalente al ${porcentaje}%: ${formatearColones(montoPorcentaje)}`,
          `- Si realiza ese pago hoy, su nuevo saldo pendiente quedaria en ${formatearColones(saldoRestante)}`
        ].join('\n'),
        datos: {
          cliente: cliente.nombre_completo,
          saldoPendiente,
          porcentaje,
          montoPorcentaje,
          saldoRestante
        }
      };
    }
  }

  if (matchAbonoMonto && !matchPorcentaje) {
    let montoAbono = normalizarNumeroToken(matchAbonoMonto[1]);
    if (matchAbonoMonto[2]) {
      montoAbono *= 1000;
    }
    if (Number.isFinite(montoAbono) && montoAbono >= 0) {
      const saldoRestante = Math.max(0, saldoPendiente - montoAbono);
      return {
        tipo: 'calculo_cliente_abono',
        respuesta: [
          `Proyeccion de saldo para ${cliente.nombre_completo}:`,
          `- Saldo pendiente actual: ${formatearColones(saldoPendiente)}`,
          `- Monto proyectado de abono: ${formatearColones(montoAbono)}`,
          `- Saldo restante estimado tras el abono: ${formatearColones(saldoRestante)}`
        ].join('\n'),
        datos: {
          cliente: cliente.nombre_completo,
          saldoPendiente,
          montoAbono,
          saldoRestante
        }
      };
    }
  }

  return null;
}

function intentarSumaZonas(pregunta, contextoOperativo) {
  const zonas = contextoOperativo?.zonas || [];
  if (!Array.isArray(zonas) || zonas.length === 0) {
    return null;
  }

  const qNorm = normalizarTexto(pregunta);
  if (!/\b(sum[ae]|total|combinad|junt[ae]|entre las zonas|cuanto.*zona)\b/i.test(qNorm)) {
    return null;
  }

  const zonasCoincidentes = zonas.filter((z) => {
    const ubicacionNorm = normalizarTexto(z.ubicacion || '');
    return ubicacionNorm && ubicacionNorm !== 'sin zona' && qNorm.includes(ubicacionNorm);
  });

  if (zonasCoincidentes.length < 2) {
    return null;
  }

  let totalSaldo = 0;
  let totalHoy = 0;
  let totalClientes = 0;
  let totalPrestamos = 0;

  const detalle = zonasCoincidentes.map((z) => {
    const saldo = Number(z.saldo_por_cobrar_zona || 0);
    const hoy = Number(z.monto_cobros_hoy_zona || 0);
    const clientes = Number(z.total_clientes || 0);
    const prestamos = Number(z.total_prestamos || 0);
    totalSaldo += saldo;
    totalHoy += hoy;
    totalClientes += clientes;
    totalPrestamos += prestamos;

    return `- ${z.ubicacion}: ${formatearColones(saldo)} por cobrar, ${formatearColones(hoy)} programados hoy, ${clientes} clientes y ${prestamos} prestamos activos`;
  });

  return {
    tipo: 'suma_zonas',
    respuesta: [
      `Suma consolidada de las ${zonasCoincidentes.length} zonas consultadas:`,
      ...detalle,
      `- Total combinado por cobrar: ${formatearColones(totalSaldo)}`,
      `- Total combinado programado hoy: ${formatearColones(totalHoy)}`,
      `- Total de clientes en estas zonas: ${totalClientes}`
    ].join('\n'),
    datos: { totalSaldo, totalHoy, totalClientes, totalPrestamos }
  };
}

function intentarPorcentajeCobroDiario(pregunta, contextoOperativo) {
  const agenda = contextoOperativo?.agendaHoy;
  if (!agenda) {
    return null;
  }

  const qNorm = normalizarTexto(pregunta);
  const pidePorcentajeHoy =
    /\b(porcentaje|avance|cumplimiento|meta)\b/i.test(qNorm) &&
    /\b(cobro|cobrado|recaudado|dia|hoy|jornada|agenda)\b/i.test(qNorm);

  if (!pidePorcentajeHoy) {
    return null;
  }

  const recaudado = Number(agenda.montoRecaudadoHoy || 0);
  const pendiente = Number(agenda.montoPendienteHoy || 0);
  const totalMeta = recaudado + pendiente;
  const porcentaje = totalMeta > 0 ? Math.round((recaudado / totalMeta) * 10000) / 100 : 0;

  return {
    tipo: 'porcentaje_cobro_diario',
    respuesta: [
      `Avance de cobranza del dia de hoy:`,
      `- Monto ya recaudado hoy: ${formatearColones(recaudado)}`,
      `- Monto aun pendiente hoy: ${formatearColones(pendiente)}`,
      `- Meta total de la jornada: ${formatearColones(totalMeta)}`,
      `- Porcentaje de cumplimiento diario: ${porcentaje}%`
    ].join('\n'),
    datos: { recaudado, pendiente, totalMeta, porcentaje }
  };
}

function intentarAritmeticaDirecta(pregunta) {
  const qNorm = normalizarTexto(pregunta);

  const matchPctDe = qNorm.match(
    /(?:cuanto\s+es\s+(?:el\s+)?)?([\d.,]+)\s*(?:%|por\s*ciento)\s+de\s+(?:₡|crc)?\s*([\d.,]+)/i
  );
  if (matchPctDe) {
    const pct = normalizarNumeroToken(matchPctDe[1]);
    const base = normalizarNumeroToken(matchPctDe[2]);
    if (Number.isFinite(pct) && Number.isFinite(base)) {
      const resultado = (pct / 100) * base;
      return {
        tipo: 'aritmetica_porcentaje',
        respuesta: `El ${pct}% de ${base.toLocaleString('en-US')} equivale a ${resultado.toLocaleString('en-US', { maximumFractionDigits: 2 })}.`,
        datos: { resultado }
      };
    }
  }

  const limpia = pregunta
    .replace(/^(?:hola\s*,?\s*)?(?:seneca\s*,?\s*)?(?:por favor\s+)?(?:dime\s+|calcula(?:me)?\s+|cuanto\s+es\s+|resuelve\s+|resultado\s+de\s+)/i, '')
    .replace(/[?=¿¡]/g, '')
    .trim();

  if (!/\d/.test(limpia) || !/[+\-*/^%]|\b(mas|menos|por|entre)\b/i.test(limpia)) {
    return null;
  }

  if (/[^0-9+\-*/().,%^\s₡¢]|^(?![0-9(+-]).*/i.test(limpia)) {
    const soloOperacion = limpia.match(/([\d.,()%+\-*/^\s]+)$/);
    if (!soloOperacion) {
      return null;
    }
    try {
      const val = evaluarExpresionAritmetica(soloOperacion[1]);
      return {
        tipo: 'aritmetica_directa',
        respuesta: `El resultado exacto de la operacion es ${val.toLocaleString('en-US', { maximumFractionDigits: 4 })}.`,
        datos: { resultado: val }
      };
    } catch (_err) {
      return null;
    }
  }

  try {
    const val = evaluarExpresionAritmetica(limpia);
    return {
      tipo: 'aritmetica_directa',
      respuesta: `El resultado exacto de la operacion es ${val.toLocaleString('en-US', { maximumFractionDigits: 4 })}.`,
      datos: { resultado: val }
    };
  } catch (err) {
    if (err.message === 'Division por cero') {
      return {
        tipo: 'error_matematico',
        respuesta: 'No es posible dividir entre cero dentro de un calculo financiero.'
      };
    }
    return null;
  }
}

/**
 * Motor determinista de ecuaciones y calculos sobre cartera real en modo solo lectura.
 */
export async function resolverCalculoConDatosReales({
  pregunta,
  cobradorId,
  contextoOperativo = null,
  esAdmin = false
}) {
  const sim = intentarSimulacionPrestamo(pregunta);
  if (sim) {
    return sim;
  }

  const aritmeticaPct = intentarAritmeticaDirecta(pregunta);

  if (!esAdmin && (cobradorId || contextoOperativo)) {
    const necesitaContexto = /\d|%|\b(zona|zonas|suma|cobro|avance|porcentaje|abona|paga|debe|saldo)\b/i.test(
      normalizarTexto(pregunta)
    );
    const ctx =
      contextoOperativo ||
      (necesitaContexto ? await obtenerRadiografiaCompleta(cobradorId).catch(() => null) : null);

    if (ctx) {
      const calcCliente = intentarCalculoClienteReal(pregunta, ctx);
      if (calcCliente) {
        return calcCliente;
      }

      const sumaZonas = intentarSumaZonas(pregunta, ctx);
      if (sumaZonas) {
        return sumaZonas;
      }

      const cobroDiario = intentarPorcentajeCobroDiario(pregunta, ctx);
      if (cobroDiario) {
        return cobroDiario;
      }
    }
  }

  return aritmeticaPct;
}
