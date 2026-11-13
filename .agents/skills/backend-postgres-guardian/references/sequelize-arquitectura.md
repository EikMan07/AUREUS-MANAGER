# Sequelize + Express + PostgreSQL: arquitectura y convenciones

## Contenido
1. Concepto y flujo de capas
2. Instalación y estructura
3. Configuración para PostgreSQL
4. Modelos
5. Tipos de datos y validaciones
6. Asociaciones
7. Migraciones
8. Comandos de sequelize-cli
9. Controladores
10. Rutas
11. app.js
12. Mejoras sobre los ejemplos del curso

Se asume **Sequelize v6** con `sequelize-cli`.

---

## 1. Concepto y flujo

Sequelize es un ORM basado en promesas: trabajas con clases y métodos de JavaScript y él genera el SQL. Se integra en la arquitectura por capas de Express:

```
Ruta → Middleware → Controlador → Servicio (opcional) → Modelo → Base de datos
```

| Capa | Responsabilidad única |
|---|---|
| Ruta | Define la URL y el verbo HTTP (`express.Router()`); decide qué controlador responde |
| Middleware | Intercepta peticiones para autenticación (`JWT`), validación de tipos y control de acceso |
| Controlador | Traduce HTTP: extrae `req.params`, `req.query`, `req.body`, convierte tipos (`Number`) y responde con `res.json()` |
| Servicio | Lógica de negocio pura y reutilizable, totalmente agnóstica de Express (sin `req` ni `res`) |
| Modelo | Representa una tabla en Sequelize: campos, tipos, validaciones y relaciones |
| Migración | Crea y modifica la estructura de la BD de forma versionada y reversible en PostgreSQL |

Flujo de ejemplo: `POST /usuarios → router.post → authMiddleware → ctrl.crear → usuarioService.crear → Usuario.create → INSERT INTO`.

## 2. Instalación y estructura

```bash
npm install sequelize pg pg-hstore express cors dotenv jsonwebtoken bcryptjs
npm install --save-dev sequelize-cli nodemon
node <ruta-de-la-skill>/scripts/ensure-sequelize.js --scaffold   # hace todo lo anterior y crea la estructura
```

El curso muestra la estructura por defecto de `sequelize-cli init` (carpetas en la raíz). **En este proyecto manda la estructura del enunciado**, con todo dentro de `src/` (ver `estructura-backend.md`):

```
backend/
  .env                  -> PUERTO, conexión a BD, JWT_SECRET
  .sequelizerc          -> apunta el CLI a src/
  src/
    config/config.js    -> lee .env para sequelize-cli
    models/             -> entidades + usuario.js (+ index.js)
    migrations/
    seeders/
    controllers/        -> un controlador por entidad + authController
    routes/             -> rutas por entidad + authRoutes.js
    middlewares/        -> authMiddleware.js, validaciones
    app.js              -> configuración de Express
```

Con `.sequelizerc` los comandos de `sequelize-cli` (sección 8) funcionan igual y escriben en `src/`. No uses `npx sequelize-cli init` sobre un proyecto que ya tiene esta estructura.

## 3. Configuración para PostgreSQL

La conexión sale de `.env` (nunca credenciales dentro del código ni en un `config.json` versionado):

```
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=mi_base
DB_USER=postgres
DB_PASSWORD=...
```

- `src/config/config.js` y `src/models/index.js` leen esas variables con `dotenv` y fijan `dialect: 'postgres'` (plantillas en `assets/templates/backend/src/`).
- Agrega `.env` a `.gitignore` y mantén un `.env.example` sin valores reales.

## 4. Modelos

Un modelo describe una tabla. `extends Model` (hereda `findAll`, `create`, `update`…), `init()` declara columnas/tipos/opciones, `associate()` define relaciones.

```js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Usuario extends Model {
    static associate(models) {
      Usuario.hasMany(models.Post);
    }
  }
  Usuario.init({
    nombre: { type: DataTypes.STRING, allowNull: false },
    email:  { type: DataTypes.STRING, unique: true },
  }, { sequelize, modelName: 'Usuario' });
  return Usuario;
};
```

Reglas:
- El modelo y la migración **deben coincidir** (columnas, tipos, `allowNull`, `unique`, FKs). Un modelo que no coincide con la tabla es un bug futuro.
- Si el proyecto ya usa `underscored`/`tableName`, replícalo en el modelo nuevo.

## 5. Tipos de datos y validaciones

| DataTypes | Uso | En PostgreSQL |
|---|---|---|
| `STRING` | Texto corto | `VARCHAR(255)` |
| `TEXT` | Texto largo | `TEXT` |
| `INTEGER` | Enteros | `INTEGER` |
| `DECIMAL(10, 2)` | Precios, montos | `DECIMAL(10,2)` |
| `BOOLEAN` | Verdadero/falso | `BOOLEAN` |
| `DATE` | Fecha y hora | `TIMESTAMP WITH TIME ZONE` |
| `ENUM('a','b')` | Valores fijos | tipo `ENUM` propio (ver trampa en `postgres-seguro.md`) |

```js
email: {
  type: DataTypes.STRING,
  allowNull: false,
  unique: true,
  defaultValue: '',
  validate: { isEmail: true, len: [5, 100] },
},
```

Ojo: `allowNull: false` + `defaultValue: ''` + `unique: true` en la misma columna es contradictorio en la práctica (dos registros sin email chocarían por el `''`). Si el ejemplo del curso lo trae, úsalo para entender la sintaxis, pero en código real elige: o es obligatorio y único (sin default), o es opcional (`allowNull: true`, sin default `''`).

## 6. Asociaciones

| Relación | Código | Ejemplo |
|---|---|---|
| 1:1 | `Usuario.hasOne(Perfil)` / `Perfil.belongsTo(Usuario)` | Un usuario tiene un perfil |
| 1:N | `Usuario.hasMany(Post)` / `Post.belongsTo(Usuario)` | Un usuario escribe muchos posts |
| N:M | `Post.belongsToMany(Etiqueta, { through: 'PostEtiquetas' })` (y la inversa) | Un post tiene muchas etiquetas y viceversa |

```js
// Traer al usuario con sus posts (JOIN)
const usuario = await Usuario.findByPk(1, { include: Post });
```

- Declara **ambos lados** de la relación.
- Define `foreignKey` explícito y `onDelete`/`onUpdate` deliberados (ver `postgres-seguro.md`).
- En N:M con atributos propios (ej.: dosis en receta), crea un **modelo intermedio** real en lugar de un `through` de string.
- La tabla intermedia N:M debe tener PK compuesta o `unique` sobre el par de FKs.

## 7. Migraciones

Son el control de versiones de la BD: **reproducibles** (mismo esquema en dev/pruebas/prod), **reversibles** (`up` y `down`), **registradas** (tabla `SequelizeMeta`).

```js
// migrations/20261103000000-create-usuario.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Usuarios', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      nombre: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, unique: true },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Usuarios');
  },
};
```

`queryInterface`: `createTable`, `dropTable`, `addColumn`, `removeColumn`, `changeColumn`, `renameColumn`, `addIndex`, `removeIndex`, `addConstraint`, `removeConstraint`, `bulkInsert`, `bulkDelete`.

Reglas:
- `up` aplica el cambio; `down` lo revierte **exactamente**.
- Una migración, un propósito (no mezcles crear tablas con migrar datos).
- Para varios pasos que deben ser atómicos, usa `queryInterface.sequelize.transaction(async (t) => { ... })` y pasa `{ transaction: t }` a cada llamada.
- Orden de creación: tablas padre antes que hijas; en `down`, al revés.
- **Nunca edites una migración ya aplicada**: crea otra.

## 8. Comandos de sequelize-cli

| `npx sequelize-cli …` | Qué hace |
|---|---|
| `db:create` | Crea la BD definida en config |
| `model:generate --name X --attributes …` | Genera modelo y su migración |
| `migration:generate --name X` | Migración vacía (ej.: agregar columna) |
| `db:migrate` | Ejecuta migraciones pendientes |
| `db:migrate:undo` | Revierte la última |
| `db:migrate:undo:all` | Revierte todas (🔴 destructivo) |
| `seed:generate --name X` | Crea un seeder |
| `db:seed:all` | Inserta datos de todos los seeders |

`db:migrate:undo:all` y `db:seed:undo:all` son destructivos: solo en desarrollo y avisando.

## 9. Controladores

```js
const { Usuario } = require('../models');

exports.listar = async (req, res) => {
  try {
    const usuarios = await Usuario.findAll();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
};

exports.obtener = async (req, res) => {
  try {
    // req.params siempre llega como string: convertir a número
    const id = Number(req.params.id);
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, email } = req.body; // Whitelist contra Mass Assignment
    const usuario = await Usuario.create({ nombre, email });
    res.status(201).json(usuario); // 201 Created canónico
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.actualizar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const { nombre, email } = req.body;
    await usuario.update({ nombre, email });
    res.json(usuario);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.eliminar = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const usuario = await Usuario.findByPk(id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    await usuario.destroy();
    res.sendStatus(204); // 204 No Content canónico (sin cuerpo)
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

- **Objetos `req` y `res`:**
  - `req.params`: Parámetros de ruta dinámicos (`/:id`). **¡Llegan como texto!** Obligatorio convertir con `Number(req.params.id)`.
  - `req.query`: Parámetros de consulta (`?page=2`). Llegan como texto; convertir si se usan como números.
  - `req.body`: Cuerpo en formato JSON. Requiere `app.use(express.json())`.
  - `res.json(data)`, `res.status(code)`, `res.sendStatus(204)`.
- `try/catch` captura errores de validación y responde con un código HTTP apropiado.

Métodos del modelo para un CRUD completo:

| Método | Ejemplo | Devuelve |
|---|---|---|
| `findAll` | `Usuario.findAll({ where: { activo: true } })` | Arreglo |
| `findByPk` | `Usuario.findByPk(id)` | Registro o `null` |
| `findOne` | `Usuario.findOne({ where: { email } })` | Primero que coincide |
| `create` | `Usuario.create(datos)` | Registro creado |
| `update` | `usuario.update(datos)` | Registro actualizado |
| `destroy` | `usuario.destroy()` | Elimina el registro |

## 10. Rutas y Orden de Coincidencia (Matching)

```js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/usuarioController');

// ⚠️ REGLA DE ORO DE ORDEN: Express prueba rutas de arriba a abajo.
// Las rutas fijas/específicas DEBEN ir ANTES de las rutas con segmentos dinámicos (:id).
router.get('/reporte', ctrl.generarReporte); // Específica ANTES de :id
router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
```

| Verbo | URL | Acción | Código Exitoso |
|---|---|---|---|
| GET | `/usuarios` | listar | `200 OK` |
| GET | `/usuarios/:id` | obtener | `200 OK` (o `404`) |
| POST | `/usuarios` | crear | `201 Created` |
| PUT | `/usuarios/:id` | actualizar | `200 OK` (o `404`) |
| DELETE | `/usuarios/:id` | eliminar | `204 No Content` |

## 11. Configuración de Express (`src/app.js`) y Punto de Entrada (`src/index.js`)

Se desacopla la configuración de la app del arranque del puerto de red:

### `src/app.js` (Configuración sin listen)
```js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const usuariosRouter = require('./routes/usuarios');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json());

// Montaje modular de routers con prefijo
app.use('/usuarios', usuariosRouter);

// Manejador 404 (Ruta no encontrada) al final de las rutas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador centralizado de errores (firma de 4 parámetros obligatoria)
app.use((err, req, res, next) => {
  console.error('[Error no controlado]:', err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});

module.exports = app;
```

### `src/index.js` (Punto de entrada del servidor)
```js
require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PUERTO = process.env.PUERTO || process.env.PORT || 3000;

sequelize.authenticate()
  .then(() => {
    app.listen(PUERTO, () => console.log(`API en el puerto ${PUERTO}`));
  })
  .catch((err) => console.error('Sin conexión a la BD:', err.message));
```

## 12. Mejoras sobre los ejemplos del curso

Los ejemplos del curso son didácticos. Al escribir código real, mantén la **misma estructura** pero aplica estas mejoras (menciónalas brevemente al usuario como sugerencia, sin imponerlas si va contra una consigna de la tarea):

1. **Capa de Servicios (`services/`):** Para reglas de negocio complejas, desacopla la lógica del controlador en un servicio puro (sin `req`/`res`).
2. **Whitelist de campos** en `crear`/`actualizar`: `const { nombre, email } = req.body;` en vez de `Usuario.create(req.body)` para mitigar Mass Assignment.
3. **Conversión explícita de tipos:** `Number(req.params.id)` ya que los parámetros siempre llegan como string.
4. **`obtener`, `actualizar` y `eliminar` devuelven 404** si `findByPk` da `null`.
5. **Diferenciar errores:** `SequelizeValidationError` → 400; `SequelizeUniqueConstraintError` → 409; `SequelizeForeignKeyConstraintError` → 409 o 400; el resto → 500 (sin filtrar detalles internos).
6. **`try/catch` también en `listar`** y en todo handler `async`.
7. **`DELETE` responde 204** sin cuerpo (`res.sendStatus(204)`).
8. **Manejador 404 y manejador centralizado de errores con 4 parámetros** al final de `app.js`.
9. **Paginación** (`limit`/`offset`) en listados que pueden crecer.
10. **`include` con cuidado:** trae solo lo necesario (`attributes`), evita N+1 usando `include` en una sola consulta.
11. **Transacciones** cuando una operación escribe en varias tablas (ej.: crear cita + recetar medicamentos).
12. **`sequelize.sync()` no se usa** para crear tablas; solo migraciones.
13. **Rutas protegidas** con `router.use(authMiddleware)` y validaciones (`requerir`, `tipos`, `verificarRelacion`) en las rutas; listados con `include` de los datos relacionados. Ver `auth-seguridad.md`.
