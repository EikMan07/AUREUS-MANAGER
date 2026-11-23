// backend/src/services/crmIa.service.js
// Servicio de Inteligencia Artificial para el CRM Dual de Aureus Manager
// Integración con Groq (openai/gpt-oss-120b) bajo aprobación humana estricta

import { getAiConfig } from '../config/env.js';

const TIMEOUT_MS = 20000;

function limpiarTextoSeguro(texto) {
  if (!texto || typeof texto !== 'string') return '';
  // Remover emojis Unicode
  let limpio = texto.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
    ''
  );
  // Remover tecnicismos restringidos
  const palabrasProhibidas = [
    /\bbackend\b/gi,
    /\bfrontend\b/gi,
    /\bservidor\b/gi,
    /\bbase de datos\b/gi,
    /\bpostgresql\b/gi,
    /\bsql\b/gi,
    /\bapi\b/gi,
    /\bendpoint\b/gi,
    /\bjsonb\b/gi,
  ];
  palabrasProhibidas.forEach((regex) => {
    limpio = limpio.replace(regex, 'plataforma');
  });
  return limpio.replace(/\s+/g, ' ').trim();
}

async function llamarGroq({ messages, temperatura = 0.2, maxTokens = 800 }) {
  const config = getAiConfig();
  if (!config.isConfigured) {
    const error = new Error('GROQ_API_KEY no configurada');
    error.code = 'GROQ_NOT_CONFIGURED';
    throw error;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: temperatura,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Groq HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const contenido = data?.choices?.[0]?.message?.content || '';
    return contenido.trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Genera propuesta de mensaje por WhatsApp para prospectos del prestamista.
 * Reemplaza variables dinámicas y adapta tono según etapa.
 */
export async function redactarMensajeProspectoPrestamista({ prospecto, cerebroConfig = {} }) {
  try {
    const nombreCompleto = [prospecto.nombre, prospecto.apellidos].filter(Boolean).join(' ').trim();
    const nombrePila = prospecto.nombre || 'estimado cliente';
    const nombreVisible = nombreCompleto || nombrePila;
    const ubicacion = prospecto.ubicacion || 'su localidad';
    const montoNum = Number(prospecto.monto_estimado ?? 0);
    const montoFormateado = montoNum > 0 ? `₡${Math.round(montoNum).toLocaleString('en-US')}` : 'a convenir';
    const diasSinAvance = Number(prospecto.dias_sin_avance ?? 0);
    const etapa = String(prospecto.etapa || 'PROSPECTO').toUpperCase();

    const etiquetasEtapa = {
      PROSPECTO: 'Prospecto',
      EVALUACION_RIESGO: 'Evaluación de riesgo',
      PROPUESTA_APROBADA: 'Propuesta aprobada',
      PRESTAMO_ACTIVO: 'Préstamo activo',
      ALERTA_ATRASO: 'Alerta de atraso',
      ARREGLO_PAGO: 'Arreglo de pago',
      FINIQUITADO_RENOVABLE: 'Finiquitado renovable',
    };
    const etiquetaEtapa = etiquetasEtapa[etapa] || 'Prospecto';

    // Plantilla base del cerebro o por defecto
    const plantillaBase =
      cerebroConfig.instruccion_base ||
      'Hola [Nombre], le saludamos cordialmente sobre su solicitud en [Ubicación]. Su monto estimado es [Monto estimado]. Quedamos a su disposición.';

    // Reemplazo de marcadores naturales en español y compatibilidad con formato heredado
    const instruccionPersonalizada = plantillaBase
      .replace(/\[\s*Nombre\s*\]|\{\{\s*nombre\s*\}\}/gi, nombreVisible)
      .replace(/\[\s*Etapa\s*\]|\{\{\s*etapa\s*\}\}/gi, etiquetaEtapa)
      .replace(/\[\s*Ubicaci[oó]n\s*\]|\{\{\s*ubicacion\s*\}\}/gi, ubicacion)
      .replace(/\[\s*Monto\s+estimado\s*\]|\{\{\s*monto_estimado\s*\}\}/gi, montoFormateado)
      .replace(/\[\s*D[ií]as\s+sin\s+avance\s*\]|\{\{\s*dias_sin_avance\s*\}\}/gi, String(diasSinAvance));

    const contextoEtapa = {
      PROSPECTO: 'Dar la bienvenida formal, agradecer el interés y ofrecer aclarar dudas sobre el crédito.',
      EVALUACION_RIESGO: 'Consultar cordialmente si ya cuenta con la información o comprobantes para continuar el estudio.',
      PROPUESTA_APROBADA: 'Informar con agrado que la propuesta crediticia está lista y pactar la entrega de fondos.',
      PRESTAMO_ACTIVO: 'Enviar un saludo cordial de seguimiento y agradecer su puntualidad en las cuotas.',
      ALERTA_ATRASO: 'Aviso formal, respetuoso y firme recordando la cuota pendiente para coordinar el pago hoy mismo.',
      ARREGLO_PAGO: 'Presentar una opción colaborativa y flexible de readecuación para facilitarle el cumplimiento.',
      FINIQUITADO_RENOVABLE: 'Felicitar cordialmente por cancelar exitosamente el crédito y ofrecerle una renovación inmediata.',
    }[etapa] || 'Atender cordialmente la consulta crediticia.';

    const systemPrompt = `Eres Séneca CRM, asistente del prestamista en Aureus Manager.
Tu objetivo es redactar un único mensaje breve para WhatsApp respetuoso, empático y directo.
Tono configurado: ${cerebroConfig.tono || 'EJECUTIVO_CERCANO'}.
Indicaciones adicionales del prestamista: ${cerebroConfig.reglas_adicionales || 'Sin indicaciones adicionales'}.
Objetivo de esta etapa (${etiquetaEtapa}): ${contextoEtapa}.
Mensaje guía del prestamista: ${instruccionPersonalizada}.
REGLAS OBLIGATORIAS:
- NO uses emojis.
- NO uses paréntesis ni barras diagonales.
- NO uses palabras técnicas como backend, frontend, servidor, base de datos, API, etc.
- Devuelve únicamente el texto del mensaje listo para enviar, sin comillas ni encabezados.`;

    const userPrompt = `Prospecto: ${nombreVisible}, ubicación ${ubicacion}.
Monto estimado: ${montoFormateado}.
Días en etapa actual: ${diasSinAvance} días.
Redacta el mensaje correspondiente.`;

    let mensajeGenerado = '';
    try {
      mensajeGenerado = await llamarGroq({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperatura: 0.25,
        maxTokens: 350,
      });
    } catch (errApi) {
      console.error('[crmIa.service] Error comunicando con Groq:', errApi.message);
      // Respaldo determinista de alta calidad adaptado exactamente a la etapa
      const mensajesRespaldo = {
        PROSPECTO: `Hola ${nombreVisible}, reciba un cordial saludo. Le contactamos respecto a su consulta en ${ubicacion} para el financiamiento por ${montoFormateado}. Quedamos a su entera disposición para brindarle los detalles.`,
        EVALUACION_RIESGO: `Hola ${nombreVisible}, esperamos que se encuentre muy bien. Nos comunicamos para dar seguimiento a su solicitud crediticia. Si tiene los datos requeridos a mano, con gusto continuamos su trámite hoy mismo.`,
        PROPUESTA_APROBADA: `Buenas noticias ${nombreVisible}. Su solicitud de crédito por ${montoFormateado} ha sido valorada favorablemente. Con gusto podemos coordinar la entrega en ${ubicacion} cuando le resulte conveniente.`,
        PRESTAMO_ACTIVO: `Hola ${nombreVisible}, le enviamos un atento saludo de seguimiento sobre su crédito vigente. Agradecemos su compromiso y quedamos a la orden para cualquier consulta.`,
        ALERTA_ATRASO: `Hola ${nombreVisible}, nos comunicamos formalmente para consultar sobre la cuota pendiente de su crédito. Le solicitamos ponerse en contacto a la brevedad para coordinar la cancelación.`,
        ARREGLO_PAGO: `Hola ${nombreVisible}, entendemos que pueden surgir imprevistos. Deseamos coordinar una alternativa accesible de pago que le permita regularizar su cuenta con tranquilidad.`,
        FINIQUITADO_RENOVABLE: `Hola ${nombreVisible}, muchas gracias por concluir exitosamente su crédito. Gracias a su excelente historial, tiene abierta la opción de renovación inmediata si así lo requiere.`,
      };
      mensajeGenerado = mensajesRespaldo[etapa] || mensajesRespaldo.PROSPECTO;
    }

    return limpiarTextoSeguro(mensajeGenerado);
  } catch (err) {
    console.error('[crmIa.service] Error en redactarMensajeProspectoPrestamista:', err);
    const errCtrl = new Error('No fue posible redactar la propuesta en este momento. Inténtalo de nuevo en unos segundos.');
    errCtrl.userMessage = 'No fue posible redactar la propuesta en este momento. Inténtalo de nuevo en unos segundos.';
    throw errCtrl;
  }
}

/**
 * Redacta mensaje comercial para que el Administrador contacte a un prospecto de nuevo prestamista.
 */
export async function redactarMensajeProspectoAdmin({ prospecto }) {
  try {
    const nombre = prospecto.nombre || 'estimado prestamista';
    const zona = prospecto.zona || 'su zona';
    const etapa = String(prospecto.etapa || 'VISITANTE_LANDING').toUpperCase();

    const objetivosPorEtapa = {
      VISITANTE_LANDING: 'Invitar cordialmente a conocer los beneficios de Aureus Manager para organizar su cartera y cobranza diaria.',
      REGISTRO_INICIADO: 'Ofrecer apoyo personalizado para completar el registro y despejar cualquier duda operativa.',
      CONSENTIMIENTO_LEY_8968: 'Explicar las garantías de protección de datos bajo la Ley 8968 y la privacidad absoluta de sus deudores.',
      CUENTA_ACTIVA: 'Felicitar por activar su cuenta y guiarle en el registro de sus primeros clientes o préstamos.',
      PRIMER_PRESTAMO: 'Celebrar el registro de su primera operación y mostrarle las herramientas de control y mora.',
      PRESTAMISTA_ACTIVO: 'Agradecer su confianza continua y consultar si requiere soporte avanzado o nuevas funciones.',
      EN_RIESGO_BAJA: 'Preguntar amablemente cómo podemos apoyarle si ha tenido dificultades con el uso de la plataforma.',
    };

    const objetivo = objetivosPorEtapa[etapa] || 'Acompañar al prestamista en el uso de la plataforma.';

    const systemPrompt = `Eres el asistente de mercadeo y admisiones de Aureus Manager, plataforma para prestamistas en Costa Rica.
Tu tarea es redactar un mensaje breve, ejecutivo, respetuoso y profesional para un prestamista.
Etapa del prestamista: ${etapa}.
Objetivo: ${objetivo}.
REGLAS:
- NO uses emojis.
- NO uses palabras técnicas (backend, frontend, servidor, base de datos, etc.).
- Devuelve únicamente el mensaje listo para enviar.`;

    const userPrompt = `Prestamista: ${nombre}. Zona: ${zona}. Etapa: ${etapa}.`;

    let mensajeGenerado = '';
    try {
      mensajeGenerado = await llamarGroq({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperatura: 0.25,
        maxTokens: 350,
      });
    } catch (errApi) {
      console.error('[crmIa.service] Error comunicando con Groq:', errApi.message);
      const respAdmin = {
        VISITANTE_LANDING: `Estimado(a) ${nombre}, le saludamos de Aureus Manager. Si brinda servicios de financiamiento en ${zona}, nuestra herramienta le permite automatizar cobros diarios y cálculo de mora con total orden. Con gusto le brindamos una demostración guiada.`,
        REGISTRO_INICIADO: `Estimado(a) ${nombre}, esperamos que se encuentre muy bien. Notamos que inició su registro en Aureus Manager. Si requiere asistencia para finalizar la configuración de su cuenta en ${zona}, estamos a su completa disposición.`,
        CONSENTIMIENTO_LEY_8968: `Estimado(a) ${nombre}, en Aureus Manager la privacidad de su cartera está blindada bajo la Ley 8968. Sus deudores y registros son 100% confidenciales y exclusivos de usted. Con gusto aclaramos cualquier inquietud.`,
        CUENTA_ACTIVA: `Estimado(a) ${nombre}, felicitaciones por activar su cuenta en Aureus Manager. Le invitamos a registrar sus primeros clientes para experimentar la facilidad del control diario en ${zona}.`,
        PRIMER_PRESTAMO: `Estimado(a) ${nombre}, excelente inicio con su primera operación registrada en Aureus Manager. Esperamos que la gestión de cuotas y saldos le esté resultando de gran utilidad.`,
        PRESTAMISTA_ACTIVO: `Estimado(a) ${nombre}, agradecemos su confianza en Aureus Manager para la gestión de su cartera en ${zona}. Continuamos mejorando nuestras herramientas para respaldar su crecimiento.`,
        EN_RIESGO_BAJA: `Estimado(a) ${nombre}, le saludamos con mucho aprecio. Queremos conocer si requiere algún apoyo o capacitación adicional para aprovechar al máximo las herramientas de cobro de Aureus Manager.`,
      };
      mensajeGenerado = respAdmin[etapa] || respAdmin.VISITANTE_LANDING;
    }

    return limpiarTextoSeguro(mensajeGenerado);
  } catch (err) {
    console.error('[crmIa.service] Error en redactarMensajeProspectoAdmin:', err);
    const errCtrl = new Error('No fue posible redactar la propuesta en este momento. Inténtalo de nuevo en unos segundos.');
    errCtrl.userMessage = 'No fue posible redactar la propuesta en este momento. Inténtalo de nuevo en unos segundos.';
    throw errCtrl;
  }
}

/**
 * Genera exactamente 3 piezas de contenido publicitario para una campaña comercial de la administración.
 */
export async function generarPiezasCampanaAdmin({ campana }) {
  try {
    const nombre = campana.nombre || 'Campaña Comercial';
    const objetivo = campana.objetivo || 'Atraer nuevos prestamistas a la plataforma';
    const publico = campana.publico_objetivo || 'Prestamistas independientes en Costa Rica';
    const mensajeCentral = campana.mensaje_central || 'Control total de cartera, mora y cobro diario';
    const canales = campana.canales || 'Facebook e Instagram';
    const presupuestoNum = Number(campana.presupuesto ?? 0);

    const systemPrompt = `Eres un estratega publicitario senior para Aureus Manager en Costa Rica.
Debes generar exactamente 3 piezas de contenido para redes sociales en formato JSON estricto.
Cada pieza debe tener:
- titulo (título conciso de la pieza)
- canal ("Facebook" o "Instagram")
- formato ("1:1" para post cuadrado o "9:16" para historia/reel)
- copy_propuesto (texto publicitario persuasivo y profesional enfocado en orden, ahorro de tiempo y cobro sin estrés)
REGLAS ESTRICTAS:
- NO uses emojis.
- NO uses tecnicismos (backend, servidor, base de datos, API, etc.).
- Devuelve ÚNICAMENTE un arreglo JSON con las 3 piezas: [{"titulo":"...","canal":"...","formato":"...","copy_propuesto":"..."}, ...]`;

    const userPrompt = `Campaña: ${nombre}
Objetivo: ${objetivo}
Público Objetivo: ${publico}
Mensaje Central: ${mensajeCentral}
Canales: ${canales}
Presupuesto: ₡${Math.round(presupuestoNum).toLocaleString('en-US')}
Genera las 3 piezas en JSON.`;

    let piezas = [];
    try {
      const respuesta = await llamarGroq({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperatura: 0.3,
        maxTokens: 900,
      });

      // Extraer JSON
      const jsonMatch = respuesta.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        piezas = JSON.parse(jsonMatch[0]);
      }
    } catch (errApi) {
      console.error('[crmIa.service] Error comunicando con Groq en generarPiezasCampanaAdmin:', errApi.message);
    }

    if (!Array.isArray(piezas) || piezas.length < 3) {
      // Fallback determinista con 3 piezas pulidas
      piezas = [
        {
          titulo: 'Control de Cobranza Diaria sin Cuadernos',
          canal: 'Facebook',
          formato: '1:1',
          copy_propuesto: `Administrar sus préstamos ya no tiene por qué ser complicado. Con Aureus Manager registre sus cuotas diarias, conozca el saldo exacto de cada cliente y calcule moratorias en segundos. Diseñado para prestamistas independientes en Costa Rica. Solicite su prueba guiada hoy mismo.`,
        },
        {
          titulo: 'Confidencialidad Total en su Cartera',
          canal: 'Instagram',
          formato: '9:16',
          copy_propuesto: `Sus clientes y números son suyos y de nadie más. En Aureus Manager sus datos están estrictamente respaldados bajo la Ley 8968. Deje atrás el riesgo de pérdidas físicas y lleve su negocio con tranquilidad y profesionalismo.`,
        },
        {
          titulo: 'Recupere su Tiempo y Evite Fugas',
          canal: 'Facebook',
          formato: '1:1',
          copy_propuesto: `¿Cuánto tiempo invierte cada noche cerrando cuentas manuales? Automatice su agenda de cobros y mantenga el control financiero de su cartera en una sola pantalla clara y ejecutiva. Descubra Aureus Manager.`,
        },
      ];
    }

    // Normalizar exactamente 3 piezas limpias
    return piezas.slice(0, 3).map((p, idx) => ({
      titulo: limpiarTextoSeguro(p.titulo || `Pieza publicitaria #${idx + 1}`),
      canal: p.canal === 'Instagram' ? 'Instagram' : 'Facebook',
      formato: p.formato === '9:16' ? '9:16' : '1:1',
      copy_propuesto: limpiarTextoSeguro(p.copy_propuesto || 'Texto publicitario en preparación.'),
      estado: 'PENDIENTE_APROBACION',
    }));
  } catch (err) {
    console.error('[crmIa.service] Error en generarPiezasCampanaAdmin:', err);
    const errCtrl = new Error('No fue posible redactar la propuesta en este momento. Inténtalo de nuevo en unos segundos.');
    errCtrl.userMessage = 'No fue posible redactar la propuesta en este momento. Inténtalo de nuevo en unos segundos.';
    throw errCtrl;
  }
}
