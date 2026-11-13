# PostgreSQL seguro: semáforo, checklists y patrones

## Contenido
1. Semáforo de riesgo (qué es 🟢 / 🟡 / 🔴)
2. Checklist por operación (agregar, modificar, eliminar, consultar)
3. Patrones seguros
4. Trampas específicas de PostgreSQL + Sequelize
5. MySQL → PostgreSQL (los documentos del curso usan MySQL)

---

## 1. Semáforo de riesgo

### 🟢 Recomendado (implementar directo)
- Crear una tabla nueva con PK, FKs con `references` e índices en FKs.
- Agregar una columna **nullable** o con `defaultValue`.
- Agregar un índice o una restricción `unique` sobre datos que se sabe que no chocan.
- Extraer datos repetidos a una tabla propia (aplicar 1FN/2FN/3FN) con migración de datos.
- Agregar un endpoint nuevo, validaciones, o `try/catch` faltante.
- Seeders de datos de prueba (solo en desarrollo).

### 🟡 Con reservas (implementar explicando riesgo y reversa)
- Agregar columna `NOT NULL` sin default a una tabla con datos (falla; requiere default o backfill en pasos).
- `changeColumn` que cambia el tipo (puede reescribir la tabla, bloquear y perder precisión).
- Renombrar tabla o columna (rompe modelos, controladores y consultas que la usan).
- Agregar `unique` o FK sobre datos existentes (puede fallar si hay duplicados o huérfanos).
- Cambiar `onDelete` de una FK.
- Desnormalizar con una razón medida y documentada.
- Usar `JSONB`/`ARRAY` en lugar de tabla hija (se justifica solo para datos no relacionales).
- Cambiar el contrato de un endpoint ya consumido (campos, códigos HTTP).
- Migración que mezcla DDL con migración de datos.
- Crear índices en tablas muy grandes (usar `CREATE INDEX CONCURRENTLY`).

### 🔴 No recomendado (no ejecutar sin explicar y confirmar)
- `DROP TABLE`, `dropTable`, `removeColumn`, `DROP TYPE` sobre datos reales.
- `sequelize.sync({ force: true })` (borra y recrea todas las tablas) y `sync({ alter: true })`.
- `db:migrate:undo:all`, `db:seed:undo:all` fuera de un entorno de desarrollo descartable.
- `DELETE`/`UPDATE` **sin `WHERE`**, `TRUNCATE`, `destroy({ truncate: true })`, `destroy({ where: {} })`.
- `onDelete: 'CASCADE'` en relaciones donde borrar el padre arrastraría datos de valor (pacientes → citas → recetas; clientes → ventas).
- Editar una migración **ya aplicada**.
- Guardar listas separadas por comas o columnas `campo1..n` (viola 1FN).
- Repetir datos de otra entidad por fila (viola 2FN/3FN) sin justificación medida.
- `Model.create(req.body)` / `update(req.body)` con datos sin filtrar en endpoints expuestos.
- SQL concatenando strings con datos del usuario (inyección SQL).
- Guardar contraseñas en texto plano, devolver `password` en una respuesta, subir credenciales o `.env` al repositorio.
- JWT sin `expiresIn`, con el secreto escrito en el código, retornado en el JSON de login, o token guardado en `localStorage`/`sessionStorage` en lugar de cookie HttpOnly reforzada (ver `auth-seguridad.md` y `cookies-seguras.md`).
- `FLOAT`/`DOUBLE` para dinero.
- Instalar o usar otro ORM distinto de Sequelize.

## 2. Checklist por operación

### AGREGAR (tabla, columna, endpoint)
- [ ] ¿Ya existe algo equivalente? (revisar `models/` y `migrations/`)
- [ ] ¿Cumple 1FN, 2FN y 3FN? (`references/normalizacion.md`)
- [ ] PK definida; si es compuesta, revisar 2FN
- [ ] FKs con `references`, `onDelete`/`onUpdate` pensados, e índice por cada FK
- [ ] `allowNull`, `unique`, `defaultValue` coherentes entre migración y modelo
- [ ] Tipos adecuados (`DECIMAL(10,2)` para dinero, `STRING` vs `TEXT`)
- [ ] `down` revierte exactamente (tablas hijas antes que padres; `DROP TYPE` si hay ENUM)
- [ ] Asociaciones declaradas en **ambos** lados
- [ ] Router registrado en `app.js`

### MODIFICAR (columna, tipo, relación, lógica)
- [ ] Migración **nueva**, nunca editar una aplicada
- [ ] Buscar todos los usos del campo (modelo, controladores, rutas, seeders, SQL crudo)
- [ ] ¿Hay datos existentes? ¿El cambio es compatible con ellos?
- [ ] Pasos pequeños (patrón *expand/contract*, sección 3)
- [ ] Plan de reversa en `down`
- [ ] Actualizar modelo y migración para que sigan coincidiendo

### ELIMINAR (columna, tabla, registros)
- [ ] **Avisar** y emitir veredicto (normalmente 🔴 o 🟡)
- [ ] Respaldo antes: `pg_dump -Fc -U <usuario> <bd> > respaldo.dump`
- [ ] Buscar dependencias: FKs que apuntan a la tabla, modelos, controladores, vistas
- [ ] Preferir **borrado lógico** (`paranoid: true` + columna `deletedAt`) o `onDelete: 'RESTRICT'`
- [ ] Para registros: `DELETE`/`destroy` siempre con `where` específico, probado primero con un `SELECT`
- [ ] Para columnas/tablas: primero dejar de usarlas en el código (deprecar), luego eliminar en una migración posterior
- [ ] `down` que recree la estructura (aunque no pueda recuperar los datos; decirlo)

### CONSULTAR (SQL / Sequelize)
- [ ] Parametrizar (`replacements`/`bind`), nunca concatenar
- [ ] Seleccionar solo las columnas necesarias; paginar listados
- [ ] `include` en una sola consulta (evitar N+1)
- [ ] Columnas de `WHERE`/`JOIN`/`ORDER BY` frecuentes con índice
- [ ] Verificar con `EXPLAIN ANALYZE` antes de desnormalizar por "lentitud"

## 3. Patrones seguros

### Expand / Contract (renombrar o cambiar sin romper)
1. **Expand:** migración que agrega la columna/tabla nueva (nullable).
2. **Backfill:** migración (o script) que copia los datos, en lotes si son muchos.
3. **Switch:** el código pasa a leer/escribir la nueva estructura.
4. **Contract:** tiempo después, otra migración elimina lo viejo (con respaldo).

### Pasar una columna multivaluada a 1FN (ej.: `telefonos` → tabla hija)
1. Migración: crear `telefonos_x` con FK + índice.
2. Migración de datos: separar con `regexp_split_to_table(telefonos, '\s*,\s*')` e insertar una fila por valor.
3. Cambiar modelo, controladores y asociaciones (`hasMany`/`belongsTo`).
4. Migración posterior: eliminar la columna vieja (con respaldo).

```sql
INSERT INTO telefonos_cliente (cliente_id, telefono)
SELECT id, trim(t)
FROM clientes, regexp_split_to_table(telefonos, ',') AS t
WHERE telefonos IS NOT NULL AND trim(t) <> '';
```

### Agregar NOT NULL a una tabla con datos
1. `addColumn` nullable (o con `defaultValue`).
2. Rellenar los existentes (`UPDATE ... WHERE columna IS NULL`).
3. `changeColumn` a `allowNull: false`.

### Borrado lógico
Modelo con `paranoid: true` (requiere columna `deletedAt` en la migración). `destroy()` marca la fecha en vez de borrar; `restore()` lo recupera. Para tablas con `unique`, considera índice único parcial (`WHERE "deletedAt" IS NULL`).

### Transacciones para operaciones multi-tabla
```js
await sequelize.transaction(async (t) => {
  const cita = await Cita.create(datos, { transaction: t });
  await CitaMedicamento.bulkCreate(recetas.map(r => ({ ...r, citaId: cita.id })), { transaction: t });
});
```

### Índices en tablas grandes
```js
await queryInterface.sequelize.query(
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ventas_cliente_id ON "Ventas"("clienteId")'
);
```
`CONCURRENTLY` no puede ir dentro de una transacción.

## 4. Trampas específicas de PostgreSQL + Sequelize

1. **PostgreSQL no indexa las FKs automáticamente.** Crea el índice a mano (`addIndex`). Sin él, los JOIN y los borrados en cascada se vuelven lentos.
2. **ENUM crea un tipo** (`enum_<Tabla>_<columna>`). Un `dropTable` no lo elimina; en `down` agrega:
   `await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Usuarios_rol";');`
   Agregar valores a un ENUM existente requiere `ALTER TYPE ... ADD VALUE` (no se puede revertir fácil). Considera una tabla catálogo (`roles`) en su lugar: es más 3FN y más flexible.
3. **Identificadores con comillas.** Sequelize crea tablas como `"Usuarios"` (mayúscula inicial); en SQL a mano hay que escribirlas entre comillas dobles. Para evitar el problema en proyectos nuevos, usa `snake_case` con `underscored: true` y `tableName`. **En un proyecto existente, respeta la convención que ya hay.**
4. **`DATE` de Sequelize = `TIMESTAMPTZ`** en PostgreSQL. `DATEONLY` = `DATE` (úsalo para fechas sin hora, como fecha de pedido).
5. **`autoIncrement: true`** genera `SERIAL`. Si insertas filas con `id` explícito en seeders, la secuencia se desincroniza: ajusta con `SELECT setval(pg_get_serial_sequence('"Tabla"','id'), (SELECT MAX(id) FROM "Tabla"));`.
6. **`changeColumn` de tipo** puede requerir `USING` para convertir; con Sequelize usa SQL crudo: `ALTER TABLE ... ALTER COLUMN ... TYPE ... USING col::tipo`.
7. **`sync({ alter: true })`** puede borrar y recrear columnas: no usar.
8. **`createdAt`/`updatedAt`** son obligatorios en las migraciones si el modelo tiene `timestamps` (por defecto sí).
9. **Orden en `down`:** elimina primero las tablas hijas (con FK) y luego las padre.
10. **Credenciales y entornos:** la conexión sale de `.env` (leído en `src/config/config.js` y `src/models/index.js`); nunca contraseñas reales dentro del código ni en un `config.json` versionado.

## 5. MySQL → PostgreSQL

Los PDF/PPTX del curso usan MySQL en sus ejemplos SQL. Equivalencias:

| MySQL (documentos) | PostgreSQL |
|---|---|
| `INT AUTO_INCREMENT PRIMARY KEY` | `INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY` (o `SERIAL`) |
| `INT` | `INTEGER` |
| `DATETIME` | `TIMESTAMPTZ` (o `TIMESTAMP`) |
| `DATE` | `DATE` |
| `VARCHAR(n)` | `VARCHAR(n)` |
| `DECIMAL(10,2)` | `NUMERIC(10,2)` / `DECIMAL(10,2)` |
| `TINYINT(1)` | `BOOLEAN` |
| `ENUM('a','b')` en la columna | `CREATE TYPE ... AS ENUM` o tabla catálogo |
| Backticks `` `tabla` `` | Comillas dobles `"tabla"` solo si hay mayúsculas/espacios |
| `LIMIT 5, 10` | `LIMIT 10 OFFSET 5` |
| `IFNULL(a,b)` | `COALESCE(a,b)` |
| `NOW()` | `NOW()` / `CURRENT_TIMESTAMP` |

En Sequelize no escribes estos tipos a mano: usas `DataTypes` y el dialecto `postgres` traduce.
