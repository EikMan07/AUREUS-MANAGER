# Middleware, Validación y Manejo de Errores en Express.js

Esta referencia documenta el estándar integral para procesar, validar y proteger cada petición HTTP en Express.js, garantizando que el servidor responda de forma consistente, segura y predecible.

---

## 1. ¿Qué es un Middleware?

Un **middleware** es una función que se ejecuta en el ciclo de vida de una petición HTTP, entre la llegada del request (`req`) y la emisión de la respuesta (`res`).

```javascript
function miMiddleware(req, res, next) {
  // Código de intercepción o transformación
  next();
}
```

### Los 3 Caminos Posibles de un Middleware
Al finalizar su tarea, todo middleware **debe** seguir exactamente uno de estos tres caminos:

1. **Continuar (`next()`):** Cede el control al siguiente middleware o controlador de la cadena.
2. **Responder (`res.status(...).json(...)`):** Finaliza el ciclo de petición-respuesta de inmediato. Los siguientes middlewares y controladores **no** se ejecutan.
3. **Fallar (`next(err)`):** Salta directamente al manejador centralizado de errores, interrumpiendo la ejecución ordinaria de la ruta.

> ⚠️ **Regla Crítica:** Si un middleware no llama a `next()` ni emite una respuesta (`res.json()`, `res.send()`), la petición queda congelada indefinidamente y el cliente experimentará un *timeout*.

---

## 2. Tipos de Middleware en Express

| Tipo | Firma / Uso | Ámbito de Ejecución | Ejemplo |
|---|---|---|---|
| **De Aplicación** | `app.use(fn)` | Todas las peticiones entrantes de la aplicación. | Logger, CORS, Helmet |
| **De Router** | `router.use(fn)` | Todas las rutas asociadas a ese enrutador específico. | `router.use(authMiddleware)` |
| **De Ruta** | `router.post('/x', auth, validar(schema), ctrl)` | Exclusivo para un método y endpoint específico. | Subida de archivos, roles |
| **Integrados** | `express.json()`, `express.urlencoded()`, `express.static()` | Nativos de Express para parseo de body y archivos. | `app.use(express.json())` |
| **De Terceros** | Paquetes npm (`helmet`, `cors`, `morgan`, `compression`) | Servicios transversales de seguridad y optimización. | `app.use(helmet())` |
| **De Errores** | `(err, req, res, next)` (4 parámetros obligatorios) | Recibe excepciones y llamadas a `next(err)`. | `app.use(errorHandler)` |

---

## 3. El Orden de Registro lo es Todo

Express evalúa los middlewares y rutas **estrictamente de arriba hacia abajo**, en el orden exacto en que fueron registrados con `app.use()` o `app[method]()`.

```
                        PETICIÓN HTTP ENTRANTE
                                  │
                                  ▼
         ┌──────────────────────────────────────────────────┐
         │ 1. SEGURIDAD Y OPTIMIZACIÓN (Terceros)           │
         │    helmet(), cors(), rateLimit(), compression()  │
         └────────────────────────┬─────────────────────────┘
                                  ▼
         ┌──────────────────────────────────────────────────┐
         │ 2. LOGGING Y TRAZABILIDAD                        │
         │    logger personalizado / morgan                 │
         └────────────────────────┬─────────────────────────┘
                                  ▼
         ┌──────────────────────────────────────────────────┐
         │ 3. PARSEO DEL CUERPO (Body Parsers)              │
         │    express.json(), express.urlencoded()          │
         └────────────────────────┬─────────────────────────┘
                                  ▼
         ┌──────────────────────────────────────────────────┐
         │ 4. RUTAS DE LA API (Routers)                     │
         │    authMiddleware → validar(schema) → Controller │
         └────────────────────────┬─────────────────────────┘
                                  ▼
         ┌──────────────────────────────────────────────────┐
         │ 5. MANEJADOR 404 (Ruta No Encontrada)            │
         │    Captura peticiones que no hicieron match      │
         └────────────────────────┬─────────────────────────┘
                                  ▼
         ┌──────────────────────────────────────────────────┐
         │ 6. MANEJADOR CENTRALIZADO DE ERRORES             │
         │    (err, req, res, next)                         │
         └──────────────────────────────────────────────────┘
```

---

## 4. Middleware de Terceros Esenciales

Configuración obligatoria recomendada al inicio de `src/app.js`:

```bash
npm install helmet cors morgan express-rate-limit compression
```

```javascript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

const app = express();

// 1. Cabeceras HTTP de seguridad
app.use(helmet());

// 2. Control de acceso cross-origin
app.use(cors({ origin: process.env.URL_FRONT || '*' }));

// 3. Compresión de respuestas HTTP (gzip)
app.use(compression());

// 4. Rate Limiting por IP (Protección contra fuerza bruta y DoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 peticiones por ventana por IP
  message: { error: 'TOO_MANY_REQUESTS', message: 'Demasiadas peticiones. Intenta más tarde.' }
});
app.use('/api/', limiter);

// 5. Logging HTTP en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// 6. Parseo de payloads JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
```

---

## 5. Logger Personalizado con `res.on('finish')`

Para medir tiempos reales de respuesta y asociar contexto a la petición (`req.user`, `req.requestId`):

```javascript
export function requestLogger(req, res, next) {
  const inicio = Date.now();
  res.on('finish', () => {
    const duracionMs = Date.now() - inicio;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duracionMs}ms)`);
  });
  next();
}
```

---

## 6. Autenticación y Autorización por Roles

- **401 Unauthorized:** "No sé quién eres": falta el token o no es válido.
- **403 Forbidden:** "Sé quién eres, pero no tienes permiso para esta acción".

```javascript
import jwt from 'jsonwebtoken';

export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token de acceso requerido.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token inválido o expirado.' });
  }
}

export const soloRol = (rolPermitido) => (req, res, next) => {
  if (!req.user || req.user.rol !== rolPermitido) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Acceso denegado: permisos insuficientes.' });
  }
  next();
};
```

---

## 7. Validación en el Borde: "Nunca Confíes en el Cliente"

Todo lo proveniente del cliente (`req.params`, `req.query`, `req.body`) puede contener datos maliciosos, tipos erróneos o campos inyectados (como `rol: 'admin'`).

### Los 3 Niveles de Validación
1. **Tipo:** ¿Es un número, texto, booleano, arreglo?
2. **Formato:** ¿Email válido? ¿Longitud mínima/máxima? ¿UUID v4? ¿Formato de cédula o teléfono?
3. **Reglas de Negocio:** ¿El email ya está registrado? ¿El saldo es suficiente? (Esto se valida en el **Servicio**, nunca en el middleware de ruta).

### Validación con Esquemas (Zod)
Zod permite declarar esquemas tipados que descartan automáticamente propiedades inyectadas no declaradas (*mass assignment* protection):

```javascript
// schemas/usuarioSchema.js
import { z } from 'zod';

export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().trim().email('Formato de correo electrónico inválido'),
  edad: z.number().int().min(18, 'Debe ser mayor de edad')
});
```

### Middleware Genérico de Validación
```javascript
// middlewares/validar.js
export const validar = (schema, target = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[target]);
  if (!result.success) {
    const detalles = result.error.issues.map((issue) => ({
      campo: issue.path.join('.'),
      mensaje: issue.message
    }));

    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Datos de entrada inválidos',
      detalles
    });
  }

  // Asignar exclusivamente los datos validados y limpios (descarta claves extra inyectadas)
  req[target] = result.data;
  next();
};
```

### Formato Canónico de Error de Validación (HTTP 400 o 422)
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Datos de entrada inválidos",
  "detalles": [
    { "campo": "email", "mensaje": "Formato de correo electrónico inválido" },
    { "campo": "edad", "mensaje": "Debe ser mayor de edad" }
  ]
}
```

---

## 8. Clasificación de Errores: Operacionales vs Bugs

| Criterio | Errores Operacionales (4xx) | Errores de Programación / Bugs (500) |
|---|---|---|
| **Naturaleza** | Esperados en el uso normal de la API. | Inesperados; fallos en el código o infraestructura. |
| **Ejemplos** | 404 No encontrado, 400 Validación, 401 Sin token, 409 Cédula duplicada. | `Cannot read property of undefined`, error de sintaxis SQL, promesa no capturada. |
| **Respuesta** | Código HTTP exacto y mensaje amigable para el usuario. | HTTP 500 genérico; nunca revelar detalles internos ni base de datos al cliente. |
| **Tratamiento** | Se lanzan como `AppError` en servicios o middlewares. | Se registran en logs con stack trace para depuración inmediata. |

---

## 9. Jerarquía de Errores Propios (`AppError`)

Los servicios lanzan excepciones tipadas (`throw new NotFoundError(...)`); son 100 % desacoplados de `res` y de Express.

```javascript
// utils/errors.js
export class AppError extends Error {
  constructor(status, message, code = 'APP_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(recurso = 'Recurso') {
    super(404, `${recurso} no encontrado`, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message, detalles = []) {
    super(400, message, 'VALIDATION_ERROR');
    this.detalles = detalles;
  }
}

export class ConflictError extends AppError {
  constructor(message = 'El recurso ya existe o genera conflicto') {
    super(409, message, 'CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Acceso no autorizado') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Permisos insuficientes') {
    super(403, message, 'FORBIDDEN');
  }
}
```

---

## 10. Errores Asíncronos: Express 4 vs Express 5

### En Express 4 (Requisito Estricto)
En Express 4, una promesa rechazada que no se capture dentro de un `try/catch` deja la petición colgada o tumba el proceso Node.js (`unhandledRejection`). Se debe envolver la ruta con un helper `asyncHandler` o usar `try/catch` llamando a `next(err)`:

```javascript
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Uso en rutas:
router.get('/:id', asyncHandler(async (req, res) => {
  const data = await miServicio.obtener(req.params.id);
  res.json(data);
}));
```

### En Express 5
Express 5 atrapa automáticamente los rechazos de funciones `async` y los remite a `next(err)` sin necesidad de envoltorios.

---

## 11. El Manejador Centralizado de Errores (`errorHandler`)

El manejador de errores se coloca **al final de `src/app.js`**, después de todas las rutas y del manejador 404. Express lo reconoce **únicamente por sus 4 parámetros**: `(err, req, res, next)`.

```javascript
// middlewares/errorHandler.js
import { AppError } from '../utils/errors.js';

export function errorHandler(err, req, res, next) {
  // 1. Error operacional propio (AppError / subclases)
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      ...(err.detalles ? { detalles: err.detalles } : {})
    });
  }

  // 2. Error de validación Zod
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Datos de entrada inválidos',
      detalles: err.issues?.map(i => ({ campo: i.path.join('.'), mensaje: i.message }))
    });
  }

  // 3. Error de base de datos PostgreSQL / Sequelize (Duplicados)
  if (err?.name === 'SequelizeUniqueConstraintError' || err?.code === '23505') {
    return res.status(409).json({
      error: 'DUPLICADO',
      message: 'El registro ya existe en el sistema.'
    });
  }

  // 4. Error de clave foránea en base de datos
  if (err?.name === 'SequelizeForeignKeyConstraintError' || err?.code === '23503') {
    return res.status(400).json({
      error: 'REFERENCIA_INVALIDA',
      message: 'El registro referenciado no existe.'
    });
  }

  // 5. Bug inesperado (Error de programación / 500)
  console.error('[Error 500 Inesperado]:', err);

  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: isProd ? 'Ocurrió un error interno en el servidor.' : err.message,
    ...(!isProd && { stack: err.stack })
  });
}
```

> 🔒 **Seguridad Crítica:** **NUNCA** envíes `err.stack` ni mensajes de error SQL directos al cliente en producción; revelan rutas de archivos, versiones de paquetes y estructura interna de la base de datos.

---

## 12. Checklist de Buenas Prácticas de Middlewares y Errores

1. ✅ **Seguridad primero:** `helmet`, `cors`, `rateLimit` y `compression` registrados antes de cualquier ruta o parseo.
2. ✅ **Parseo antes de rutas:** `express.json()` configurado antes de montar los enrutadores.
3. ✅ **Validación en el borde:** `params`, `query` y `body` validados con esquemas declarativos antes del controlador.
4. ✅ **Controladores limpios:** El controlador delega la lógica de negocio al servicio y solo coordina HTTP.
5. ✅ **Servicios con `AppError`:** Los servicios lanzan excepciones tipadas (`throw new NotFoundError()`) en vez de manipular `res`.
6. ✅ **Manejador 404:** Antes del `errorHandler`, captura rutas no encontradas y responde 404 con formato JSON uniforme.
7. ✅ **Manejador de error con 4 parámetros:** `(err, req, res, next)` ubicado al final de `src/app.js`.
8. ✅ **Protección del stack trace:** `err.stack` nunca expuesto en entornos de producción.
9. ✅ **Captura de caídas globales:** El proceso principal (`index.js` / `server.js`) escucha `unhandledRejection` y `uncaughtException` para registrar y reiniciar de forma controlada.

