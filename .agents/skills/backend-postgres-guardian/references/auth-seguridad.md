# Autenticación y Seguridad (JWT en Cookie Segura + bcrypt + CSRF + AuthContext)

## Contenido
1. Requisitos del proyecto
2. Contraseñas con bcrypt
3. JWT en Cookie Segura y Expiración Deslizante (25 min)
4. Protección Anti-CSRF en Capas
5. Middleware de Autenticación
6. Endpoints Clave de Sesión (/login, /yo, /logout)
7. Front end: AuthContext y Restauración de Sesión (sin localStorage)
8. Relaciones y validaciones (400 / 404)
9. Listados con datos relacionados
10. Fuera de alcance
11. Checklist de seguridad actualizado

---

## 1. Requisitos del proyecto

- **Contraseñas cifradas con bcrypt** (o `bcryptjs`). Nunca en texto plano ni devueltas en respuestas JSON.
- **JWT almacenado en cookie reforzada**: `HttpOnly`, `Secure`, `SameSite=Lax` (o `Strict`), `Path=/` y sin atributo `Domain` (host-only). En producción utiliza el prefijo `__Host-sid`.
- **Clave secreta en `.env`** (`JWT_SECRET`), nunca escrita en el código fuente.
- **La sesión expira a los 25 minutos sin interacción**: Se implementa expiración deslizante (*sliding expiration*). Cada petición autenticada re-emite la cookie con un `maxAge` renovado de 25 minutos.
- **Middleware de autenticación**: Revisa prioritariamente la cookie segura; acepta `Authorization: Bearer <token>` únicamente como respaldo para clientes no-navegador (pruebas, scripts). Si el token falta, es inválido o expiró, responde **401 Unauthorized**. Exige algoritmos explícitos (`algorithms: ['HS256']`).
- **Restauración transparente de sesión**: Al recargar la página (F5), el frontend llama a `GET /auth/yo` con credenciales incluidas. Si la cookie sigue vigente, la sesión se restaura de inmediato sin pedir credenciales nuevamente.
- **Cierre de sesión seguro**: `POST /auth/logout` elimina la cookie mediante `res.clearCookie` pasando las mismas opciones estructurales.
- **Protección CSRF en profundidad**: Combinación de `SameSite`, verificación del encabezado `Origin`/`Referer` y token HMAC transmitido en el encabezado `X-CSRF-Token` para peticiones que modifican estado.
- **Frontend sin almacenamiento inseguro**: El token vive en la cookie inaccesible para scripts (`HttpOnly`). En la memoria de React (`AuthContext`) únicamente residen el perfil del usuario autenticado y el token CSRF. **Prohibido `localStorage` o `sessionStorage` para datos de sesión**.

---

## 2. Contraseñas con bcrypt

- Paquete: `bcryptjs` (JavaScript puro) o `bcrypt`.
- Se cifra con un **hook `beforeSave`** del modelo `Usuario` cuando `changed('password')`. Ningún controlador debe cifrar manualmente.
- Costo (`SALT_ROUNDS`): 10 a 12.
- **Ocultamiento estricto del hash**: `defaultScope` excluye `password`, `toJSON()` lo elimina de cualquier serialización, y solo el proceso de login utiliza `Usuario.scope('conPassword')`.
- Columna `password` como `STRING(255)`. Validación de longitud mínima de 8 caracteres.
- Login: Mensaje genérico uniforme (`Credenciales inválidas`, 401) tanto cuando el correo no existe como cuando la contraseña no coincide. Nunca revela la existencia previa de un correo.

---

## 3. JWT en Cookie Segura y Expiración Deslizante (25 min)

### 3.1 Emisión y Opciones de la Cookie
La gestión de la cookie de sesión se centraliza en `src/utils/cookies.js`:
- En producción: Nombre `__Host-sid`, `secure: true`, `path: '/'`, sin `domain`.
- En desarrollo: Nombre `sid`, `secure: false` (o `true` si se prueba en HTTPS/localhost), `path: '/'`.
- `httpOnly: true`: JavaScript no puede acceder a `document.cookie`.
- `sameSite: 'lax'` (o `'strict'`).
- `maxAge: 25 * 60 * 1000` (25 minutos en milisegundos).

### 3.2 Expiración Deslizante (Sliding Expiration)
1. **Login:** El usuario se autentica; el backend emite la cookie con `maxAge: 25m` y genera el JWT con `expiresIn: '25m'`.
2. **Peticiones Activas:** Con cada petición que pasa por `authMiddleware`, el servidor re-emite la cookie (`Set-Cookie`) con el temporizador reiniciado a 25 minutos.
3. **Inactividad:** Si transcurren 25 minutos sin que el usuario realice ninguna acción o petición, la cookie caduca y el JWT expira. La siguiente petición recibirá un **401 Unauthorized** con código `TOKEN_EXPIRADO`.
4. **Cierre en el Front:** Al recibir 401, el cliente HTTP limpia el estado en memoria y redirige al usuario a la pantalla de login con el mensaje: *"Tu sesión expiró por inactividad. Inicia sesión de nuevo."*

---

## 4. Protección Anti-CSRF en Capas

Debido a que las cookies viajan de forma automática con las peticiones del navegador, se implementa una defensa integral de tres capas:

1. **Capa de Transporte (Cookie SameSite):** `SameSite=Lax` evita el envío de cookies en peticiones cruzadas disparadas por imágenes, iframes o formularios de terceros.
2. **Capa de Verificación de Origen (`verificarOrigen`):** En todos los métodos mutables (`POST`, `PUT`, `PATCH`, `DELETE`), el backend comprueba que `req.headers.origin` coincida exactamente con la variable de entorno `FRONTEND_URL`. Si no coincide, bloquea con **403 Forbidden** (`ORIGEN_NO_PERMITIDO`).
3. **Capa de Token Criptográfico (`verificarCsrf`):**
   - El backend genera un token HMAC basado en el ID del usuario, una marca temporal y el secreto `CSRF_SECRET`.
   - Se entrega al frontend en la respuesta de `/auth/login` y `/auth/yo`.
   - El frontend lo envía en el encabezado `X-CSRF-Token` en cada petición no idempotente.
   - El middleware verifica la firma y valida que no haya expirado usando comparación en tiempo constante (`crypto.timingSafeEqual`).

---

## 5. Middleware de Autenticación

`src/middlewares/authMiddleware.js`:
1. **Extracción de la credencial:**
   - Prioridad 1: Cookie de sesión (`req.cookies[getCookieName()]`).
   - Prioridad 2: Encabezado `Authorization: Bearer <token>` (para soporte de herramientas CLI y scripts externos).
2. **Validación Criptográfica:**
   - Ejecuta `jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })`.
   - Si no existe el token o la firma falla, devuelve **401 Unauthorized** con `codigo: 'TOKEN_AUSENTE'`, `'TOKEN_INVALIDO'` o `'TOKEN_EXPIRADO'`.
3. **Inyección de Contexto y Renovación Deslizante:**
   - Inyecta `req.usuario = { id: payload.id, email: payload.email }`.
   - Si la petición llegó con cookie, renueva la cookie de sesión emitiendo un nuevo `Set-Cookie` con `maxAge` de 25 minutos.

---

## 6. Endpoints Clave de Sesión

### 6.1 `POST /auth/login`
- Valida credenciales contra `Usuario.scope('conPassword')`.
- Firma el JWT con `expiresIn: '25m'`.
- Establece la cookie HttpOnly mediante `setCookieSesion(res, token)`.
- Genera el token CSRF para el cliente.
- **Responde con código 200 y JSON:**
  ```json
  {
    "mensaje": "Inicio de sesión exitoso",
    "usuario": { "id": "uuid", "nombre": "...", "email": "..." },
    "csrfToken": "1731278400000.a1b2c3..."
  }
  ```
  *(Nota crítica: El JWT **nunca** se incluye en el cuerpo de la respuesta JSON).*

### 6.2 `GET /auth/yo` (Protegido por `authMiddleware`)
- Permite al frontend validar si la cookie actual sigue activa tras una recarga de página (F5) o al reabrir el navegador.
- Genera un token CSRF fresco.
- Responde con `{ usuario: req.usuario, csrfToken }`.

### 6.3 `POST /auth/logout` (Protegido por `authMiddleware` y `verificarCsrf`)
- Destruye la cookie en el navegador ejecutando `clearCookieSesion(res)`.
- Responde con `{ mensaje: 'Sesión cerrada exitosamente' }`.

---

## 7. Front end: AuthContext y Restauración de Sesión (sin localStorage)

### Componentes en `assets/templates/frontend/`:
- `apiClient.template.js`:
  - Configurado con `credentials: 'include'`.
  - Inyecta automáticamente el encabezado `X-CSRF-Token` en métodos `POST`, `PUT`, `PATCH`, `DELETE`.
  - Captura respuestas 401 para notificar al contexto de autenticación la expiración de sesión.
- `AuthContext.template.jsx`:
  - Maneja estado en memoria: `usuario`, `csrfToken`, `autenticado`, `cargando`.
  - **Restauración en montura (`useEffect` inicial):** Ejecuta `apiClient.get('/auth/yo')`. Si la cookie existe y es válida, recupera al usuario y el token CSRF, pasando `cargando` a `false`. Si falla con 401, limpia la sesión sin emitir alertas invasivas.
  - Temporizador de inactividad de 25 minutos en cliente sincronizado con eventos del usuario (`mousemove`, `keydown`, `scroll`, etc.).
- `PrivateRoute.template.jsx`:
  - Si `cargando` es `true`, muestra un indicador visual o pantalla neutra ("Verificando sesión...").
  - Si no está autenticado tras la carga, redirige a `/login`.
- `Login.template.jsx`:
  - Si `cargando` es `true`, espera antes de evaluar redirecciones.
  - Si `autenticado` es `true`, redirige directamente a la pantalla principal.

---

## 8. Relaciones y validaciones (400 / 404)

- Al crear o actualizar un registro relacionado, se verifica que la entidad referenciada exista (400 si es dato del cuerpo inválido, 404 si la entidad de la URL no existe).
- Validaciones en backend con mensajes claros sobre campos obligatorios, tipos y valores únicos.
- Códigos: `200` OK, `201` Creado, `204` Sin contenido, `400` Validación/solicitud incorrecta, `401` No autenticado, `403` Prohibido (CSRF / Origen), `404` No encontrado, `409` Conflicto, `500` Error interno.
- Whitelist explícita de campos siempre; nunca `Model.create(req.body)` a ciegas.

---

## 9. Listados con datos relacionados

- Los listados incluyen entidades relacionadas mediante `include` de Sequelize en una sola consulta estructurada, evitando el problema de consultas N+1 y acotando los atributos devueltos.

---

## 10. Fuera de alcance

- **Roles y permisos complejos:** Basta distinguir entre usuario autenticado y no autenticado. No agregar tablas o columnas de roles salvo solicitud expresa del usuario.

---

## 11. Checklist de Seguridad Actualizado

- [ ] `.env` en `.gitignore` y plantilla `.env.example` completa (sin contraseñas reales).
- [ ] `JWT_SECRET`, `JWT_EXPIRES_IN=25m` y `CSRF_SECRET` definidos en `.env`.
- [ ] Cookie de sesión configurada con `httpOnly: true`, `sameSite: 'lax'` (o `'strict'`), `path: '/'` y sin atributo `Domain`.
- [ ] En producción (`NODE_ENV=production`), cookie nombrada con el prefijo obligatorio `__Host-sid` y bandera `secure: true`.
- [ ] Validación fail-fast en `utils/cookies.js` al arrancar el servidor ante combinaciones inseguras de flags.
- [ ] El JWT **nunca** se retorna en el cuerpo JSON de respuestas en `/auth/login` o `/auth/registro`.
- [ ] Expiración deslizante implementada re-emitiendo la cookie con nuevo `maxAge` en peticiones autenticadas.
- [ ] `authMiddleware` con verificación estricta de algoritmo (`algorithms: ['HS256']`).
- [ ] `cors` configurado con `credentials: true` y `origin` explícito coincidente con `FRONTEND_URL` (PROHIBIDO `*`).
- [ ] Middleware `verificarOrigen` para métodos `POST`, `PUT`, `PATCH`, `DELETE` verificando cabecera `Origin`/`Referer`.
- [ ] Middleware `verificarCsrf` validando cabecera `X-CSRF-Token` mediante `crypto.timingSafeEqual`.
- [ ] Endpoint `GET /auth/yo` funcional para restaurar sesión al recargar la página (F5).
- [ ] Endpoint `POST /auth/logout` que destruye la cookie mediante `res.clearCookie` con opciones coincidentes.
- [ ] Frontend: `apiClient` con `credentials: 'include'` y envío automático de `X-CSRF-Token`.
- [ ] Frontend: Cero uso de `localStorage` o `sessionStorage` para guardar tokens o credenciales.
- [ ] Frontend: `PrivateRoute` y `Login` respetan el estado `cargando` durante la verificación inicial de sesión.
