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

Sequelize es un ORM basado en promesas: trabajas con clases y métodos de JavaScript y él genera el SQL.

```
Ruta → Controlador → Modelo → Base de datos
```

| Capa | Responsabilidad única |
|---|---|
| Ruta | Define la URL y el verbo HTTP; decide qué controlador responde |
| Controlador | Recibe la petición, aplica la lógica y envía la respuesta |
| Modelo | Representa una tabla: campos, tipos, validaciones y relaciones |
| Migración | Crea y modifica la estructura de la BD de forma versionada y reversible |

Flujo de ejemplo: `POST /usuarios → router.post → ctrl.crear → Usuario.create → INSERT INTO`.

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
  const usuarios = await Usuario.findAll();
  res.json(usuarios);
};

exports.crear = async (req, res) => {
  try {
    const usuario = await Usuario.create(req.body);
    res.status(201).json(usuario);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
```

- `req`: `req.params`, `req.query`, `req.body`. `res`: `res.status()`, `res.json()`.
- `try/catch` captura errores de validación y responde con un código claro.

Métodos del modelo para un CRUD completo:

| Método | Ejemplo | Devuelve |
|---|---|---|
| `findAll` | `Usuario.findAll({ where: { activo: true } })` | Arreglo |
| `findByPk` | `Usuario.findByPk(req.params.id)` | Registro o `null` |
| `findOne` | `Usuario.findOne({ where: { email } })` | Primero que coincide |
| `create` | `Usuario.create(datos)` | Registro creado |
| `update` | `usuario.update(datos)` | Registro actualizado |
| `destroy` | `usuario.destroy()` | Elimina el registro |

## 10. Rutas

```js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/usuarioController');

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
```

| Verbo | URL | Acción |
|---|---|---|
| GET | `/usuarios` | listar |
| GET | `/usuarios/:id` | obtener |
| POST | `/usuarios` | crear |
| PUT | `/usuarios/:id` | actualizar |
| DELETE | `/usuarios/:id` | eliminar |

## 11. app.js

```js
const express = require('express');
const { sequelize } = require('./models');
const usuariosRouter = require('./routes/usuarios');

const app = express();
app.use(express.json());
app.use('/usuarios', usuariosRouter);

sequelize.authenticate()
  .then(() => app.listen(3000, () => console.log('API en el puerto 3000')))
  .catch((err) => console.error('Sin conexión a la BD:', err));
```

Al agregar una entidad nueva: registrar su router aquí (`app.use('/entidad', router)`). En este proyecto `app.js` está en `src/app.js`, usa `cors` con `exposedHeaders: ['x-access-token']` y monta `/auth` (pública) antes de las rutas protegidas. Plantilla: `assets/templates/backend/src/app.template.js`.

## 12. Mejoras sobre los ejemplos del curso

Los ejemplos del curso son didácticos. Al escribir código real, mantén la **misma estructura** pero aplica estas mejoras (menciónalas brevemente al usuario como sugerencia, sin imponerlas si va contra una consigna de la tarea):

1. **Whitelist de campos** en `crear`/`actualizar`: `const { nombre, email } = req.body;` en vez de `Usuario.create(req.body)`.
2. **`obtener` y `actualizar`/`eliminar` devuelven 404** si `findByPk` da `null`.
3. **Diferenciar errores:** `SequelizeValidationError` → 400; `SequelizeUniqueConstraintError` → 409; `SequelizeForeignKeyConstraintError` → 409 o 400; el resto → 500 (sin filtrar detalles internos).
4. **`try/catch` también en `listar`** y en todo handler `async`. Alternativa: un wrapper `asyncHandler` + middleware de errores.
5. **`DELETE` responde 204** sin cuerpo (o 200 con mensaje).
6. **Paginación** (`limit`/`offset`) en listados que pueden crecer.
7. **`include` con cuidado:** trae solo lo necesario (`attributes`), evita N+1 usando `include` en una sola consulta.
8. **Transacciones** cuando una operación escribe en varias tablas (ej.: crear cita + recetar medicamentos).
9. **`sequelize.sync()` no se usa** para crear tablas; solo migraciones.
10. **Rutas protegidas** con `router.use(authMiddleware)` y validaciones (`requerir`, `tipos`, `verificarRelacion`) en las rutas; listados con `include` de los datos relacionados. Ver `auth-seguridad.md`.
