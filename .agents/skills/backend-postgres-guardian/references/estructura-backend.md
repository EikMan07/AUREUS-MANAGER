# Estructura de la Carpeta Backend y Arquitectura por Capas

Esta referencia define la estructura canónica del backend para proyectos con Node.js, Express y Sequelize sobre PostgreSQL, integrando el estándar didáctico del curso con la arquitectura por capas (*Layered Architecture*) de Express.

---

## 1. Estructura Canónica de Directorios

```
backend/
├── .env                  -> PUERTO, conexión a BD, JWT_SECRET (IGNORADO EN GIT)
├── .env.example          -> Plantilla de variables sin secretos para el equipo
├── .sequelizerc          -> Apunta sequelize-cli hacia src/
├── package.json          -> Dependencias, scripts ("dev": "nodemon src/index.js", "start")
└── src/
    ├── config/           -> Conexión a BD y lectura de variables de entorno
    ├── routes/           -> Enrutadores modulares (express.Router) por entidad + authRoutes.js
    ├── middlewares/      -> authMiddleware.js, validar.js, errorHandler.js, rate limiting
    ├── schemas/          -> Esquemas declarativos de validación (Zod / Joi) por entidad
    ├── controllers/      -> Controladores HTTP: extraen datos y responden con status/json
    ├── services/         -> Reglas de negocio puras (sin req ni res, testeables)
    ├── models/           -> Modelos Sequelize de las entidades + usuario.js + index.js
    ├── utils/            -> errors.js (jerarquía AppError), helpers y formateadores
    ├── migrations/       -> Migraciones versionadas (up / down) de PostgreSQL
    ├── seeders/          -> Datos iniciales o semillas controladas
    ├── app.js            -> Crea y configura Express (middlewares, routers, 404, error handler)
    └── index.js          -> Punto de entrada: carga .env, conecta BD y arranca app.listen()
```

---

## 2. Responsabilidades por Pieza y Capa

| Pieza / Capa | Responsabilidad única | Regla de Oro |
|---|---|---|
| `.env` | Variables sensibles del entorno. | **Nunca se sube al repositorio** (`.gitignore`). Se entrega `.env.example`. |
| `src/routes/` | Define qué URL y qué método HTTP responde cada endpoint. | Rutas específicas **antes** de rutas dinámicas (`:id`). |
| `src/middlewares/` | Interceptores: seguridad (`authMiddleware`), validación de datos. | Debe responder o llamar a `next()`; si no, la petición queda congelada. |
| `src/controllers/` | Traduce el protocolo HTTP: lee `req.params`, `req.query`, `req.body`. | **Convierte tipos** (`Number(req.params.id)`) y delega la lógica al servicio o modelo. |
| `src/services/` | Lógica y reglas de negocio puras. | **Agnóstica de HTTP**: NO recibe ni conoce `req` ni `res`. Testeable y reutilizable. |
| `src/models/` | Representación de entidades y esquemas relacionales. | Un archivo por entidad en singular (`producto.js`). |
| `src/app.js` | Configura Express: CORS, JSON parser, rutas, 404 y manejador de error. | **NO llama a `app.listen()`**. Se exporta (`module.exports = app`) para pruebas. |
| `src/index.js` | Punto de entrada del servidor. | Carga entorno, verifica conexión a BD y ejecuta `app.listen(PUERTO)`. |

---

## 3. Flujo Canónico Completo de una Petición

```
Cliente HTTP (Browser / Postman / Móvil)
                 │
                 ▼
     [ 1. Seguridad y Terceros ]  helmet, cors, rateLimit, compression
                 │
                 ▼
         [ 2. Parseo Body ]       express.json(), express.urlencoded()
                 │
                 ▼
         [ 3. Enrutador ]         Route /api/recursos (URL y método HTTP)
                 │
                 ▼
        [ 4. Autenticación ]      authMiddleware (JWT), soloRol
                 │
                 ▼
     [ 5. Validación en Borde ]   validar(schema): Zod/Joi descarta datos inyectados
                 │
                 ▼
        [ 6. Controlador ]        Extrae req.params, convierte Number(id), llama servicio
                 │
                 ▼
         [ 7. Servicio ]          Reglas de negocio puras; lanza AppError si falla
                 │
                 ▼
       [ 8. Modelos / ORM ]       Sequelize interactúa con PostgreSQL
                 │
        ┌────────┴────────┐
        ▼                 ▼
   [ Éxito ]        [ Error / Falla ]
  res.json()        errorHandler(err, req, res, next) (4 parámetros)
```

> **Principio de Acoplamiento Unidireccional:**  
> Cada capa únicamente conoce a la capa inmediatamente inferior:  
> `Route → Middleware → Controller → Service → Model`.  
> La capa de Servicios no sabe qué es una petición HTTP ni qué es Express; puede ser invocada indistintamente desde un controlador REST, un script de terminal, una tarea programada o un test unitario.

---

## 4. Separación de `app.js` e `index.js`

Desacoplar la aplicación del listener de red es un estándar de la industria:

1. **`src/app.js`:**
   - Registra `express.json()`, `cors()`.
   - Monta los enrutadores (`app.use('/api/...', ...)`) .
   - Registra el manejador 404 para rutas inexistentes:
     ```js
     app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
     ```
   - Registra el manejador centralizado de errores con **4 parámetros**:
     ```js
     app.use((err, req, res, next) => {
       console.error(err);
       res.status(err.status || 500).json({ error: err.message || 'Error interno' });
     });
     ```
   - Exporta la instancia: `module.exports = app;`.

2. **`src/index.js`:**
   - Lee `PORT` o `PUERTO` desde las variables de entorno.
   - Autentica la base de datos con `sequelize.authenticate()`.
   - Inicia la escucha con `app.listen(PUERTO)`.

---

## 5. Dónde van Migraciones y Seeders de Sequelize

Sequelize requiere carpetas de control de versiones de base de datos. Se ubican dentro de `src/` mediante `.sequelizerc`:

```
backend/
├── .sequelizerc          -> Apunta a src/
└── src/
    ├── config/config.js  -> Lee .env para sequelize-cli
    ├── migrations/       -> Archivos YYYYMMDD-create-*.js
    └── seeders/          -> Archivos YYYYMMDD-demo-*.js
```

---

## 6. Cómo Crear un Módulo o Entidad Nueva (Paso a Paso)

1. **Migración:** `npx sequelize-cli migration:generate --name create-<entidad>` → crea migración en `src/migrations/`.
2. **Modelo:** `src/models/<entidad>.js` (utilizar `assets/templates/model.template.js`).
3. **Asociaciones:** Configurar en `associate()` de ambos modelos relacionados.
4. **Servicio (opcional para negocio complejo):** `src/services/<entidad>Service.js` (`service.template.js`).
5. **Controlador:** `src/controllers/<entidad>Controller.js` (`controller.template.js`).
6. **Rutas:** `src/routes/<entidad>Routes.js` (`routes.template.js`). Colocar rutas fijas antes de las dinámicas (`/:id`).
7. **Montaje en `src/app.js`:** `app.use('/api/<entidades>', require('./routes/<entidad>Routes'));`.
8. **Auditoría:** Ejecutar `node scripts/lint-backend.js` para asegurar 0 errores.

---

## 7. Catálogo de Plantillas Disponibles

| Plantilla | Ubicación de Destino | Descripción |
|---|---|---|
| `env.example` | `backend/.env.example` | Plantilla segura de variables de entorno. |
| `sequelizerc.template` | `backend/.sequelizerc` | Mapeo de rutas de `sequelize-cli` hacia `src/`. |
| `src/config/config.template.js` | `backend/src/config/config.js` | Configuración PostgreSQL de Sequelize con `dotenv`. |
| `src/models/index.template.js` | `backend/src/models/index.js` | Cargador dinámico de modelos de Sequelize. |
| `src/models/usuario.template.js` | `backend/src/models/usuario.js` | Modelo de usuario con bcrypt y exclusión de contraseña. |
| `src/migrations/create-usuarios.template.js` | `backend/src/migrations/*-create-usuarios.js` | Migración inicial de tabla de usuarios. |
| `src/controllers/authController.template.js` | `backend/src/controllers/authController.js` | Login (con cookie HttpOnly), registro, sesión actual (`/yo`) y logout seguro. |
| `src/routes/authRoutes.template.js` | `backend/src/routes/authRoutes.js` | Endpoints públicos (`/login`, `/registro`), y protegidos (`/yo`, `/logout`). |
| `src/middlewares/authMiddleware.template.js` | `backend/src/middlewares/authMiddleware.js` | Extracción de JWT desde cookie segura (o Bearer) y renovación deslizante a 25 min. |
| `src/utils/cookies.template.js` | `backend/src/utils/cookies.js` | Única fuente de verdad para emitir, leer y borrar cookies de sesión seguras. |
| `src/middlewares/csrf.template.js` | `backend/src/middlewares/csrf.js` | Verificación de origen y validación de token CSRF con firma HMAC en tiempo constante. |
| `src/middlewares/validaciones.template.js` | `backend/src/middlewares/validaciones.js` | Validadores de campos obligatorios, tipos y claves foráneas. |
| `src/middlewares/validar.template.js` | `backend/src/middlewares/validar.js` | Middleware genérico de validación para esquemas Zod con respuesta de error 400 uniforme. |
| `src/middlewares/errorHandler.template.js` | `backend/src/middlewares/errorHandler.js` | Manejador centralizado de errores con firma cuádruple y ocultamiento de trazas en prod. |
| `src/utils/errors.template.js` | `backend/src/utils/errors.js` | Jerarquía de errores operacionales (`AppError`, `NotFoundError`, `ValidationError`, etc.). |
| `src/app.template.js` | `backend/src/app.js` | Pipeline Express: helmet, cors con credenciales, cookieParser, parsers, rutas, 404 y errorHandler. |
| `src/index.template.js` | `backend/src/index.js` | Punto de entrada del servidor (`app.listen`). |
| `service.template.js` | `backend/src/services/<entidad>Service.js` | Servicio de lógica de negocio pura (sin `req`/`res`). |
| `controller.template.js` | `backend/src/controllers/<entidad>Controller.js` | Controlador CRUD con tipado de `Number(id)` y helpers de Express. |
| `routes.template.js` | `backend/src/routes/<entidad>Routes.js` | Enrutador modular con regla de orden de matching. |
