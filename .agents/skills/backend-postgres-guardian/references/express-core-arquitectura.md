# Express.js: Arquitectura de Servidor, Routing, Middlewares y Capas Backend

Esta referencia sintetiza los conceptos fundamentales de Express.js sobre Node.js: ciclo de vida de peticiones, middlewares, anatomía y orden de rutas, manejo centralizado de errores y arquitectura por capas (Route → Middleware → Controller → Service → Model).

---

## 1. ¿Qué es Express.js y Arquitectura del Sistema?

Express es un framework minimalista y flexible para Node.js que simplifica la creación de servidores web y APIs REST, añadiendo una capa ligera sobre el módulo `http` nativo de Node.js.

### Las 4 Capas del Sistema Backend

```
┌────────────────────────────────────────────────────────┐
│  Tu Aplicación                                         │
│  Rutas, middlewares, controladores, servicios, modelos │
├────────────────────────────────────────────────────────┤
│  Express.js                                            │
│  Routing, cadena de middleware, objetos req/res        │
├────────────────────────────────────────────────────────┤
│  Node.js Runtime                                       │
│  Módulo http, Event Loop, sistema de archivos (fs)     │
├────────────────────────────────────────────────────────┤
│  Sistema Operativo / Red                               │
│  Sockets TCP, interfaces de red, puertos (3000, 5000)  │
└────────────────────────────────────────────────────────┘
```

### Características Principales
- **Routing:** Asocia URLs y verbos HTTP a funciones controladoras.
- **Cadena de Middleware:** Funciones encadenadas `(req, res, next)` que procesan cada petición secuencialmente.
- **Helpers de respuesta:** Métodos auxiliares integrados (`res.json()`, `res.status()`, `res.sendStatus()`, `res.redirect()`).
- **Ecosistema modular:** Integración sencilla de paquetes como `cors`, `helmet`, `morgan`, `multer`, etc.

---

## 2. Inicialización, Entorno y Scripts de Ejecución

### Comandos de Inicialización
```bash
# Inicializar proyecto Node.js
npm init -y

# Instalar Express y dependencias de producción
npm install express cors dotenv

# Instalar herramientas de desarrollo
npm install -D nodemon
```

### Configuración en `package.json`
```json
{
  "name": "mi-api",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.21.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.0"
  }
}
```

> **Nota:** En Node.js 18.11+ también es posible usar el flag nativo `node --watch src/index.js` como alternativa a `nodemon`.

---

## 3. Separación Arquitectónica: `app.js` vs `index.js` (o `server.js`)

Es una **regla de diseño fundamental** desacoplar la configuración de Express del arranque del servidor de red:

```
src/
├── app.js       -> Configura Express: middlewares, rutas, 404 y manejador de error (NO llama a app.listen)
└── index.js     -> Punto de entrada: carga .env, conecta BD y arranca app.listen()
```

### Ventajas Clave
1. **Pruebas de Integración:** Permite importar `app` en tests (Supertest, Jest) para ejecutar peticiones HTTP directas en memoria sin abrir sockets TCP ni generar conflictos de puertos (`EADDRINUSE`).
2. **Reutilización:** Permite utilizar la misma aplicación en entornos serverless, clusters o workers.

---

## 4. Los Objetos `req` (Petición) y `res` (Respuesta)

### Objeto `req` (Incoming Request)
| Propiedad | Propósito | Ejemplo / Formato |
|---|---|---|
| `req.params` | Segmentos dinámicos declarados en la ruta (`/:id`). Identifica el recurso. | `{ id: '7' }` (**¡Llega como string!**) |
| `req.query` | Parámetros del query string (`?page=2&filtro=activo`). Opcionales para paginación y filtros. | `{ page: '2', filtro: 'activo' }` (**¡Llega como string!**) |
| `req.body` | Cuerpo enviado por el cliente en JSON. Requiere `app.use(express.json())`. | `{ precio: 22.5, nombre: 'Producto' }` |
| `req.headers` | Cabeceras de la petición (`authorization`, `content-type`, etc.). | `req.headers['authorization']` |
| `req.method` | Verbo HTTP utilizado en la petición. | `'GET'`, `'POST'`, `'PUT'`, `'DELETE'` |

> **⚠️ Regla de Oro de Tipado:** Tanto `req.params` como `req.query` siempre se reciben como cadenas de texto (`string`). Si se esperan identificadores o cantidades numéricas, se deben convertir explícitamente antes de operar:
> ```js
> const id = Number(req.params.id); // o parseInt(req.params.id, 10)
> const page = Number(req.query.page) || 1;
> ```

### Objeto `res` (Outgoing Response)
| Método | Acción | Código HTTP típico |
|---|---|---|
| `res.json(data)` | Serializa un objeto/array a JSON y fija `Content-Type: application/json`. | 200, 201 |
| `res.status(code)` | Establece el código de estado HTTP (retorna `res` para encadenar). | `res.status(201).json(nuevo)` |
| `res.send(data)` | Envía texto plano o HTML. | 200 |
| `res.sendStatus(code)` | Envía únicamente el código de estado sin cuerpo (mensaje por defecto de HTTP). | `res.sendStatus(204)` (No Content) |
| `res.redirect(url)` | Redirige al cliente hacia otra ruta o URL absoluta. | 302 |

---

## 5. Cadena de Middlewares (`req, res, next`)

Un middleware es una función con acceso a los objetos de petición (`req`), respuesta (`res`) y a la función `next()` para transferir el control al siguiente middleware en la cadena.

```
Petición HTTP
     │
     ▼
[ Logger Middleware ] ── next() ──▶ [ express.json() ] ── next() ──▶ [ Route Handler ]
                                                                             │
                                                                             ▼
                                                                     res.json(resultado)
```

### Firma Estándar
```js
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // Pasa el control al siguiente middleware
});
```

### Reglas Esenciales de Middlewares
1. **Orden de registro:** Los middlewares se ejecutan exactamente en el orden en que se registran con `app.use()`.
2. **Debe responder o avanzar:** Todo middleware debe enviar una respuesta (`res.json(...)`, `res.sendStatus(...)`) o llamar a `next()`. Si no hace ninguna de las dos, la petición del cliente quedará congelada/colgada indefinidamente.
3. **Middlewares de terceros indispensables:**
   - `express.json()`: Parsea cuerpos de peticiones entrantes con formato JSON.
   - `cors()`: Configura encabezados Cross-Origin Resource Sharing.
   - `helmet()`: Añade cabeceras HTTP de seguridad.
   - `morgan()`: Registra logs detallados de tráfico HTTP.

---

## 6. Anatomía de Rutas y Orden de Coincidencia (Matching Order)

### Estructura de una Ruta
```js
app.get('/api/productos/:id', (req, res) => { /* handler */ });
//  ▲   └────────┬─────────┘  └─────────────┬──────────────┘
//  │            │                          │
//  Método       Ruta / Segmento            Handler (Función controladora)
```

### ⚠️ Regla de Oro: El Orden de las Rutas Importa
Express evalúa las rutas de **arriba hacia abajo** y ejecuta la primera que coincida con la URL entrante:

```js
// ❌ INCORRECTO: La ruta dinámica captura la palabra "nuevos" como si fuera un :id
router.get('/productos/:id', productosCtrl.obtener);
router.get('/productos/nuevos', productosCtrl.listarNuevos); // ¡NUNCA se ejecutará!

// ✅ CORRECTO: Coloca las rutas específicas ANTES de las rutas con segmentos dinámicos
router.get('/productos/nuevos', productosCtrl.listarNuevos);
router.get('/productos/:id', productosCtrl.obtener);
```

---

## 7. Modularización con `express.Router()`

Permite dividir los endpoints en archivos temáticos independientes en lugar de concentrarlos en `app.js`:

```js
// src/routes/productosRoutes.js
const { Router } = require('express');
const router = Router();
const ctrl = require('../controllers/productosController');

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.post('/', ctrl.crear);
router.put('/:id', ctrl.actualizar);
router.delete('/:id', ctrl.eliminar);

module.exports = router;
```

En `src/app.js`, se monta asignando un prefijo base:
```js
const productosRoutes = require('./routes/productosRoutes');
app.use('/api/productos', productosRoutes);
// router.get('/:id') responderá a GET /api/productos/:id
```

---

## 8. Manejo de Errores 404 y Manejador Centralizado de Errores

Ambos deben registrarse **al final de `app.js`**, después de todas las rutas y routers:

```js
// 1. Manejador 404: Ninguna ruta previa coincidió
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// 2. Manejador centralizado de errores: 4 parámetros obligatorios
app.use((err, req, res, next) => {
  console.error('[Error no controlado]:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor'
  });
});
```

### Consideraciones Cruciales
1. **Firma cuádruple obligatoria `(err, req, res, next)`:** Express identifica un middleware de errores **únicamente** cuando tiene 4 parámetros. Si se definen solo 3 `(err, req, res)`, Express lo procesará como un middleware ordinario y los errores no serán capturados.
2. **Express 4 vs Express 5 / Manejo Async:**
   - En **Express 4**, los errores arrojados en funciones asíncronas (`async/await`) no llegan solos al middleware de error; requieren atraparlos con `try/catch` y llamar a `next(err)` o usar un wrapper `asyncHandler`.
   - En **Express 5**, las promesas rechazadas en handlers async se envían automáticamente al middleware de error sin requerir `next(err)`.

---

## 9. Arquitectura por Capas: Route → Middleware → Controller → Service → Model

Para mantener una API mantenible, testeable y escalable, se aplica la separación de responsabilidades en 5 capas:

```
Petición HTTP
     │
     ▼
┌──────────────┐   ¿Qué URL y qué método HTTP?
│    Route     │   Define el endpoint y delega la ejecución.
└──────┬───────┘
       │
       ▼
┌──────────────┐   ¿Puede pasar? ¿Los datos son válidos?
│  Middleware  │   Autenticación (JWT), validación de esquema, rate limiting.
└──────┬───────┘
       │
       ▼
┌──────────────┐   Traduce el protocolo HTTP a llamadas del dominio.
│  Controller  │   Lee req.params, req.body, invoca al Service y responde con res.json().
└──────┬───────┘
       │
       ▼
┌──────────────┐   Reglas de negocio puras.
│   Service    │   Totalmente agnóstico de Express (sin req ni res). Testeable y reutilizable.
└──────┬───────┘
       │
       ▼
┌──────────────┐   Persistencia y acceso a datos.
│ Model / ORM  │   Sequelize (PostgreSQL). Consultas SQL, relaciones y restricciones.
└──────────────┘
```

### Regla de Acoplamiento Unidireccional
> **Cada capa conoce únicamente a la capa inmediatamente siguiente.**  
> Si se cambia la base de datos o el ORM, solo se modifican `Model` y `Service`. Si se migra el transporte de Express a WebSockets, CLI o gRPC, la capa de `Service` y `Model` se reutiliza al 100 % sin tocar lógica de negocio.

---

## 10. CRUD Canónico y Códigos de Estado HTTP

| Operación | Método HTTP | Ruta de Ejemplo | Acción en BD | Código HTTP Exitoso | Códigos de Error Típicos |
|---|---|---|---|---|---|
| **Listar** | `GET` | `/api/productos` | `findAll()` | `200 OK` | `500 Internal Error` |
| **Obtener uno** | `GET` | `/api/productos/:id` | `findByPk(id)` | `200 OK` | `404 Not Found` |
| **Crear** | `POST` | `/api/productos` | `create(datos)` | `201 Created` | `400 Bad Request` / `409 Conflict` |
| **Actualizar** | `PUT` | `/api/productos/:id` | `update(datos)` | `200 OK` | `400 Bad Request` / `404 Not Found` |
| **Eliminar** | `DELETE` | `/api/productos/:id` | `destroy()` | `204 No Content` | `404 Not Found` / `409 Conflict` |

