---
name: bitacora-agente
description: Guarda y documenta de forma sistemática y cronológica la respuesta completa del agente, la indicación del usuario, los archivos creados o modificados y las acciones ejecutadas en el archivo bitacora_agente.md. Úsala OBLIGATORIAMENTE al finalizar cada indicación, comando, cambio de código, consulta o ajuste técnico, incluso si el usuario no menciona explícitamente "bitácora" o "guardar respuesta".
---

# Bitácora de Respuestas del Agente

Esta skill define el protocolo obligatorio para registrar y persistir en el archivo `bitacora_agente.md` (ubicado en la raíz de `Proyecto-Backend`) toda la información de cada respuesta y acción que el agente ejecute tras recibir una indicación del usuario.

## Cuándo se activa

Se debe ejecutar **SIEMPRE** al finalizar cualquier interacción o indicación de trabajo:
- Creación de nuevas características o módulos (Frontend o Backend).
- Corrección de errores, bugs o fallas de base de datos.
- Modificación de estilos, maquetación o componentes de React.
- Creación o alteración de esquemas, tablas o funciones SQL en PostgreSQL.
- Consultas técnicas o análisis de arquitectura.
- Cualquier indicación donde el agente realice cambios o responda al usuario.

---

## Ubicación del archivo de bitácora

El archivo de destino es estrictamente:
```
Proyecto-Backend/bitacora_agente.md
```
Ruta absoluta:
`c:\Users\abark\OneDrive\Documentos\OneDrive\Escritorio\Proyect\Proyecto-Backend\bitacora_agente.md`

---

## Reglas obligatorias de registro

1. **Nunca sobrescribir el historial existente:**
   - Siempre se debe agregar el contenido al final del archivo (`append`), preservando todas las entradas anteriores.
2. **Inicialización automática:**
   - Si `bitacora_agente.md` se encuentra vacío o sin encabezado, se debe inicializar primero con el título del proyecto y descripción antes de añadir la primera entrada.
3. **Fidelidad y completitud de la respuesta:**
   - La sección `Respuesta Entregada al Usuario` debe contener la respuesta completa y detallada proporcionada al usuario, incluyendo explicaciones, rutas de archivos modificados, listas de cambios y resultados de compilación.
4. **Numeración correlativa limpia:**
   - Cada entrada debe llevar únicamente su número correlativo consecutivo (`## [Entrada #1]`, `## [Entrada #2]`, etc.), sin incluir fecha, hora ni país en el encabezado.
5. **Separador visual:**
   - Cada entrada finaliza con una línea horizontal separadora `---` para facilitar la lectura y búsqueda rápida.

---

## Estructura estándar de cada entrada

Cada nuevo registro en `bitacora_agente.md` debe seguir rigurosamente esta plantilla:

```markdown
## [Entrada #N]
**Indicación / Tarea:**
> [Texto o resumen fiel de la solicitud realizada por el usuario]

### 1. Archivos Afectados
- `ruta/al/archivo1.ext` (Creado / Modificado / Eliminado)
- `ruta/al/archivo2.ext`

### 2. Resumen de Acciones Técnicas
- [Detalle de los cambios aplicados en Base de Datos / Backend / Frontend]
- [Resultados de compilación, verificación de sintaxis o tests ejecutados]

### 3. Respuesta Completa del Agente
[Aquí se coloca íntegra la respuesta final emitida por el agente al usuario, preservando formato, enlaces a archivos y detalles explicativos]

---
```

---

## Procedimiento paso a paso para el Agente

Al completar cualquier tarea o indicación:

1. **Identificar los cambios:** Listar con precisión los archivos modificados, creados o eliminados.
2. **Revisar el archivo `bitacora_agente.md`:**
   - Si está vacío, escribir el encabezado principal:
     ```markdown
     # 📓 Bitácora Histórica de Respuestas del Agente - Cobro-Firme
     Registro continuo de solicitudes de usuario, modificaciones técnicas y respuestas generadas por el agente.

     ---
     ```
   - Determinar el número correlativo de la siguiente entrada (contando las entradas previas `[Entrada #N]`).
3. **Construir el bloque de la entrada** con la indicación, los archivos afectados, el resumen técnico y la respuesta completa generada.
4. **Anexar al archivo:** Usar la herramienta `write_file` con `Append: true` o concatenar el nuevo bloque al final del archivo `bitacora_agente.md`.
5. **Confirmar:** Entregar la respuesta al usuario asegurando que la bitácora quedó actualizada.

---

## Recursos auxiliares incluidos

- `references/plantilla-ejemplo.md`: Plantilla de referencia y ejemplos reales de entradas completadas.
- `scripts/append-bitacora.js`: Script utilitario en Node.js para formatear y anexar entradas automáticamente si se requiere automatización programática.

