# Estructura obligatoria de la carpeta backend

Esta es la estructura que exige el proyecto (tomada del enunciado). **Se respeta tal cual.**

```
backend/
  .env                  -> PUERTO, conexión a BD, JWT_SECRET                  [nuevo]
  src/
    models/             -> todas las entidades + usuario.js                   [nuevo]
    controllers/        -> un controlador por entidad + authController        [nuevo]
    routes/             -> rutas por entidad + authRoutes.js                   [nuevo]
    middlewares/        -> authMiddleware.js, validaciones                     [nuevo]
    app.js              -> configuración de Express
```

## Reglas de esta estructura

| Pieza | Regla |
|---|---|
| `.env` | Vive en `backend/`, **nunca se sube al repositorio** (`.gitignore`). Contiene `PUERTO`, datos de conexión a PostgreSQL y `JWT_SECRET`. Se entrega un `.env.example` sin valores reales. |
| `models/` | **Un archivo por entidad** + `usuario.js`. Más `index.js` (cargador de Sequelize). |
| `controllers/` | **Un controlador por entidad** (`productoController.js`) + `authController.js`. |
| `routes/` | **Un archivo de rutas por entidad** (`productoRoutes.js`) + `authRoutes.js`. |
| `middlewares/` | `authMiddleware.js` (JWT) y `validaciones.js` (campos obligatorios, tipos, relaciones). |
| `app.js` | Está **dentro de `src/`**. Solo configura Express: cors, `express.json()`, registro de routers, manejo de errores y arranque. Sin lógica de negocio. |

Nombres: `<entidad>Controller.js`, `<entidad>Routes.js` (camelCase, singular) y modelos en singular (`producto.js` → modelo `Producto`).

## Dónde van migraciones y seeders (adición necesaria)

La imagen no los lista, pero Sequelize los necesita. Se ubican **dentro de `src/`** para no agregar carpetas al nivel de `backend/`:

```
backend/
  .sequelizerc          -> apunta a src/ (plantilla en assets/templates/backend/sequelizerc.template)
  src/
    config/config.js    -> lee .env para sequelize-cli
    migrations/
    seeders/
```

Si el docente exige la estructura *exactamente* como en la imagen, estos tres elementos son los únicos extras: dilo al usuario y pregunta antes de quitarlos (sin ellos no habría migraciones).

`package.json`: `"main": "src/app.js"` y scripts `"dev": "nodemon src/app.js"`, `"start": "node src/app.js"`.

## Cómo crear una entidad nueva (orden)

1. Migración: `npx sequelize-cli migration:generate --name create-<entidad>` → `src/migrations/`.
2. Modelo: `src/models/<entidad>.js` (copiar `assets/templates/model.template.js`).
3. Asociaciones en `associate()` de **ambos** modelos.
4. Controlador: `src/controllers/<entidad>Controller.js` (`controller.template.js`).
5. Rutas: `src/routes/<entidad>Routes.js` protegidas con `authMiddleware` (`routes.template.js`).
6. Registrar en `src/app.js`: `app.use('/<entidades>', require('./routes/<entidad>Routes'))`.
7. Correr `node scripts/lint-backend.js`.

## Plantillas listas (assets/templates/backend/)

| Plantilla | Destino |
|---|---|
| `env.example` | `backend/.env.example` (y copiar a `.env`) |
| `sequelizerc.template` | `backend/.sequelizerc` |
| `src/config/config.template.js` | `backend/src/config/config.js` |
| `src/models/index.template.js` | `backend/src/models/index.js` |
| `src/models/usuario.template.js` | `backend/src/models/usuario.js` |
| `src/migrations/create-usuarios.template.js` | `backend/src/migrations/<fecha>-create-usuarios.js` |
| `src/controllers/authController.template.js` | `backend/src/controllers/authController.js` |
| `src/routes/authRoutes.template.js` | `backend/src/routes/authRoutes.js` |
| `src/middlewares/authMiddleware.template.js` | `backend/src/middlewares/authMiddleware.js` |
| `src/middlewares/validaciones.template.js` | `backend/src/middlewares/validaciones.js` |
| `src/app.template.js` | `backend/src/app.js` |

`node scripts/ensure-sequelize.js --scaffold` copia todo esto **sin sobrescribir** archivos existentes.
