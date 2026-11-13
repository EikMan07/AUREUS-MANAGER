---
name: backend-postgres-guardian
description: Guardián de cambios de backend (Node.js + Express + Sequelize) y SQL en PostgreSQL. Úsala SIEMPRE que se vaya a crear, modificar o eliminar algo del backend o de la BD: tablas, columnas, modelos, migraciones, asociaciones, controladores, rutas, seeders, consultas SQL, claves, índices; también middlewares (orden estricto, seguridad con helmet/cors/rateLimit, logger res.on finish), validación en el borde con esquemas (Zod/Joi), prevención de mass-assignment, manejo centralizado de errores con firma cuádruple (err, req, res, next), clase AppError en servicios, captura de errores async, login, registro, JWT almacenado en cookie segura reforzada (HttpOnly, Secure, SameSite=Lax/Strict, host-only sin domain, prefijo __Host- en prod), defensa anti-CSRF en capas (SameSite, verificación de origen en métodos mutables y token HMAC en X-CSRF-Token), CORS con credenciales, restauración de sesión vía /auth/yo, logout seguro con res.clearCookie, bcrypt, middleware de auth, AuthContext de React (en memoria, prohibido localStorage/sessionStorage), sesión que expira a los 25 min de inactividad con expiración deslizante y la estructura de la carpeta backend, aunque el usuario no lo pida. Sequelize es el ÚNICO ORM: si no está instalado, lo instala automáticamente. Aplica 1FN, 2FN y 3FN, da un veredicto de riesgo (recomendado / con reservas / no recomendado) y advierte antes de operaciones destructivas (DROP, removeColumn, sync force, CASCADE, borrados masivos) proponiendo una alternativa segura.
---

# Backend + PostgreSQL Guardian

Eres el guardián del diseño de datos y de la arquitectura del backend. Antes de tocar cualquier cosa, **piensas, evalúas el riesgo y avisas**. Después implementas siguiendo las convenciones del curso (Sequelize + Express) adaptadas a PostgreSQL.

Esta skill sintetiza seis fuentes: *Express.js: Tu primer servidor web, routing y estructura de un proyecto backend con Node.js*, *Sequelize: modelos, migraciones, controladores y rutas*, *Middleware, validación y errores: Cómo procesar, validar y proteger cada petición en Express, y responder a los errores de forma consistente*, *Semana 10: 1FN y 2FN*, *Formas Normales 1FN-3FN* y *Normalización aplicada a Business Solutions*.

## Cuándo se activa

Cualquier tarea que implique **agregar, modificar o eliminar** algo en:

- Base de datos: tablas, columnas, tipos, claves (PK/FK), índices, restricciones, datos (seeders, UPDATE, DELETE).
- Capa Sequelize: modelos, asociaciones, migraciones, seeders.
- API Express: enrutadores (`express.Router`), controladores, servicios de negocio, `app.js`, `index.js`, middlewares (seguridad, terceros, auth, logger), validaciones en el borde con esquemas (Zod/Joi), manejo centralizado de errores (`errorHandler` cuádruple, `AppError`).
- Seguridad y sesión: usuarios, contraseñas, JWT almacenado en cookie segura y reforzada (HttpOnly, Secure, SameSite, `__Host-sid`), protección anti-CSRF en capas (SameSite, Origin/Referer, HMAC en `X-CSRF-Token`), CORS con credenciales (`credentials: true`), restauración de sesión (`/auth/yo`), logout seguro, middleware de autenticación, `.env`.
- Front end React (JavaScript): `AuthContext` (en memoria, sin localStorage ni tokens en JS), login/registro, rutas privadas que esperan carga, cliente HTTP (`apiClient`) con `credentials: 'include'`.
- SQL escrito a mano para PostgreSQL (DDL, DML, consultas, reportes).

Si la tarea es solo leer o explicar código, aplica las secciones de "Reglas de oro" y no el protocolo completo.

## Estructura obligatoria de la carpeta backend

Se respeta tal cual (detalles y plantillas en `references/estructura-backend.md`, `references/express-core-arquitectura.md` y `references/middleware-validacion-errores.md`):

```
backend/
  .env                  -> PUERTO, conexión a BD, JWT_SECRET (ignorado en git)
  .env.example          -> plantilla de variables sin valores reales
  .sequelizerc          -> apunta sequelize-cli a src/
  package.json          -> scripts "start": "node src/index.js", "dev": "nodemon src/index.js"
  src/
    config/             -> config.js para Sequelize y variables de entorno
    routes/             -> rutas por entidad (express.Router) + authRoutes.js
    middlewares/        -> authMiddleware.js, validar.js, errorHandler.js, rate limiting
    schemas/            -> esquemas declarativos de validación (Zod / Joi) por entidad
    controllers/        -> controladores HTTP: leen req, convierten tipos, responden con res
    services/           -> lógica y reglas de negocio puras (sin req ni res, testeables)
    models/             -> todas las entidades en Sequelize + usuario.js + index.js
    utils/              -> errors.js (jerarquía AppError), helpers y formateadores
    migrations/         -> migraciones versionadas (up / down)
    seeders/            -> datos semilla
    app.js              -> configuración de Express (seguridad, parseo, rutas, 404, errorHandler)
    index.js            -> punto de entrada: carga .env, conecta BD y arranca app.listen()
```

Un archivo por entidad en `models/`, `controllers/`, `routes/` y `services/`. `app.js` e `index.js` van dentro de `src/`. Las migraciones y seeders van dentro de `src/` mediante `.sequelizerc` para no agregar carpetas al nivel de `backend/`. Nunca crees carpetas o archivos de lógica fuera de esta estructura sin avisar.

## Protocolo obligatorio (en este orden)

### 0. ORM exclusivo: Sequelize (verificar e instalar)
**El único ORM permitido en este proyecto es Sequelize (v6) sobre PostgreSQL.** Nunca propongas, instales ni escribas código con Prisma, TypeORM, Knex, Drizzle, Mongoose, Objection ni ningún otro, ni siquiera "como alternativa". Si el usuario menciona otro ORM, responde que el proyecto usa solo Sequelize y adapta la idea a Sequelize.

Antes de cualquier otra cosa, comprueba si Sequelize está instalado en el aplicativo (mira `package.json` y `node_modules/sequelize`). Si **no está**, instálalo tú mismo, sin pedir permiso:

```bash
node <ruta-de-la-skill>/scripts/ensure-sequelize.js --scaffold
```

El script es idempotente (si ya está todo, no toca nada) y hace esto:
1. Verifica que exista `package.json` (si no, ejecuta `npm init -y`).
2. Instala lo que falte: `sequelize`, `pg`, `pg-hstore`, `express`, `cors`, `cookie-parser`, `dotenv`, `jsonwebtoken`, `helmet`, `compression`, `bcryptjs` y, como dependencia de desarrollo, `sequelize-cli`.
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
`Migración → Modelo → Asociaciones → Servicio (lógica de negocio pura) → Validaciones (middlewares) → Controlador (conversión tipos / res) → Ruta modular protegida con authMiddleware → app.js (montaje) → Seeder (si aplica)`

Cada capa tiene **una sola responsabilidad** siguiendo el principio de acoplamiento unidireccional (Ruta define URL/método, Middleware verifica acceso/esquema, Controlador traduce HTTP y convierte tipos, Servicio aplica reglas de negocio sin `req`/`res`, Modelo representa la tabla en Sequelize, la Migración construye la estructura en PostgreSQL). Detalles y plantillas en `references/express-core-arquitectura.md`, `references/sequelize-arquitectura.md` y `assets/templates/`.

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
11. **Respuestas HTTP claras y canónicas**: `200` al listar u obtener, `201` al crear, `204` al eliminar (`res.sendStatus(204)` sin cuerpo), `400` validación, `404` no existe, `409` duplicado/conflicto, `500` inesperado. Siempre `try/catch` en controladores `async`.
12. **Valida con el negocio.** El DER se dibuja antes de programar; si hay una duda de negocio (¿un producto puede tener varios proveedores?), se pregunta al usuario en vez de asumir.

### Convenciones de Express.js y Arquitectura por Capas (Presentación de Routing)

13. **El orden de las rutas importa estrictamente:** Express evalúa las rutas de arriba hacia abajo. **Las rutas específicas y fijas deben declararse ANTES de las rutas con segmentos dinámicos (`:id`)**. Coloca `/productos/nuevos` o `/usuarios/reporte` antes de `/productos/:id` para evitar capturas accidentales.
14. **`req.params` y `req.query` siempre llegan como texto (`string`):** Convierte explícitamente a número (`Number(req.params.id)`) antes de consultar o comparar identificadores numéricos.
15. **Cadena de middlewares sin bloqueo:** Todo middleware debe responder al cliente (`res.json()`, `res.sendStatus()`) o invocar a `next()`. Si omite ambos, la petición del cliente queda congelada indefinidamente.
16. **Manejador 404 y manejador centralizado de errores con 4 parámetros:** Se ubican al final de `src/app.js`, después de todas las rutas. Express reconoce el manejador de error **exclusivamente por la firma cuádruple `(err, req, res, next)`**; si tiene 3 parámetros, Express lo tratará como middleware ordinario y no atrapará los fallos.
17. **Separación de `app.js` e `index.js` (o `server.js`):** `app.js` crea y configura Express (middlewares, rutas y errores) y se exporta sin llamar a `listen`. `index.js` es el punto de entrada que carga variables de entorno, conecta la base de datos y ejecuta `app.listen(PUERTO)`. Esto habilita pruebas de integración con Supertest sin abrir puertos TCP.
18. **Capa de Servicios (`services/`):** La lógica de negocio vive desacoplada en funciones puras sin objetos `req` ni `res`. Cada capa conoce únicamente a la siguiente (`Route → Middleware → Controller → Service → Model`).

### Middlewares, Validación y Manejo Centralizado de Errores (Presentación Middleware & Errores)

19. **Pipeline estricto de middlewares en `app.js`:** El orden de registro determina el procesamiento:
    1. *Seguridad y compresión:* `helmet()`, `cors()`, `compression()`.
    2. *Logging:* Morgan o logger personalizado con `res.on('finish')`.
    3. *Body Parsers:* `express.json()`, `express.urlencoded({ extended: true })`.
    4. *Rutas de la aplicación:* Enrutadores modulares protegidos por autenticación y validación.
    5. *Manejador 404 (Ruta no encontrada):* Captura toda petición no mapeada y genera `NotFoundError`.
    6. *Manejador de Errores Centralizado:* El último middleware de la aplicación con firma obligatoria de 4 parámetros.
20. **Los 3 caminos de un middleware:** Todo middleware debe:
    - Modificar la petición/respuesta y pasar el control: `next()`.
    - Terminar la petición con una respuesta: `res.status(codigo).json(...)`.
    - O abortar por error delegando al manejador global: `next(err)`.
    *¡Regla crítica:* Si un middleware no ejecuta ninguna de las tres opciones, la petición del cliente quedará congelada en un timeout.
21. **Validación en el borde ("Never trust the client"):**
    - Todo dato entrante (`body`, `params`, `query`) debe validarse y sanitizarse mediante esquemas declarativos (Zod o Joi) en un middleware antes de llegar al controlador o servicio.
    - Rechaza propiedades desconocidas (o usa `.strip()` / selección explícita) para evitar *mass assignment* (ej. inyección de `rol: 'admin'`).
22. **Formato canónico de error de validación (400 / 422):** Si la validación falla, responde inmediatamente con estructura canónica uniforme:
    ```json
    {
      "error": "Error de validacion",
      "message": "Los datos enviados no son validos",
      "detalles": [
        { "campo": "email", "mensaje": "Debe ser un correo electronico valido" },
        { "campo": "password", "mensaje": "Debe tener al menos 8 caracteres" }
      ]
    }
    ```
23. **Distinción entre Errores Operacionales y Errores de Programación (Bugs):**
    - *Operacionales (4xx):* Errores predecibles y controlados (recurso no encontrado, validación fallida, credenciales incorrectas, duplicados). Se representan con la jerarquía `AppError` (`NotFoundError`, `ValidationError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`) con `isOperational = true`.
    - *De programación (500):* Bugs imprevistos (excepciones no capturadas, fallos de sintaxis, caídas de BD). El manejador centralizado los captura, registra el stack trace en servidor y responde con un mensaje genérico protegiendo la infraestructura.
24. **Servicios desacoplados del protocolo HTTP:** La capa de servicio (`src/services/`) **nunca recibe `req` ni `res`**. Si una regla de negocio falla, el servicio lanza una instancia de `AppError` (`throw new NotFoundError(...)`), la cual es capturada por el controlador y delegada a `next(err)`.
25. **Captura obligatoria de errores asíncronos:** Express 4 **no** captura automáticamente promesas rechazadas (`async/await`). Todo controlador o middleware asíncrono debe:
    - Envolverse con una utilidad `asyncHandler(fn)` que envíe errores a `next(err)`, o
    - Contener un bloque `try / catch` cuyo `catch` ejecute `next(err)`.
    *(En Express 5 las promesas rechazadas se capturan nativamente, pero siempre requieren el manejador centralizado de errores).*
26. **Manejador centralizado de errores con firma cuádruple obligatoria:** `(err, req, res, next)`. Express inspecciona `fn.length === 4` para identificarlo. Si omites el parámetro `next` (usando solo 3 parámetros), Express lo tratará como middleware común y la captura de errores fallará.
27. **Ocultamiento de información sensible en producción:** En `NODE_ENV === 'production'`, el manejador centralizado jamás debe enviar `err.stack`, consultas SQL crudas o detalles internos de la base de datos al cliente. En desarrollo se permite `stack` para depuración.

### Seguridad y sesión (reglas del proyecto)

28. **Contraseñas con bcrypt (`bcryptjs` o `bcrypt`), cifradas con un hook del modelo; nunca en texto plano ni devueltas en las respuestas** (`defaultScope` excluye `password`, `toJSON()` la borra, login usa `scope('conPassword')`).
29. **JWT con `expiresIn` y secreto en `.env` (`JWT_SECRET`), nunca en el código.** Nada sensible dentro del payload (`{ id, email }`).
30. **Token de sesión en cookie segura reforzada y expiración deslizante (25 min sin interacción):**
    - El JWT vive en una cookie de sesión emitida por el backend mediante `src/utils/cookies.js`: banderas obligatorias `httpOnly: true` (frena exfiltración XSS), `sameSite: 'lax'` o `'strict'` (mitiga CSRF), `path: '/'` y sin atributo `Domain` (host-only, bloquea subdominios).
    - En producción (`NODE_ENV=production`), la cookie lleva obligatoriamente el prefijo `__Host-sid` y la bandera `secure: true`. En desarrollo sobre localhost se usa `sid` con `secure: false` (o `true` si se trabaja en contexto seguro).
    - Cada petición autenticada re-emite la cookie con un `maxAge` renovado de 25 minutos (expiración deslizante). Si pasan 25 minutos sin interacción, la cookie caduca, el backend responde `401 Unauthorized` (`codigo: 'TOKEN_EXPIRADO'`) y el front redirige al login.
31. **`authMiddleware` extrae el token prioritariamente de la cookie segura:**
    - Lee `req.cookies[getCookieName()]`. Solo acepta `Authorization: Bearer <token>` como respaldo secundario para herramientas/APIs no web. Si falta o es inválido/expirado, responde **401**.
    - Verifica el JWT con algoritmo explícito: `jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })`.
    - Solo `/auth/registro` y `/auth/login` son públicas.
32. **Front end sin almacenamiento inseguro (Cero `localStorage`/`sessionStorage`):**
    - El token JWT vive en la cookie HttpOnly inaccesible para JavaScript.
    - React (`AuthContext`) almacena **únicamente en memoria** el perfil del usuario autenticado y el token anti-CSRF.
    - **Prohibido taxativamente `localStorage.setItem('token', ...)` o `sessionStorage`** para datos de sesión.
    - **Restauración transparente de sesión tras F5:** Al recargar la página o montar la aplicación, React consulta `GET /auth/yo` con credenciales. Si la cookie sigue vigente, la sesión se restaura de inmediato. `PrivateRoute` y `Login` respetan el estado `cargando` para evitar parpadeos o redirecciones prematuras.
33. **CORS con credenciales y origen explícito (PROHIBIDO `*`):**
    - En `app.js`: `app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }))`.
    - Cuando `credentials: true` está habilitado, la especificación de los navegadores **prohíbe taxativamente el comodín `*` en `origin`**. El servidor debe reflejar el origen exacto autorizado.
    - En el frontend, todas las llamadas `fetch` en `apiClient` deben incluir `credentials: 'include'`.
34. **Defensa Anti-CSRF en Tres Capas (OWASP):**
    - *Capa 1:* Atributo `SameSite=Lax` o `Strict` en la cookie de sesión.
    - *Capa 2:* Middleware `verificarOrigen` en métodos mutables (`POST`, `PUT`, `PATCH`, `DELETE`) que valida que `req.headers.origin` (o `referer`) coincida exactamente con `FRONTEND_URL`. Si no coincide, responde **403 Forbidden** (`ORIGEN_NO_PERMITIDO`).
    - *Capa 3:* Token criptográfico anti-CSRF basado en HMAC emitido en `/auth/login` y `/auth/yo`, guardado solo en memoria por React y enviado en la cabecera `X-CSRF-Token` para métodos mutables. El servidor lo valida con comparación en tiempo constante (`crypto.timingSafeEqual`).
35. **Cierre de sesión seguro (`POST /auth/logout`):**
    - Destruye la cookie en el navegador invocando `res.clearCookie()` con **exactamente las mismas opciones estructurales** (`path: '/'`, `secure`, `sameSite`, `httpOnly`) que se usaron al emitirla.
36. **Relaciones:** al crear/actualizar, verifica que el registro referenciado exista (400/404). **Validaciones** en el back con mensajes claros (obligatorios, tipos, únicos). **Listados** con `include` de los datos relacionados (ej.: nombre de la categoría en cada producto).
37. **Roles y permisos están fuera de alcance:** basta con usuario autenticado / no autenticado. No agregar roles si no se piden.
38. **El `.env` nunca se sube** (`.gitignore`) y se entrega un `.env.example` con `JWT_SECRET`, `CSRF_SECRET`, `FRONTEND_URL`, `COOKIE_SECURE` y `COOKIE_SAMESITE`.

## Qué hacer cuando el usuario pide algo 🔴

1. No lo ejecutes todavía. Explica el riesgo en 2-3 líneas, sin sermón.
2. Ofrece la alternativa segura (ver patrones en `references/postgres-seguro.md`: *expand/contract*, borrado lógico, respaldo con `pg_dump`).
3. Si el usuario confirma de forma explícita que quiere hacerlo igual, hazlo **con** respaldo sugerido y `down` funcional cuando sea posible.

## Cuándo desnormalizar (decisión consciente)

Solo si: (a) ya está normalizado hasta 3FN, (b) hay un problema de rendimiento **medido**, (c) queda documentado en un comentario del modelo/migración ("excepción a 3FN: columna `total` precalculada para el dashboard X"). Nunca como punto de partida.

## Archivos de la skill

| Archivo | Para qué | Cuándo leerlo |
|---|---|---|
| `references/cookies-seguras.md` | Atributos HttpOnly/Secure/SameSite, prefijo `__Host-`, CORS credenciales, CSRF en 3 capas, límites reales y fuentes | Al implementar o auditar cookies, CSRF, CORS y sesión |
| `references/auth-seguridad.md` | bcrypt, JWT en cookie HttpOnly, expiración deslizante a 25 min, endpoints `/yo` y `/logout`, AuthContext | Al tocar usuarios, login, sesión, `.env` o el front de autenticación |
| `references/express-core-arquitectura.md` | Ciclo de vida Express, req/res, middlewares, orden de rutas, 404, error handler (4 params) y capas | Al estructurar servidores, endpoints y routing |
| `references/middleware-validacion-errores.md` | Pipeline de middlewares, validación en el borde con Zod/Joi, jerarquía AppError, errores async y manejador centralizado (4 params) | Al configurar Express, validar entradas o implementar manejo de errores |
| `references/normalizacion.md` | 1FN/2FN/3FN, anomalías, dependencias funcionales, ejemplos en PostgreSQL, hospital, inventarios, RRHH, ventas | Al diseñar o revisar tablas |
| `references/sequelize-arquitectura.md` | Capas, modelos, tipos, asociaciones, migraciones, comandos CLI, controladores, rutas, `app.js` | Al escribir código de backend |
| `references/estructura-backend.md` | Estructura obligatoria de `backend/`, reglas por carpeta, cómo crear una entidad, mapa de plantillas | Al crear archivos o entidades nuevas |
| `references/postgres-seguro.md` | Semáforo detallado, checklists por operación, patrones seguros, diferencias MySQL → PostgreSQL | Al modificar/eliminar o ante dudas de riesgo |
| `assets/templates/*` | Modelo, migraciones, controlador CRUD, servicio de negocio y rutas protegidas genéricos | Al crear una entidad o capa |
| `assets/templates/backend/*` | Estructura completa con app.js, index.js, usuario, auth con cookies, CSRF, AppError, errorHandler, validar (Zod), config y .env.example | Al armar o completar el backend |
| `assets/templates/frontend/*` | `AuthContext.jsx` (memoria + /auth/yo), `apiClient.js` (credentials + X-CSRF-Token), `PrivateRoute.jsx`, `Login.jsx` | Al armar el front de autenticación |
| `scripts/ensure-sequelize.js` | Verifica e instala Sequelize + pg + express + cookie-parser + sequelize-cli y la estructura base con utils y schemas | Paso 0, siempre que Sequelize no esté instalado |
| `scripts/lint-backend.js` | Auditoría estática de cookies seguras, CSRF, CORS credenciales, middlewares, errorHandler (4 params), normalización y front | Al terminar un cambio |
| `scripts/audit_schema.sql` | Auditoría SQL sobre la BD PostgreSQL real | Al revisar el esquema vivo |

## Nota sobre las fuentes

Los documentos de normalización usan sintaxis MySQL (`AUTO_INCREMENT`, `INT`). En este proyecto el motor es **PostgreSQL**: traduce siempre (`SERIAL`/`GENERATED ... AS IDENTITY`, `TIMESTAMPTZ`, `VARCHAR`/`TEXT`). La tabla de equivalencias está en `references/postgres-seguro.md`. Los conceptos (1FN, 2FN, 3FN) no cambian.
