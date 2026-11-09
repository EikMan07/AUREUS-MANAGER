# Normalización: 1FN, 2FN y 3FN (aplicada a PostgreSQL)

## Contenido
1. Por qué normalizar (anomalías)
2. Conceptos base
3. 1FN
4. 2FN
5. 3FN
6. Resumen lado a lado
7. Casos de negocio (inventarios, RRHH, ventas, hospital)
8. Cuándo desnormalizar
9. Anti-patrones
10. Del negocio al diseño (flujo + DER)
11. Checklist de revisión rápida

---

## 1. Por qué normalizar

Una tabla mal diseñada repite datos. Esa repetición causa tres **anomalías**:

| Anomalía | Qué pasa | Ejemplo |
|---|---|---|
| Inserción | No puedes registrar un dato sin inventar otro | No guardar un producto que aún no se ha vendido |
| Actualización | Un mismo dato vive en muchas filas; cambias una y olvidas otra | Cambiar el precio en una fila y no en otras |
| Eliminación | Al borrar una fila pierdes información que querías conservar | Borrar el último pedido borra también al cliente |

Costo de negocio real: reportes que no cuadran, horas corrigiendo el mismo dato en varios lugares, decisiones sobre información inconsistente.

## 2. Conceptos base

- **Clave primaria (PK):** columna que identifica cada fila de forma única; nunca se repite ni queda vacía. Ej.: `id_cliente`.
- **Clave compuesta:** PK formada por dos o más columnas que juntas identifican la fila. Ej.: `(id_pedido, id_producto)`.
- **Dependencia funcional:** B depende de A si, al conocer A, siempre conoces un único valor de B. Ej.: `id_producto → precio`.
- **Dependencia parcial:** atributo que depende solo de una parte de una clave compuesta (viola 2FN).
- **Dependencia transitiva:** A depende de B y B depende de C (B no es clave), entonces A depende de C "de rebote" (viola 3FN).

## 3. Primera Forma Normal (1FN) — "cada celda, un dato"

Una tabla está en 1FN cuando:
1. **Valores atómicos:** nada de listas en una celda (`'8888-1111, 7777-2222'`).
2. **Sin grupos repetitivos:** nada de `telefono1, telefono2, telefono3`.
3. **Clave primaria:** cada fila se identifica de forma única.
4. **Un tipo por columna:** todos los valores de una columna son del mismo tipo.

Truco de detección: si te imaginas separando un valor por comas para leerlo, ya violas 1FN.

**Problema → solución (PostgreSQL):**

```sql
-- ❌ Viola 1FN
CREATE TABLE estudiantes (
  id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL,
  telefonos VARCHAR(255)            -- '8888-1111, 8888-2222'
);

-- ✅ 1FN
CREATE TABLE estudiantes (
  id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);

CREATE TABLE telefonos (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  telefono      VARCHAR(20) NOT NULL
);
CREATE INDEX idx_telefonos_estudiante_id ON telefonos(estudiante_id);
```

Un estudiante puede tener 1, 3 o 10 teléfonos sin cambiar la estructura.

> Nota PostgreSQL: existen `ARRAY` y `JSONB`. Son válidos para casos específicos (etiquetas, configuración flexible), pero **para datos de negocio que se consultan, filtran o relacionan, usa una tabla hija**. Si propones `ARRAY`/`JSONB` donde el curso espera 1FN, marca el veredicto como 🟡 y justifica.

## 4. Segunda Forma Normal (2FN) — "todo depende de toda la clave"

Una tabla está en 2FN cuando:
1. Ya está en 1FN.
2. Cada atributo no clave depende de la **clave primaria completa**, no solo de una parte.

**Atajo:** si la PK tiene una sola columna y la tabla está en 1FN, ya está en 2FN. El problema solo aparece con claves compuestas.

```sql
-- ❌ Viola 2FN: PK (estudiante_id, curso_id)
CREATE TABLE matriculas (
  estudiante_id     INTEGER,
  curso_id          INTEGER,
  estudiante_nombre VARCHAR(100),  -- depende solo de estudiante_id
  curso_nombre      VARCHAR(100),  -- depende solo de curso_id
  nota              DECIMAL(5,2),  -- depende de la clave completa ✔
  PRIMARY KEY (estudiante_id, curso_id)
);

-- ✅ 2FN
CREATE TABLE estudiantes (id INTEGER PRIMARY KEY, nombre VARCHAR(100) NOT NULL);
CREATE TABLE cursos      (id INTEGER PRIMARY KEY, nombre VARCHAR(100) NOT NULL);

CREATE TABLE matriculas (
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
  curso_id      INTEGER NOT NULL REFERENCES cursos(id),
  nota          DECIMAL(5,2),
  PRIMARY KEY (estudiante_id, curso_id)
);
-- La PK compuesta ya indexa estudiante_id; agrega índice para curso_id:
CREATE INDEX idx_matriculas_curso_id ON matriculas(curso_id);
```

**Ejemplo de pedidos del curso:** `Detalle_Pedido (id_pedido, id_producto, cantidad, nombre_producto, precio, fecha_pedido)`:
- `(id_pedido, id_producto) → cantidad` ✔ depende de toda la clave
- `id_producto → nombre_producto, precio` ✘ parcial
- `id_pedido → fecha_pedido` ✘ parcial

Solución: `Pedido(id_pedido, fecha_pedido)`, `Producto(id_producto, nombre_producto, precio)`, `Detalle_Pedido(id_pedido, id_producto, cantidad)` con FKs.

> Nota de negocio: si el **precio al momento de la venta** debe quedar congelado (porque el precio del producto cambia con el tiempo), guarda `precio_unitario` en `Detalle_Pedido` a propósito. No es violación de 2FN: es otro dato (el precio *pagado*), no el precio *actual*. Documéntalo con un comentario.

### Procedimiento para llevar a 2FN
1. **Identificar** tablas con clave compuesta (ej.: la que une Cita con Medicamento).
2. **Analizar:** escribir las dependencias funcionales de cada atributo no clave.
3. **Separar:** mover los atributos con dependencia parcial a su propia tabla y unirlas con FKs.
4. **Verificar:** cada atributo depende de toda la clave de su tabla; dibujar el diagrama final.

## 5. Tercera Forma Normal (3FN) — "depende solamente de la clave"

Una tabla está en 3FN cuando está en 1FN y 2FN y **no tiene dependencias transitivas**: un atributo no clave no puede depender de otro atributo no clave.

```sql
-- ❌ Viola 3FN: id → departamento_id → departamento_nombre
CREATE TABLE empleados (
  id                  INTEGER PRIMARY KEY,
  nombre              VARCHAR(100),
  departamento_id     INTEGER,
  departamento_nombre VARCHAR(100)   -- "Desarrollo" repetido en cada fila
);

-- ✅ 3FN
CREATE TABLE departamentos (
  id     INTEGER PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL
);
CREATE TABLE empleados (
  id              INTEGER PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  departamento_id INTEGER NOT NULL REFERENCES departamentos(id)
);
CREATE INDEX idx_empleados_departamento_id ON empleados(departamento_id);
```

Pregunta guía: **"¿de qué depende esto?"** Si la respuesta es otro campo que no es la clave, hay dependencia transitiva.

## 6. Resumen lado a lado

| Forma | Pregunta clave | Qué evita | Solución típica |
|---|---|---|---|
| 1FN | ¿Cada celda tiene un solo valor? | Datos multivaluados, grupos repetitivos | Separar valores en filas o en una tabla nueva |
| 2FN | ¿Cada atributo depende de toda la clave? | Dependencias parciales | Mover cada atributo a la tabla de la que realmente depende |
| 3FN | ¿Cada atributo depende solo de la clave? | Dependencias transitivas | Extraer el atributo determinante a su propia tabla |

Una tabla en 3FN cumple automáticamente 1FN y 2FN. Cada nivel construye sobre el anterior: **no se puede saltar un paso**.

## 7. Casos de negocio

**Inventarios.** `producto | proveedor | pais_proveedor | stock` repite "TechCorp / Costa Rica" por producto. → `proveedores(id, nombre, pais)` + `productos(id, nombre, stock, proveedor_id → proveedores)`. Si TechCorp cambia de nombre, se corrige en un solo registro. *Pregunta de negocio a validar: ¿un producto puede tener varios proveedores?* Si sí, la relación es N:M (`producto_proveedor`).

**RRHH.** `empleado | depto_id | depto_nombre | depto_gerente`: `depto_nombre` y `depto_gerente` dependen de `depto_id` (transitiva). → `departamentos(id, nombre, gerente)` + `empleados(…, departamento_id)`. Cambiar de gerente es un solo UPDATE.

**Ventas.** Guardar nombre y correo del cliente en cada venta provoca "Juan Pérez" vs "juan perez" y reportes que agrupan mal. → `clientes(id, nombre, correo UNIQUE)` + `ventas(id, cliente_id, fecha, monto DECIMAL(10,2))`.

**Hospital (actividad de clase).** Entidades: Paciente, Médico, Especialidad, Cita, Medicamento.
- Atributo multivaluado a propósito: teléfonos o alergias del paciente → tabla hija (1FN).
- Relación N:M: una cita puede recetar varios medicamentos y un medicamento aparece en muchas citas → tabla intermedia `receta`/`cita_medicamento` con PK compuesta `(cita_id, medicamento_id)` y atributos propios (dosis, duración) que dependen de **ambos** (2FN).
- Especialidad es su propia tabla; el médico solo guarda `especialidad_id` (3FN). Si un médico puede tener varias especialidades → N:M `medico_especialidad`.
- Un paciente es dato clínico sensible: no borrar en duro (ver `postgres-seguro.md`).

## 8. Cuándo desnormalizar

La normalización no es una regla absoluta, pero la excepción debe ser **consciente y documentada**.
- Normaliza primero hasta 3FN.
- Desnormaliza solo donde **midas** un problema real de rendimiento (ej.: un dashboard que necesita respuestas instantáneas).
- Deja un comentario explicando por qué esa tabla es la excepción, y cómo se mantiene sincronizada (trigger, job, o recalculo en el controlador).
- Nunca como punto de partida ni "por si acaso es más rápido".

## 9. Anti-patrones

- Varios valores separados por comas en una columna.
- No revisar dependencias parciales con PK compuesta.
- Repetir el nombre de una entidad relacionada en cada fila en vez de usar su clave.
- Texto libre (nombres, categorías) donde debería haber una tabla relacionada.
- Sobre-normalizar hasta que la consulta más simple necesita 6 JOIN.
- Desnormalizar desde el inicio.
- Diseñar la BD sin hablar con quien conoce el negocio.
- No medir el costo real de un mal diseño hasta que ya generó un problema.
- Normalizar como fin en sí mismo: el objetivo es evitar inconsistencias, no perseguir la teoría a cualquier costo.

## 10. Del negocio al diseño normalizado

1. **Entender el negocio:** conversa con quien conoce el proceso real; no asumas.
2. **Identificar entidades:** ¿qué cosas necesitan guardarse?
3. **Dibujar relaciones** (DER): ¿cómo se conectan?
4. **Aplicar 1FN, 2FN, 3FN.**
5. **Validar con el negocio:** ¿el diseño final sigue reflejando la realidad?

El DER se diseña **antes** de programar: un cambio en papel cuesta minutos; en producción, mucho más. Sirve también para validar con el dueño del negocio, no solo con programadores.

## 11. Checklist de revisión rápida

**1FN**
- [ ] Ninguna celda tiene listas ni valores separados por comas
- [ ] No hay columnas repetidas tipo `telefono1`, `telefono2`
- [ ] Cada tabla tiene PK
- [ ] Cada columna guarda un solo tipo de dato

**2FN**
- [ ] Las tablas con PK compuesta no tienen dependencias parciales
- [ ] Cada atributo no clave depende de toda la clave
- [ ] Las FKs conectan las tablas nuevas

**3FN**
- [ ] Ningún atributo no clave depende de otro atributo no clave
- [ ] Ningún nombre/categoría de otra entidad se repite por fila (se usa su FK)

**Diseño**
- [ ] El DER está validado con el negocio
- [ ] Toda desnormalización tiene comentario y medición que la justifique
- [ ] Ninguna consulta básica requiere más de ~4 JOIN sin motivo

**Reto de práctica (para entrenar el ojo):** `libros(id, titulo, autor_nombre, autor_pais, editorial_nombre, editorial_pais)` viola 3FN (autor_pais depende de autor_nombre; editorial_pais de editorial_nombre). Se rediseña en `autores`, `editoriales` y `libros(autor_id, editorial_id)`; si un libro puede tener varios autores, se agrega la tabla N:M `libro_autor`.
