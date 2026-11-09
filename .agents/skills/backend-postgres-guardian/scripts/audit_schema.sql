-- ============================================================================
-- audit_schema.sql — Auditoría de normalización, integridad e índices (PostgreSQL)
-- Solo LEE (SELECT). No modifica nada. Ejecutar con:
--   psql -U <usuario> -d <base_de_datos> -f audit_schema.sql
-- Cada bloque indica qué significa que devuelva filas.
-- Ajusta el esquema si no usas 'public'.
-- ============================================================================

\echo ''
\echo '== 1. Tablas SIN clave primaria (violan 1FN) — deberia devolver 0 filas'
SELECT n.nspname AS esquema, c.relname AS tabla
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname = 'public'
  AND c.relname <> 'SequelizeMeta'
  AND NOT EXISTS (
    SELECT 1 FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'p'
  )
ORDER BY 2;

\echo ''
\echo '== 2. Claves foráneas SIN índice (PostgreSQL no las indexa solo) — deberia devolver 0 filas'
SELECT c.conrelid::regclass AS tabla,
       c.conname           AS fk,
       string_agg(a.attname, ', ' ORDER BY x.n) AS columnas
FROM pg_constraint c
CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS x(attnum, n)
JOIN pg_attribute a ON a.attnum = x.attnum AND a.attrelid = c.conrelid
JOIN pg_namespace ns ON ns.oid = c.connamespace
WHERE c.contype = 'f'
  AND ns.nspname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
      AND (i.indkey::smallint[])[0:cardinality(c.conkey) - 1] @> c.conkey
  )
GROUP BY c.conrelid, c.conname
ORDER BY 1, 2;

\echo ''
\echo '== 3. Tablas con CLAVE COMPUESTA (revisar 2FN: ¿algun atributo depende de solo una parte?)'
SELECT c.conrelid::regclass AS tabla,
       pg_get_constraintdef(c.oid) AS clave_compuesta
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE c.contype = 'p'
  AND cardinality(c.conkey) > 1
  AND n.nspname = 'public'
ORDER BY 1;

\echo ''
\echo '== 4. Columnas numeradas (posibles grupos repetitivos: telefono1, telefono2...) — viola 1FN'
SELECT table_name AS tabla, column_name AS columna
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name <> 'SequelizeMeta'
  AND column_name ~ '_?[1-9]$'
ORDER BY 1, 2;

\echo ''
\echo '== 5. Columnas que podrian guardar LISTAS en una celda (nombre sospechoso o tipo ARRAY)'
SELECT table_name AS tabla, column_name AS columna, data_type AS tipo
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name <> 'SequelizeMeta'
  AND (
    data_type = 'ARRAY'
    OR column_name ~* '^(telefonos|correos|emails|alergias|etiquetas|tags|categorias|medicamentos|hobbies|items)$'
  )
ORDER BY 1, 2;

\echo ''
\echo '== 6. Posibles dependencias transitivas (3FN): columnas "<algo>_nombre" en tablas que ya tienen una FK'
SELECT c.table_name AS tabla, c.column_name AS columna
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name ~* '.+_?nombre$'
  AND lower(c.column_name) <> 'nombre'
  AND EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = c.table_name
      AND tc.constraint_type = 'FOREIGN KEY'
  )
ORDER BY 1, 2;

\echo ''
\echo '== 7. Columnas FLOAT/DOUBLE (para dinero usar NUMERIC/DECIMAL(10,2))'
SELECT table_name AS tabla, column_name AS columna, data_type AS tipo
FROM information_schema.columns
WHERE table_schema = 'public'
  AND data_type IN ('real', 'double precision')
ORDER BY 1, 2;

\echo ''
\echo '== 8. FKs con ON DELETE CASCADE (borrar el padre arrastra a los hijos: revisar datos de valor)'
SELECT c.conrelid::regclass AS tabla_hija,
       c.conname            AS fk,
       pg_get_constraintdef(c.oid) AS definicion
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE c.contype = 'f'
  AND c.confdeltype = 'c'
  AND n.nspname = 'public'
ORDER BY 1, 2;

\echo ''
\echo '== 9. Tipos ENUM huérfanos (quedaron tras un dropTable sin DROP TYPE)'
SELECT t.typname AS tipo_enum_huerfano
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE t.typtype = 'e'
  AND n.nspname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_attribute a WHERE a.atttypid IN (t.oid, t.typarray) AND NOT a.attisdropped
  )
ORDER BY 1;

\echo ''
\echo '== 10. Tamaño de tablas (antes de ALTER/INDEX: tablas grandes requieren cuidado)'
SELECT relname AS tabla,
       n_live_tup AS filas_aprox,
       pg_size_pretty(pg_total_relation_size(relid)) AS tamano_total
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

\echo ''
\echo '== 11. Migraciones aplicadas (SequelizeMeta)'
SELECT name AS migracion_aplicada FROM "SequelizeMeta" ORDER BY name;

-- ============================================================================
-- PLANTILLAS MANUALES (descomenta y ajusta con \set en psql)
-- ============================================================================

-- ¿Hay listas separadas por comas en una columna?  (1FN)
--   \set tabla 'clientes'
--   \set columna 'telefonos'
--   SELECT count(*) AS filas_con_lista FROM :"tabla" WHERE :"columna" LIKE '%,%';

-- Probar una dependencia funcional  A -> B  con los datos reales  (2FN / 3FN)
-- Si devuelve filas, A NO determina B (la dependencia no se cumple).
-- Si devuelve 0 filas y A se repite en varias filas, B depende de A: candidata a tabla propia.
--   \set tabla 'detalle_pedido'
--   \set a 'id_producto'
--   \set b 'nombre_producto'
--   SELECT :"a", count(DISTINCT :"b") AS valores_distintos
--   FROM :"tabla" GROUP BY :"a" HAVING count(DISTINCT :"b") > 1;

-- Registros huérfanos antes de agregar una FK  (hijo sin padre)
--   SELECT h.* FROM hija h LEFT JOIN padre p ON p.id = h.padre_id
--   WHERE h.padre_id IS NOT NULL AND p.id IS NULL;

-- Duplicados antes de agregar un UNIQUE
--   SELECT columna, count(*) FROM tabla GROUP BY columna HAVING count(*) > 1;

-- Sincronizar la secuencia de un id tras insertar ids a mano
--   SELECT setval(pg_get_serial_sequence('"Tabla"', 'id'), (SELECT MAX(id) FROM "Tabla"));
