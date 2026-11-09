/**
 * Script auxiliar para anexar de forma segura una nueva entrada a bitacora_agente.md
 * Uso: node append-bitacora.js [ruta-a-json-de-entrada]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ubicación de bitacora_agente.md en la raíz de Proyecto-Backend
const BITACORA_PATH = path.resolve(__dirname, '../../../bitacora_agente.md');

const HEADER_TEXT = `# 📓 Bitácora Histórica de Respuestas del Agente - Cobro-Firme
Registro continuo de solicitudes de usuario, modificaciones técnicas y respuestas generadas por el agente.

---
`;

export function appendToBitacora({ indicacion, archivos = [], resumenTecnico = [], respuesta }) {
  let existingContent = '';
  if (fs.existsSync(BITACORA_PATH)) {
    existingContent = fs.readFileSync(BITACORA_PATH, 'utf8');
  }

  if (!existingContent.trim()) {
    existingContent = HEADER_TEXT;
  }

  // Contar entradas existentes para asignar el número consecutivo
  const matchEntries = existingContent.match(/## \[Entrada #(\d+)\]/g) || [];
  const nextNum = matchEntries.length + 1;

  const archivosMd = archivos.length > 0 
    ? archivos.map(a => `- \`${a}\``).join('\n')
    : '- Ninguno (consulta informativa o sin cambios de archivo)';

  const resumenMd = resumenTecnico.length > 0
    ? resumenTecnico.map(r => `- ${r}`).join('\n')
    : '- Tarea completada según especificaciones.';

  const entryBlock = `
## [Entrada #${nextNum}]
**Indicación / Tarea:**
> ${indicacion.trim().replace(/\n/g, '\n> ')}

### 1. Archivos Afectados
${archivosMd}

### 2. Resumen de Acciones Técnicas
${resumenMd}

### 3. Respuesta Completa del Agente
${respuesta.trim()}

---
`;

  fs.writeFileSync(BITACORA_PATH, existingContent.trimEnd() + '\n' + entryBlock, 'utf8');
  console.log(`[Bitácora] Entrada #${nextNum} registrada exitosamente en ${BITACORA_PATH}`);
}

// Ejecución directa por CLI si se pasa un archivo JSON
if (process.argv[2]) {
  try {
    const rawData = fs.readFileSync(process.argv[2], 'utf8');
    const data = JSON.parse(rawData);
    appendToBitacora(data);
  } catch (err) {
    console.error('[Bitácora] Error ejecutando script:', err);
    process.exit(1);
  }
}

