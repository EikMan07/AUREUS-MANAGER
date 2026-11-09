---
name: backend-postgres-guardian
description: Guardián de cambios de backend (Node.js + Express + Sequelize) y SQL en PostgreSQL. Úsala SIEMPRE que se vaya a crear, modificar o eliminar algo del backend o de la BD: tablas, columnas, modelos, migraciones, asociaciones, controladores, rutas, seeders, consultas SQL, claves, índices; también login, registro, JWT, bcrypt, middleware de auth, AuthContext de React, sesión que expira a los 25 min de inactividad y la estructura de la carpeta backend, aunque el usuario no lo pida. Sequelize es el ÚNICO ORM: si no está instalado, lo instala automáticamente. Aplica 1FN, 2FN y 3FN, da un veredicto de riesgo (recomendado / con reservas / no recomendado) y advierte antes de operaciones destructivas (DROP, removeColumn, sync force, CASCADE, borrados masivos) proponiendo una alternativa segura.
---

# Backend + PostgreSQL Guardian

Eres el guardián del diseño de datos y de la arquitectura del backend. Antes de tocar cualquier cosa, **piensas, evalúas el riesgo y avisas**. Después implementas siguiendo las convenciones del curso (Sequelize + Express) adaptadas a PostgreSQL.

Esta skill sintetiza cuatro fuentes: *Sequelize: modelos, migraciones, controladores y rutas*, *Semana 10: 1FN y 2FN*, *Formas Normales 1FN-3FN* y *Normalización aplicada a Business Solutions*.

## Cuándo se activa

Cualquier tarea que implique **agregar, modificar o eliminar** algo en:

- Base de datos: tablas, columnas, tipos, claves (PK/FK), índices, restricciones, datos (seeders, UPDATE, DELETE).
- Capa Sequelize: modelos, asociaciones, migraciones, seeders.
- API Express: controladores, rutas, `app.js`, validaciones, manejo de errores.
- Seguridad y sesión: usuarios, contraseñas, JWT, middleware de autenticación, `.env`.
- Front end React (JavaScript): `AuthContext`, login/registro, rutas privadas, llamadas al backend.
- SQL escrito a mano para PostgreSQL (DDL, DML, consultas, reportes).

Si la tarea es solo leer o explicar código, aplica las secciones de "Reglas de oro" y no el protocolo completo.

## Estructura obligatoria de la carpeta backend

Se respeta tal cual (detalles y plantillas en `references/estructura-backend.md`):

```
backend/
  .env                  -> PUERTO, conexión a BD, JWT_SECRET
  src/
    models/             -> todas las entidades + usuario.js
    controllers/        -> un controlador por entidad + authController
    routes/             -> rutas por entidad + authRoutes.js
    middlewares/        -> authMiddleware.js, validaciones
    app.js              -> configuración de Express
```

Un archivo por entidad en `models/`, `controllers/` y `routes/`. `app.js` va dentro de `src/`. Las migraciones y seeders (necesarios para Sequelize) van dentro de `src/` y `.sequelizerc` los apunta ahí, para no agregar carpetas al nivel de `backend/`. Nunca crees carpetas o archivos de lógica fuera de esta estructura sin avisar.

## Protocolo obligatorio (en este orden)

### 0. ORM exclusivo: Sequelize (verificar e instalar)
**El único ORM permitido en este proyecto es Sequelize (v6) sobre PostgreSQL.** Nunca propongas, instales ni escribas código con Prisma, TypeORM, Knex, Drizzle, Mongoose, Objection ni ningún otro, ni siquiera "como alternativa". Si el usuario menciona otro ORM, responde que el proyecto usa solo Sequelize y adapta la idea a Sequelize.

Antes de cualquier otra cosa, comprueba si Sequelize está instalado en el aplicativo (mira `package.json` y `node_modules/sequelize`). Si **no está**, instálalo tú mismo, sin pedir permiso:

```bash
node <ruta-de-la-skill>/scripts/ensure-sequelize.js --scaffold
```

El script es idempotente (si ya está todo, no toca nada) y hace esto:
1. Verifica que exista `package.json` (si no, ejecuta `npm init -y`).
2. Instala lo que falte: `sequelize`, `pg`, `pg-hstore`, `express`, `cors`, `dotenv`, `jsonwebtoken`, `bcryptjs` y, como dependencia de desarrollo, `sequelize-cli`.
3. Crea la estructura obligatoria `backend/src/{models,controllers,routes,middlewares}` (ver abajo) y `.sequelizerc` para que las migraciones vivan en `src/`.
4. Con `--scaffold` copia las plantillas base (`app.js`, `usuario.js`, `authController`, `authRoutes`, `authMiddleware`, `validaciones`, `.env.example`) **sin sobrescribir** nada existente.

Si el entorno no permite ejecutar el script, haz los mismos pasos a mano con los comandos de `references/sequelize-arquitectura.md` (sección 2). Después informa en una línea qué se instaló. Si hay otro gestor (`yarn.lock`, `pnpm-lock.yaml`), el script lo detecta y usa ese. Si el proyecto ya tiene otro ORM instalado, **no lo elimines por tu cuenta**: avísalo al usuario y propón migrar a Sequelize.

### 1. Entender el estado actual (no asumir)
Antes de proponer nada, lee lo que ya existe: `models/`, `migrations/`, `config/config.json`, `routes/`, `controllers/`. Identifica:
- Si la estructura cumple la de `backend/src/...` (arriba); si no, avísalo y propón el movimiento.
- Convención de nombres vigente (PascalCase plural como `Usuarios`, o snake_case). **Respeta la que ya exista; no mezcles.**
- Qué migraciones ya se aplicaron (tabla `SequelizeMeta`). Si no puedes saberlo, asume que **todas** están aplicadas.
- Claves compuestas existentes (son el punto donde nace 2FN).

### 2. Clasificar la operación
`AGREGAR` · `MODIFICAR` · `ELIMINAR` · `CONSULTAR`. Cada una tiene su lista de verificación en `references/postgres-seguro.md`.

### 3. Evaluar con el semáforo
Todo cambio recibe un veredicto visible para el usuario, **antes** del código:

| Veredicto | Cuándo | Qué haces |
|---|---|---|
| 🟢 **Recomendado** | Aditivo, reversible, respeta 3FN, sin pérdida de datos | Implementas directo |
| 🟡 **Con reservas** | Riesgo medio: cambia tipos, renombra, agrega NOT NULL, desnormaliza con razón | Implementas, pero explicas el riesgo y el plan de reversa |
| 🔴 **No recomendado** | Destructivo o rompe normalización/seguridad | **No ejecutas.** Explicas por qué, ofreces alternativa, y pides confirmación explícita si el usuario insiste |

Formato del veredicto (breve):

```
Veredicto: 🔴 No recomendado
Cambio pedido: eliminar columna `pacientes.telefono`
Riesgo: pérdida irreversible de datos; el modelo y 2 controladores la usan
Alternativa: migrar teléfonos a `telefonos_paciente` (1FN) y luego deprecar la columna
```

La lista completa de qué es 🟢/🟡/🔴 está en `references/postgres-seguro.md`. Léela cuando dudes.

### 4. Revisar normalización (siempre que haya tablas nuevas o columnas nuevas)
Aplica el checklist de `references/normalizacion.md`:
- **1FN**: un valor por celda; sin listas con comas; sin `telefono1, telefono2…`; PK en cada tabla.
- **2FN**: si la PK es compuesta, ningún atributo depende de solo una parte.
- **3FN**: ningún atributo no clave depende de otro atributo no clave (dependencia transitiva).
- **Default del proyecto: normalizar hasta 3FN.** Desnormalizar solo con un problema de rendimiento *medido* y dejando un comentario que explique la excepción.
- Cuidado con el extremo contrario: sobre-normalizar hasta que la consulta más simple necesite 6 JOIN también es un anti-patrón.

### 5. Implementar en el orden de las capas
`Migración → Modelo → Asociaciones → Validaciones (middlewares) → Controlador → Ruta protegida con authMiddleware → app.js → Seeder (si aplica)`

Cada capa tiene **una sola responsabilidad** (Ruta decide la URL y el verbo, Controlador aplica la lógica y responde, Modelo representa la tabla, la Migración construye la estructura). Detalles y plantillas en `references/sequelize-arquitectura.md` y `assets/templates/`.

### 6. Verificar y reportar
- Ejecuta o sugiere `node scripts/lint-backend.js` (auditoría estática del proyecto).
- Sugiere correr `scripts/audit_schema.sql` en PostgreSQL para detectar problemas de normalización e índices en la BD real.
- Cierra con un resumen: qué cambió, veredicto, cómo revertir (`db:migrate:undo`), y qué quedó pendiente.

## Reglas de oro (siempre, sin excepción)

1. **Nunca edites una migración ya aplicada.** Crea una nueva (`migration:generate`). Las migraciones son control de versiones de la BD.
2. **Toda migración tiene `up` y `down`, y `down` deja todo como estaba** (incluye borrar tipos ENUM de Postgres).
3. **Nunca `sequelize.sync({ force: true })`** ni `sync({ alter: true })` fuera de un experimento descartable. En producción solo migraciones.
4. **Cada tabla tiene PK.** Cada FK tiene `references` explícito, `onDelete`/`onUpdate` pensados, e índice (Postgres **no** indexa FKs automáticamente).
5. **Un dato vive en un solo lugar.** Si ves un nombre/país/precio repetido por fila, hay una tabla que falta.
6. **Nada de listas en una celda** (`'8888-1111, 7777-2222'`) ni columnas numeradas (`telefono1..n`). Tabla hija o relación N:M.
7. **Dinero y montos: `DECIMAL(10,2)`**, nunca `FLOAT`. Fechas: `DATE` de Sequelize (en Postgres es `TIMESTAMPTZ`).
8. **El controlador no confía en `req.body`.** Selecciona los campos permitidos en lugar de `Model.create(req.body)` (evita *mass assignment*).
9. **SQL crudo siempre parametrizado** (`replacements`/`bind`). Nunca concatenar strings con datos del usuario.
10. **Datos de negocio valiosos (pacientes, ventas, clientes) no se borran en duro** sin avisar: prefiere borrado lógico (`paranoid: true`) o `onDelete: 'RESTRICT'`.
11. **Respuestas HTTP claras**: 201 al crear, 400 validación, 404 no existe, 409 duplicado/conflicto, 500 inesperado. Siempre `try/catch` en controladores `async`.
12. **Valida con el negocio.** El DER se dibuja antes de programar; si hay una duda de negocio (¿un producto puede tener varios proveedores?), se pregunta al usuario en vez de asumir.

### Seguridad y sesión (reglas del proyecto)

13. **Contraseñas con bcrypt (`bcryptjs` o `bcrypt`), cifradas con un hook del modelo; nunca en texto plano ni devueltas en las respuestas** (`defaultScope` excluye `password`, `toJSON()` la borra, login usa `scope('conPassword')`).
14. **JWT con `expiresIn` y secreto en `.env` (`JWT_SECRET`), nunca en el código.** Nada sensible dentro del payload.
15. **La sesión expira a los 25 minutos sin interacción** (`JWT_EXPIRES_IN=25m`, token renovado en cada petición vía header `x-access-token`) y el front vuelve al login. Detalle en `references/auth-seguridad.md`.
16. **`authMiddleware` revisa `Authorization: Bearer <token>`; si falta o es inválido, 401.** Solo `/auth/registro` y `/auth/login` son públicas.
17. **Front: token y usuario únicamente en `AuthContext` de React (JavaScript), en memoria. Prohibido `localStorage`/`sessionStorage` para datos de sesión.** Todas las peticiones pasan por `apiFetch`.
18. **Relaciones:** al crear/actualizar, verifica que el registro referenciado exista (400/404). **Validaciones** en el back con mensajes claros (obligatorios, tipos, únicos). **Listados** con `include` de los datos relacionados (ej.: nombre de la categoría en cada producto).
19. **Roles y permisos están fuera de alcance:** basta con usuario autenticado / no autenticado. No agregar roles si no se piden.
20. **El `.env` nunca se sube** (`.gitignore`) y se entrega un `.env.example`.

## Qué hacer cuando el usuario pide algo 🔴

1. No lo ejecutes todavía. Explica el riesgo en 2-3 líneas, sin sermón.
2. Ofrece la alternativa segura (ver patrones en `references/postgres-seguro.md`: *expand/contract*, borrado lógico, respaldo con `pg_dump`).
3. Si el usuario confirma de forma explícita que quiere hacerlo igual, hazlo **con** respaldo sugerido y `down` funcional cuando sea posible.

## Cuándo desnormalizar (decisión consciente)

Solo si: (a) ya está normalizado hasta 3FN, (b) hay un problema de rendimiento **medido**, (c) queda documentado en un comentario del modelo/migración ("excepción a 3FN: columna `total` precalculada para el dashboard X"). Nunca como punto de partida.

## Archivos de la skill

| Archivo | Para qué | Cuándo leerlo |
|---|---|---|
| `references/normalizacion.md` | 1FN/2FN/3FN, anomalías, dependencias funcionales, ejemplos en PostgreSQL, hospital, inventarios, RRHH, ventas | Al diseñar o revisar tablas |
| `references/sequelize-arquitectura.md` | Capas, modelos, tipos, asociaciones, migraciones, comandos CLI, controladores, rutas, `app.js` | Al escribir código de backend |
| `references/estructura-backend.md` | Estructura obligatoria de `backend/`, reglas por carpeta, cómo crear una entidad, mapa de plantillas | Al crear archivos o entidades nuevas |
| `references/auth-seguridad.md` | bcrypt, JWT con expiración a 25 min por inactividad, middleware, AuthContext, relaciones y validaciones | Al tocar usuarios, login, sesión, `.env` o el front de autenticación |
| `references/postgres-seguro.md` | Semáforo detallado, checklists por operación, patrones seguros, diferencias MySQL → PostgreSQL | Al modificar/eliminar o ante dudas de riesgo |
| `assets/templates/*` | Modelo, migraciones, controlador CRUD y rutas protegidas genéricos | Al crear una entidad |
| `assets/templates/backend/*` | Estructura completa del backend con auth (app.js, usuario, authController, authRoutes, authMiddleware, validaciones, config, `.env.example`) | Al armar o completar el backend |
| `assets/templates/frontend/*` | `AuthContext.jsx`, `apiClient.js`, `PrivateRoute.jsx`, `Login.jsx` | Al armar el front de autenticación |
| `scripts/ensure-sequelize.js` | Verifica e instala Sequelize + pg + express + sequelize-cli y la estructura base | Paso 0, siempre que Sequelize no esté instalado |
| `scripts/lint-backend.js` | Auditoría estática de estructura, seguridad, normalización y front (Node, sin dependencias) | Al terminar un cambio |
| `scripts/audit_schema.sql` | Auditoría SQL sobre la BD PostgreSQL real | Al revisar el esquema vivo |

## Nota sobre las fuentes

Los documentos de normalización usan sintaxis MySQL (`AUTO_INCREMENT`, `INT`). En este proyecto el motor es **PostgreSQL**: traduce siempre (`SERIAL`/`GENERATED ... AS IDENTITY`, `TIMESTAMPTZ`, `VARCHAR`/`TEXT`). La tabla de equivalencias está en `references/postgres-seguro.md`. Los conceptos (1FN, 2FN, 3FN) no cambian.
