import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');
const DRIVE_DOCS_ROOT = path.join(REPO_ROOT, 'docs', 'drive_archivos');
const DIR_PRESTAMISTAS = path.join(DRIVE_DOCS_ROOT, 'Prestamistas');
const DIR_ADMINISTRACION = path.join(DRIVE_DOCS_ROOT, 'Administracion');

/**
 * Construye un archivo PDF legible a partir de secciones estructuradas.
 */
function generarPdfBuffer({ titulo, subtitulo, secciones }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 54, bottom: 54, left: 54, right: 54 },
      info: {
        Title: titulo,
        Author: 'Aureus Manager',
        Subject: subtitulo
      }
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(18).fillColor('#101C2C').text(titulo);
    doc.moveDown(0.35);
    doc.font('Helvetica-Oblique').fontSize(11).fillColor('#6E5B2D').text(subtitulo);
    doc.moveDown(1);

    for (const seccion of secciones) {
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#101C2C').text(seccion.titulo);
      doc.moveDown(0.3);

      for (const parrafo of seccion.parrafos) {
        doc
          .font('Helvetica')
          .fontSize(10.5)
          .fillColor('#222222')
          .text(parrafo, { align: 'left', lineGap: 3 });
        doc.moveDown(0.45);
      }

      doc.moveDown(0.35);
    }

    doc.end();
  });
}

/**
 * Construye un archivo Word DOCX estructurado con titulos y parrafos limpios.
 */
async function generarDocxBuffer({ titulo, subtitulo, secciones }) {
  const children = [
    new Paragraph({
      text: titulo,
      heading: HeadingLevel.TITLE
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: subtitulo,
          italics: true
        })
      ],
      spacing: { after: 240 }
    })
  ];

  for (const seccion of secciones) {
    children.push(
      new Paragraph({
        text: seccion.titulo,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 220, after: 120 }
      })
    );

    for (const parrafo of seccion.parrafos) {
      children.push(
        new Paragraph({
          text: parrafo,
          spacing: { after: 140 }
        })
      );
    }
  }

  const document = new Document({
    sections: [
      {
        properties: {},
        children
      }
    ]
  });

  return await Packer.toBuffer(document);
}

function crearGuiaModulosPrestamistasPdf() {
  return generarPdfBuffer({
    titulo: 'Guia Completa de Modulos Aureus Manager para Prestamistas',
    subtitulo: 'Manual operativo diario de gestion de clientes, creditos, cobros y zonas en Costa Rica',
    secciones: [
      {
        titulo: '1. Proposito de Aureus Manager',
        parrafos: [
          'Aureus Manager es una herramienta de control financiero pensada para prestamistas independientes en Costa Rica. Su enfoque es ordenar cada credito desde el otorgamiento hasta su cancelacion, mostrar cuanto dinero falta por recuperar y priorizar las visitas o cobros diarios sin depender de cuadernos sueltos.',
          'Cada cuenta de prestamista trabaja exclusivamente con su propia cartera. Ningun otro prestamista puede ver sus clientes, sus prestamos ni sus cobros.'
        ]
      },
      {
        titulo: '2. Panel de Inicio y Resumen Diario',
        parrafos: [
          'La vista principal concentra el pulso financiero del dia: cantidad de cobros programados para hoy, monto total esperado en la jornada, dinero ya recaudado, clientes con atrasos acumulados y saldo total activo en la calle.',
          'Desde este resumen el prestamista identifica de inmediato en que sector concentrar la ruta y cuanto capital ya regreso a caja.'
        ]
      },
      {
        titulo: '3. Modulo de Clientes',
        parrafos: [
          'Permite registrar cada cliente con su nombre completo, numero de cedula costarricense, telefono de contacto, zona geografica y notas de referencia. Un perfil ordenado evita duplicar fichas cuando la misma persona solicita renovaciones.',
          'Antes de otorgar un nuevo credito, el prestamista debe revisar el saldo pendiente del cliente y verificar si presenta atrasos activos en prestamos vigentes.',
          'Cuando un cliente ya no forma parte de la cartera activa, puede enviarse a la papelera de reciclaje donde permanece resguardado durante 30 dias antes de pasar al archivo historico definitivo.'
        ]
      },
      {
        titulo: '4. Modulo de Prestamos',
        parrafos: [
          'El alta de prestamos registra el monto entregado como capital inicial, el porcentaje de interes acordado, la cantidad de cuotas y la frecuencia de cobro. Las modalidades disponibles son diaria, semanal, quincenal y mensual.',
          'La formula operativa general suma al monto prestado el interes pactado para obtener el total a pagar, y luego divide ese total entre la cantidad de cuotas para fijar cada abono.',
          'Cada prestamo refleja su saldo pendiente actualizado en tiempo real despues de cada pago registrado, indicando cuando el credito queda completamente cancelado.'
        ]
      },
      {
        titulo: '5. Modulo de Cobros y Agenda del Dia',
        parrafos: [
          'La agenda diaria agrupa los vencimientos de hoy y de la semana, diferenciando entre cobros pendientes, cobros ya registrados y cuotas en atraso.',
          'El prestamista puede registrar pagos completos o abonos parciales. Todo abono reduce directamente el saldo pendiente del cliente y actualiza el porcentaje de recaudacion de la jornada.'
        ]
      },
      {
        titulo: '6. Modulo de Zonas, Lista Negra y Papelera',
        parrafos: [
          'El modulo de zonas agrupa clientes segun su localidad o sector de ruta, permitiendo consultar cuanto dinero hay por cobrar en cada zona y programar recorridos ordenados.',
          'La lista negra funciona como historial preventivo privado para anotar casos de incumplimiento reiterado y evitar riesgos en nuevas colocaciones.',
          'La papelera conserva clientes y prestamos eliminados durante 30 dias completos, garantizando que cualquier borrado accidental pueda recuperarse sin perdida de informacion financiera.'
        ]
      },
      {
        titulo: '7. Asistente Financiero Seneca',
        parrafos: [
          'Seneca acompaña al prestamista en consultas de solo lectura sobre su cartera real: explica reglas operativas, resume cobros pendientes del dia, calcula simulaciones de cuotas e intereses y compara zonas activas.',
          'Por seguridad patrimonial, el asistente nunca registra pagos, no crea prestamos ni modifica informacion por su cuenta; toda operacion financiera requiere accion directa del titular.'
        ]
      }
    ]
  });
}

function crearPoliticasUsoLey8968Docx() {
  return generarDocxBuffer({
    titulo: 'Politicas de Uso, Privacidad y Cumplimiento de la Ley 8968',
    subtitulo: 'Lineamientos obligatorios para prestamistas independientes usuarios de Aureus Manager en Costa Rica',
    secciones: [
      {
        titulo: '1. Respeto a la Ley 8968 de Proteccion de Datos Personales',
        parrafos: [
          'Toda informacion de identificacion, telefonos, direcciones, historiales crediticios y saldos pertenece a personas fisicas protegidas por la Ley 8968 de Proteccion de la Persona frente al tratamiento de sus datos personales en Costa Rica.',
          'Los datos recopilados por el prestamista deben usarse unicamente para evaluar solicitudes de credito, documentar el prestamo acordado y gestionar el cobro de manera respetuosa y verificable.'
        ]
      },
      {
        titulo: '2. Confidencialidad y Manejo Seguro de la Cartera',
        parrafos: [
          'Queda estrictamente prohibido compartir listados de deudores, capturas de saldos, numeros telefonicos o avisos de morosidad con terceros ajenos a la relacion crediticia, en redes sociales o en grupos de mensajeria publicos.',
          'Cada prestamista es responsable de resguardar su acceso personal y no prestar sus credenciales a personas no autorizadas. Al terminar la jornada en equipos compartidos o tabletas de oficina se debe cerrar la sesion manualmente.'
        ]
      },
      {
        titulo: '3. Expiracion de Sesion y Proteccion ante Inactividad',
        parrafos: [
          'Como medida preventiva frente a extravios o descuidos del dispositivo, la sesion de trabajo expira automaticamente despues de 25 minutos continuos sin actividad. Si esto ocurre, el titular debe volver a identificarse para continuar revisando su cartera.'
        ]
      },
      {
        titulo: '4. Politica de Conservacion y Papelera de 30 Dias',
        parrafos: [
          'Ningun cliente ni prestamo se destruye de forma inmediata ante una eliminacion ordinaria. Todos los registros eliminados permanecen respaldados en papelera durante 30 dias naturales para auditoria personal o restauracion oportuna.',
          'Transcurrido el periodo de 30 dias, el historial puede archivarse definitivamente respetando la trazabilidad contable minima.'
        ]
      },
      {
        titulo: '5. Buenas Practicas de Cobranza Responsable',
        parrafos: [
          'Las gestiones de cobro deben realizarse en horarios prudentes comprendidos entre las 7 de la manana y las 7 de la noche, manteniendo siempre trato respetuoso, transparencia sobre capital e intereses y confirmacion clara de cada abono recibido.',
          'El asistente financiero Seneca solo brinda respuestas informativas y calculos de apoyo. Nunca solicita claves personales ni ejecuta movimientos monetarios.'
        ]
      }
    ]
  });
}

function crearReglasOperativasCsv() {
  const filas = [
    ['Categoria', 'Codigo_Regla', 'Regla_Operativa', 'Formula_o_Criterio', 'Ejemplo_Practico'],
    [
      'Calculo_Prestamo',
      'REG-01',
      'Calculo del monto total a pagar en un credito nuevo',
      'Total a pagar igual a principal mas el porcentaje de interes multiplicado por el principal',
      'Un prestamo de 200000 colones al 20 por ciento genera 40000 colones de interes y un total a pagar de 240000 colones'
    ],
    [
      'Calculo_Cuota',
      'REG-02',
      'Determinacion del monto fijo por cada cuota pactada',
      'Valor de cuota igual a total a pagar dividido entre numero de cuotas',
      'Un total de 240000 colones pactado en 4 cuotas equivale a 60000 colones por cuota'
    ],
    [
      'Frecuencias',
      'REG-03',
      'Periodicidades permitidas para calendarios de cobro',
      'Diaria cada 1 dia, semanal cada 7 dias, quincenal cada 15 dias y mensual cada 30 dias',
      'Un credito semanal de 4 cuotas completa su cobro proyectado en 28 dias calendario'
    ],
    [
      'Abonos',
      'REG-04',
      'Aplicacion directa de cada pago al saldo pendiente',
      'Nuevo saldo igual a saldo pendiente actual menos monto del abono registrado',
      'Si un cliente debe 120000 colones y abona el 25 por ciento equivalente a 30000 colones su saldo baja a 90000 colones'
    ],
    [
      'Atrasos',
      'REG-05',
      'Control de cuotas vencidas no pagadas a tiempo',
      'Todo vencimiento anterior o igual a la fecha actual sin pago aplicado suma en atrasos acumulados',
      'Si una cuota semanal vencio ayer y no se registro abono aparece marcada como atraso prioritario en agenda'
    ],
    [
      'Meta_Diaria',
      'REG-06',
      'Medicion del avance de cobranza durante el dia',
      'Porcentaje de cobro diario igual a monto recaudado hoy dividido entre suma de recaudado hoy mas pendiente de hoy por 100',
      'Si se recaudo 150000 colones y quedan 50000 pendientes hoy el cumplimiento diario es 75 por ciento'
    ],
    [
      'Respaldo',
      'REG-07',
      'Retencion obligatoria en papelera tras eliminar un cliente o credito',
      'Periodo minimo de resguardo igual a 30 dias antes del archivo historico definitivo',
      'Un perfil eliminado el dia 1 del mes permanece recuperable hasta completar los 30 dias en papelera'
    ],
    [
      'Seguridad_Asistente',
      'REG-08',
      'Operacion de solo lectura del asistente financiero Seneca',
      'Seneca responde consultas y realiza calculos exactos pero no modifica ni registra transacciones',
      'El prestamista valida el calculo con Seneca y luego registra manualmente el abono en el modulo de cobros'
    ]
  ];

  return `${filas.map((fila) => fila.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(',')).join('\n')}\n`;
}

function crearArquitecturaTecnicaAdminMd() {
  return `# Arquitectura Tecnica de Aureus Manager

Documento exclusivo para personal con rol ADMINISTRADOR. Prohibida su exposicion a cuentas COBRADOR o prestamistas externos.

## 1. Pila Tecnologica Oficial

- Backend: Node.js en modo ESM con Express 5 como capa HTTP y middlewares estrictos de seguridad.
- Base de Datos y ORM: PostgreSQL 18 (\`cobro_firme_db\`) accedido mediante pool nativo \`pg\` para consultas vectoriales/analiticas y Sequelize ORM para modelos relacionales.
- Frontend: React con Vite y react-router-dom ejecutando contexto de autenticacion estrictamente en memoria (prohibido usar localStorage o sessionStorage para sesiones).
- Proveedor de IA: Groq API con modelo \`openai/gpt-oss-120b\` consumido exclusivamente desde el servidor backend con Streaming SSE.
- Almacenamiento Documental Externo: Google Drive API (\`googleapis\`) autenticado mediante cuenta de servicio en el backend.

## 2. Seguridad, Sesiones y Defensa CSRF

1. **Cookies HttpOnly Reforzadas**: La sesion se emite mediante JWT firmado almacenado en cookie \`sid\` en desarrollo y \`__Host-sid\` en produccion, siempre con banderas \`HttpOnly\`, \`SameSite=Lax\` y alcance host-only sin atributo \`Domain\`.
2. **Proteccion de Rutas Privadas**: Todo endpoint de negocio bajo \`/api/seneca\` y rutas privadas valida la sesion mediante \`authMiddleware.js\`, respondiendo HTTP 401 ante cualquier peticion no autenticada.
3. **Control de Acceso Basado en Roles (RBAC)**: El middleware \`soloAdminRag\` valida exclusivamente \`req.user.rol === 'ADMINISTRADOR'\` y retorna HTTP 403 frente a cuentas \`COBRADOR\` en rutas de subida, borrado, configuracion Drive, sincronizacion y cambio de plan.
4. **Defensa CSRF en Capas**: Validacion de origen en metodos mutables y verificacion obligatoria de token HMAC en cabecera \`X-CSRF-Token\`.
5. **Expiracion Deslizante por Inactividad**: Toda sesion caduca automaticamente tras 25 minutos sin actividad.

## 3. Arquitectura RAG Segregada y Motor Determinista

- Las tablas \`empresas_rag\`, \`documentos_rag\` y \`fragmentos_rag\` almacenan metadatos, vectores \`DOUBLE PRECISION[]\` y etiquetas de seguridad \`nivel_acceso\` (\`PRESTAMISTA\` o \`ADMIN\`) junto con \`ruta_carpeta\`.
- \`drive.service.js\` escanea de forma recursiva las subcarpetas configuradas en Google Drive (\`Prestamistas/\` y \`Administracion/\`), clasifica cada archivo segun su ruta y mantiene sincronia con limpieza automatica de documentos eliminados o heredados.
- \`embeddings.service.js\` ejecuta el filtrado RBAC directamente en SQL mediante \`AND d.nivel_acceso = ANY($2::varchar[])\`, garantizando que ningun fragmento \`ADMIN\` sea recuperado por un \`COBRADOR\`.
- \`senecaCalculos.service.js\` intercepta preguntas de calculo financiero o aritmetico y resuelve ecuaciones de forma determinista sobre datos reales en PostgreSQL sin usar \`eval\` ni \`new Function\`.
`;
}

function crearGobernanzaSeguridadAdminPdf() {
  return generarPdfBuffer({
    titulo: 'Gobernanza, Auditoria y Seguridad de Plataforma Aureus Manager',
    subtitulo: 'Documento confidencial de Administracion: cumplimiento ADR-0001, ADR-0002, ADR-0003 y Ley 8968',
    secciones: [
      {
        titulo: '1. Gobernanza de Inteligencia Artificial (ADR-0001 y ADR-0002)',
        parrafos: [
          'Conforme al ADR-0001, la integracion con Groq y el modelo openai/gpt-oss-120b reside exclusivamente en el backend de Node.js. Cuando el proveedor externo no responde o no existe llave configurada, el sistema opera con respaldo SQL determinista sin exponer errores tecnicos al cliente.',
          'Conforme al ADR-0002, Seneca es estrictamente de solo lectura. La IA nunca registra abonos, nunca aprueba creditos, nunca altera saldos ni ejecuta mutaciones SQL sobre clientes, prestamos, pagos o agenda de cobros.'
        ]
      },
      {
        titulo: '2. Privacidad y Minimizacion de Datos (ADR-0003 y Ley N. 8968)',
        parrafos: [
          'Conforme al ADR-0003, al proveedor de IA solo se envian resumenes operativos necesarios para contestar la consulta del usuario autenticado. Nunca se transmiten contraseñas, hashes bcrypt, tokens JWT, cookies de sesion ni llaves privadas.',
          'El rol ADMINISTRADOR puede consultar metricas agregadas globales de la plataforma (total de cuentas, prestamos registrados, documentos y estado de indexacion RAG), pero tiene estrictamente prohibido acceder a nombres, cedulas, telefonos o direcciones de deudores individuales en cumplimiento de la Ley N. 8968.'
        ]
      },
      {
        titulo: '3. Segregacion RBAC de Base de Conocimiento RAG',
        parrafos: [
          'El sistema clasifica cada documento por nivel_acceso en PRESTAMISTA o ADMIN y registra su ruta_carpeta de origen. Las consultas del rol COBRADOR filtran en base de datos unicamente nivel PRESTAMISTA y bloquean preguntas sobre arquitectura interna, codigo fuente, PostgreSQL, Express, Groq o carteras de otros usuarios.',
          'Solo las cuentas con rol ADMINISTRADOR pueden invocar los endpoints de gestion documental, conexion con Google Drive, sincronizacion manual y actualizacion de planes RAG.'
        ]
      },
      {
        titulo: '4. Politica de Retencion, Errores y Seguridad Perimetral',
        parrafos: [
          'Toda eliminacion de clientes o prestamos respeta respaldo obligatorio en papelera durante 30 dias previos al archivo definitivo. En el servidor HTTP se aplican encabezados Helmet, control de tasa por endpoint, validacion estricta de entradas en el borde para prevenir mass-assignment y manejador centralizado de errores con firma cuadruple.'
        ]
      }
    ]
  });
}

function crearMatrizRolesPermisosJson() {
  const matriz = {
    sistema: 'Aureus Manager',
    version_matriz: '2.0',
    roles: [
      {
        rol: 'COBRADOR',
        nombre_visible: 'Prestamista Independiente',
        alcance_datos: 'Exclusivo de su propia cartera vinculada a su identificador de usuario',
        rag_niveles_permitidos: ['PRESTAMISTA'],
        permisos_operativos: [
          'Gestionar sus propios clientes, prestamos, cobros, zonas, lista negra y papelera de 30 dias',
          'Consultar a Seneca en modo lectura sobre su propia cartera, reglas operativas y simulaciones',
          'Visualizar en el estado documental unicamente los documentos con nivel PRESTAMISTA'
        ],
        restricciones_estrictas: [
          'Acceso denegado con HTTP 403 a subida de documentos, borrado documental, conexion o sincronizacion Google Drive y cambio de plan RAG',
          'Prohibido recuperar fragmentos ADMIN o recibir informacion sobre PostgreSQL, Node.js, Express, Sequelize, Groq, API o arquitectura interna',
          'Prohibido consultar datos o metricas de otros prestamistas'
        ]
      },
      {
        rol: 'ADMINISTRADOR',
        nombre_visible: 'Administrador de Plataforma',
        alcance_datos: 'Gobernanza administrativa, auditoria RAG y metricas globales agregadas sin datos personales de deudores',
        rag_niveles_permitidos: ['PRESTAMISTA', 'ADMIN'],
        permisos_operativos: [
          'Administrar cuentas de prestamistas, planes RAG, documentos propios y sincronizacion recursiva con Google Drive',
          'Consultar a Seneca sobre arquitectura tecnica, gobernanza, ADRs, roles, permisos y metricas globales agregadas de la plataforma',
          'Visualizar documentos de niveles PRESTAMISTA y ADMIN en el panel de estado RAG'
        ],
        restricciones_estrictas: [
          'Prohibido exponer nombres, cedulas, telefonos o direcciones individuales de clientes deudores conforme a Ley 8968',
          'Seneca mantiene modo estricto de solo lectura conforme a ADR-0002 sin mutaciones automaticas en base de datos'
        ]
      }
    ],
    endpoints_rag_protegidos: [
      {
        metodo: 'GET',
        ruta: '/api/seneca/rag/estado',
        roles_permitidos: ['COBRADOR', 'ADMINISTRADOR'],
        regla: 'Retorna solo documentos PRESTAMISTA para COBRADOR y todos los niveles para ADMINISTRADOR'
      },
      {
        metodo: 'POST',
        ruta: '/api/seneca/rag/documentos',
        roles_permitidos: ['ADMINISTRADOR'],
        regla: 'Protegido por soloAdminRag con respuesta HTTP 403 para COBRADOR'
      },
      {
        metodo: 'DELETE',
        ruta: '/api/seneca/rag/documentos/:id',
        roles_permitidos: ['ADMINISTRADOR'],
        regla: 'Protegido por soloAdminRag con respuesta HTTP 403 para COBRADOR'
      },
      {
        metodo: 'POST',
        ruta: '/api/seneca/rag/drive/conectar',
        roles_permitidos: ['ADMINISTRADOR'],
        regla: 'Protegido por soloAdminRag con respuesta HTTP 403 para COBRADOR'
      },
      {
        metodo: 'POST',
        ruta: '/api/seneca/rag/drive/sincronizar',
        roles_permitidos: ['ADMINISTRADOR'],
        regla: 'Protegido por soloAdminRag con respuesta HTTP 403 para COBRADOR'
      },
      {
        metodo: 'PUT y PATCH',
        ruta: '/api/seneca/rag/plan',
        roles_permitidos: ['ADMINISTRADOR'],
        regla: 'Protegido por soloAdminRag con respuesta HTTP 403 para COBRADOR'
      }
    ]
  };

  return `${JSON.stringify(matriz, null, 2)}\n`;
}

async function main() {
  await fs.mkdir(DIR_PRESTAMISTAS, { recursive: true });
  await fs.mkdir(DIR_ADMINISTRACION, { recursive: true });

  const [guiaPdf, politicasDocx, gobernanzaPdf] = await Promise.all([
    crearGuiaModulosPrestamistasPdf(),
    crearPoliticasUsoLey8968Docx(),
    crearGobernanzaSeguridadAdminPdf()
  ]);

  const archivos = [
    {
      ruta: path.join(DIR_PRESTAMISTAS, '01_Guia_Modulos_Aureus.pdf'),
      contenido: guiaPdf
    },
    {
      ruta: path.join(DIR_PRESTAMISTAS, '02_Politicas_Uso_y_Privacidad_Ley8968.docx'),
      contenido: politicasDocx
    },
    {
      ruta: path.join(DIR_PRESTAMISTAS, '03_Reglas_Operativas_Cobros_y_Prestamos.csv'),
      contenido: crearReglasOperativasCsv()
    },
    {
      ruta: path.join(DIR_ADMINISTRACION, '01_Arquitectura_Tecnica_Aureus.md'),
      contenido: crearArquitecturaTecnicaAdminMd()
    },
    {
      ruta: path.join(DIR_ADMINISTRACION, '02_Gobernanza_Auditoria_y_Seguridad.pdf'),
      contenido: gobernanzaPdf
    },
    {
      ruta: path.join(DIR_ADMINISTRACION, '03_Matriz_Roles_y_Permisos.json'),
      contenido: crearMatrizRolesPermisosJson()
    }
  ];

  for (const archivo of archivos) {
    await fs.writeFile(archivo.ruta, archivo.contenido);
    console.log(`[generar-archivos-drive] Generado: ${path.relative(REPO_ROOT, archivo.ruta)}`);
  }
}

main().catch((err) => {
  console.error('[generar-archivos-drive] Error:', err);
  process.exit(1);
});
