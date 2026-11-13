# Manejo de Sesiones en Cookies Seguras y Reforzadas (Express + JWT + React)

Este documento establece la arquitectura y las directrices obligatorias para almacenar tokens de sesión (JWT) en cookies reforzadas dentro de aplicaciones Node.js, Express y React.

---

## 1. Atributos de una Cookie de Sesión Segura y su Razón Técnica

Una cookie de sesión no debe tratarse como un contenedor de datos ordinario, sino como una credencial de autenticación crítica que viaja en el protocolo HTTP. Para garantizar confidencialidad e integridad, debe emitirse con la combinación de directivas recomendadas por OWASP (ASVS y WSTG) y los estándares de la IETF (RFC 6265bis).

```http
Set-Cookie: __Host-sid=eyJhbGciOiJIUzI1NiIsInR5c...; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=1500
```

### 1.1 `HttpOnly`
- **Definición:** Instruye al navegador de que la cookie no debe ser accesible a través de APIs de scripts del lado del cliente (`document.cookie`, Web Workers, etc.).
- **Razón técnica:** Mitiga el impacto de vulnerabilidades de Cross-Site Scripting (XSS). Si un atacante logra inyectar código JavaScript malicioso en la aplicación, no podrá exfiltrar directamente la cadena del token de sesión hacia sus propios servidores.
- **Referencia normativa:** OWASP ASVS v4.0.3 (Capítulo V3: Session Management Verification Requirements, ítem 3.4.1) y OWASP WSTG-SESS-02.

### 1.2 `Secure`
- **Definición:** Ordena al navegador que transmita la cookie **únicamente** sobre canales cifrados mediante TLS/HTTPS.
- **Razón técnica:** Impide la interceptación del token en texto plano ante ataques de Man-in-the-Middle (MitM) en redes no confiables o Wi-Fi públicas.
- **Excepción de `localhost` (RFC 6265bis / W3C Secure Contexts):** Los navegadores modernos clasifican `http://localhost` y `http://127.0.0.1` como "orígenes potencialmente confiables" (*secure contexts*). Esto permite que en desarrollo local sobre `localhost` se puedan aceptar cookies con la bandera `Secure` sin necesidad de certificados TLS locales. Sin embargo, para entornos de pruebas en red local (IPs privadas `192.168.x.x`), los navegadores rechazarán cookies marcadas con `Secure` si no viajan por HTTPS.
- **Referencia normativa:** RFC 6265bis § 5.3.6 y MDN Web Docs ("Set-Cookie: Secure").

### 1.3 `SameSite` (`Strict` vs `Lax` vs `None`)
Controla si la cookie debe retenerse o adjuntarse automáticamente en peticiones que se originan desde sitios externos (*cross-site*).

| Valor | Comportamiento | Cuándo usarlo |
|---|---|---|
| `SameSite=Strict` | La cookie **nunca** se envía en peticiones cross-site, ni siquiera cuando el usuario pulsa un hipervínculo ordinario desde un sitio externo (ej. enlace en un correo o chat). | Paneles de máxima sensibilidad donde los usuarios nunca llegan por enlaces externos profundos (banca, portales de administración crítica). |
| `SameSite=Lax` | La cookie se retiene en peticiones cross-site de sub-recursos (imágenes, formularios POST, peticiones fetch/XHR), pero **sí se envía** en navegaciones seguras de nivel superior (GET) iniciadas por el usuario al hacer clic en un enlace externo. | Aplicaciones SaaS, portales web corporativos y paneles comerciales donde se desea que el usuario mantenga su sesión al hacer clic en un enlace entrante. |
| `SameSite=None` | La cookie se adjunta en todas las peticiones cross-site. **Requiere obligatoriamente `Secure`**. Si falta `Secure`, el navegador descarta la cookie. | Widgets embebidos en iframes de terceros o APIs públicas consumidas desde dominios totalmente ajenos. **Prohibido para sesiones principales de este proyecto.** |

- **Referencia normativa:** RFC 6265bis § 5.3.7 y OWASP CSRF Prevention Cheat Sheet.

### 1.4 `Path=/` y Ausencia de `Domain` (Host-Only Cookies)
- **`Path=/`:** Garantiza que la cookie esté disponible en todas las rutas del servidor y es un requisito obligatorio cuando se utilizan prefijos de seguridad.
- **Sin atributo `Domain`:** Al omitir deliberadamente el atributo `Domain`, la cookie se convierte en una **cookie de solo host** (*host-only cookie*). La cookie solo se enviará al host exacto que la emitió (por ejemplo, `api.midominio.com`) y los navegadores **no la compartirán** con subdominios hermanos (`vulnerable.midominio.com`) ni con el dominio padre (`midominio.com`).
- **Peligro de definir `Domain`:** Si se configura `Domain=midominio.com`, cualquier subdominio comprometido podría tener visibilidad o sobreescribir la cookie.
- **Referencia normativa:** RFC 6265bis § 4.1.2.3 y OWASP WSTG-SESS-02.

### 1.5 Prefijos de Nombre de Cookie: `__Host-` vs `__Secure-`
Los prefijos de cookies son mecanismos reforzados por el navegador que impiden que servidores mal configurados o subdominios hostiles violen las propiedades estructurales de la cookie. Si el nombre comienza con el prefijo, el navegador evalúa reglas estrictas antes de aceptarla:

| Prefijo | Requisitos Obligatorios para que el Navegador la Acepte | Protección Brindada |
|---|---|---|
| `__Host-` | 1. Debe incluir `Secure`.<br>2. Debe enviarse desde un origen seguro (HTTPS).<br>3. **NO debe incluir el atributo `Domain`**.<br>4. Debe incluir `Path=/`. | Máxima protección. Evita *cookie tossing* y *session fixation* provocados por subdominios hermanos comprometidos. Es la opción recomendada para tokens de sesión en producción. |
| `__Secure-` | 1. Debe incluir `Secure`.<br>2. Debe enviarse desde un origen seguro (HTTPS). | Garantiza que no viaje en HTTP claro, pero permite definir `Domain` y cualquier `Path`. |

---

## 2. Configuración en Desarrollo vs Producción

Para permitir fluidez en el desarrollo local y máxima rigurosidad en producción sin comprometer la seguridad, se adopta la siguiente convención:

```js
// Configuración dinámica en utils/cookies.js
const isProd = process.env.NODE_ENV === 'production';

// En producción se exige el prefijo __Host- para fijar la cookie al host y exigir HTTPS.
// En desarrollo se usa un nombre sin prefijo (ej. 'sid') si se trabaja sobre HTTP simple.
const COOKIE_NAME = isProd ? '__Host-sid' : (process.env.COOKIE_NAME || 'sid');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd || process.env.COOKIE_SECURE === 'true',
  sameSite: (process.env.COOKIE_SAMESITE || 'lax').toLowerCase(),
  path: '/',
  // NO se define 'domain' para forzar comportamiento Host-Only
};
```

### Validación al Iniciar el Servidor (Fail-Fast)
El módulo `utils/cookies.js` valida combinaciones incompatibles o inseguras durante el arranque del backend:
1. Si `NODE_ENV === 'production'` y `secure` es `false`, el servidor debe abortar el arranque arrojando un error fatal.
2. Si `sameSite === 'none'` y `secure` es `false`, el servidor aborta el arranque porque los navegadores rechazan inmediatamente dicha cookie.
3. Si el nombre de la cookie comienza con `__Host-` y `secure` es `false`, el servidor aborta el arranque.

---

## 3. Protección CSRF en Capas (Defensa en Profundidad)

El uso de cookies de sesión introduce la necesidad de blindar la API contra peticiones falsificadas en sitios cruzados (CSRF). No se debe confiar en una sola barrera; se aplica el modelo de defensa en capas recomendado por OWASP:

```
[ Petición Entrante (POST / PUT / PATCH / DELETE) ]
                      │
                      ▼
 ┌────────────────────────────────────────────────────────┐
 │ Capa 1: Navegador & Cookie SameSite=Lax / Strict       │
 │ Retiene la cookie en contextos cross-site.             │
 └────────────────────────────┬───────────────────────────┘
                              │
                              ▼
 ┌────────────────────────────────────────────────────────┐
 │ Capa 2: Verificación de Cabeceras Estándar             │
 │ Inspecciona 'Origin' (o 'Referer'). Debe coincidir con │
 │ FRONTEND_URL. Rechaza con 403 si proviene de otro web. │
 └────────────────────────────┬───────────────────────────┘
                              │
                              ▼
 ┌────────────────────────────────────────────────────────┐
 │ Capa 3: Token Anti-CSRF Firmado (HMAC) en Cabecera     │
 │ Exige cabecera personalizada 'X-CSRF-Token'.           │
 │ Valida firma HMAC criptográfica con timingSafeEqual.   │
 └────────────────────────────┬───────────────────────────┘
                              │
                              ▼
           [ Ejecutar Controlador de Negocio ]
```

### Capa 1: Atributo `SameSite=Lax` o `Strict`
El navegador omite la cookie en envíos cruzados desde sitios de terceros.

### Capa 2: Middleware de Verificación de `Origin` / `Referer`
Para todos los métodos que alteran estado (`POST`, `PUT`, `PATCH`, `DELETE`):
- Se extrae el encabezado `req.headers.origin` (o en su defecto `req.headers.referer`).
- Se compara contra la URL autorizada del frontend (`process.env.FRONTEND_URL`).
- Si el origen no coincide o está ausente en peticiones de navegadores, se responde inmediatamente con código **403 Forbidden** (`codigo: 'ORIGEN_NO_PERMITIDO'`).

### Capa 3: Token Anti-CSRF Basado en HMAC (Double Submit Criptográfico)
Para aplicaciones Single Page Application (SPA), las peticiones mutables deben adjuntar un token en el encabezado HTTP personalizado `X-CSRF-Token`.
- **Generación:** Al autenticarse (`/auth/login`) o verificar sesión (`/auth/yo`), el backend calcula un token HMAC:
  ```js
  const timestamp = Date.now();
  const datos = `${usuarioId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', process.env.CSRF_SECRET).update(datos).digest('hex');
  const csrfToken = `${timestamp}.${hmac}`;
  ```
- **Almacenamiento en el Cliente:** El frontend recibe `csrfToken` en la respuesta JSON y lo guarda **únicamente en memoria** dentro del contexto de React (`AuthContext`).
- **Envío:** El cliente HTTP (`apiClient.js`) adjunta automáticamente `headers['X-CSRF-Token'] = csrfToken` en peticiones `POST`, `PUT`, `PATCH` y `DELETE`.
- **Validación en el Servidor:**
  1. Se verifica que el token no haya expirado (vigencia sincronizada con la sesión).
  2. Se reconstruye el HMAC esperado utilizando `req.usuario.id`, el `timestamp` y `process.env.CSRF_SECRET`.
  3. Se compara el hash recibido con el hash esperado utilizando comparación en tiempo constante: `crypto.timingSafeEqual(Buffer.from(hmacRecibido), Buffer.from(hmacEsperado))`.
  4. Si no coincide o falta la cabecera, se responde con código **403 Forbidden** (`codigo: 'CSRF_TOKEN_INVALIDO'`).

---

## 4. CORS con Credenciales (Cross-Origin Resource Sharing)

Cuando el frontend y el backend residen en orígenes distintos (por ejemplo, frontend en `http://localhost:5173` y backend en `http://localhost:5000`), el envío de cookies requiere configuración estricta.

### Reglas Obligatorias de CORS:
1. **`credentials: true`:** Habilita el encabezado `Access-Control-Allow-Credentials: true`.
2. **Origen Explícito y Único (PROHIBIDO `*`):** Cuando `credentials` es `true`, la especificación W3C/MDN prohíbe taxativamente el comodín `*` en `Access-Control-Allow-Origin`. Si se usa `*`, el navegador bloqueará la respuesta con un error de seguridad en la consola.
   ```js
   // app.js
   app.use(cors({
     origin: process.env.FRONTEND_URL, // Ej: 'http://localhost:5173' (NUNCA '*')
     credentials: true,
   }));
   ```
3. **Diferencia entre "Sitio" y "Origen":**
   - *Origen:* Protocolo + Dominio + Puerto (ej. `http://localhost:5173` y `http://localhost:5000` son **orígenes distintos**).
   - *Sitio (eTLD+1):* Dominio registrable más su TLD (ambos son el mismo sitio `localhost`).
   - El navegador aplica las restricciones de CORS a nivel de **origen**. Por lo tanto, aunque sean el mismo sitio local, el cliente `fetch()` **debe** incluir `credentials: 'include'`.

---

## 5. Manejo en Express y `cookie-parser`

### 5.1 Parseo de Cookies Entrantes
Se debe registrar `cookieParser()` en `src/app.js` **antes** del montaje de las rutas y middlewares de autenticación:
```js
const cookieParser = require('cookie-parser');
app.use(cookieParser());
```
Esto puebla el objeto `req.cookies` con las cookies enviadas por el navegador.

### 5.2 Emisión con `res.cookie` (`maxAge` en milisegundos)
En Express, la opción `maxAge` se expresa en **milisegundos** (a diferencia de la cabecera HTTP `Max-Age` que se define en segundos). Para 25 minutos de sesión:
```js
const MAX_AGE_MS = 25 * 60 * 1000; // 1,500,000 ms

res.cookie(COOKIE_NAME, token, {
  ...COOKIE_OPTIONS,
  maxAge: MAX_AGE_MS,
});
```

### 5.3 Borrado con `res.clearCookie` (Exige Opciones Idénticas)
Para que el navegador elimine con éxito una cookie existente, `res.clearCookie` debe invocarse pasando **exactamente los mismos parámetros estructurales** (`path`, `domain`, `secure`, `sameSite`) utilizados al crearla:
```js
// Si las opciones no coinciden exactamente, el navegador ignorará la orden de borrado.
res.clearCookie(COOKIE_NAME, {
  path: '/',
  secure: COOKIE_OPTIONS.secure,
  sameSite: COOKIE_OPTIONS.sameSite,
  httpOnly: true,
});
```

---

## 6. Límites Honestos de Seguridad y Compromisos de Diseño

Como ingenieros de seguridad, es vital distinguir entre las protecciones reales de una directiva y las falsas sensaciones de seguridad:

### 6.1 Qué NO resuelve `HttpOnly` ante un ataque XSS
- **Mito:** *"Con HttpOnly mi aplicación es inmune al robo de sesiones por XSS"*.
- **Realidad Técnica:** `HttpOnly` impide que el script atacante lea el valor literal de la cookie mediante `document.cookie` para exfiltrarlo a un servidor externo.
- **Vulnerabilidad remanente (*Session Riding* / Ejecución en contexto):** Si un atacante inyecta JavaScript malicioso en la página, no necesita leer la cookie. El script atacante puede invocar `fetch('/api/cuentas/transferir', { method: 'POST', body: ... })` directamente desde el navegador de la víctima. El navegador **adjuntará automáticamente la cookie `HttpOnly`** a esa petición.
- **Conclusión:** `HttpOnly` frena la persistencia del robo fuera del navegador de la víctima, pero la única defensa real contra el abuso de sesión en caliente es prevenir el XSS mediante sanitización de entradas, escape contextual en plantillas React y directivas de Content Security Policy (CSP).

### 6.2 Límites de Revocación de un JWT sin Estado (Stateless JWT)
- **El dilema de la arquitectura:** Por definición, un JWT es autocontenido y se valida mediante firma criptográfica sin consultar una base de datos central en cada petición.
- **Consecuencia:** Cuando el usuario hace "Cerrar sesión", el servidor ejecuta `res.clearCookie()`, lo que destruye la cookie en el navegador del usuario legítimo. Sin embargo, si ese JWT fue copiado o interceptado antes de cerrar sesión, **el token seguirá siendo criptográficamente válido ante el backend hasta que transcurra su tiempo de vida (`exp`)**.
- **Soluciones y compromisos:**
  - *Opción adoptada (Estándar del proyecto):* Mantener la ventana de exposición reducida (ventana deslizante de 25 minutos). Al no haber interacción, el token expira rápidamente por sí mismo.
  - *Opción con estado (si el negocio requiere revocación instantánea):* Implementar una lista de revocación (denylist) en Redis o una columna `token_version` en la tabla `usuarios` de PostgreSQL. Esto introduce consultas a la base de datos, sacrificando la naturaleza estrictamente *stateless* del JWT.

---

## 7. Verificación Técnica de la Configuración

Para comprobar que las cookies y cabeceras están correctamente configuradas:

### 7.1 En las Herramientas de Desarrollo del Navegador (DevTools)
1. Abre **DevTools (F12) → Pestaña Application (Aplicación) → Storage → Cookies**.
2. Inspecciona la cookie de sesión:
   - Nombre: `__Host-sid` (o `sid` en desarrollo).
   - Columna **HttpOnly**: Debe tener una marca o `true`.
   - Columna **Secure**: Debe tener una marca o `true` (en producción o contextos seguros).
   - Columna **SameSite**: Debe indicar `Lax` o `Strict`.
   - Columna **Path**: Debe indicar estrictamente `/`.
   - Columna **Domain**: Debe coincidir exactamente con el host sin puntos iniciales.

### 7.2 Inspección de Cabeceras mediante cURL
```bash
curl -i -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@empresa.com","password":"PasswordSeguro123"}'
```
Respuesta esperada en cabeceras:
```http
HTTP/1.1 200 OK
Set-Cookie: sid=eyJhbGciOi...; Max-Age=1500; Path=/; HttpOnly; SameSite=Lax
Vary: Origin
Access-Control-Allow-Credentials: true
```
Y el cuerpo JSON de la respuesta **jamás** debe contener el JWT:
```json
{
  "mensaje": "Inicio de sesión exitoso",
  "usuario": { "id": "uuid", "nombre": "...", "email": "..." },
  "csrfToken": "1731278400000.a1b2c3d4..."
}
```

---

## 8. Errores Frecuentes y Cómo Evitarlos

1. **Olvidar `credentials: 'include'` en el cliente `fetch`:** El navegador omitirá silenciosamente la cookie y no procesará las cabeceras `Set-Cookie` en respuestas cross-origin.
2. **Configurar `cors({ origin: '*', credentials: true })`:** Error fatal en navegadores; la petición fallará inmediatamente por violación de especificación CORS.
3. **Disparidad de opciones en `res.clearCookie`:** Si al cerrar sesión se omiten las opciones con las que se creó la cookie (`path`, `sameSite`, `secure`), la cookie permanecerá viva en el navegador.
4. **Devolver el token en el cuerpo JSON del login:** Si se envía la cookie pero además se retorna `{ token: '...' }` en la respuesta JSON, cualquier script con acceso a la respuesta o que lo guarde en memoria anula el propósito de `HttpOnly`.
5. **No validar el origen en peticiones mutables:** Confiar ciegamente en `SameSite` sin verificar la cabecera `Origin` o `Referer` debilita la protección contra ataques desde navegadores antiguos o configuraciones anómalas.

---

## 9. Lista de Fuentes Oficiales Consultadas

La información técnica contenida en este documento fue contrastada y verificada contra fuentes oficiales primarias:

1. **OWASP Application Security Verification Standard (ASVS) v4.0.3:**
   - *Capítulo V3: Session Management Verification Requirements (V3.4 Cookie-based Session Management).*
   - URL: `https://owasp.org/www-project-application-security-verification-standard/`
   - Consulta: 10 de noviembre de 2026.
2. **OWASP Web Security Testing Guide (WSTG) v4.2:**
   - *WSTG-SESS-02: Testing for Cookies Attributes.*
   - URL: `https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/06-Session_Management_Testing/02-Testing_for_Cookies_Attributes`
   - Consulta: 10 de noviembre de 2026.
3. **OWASP Cheat Sheet Series:**
   - *Cross-Site Request Forgery Prevention Cheat Sheet (Defense in Depth, SameSite Attribute, Custom Request Headers).*
   - URL: `https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html`
   - Consulta: 10 de noviembre de 2026.
4. **MDN Web Docs (Mozilla Developer Network):**
   - *Set-Cookie Header Reference (Directivas Secure, HttpOnly, SameSite, Max-Age, Path, Domain, Prefijos `__Host-` y `__Secure-`).*
   - URL: `https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie`
   - Consulta: 10 de noviembre de 2026.
   - *Access-Control-Allow-Credentials & Wildcard Restrictions in CORS.*
   - URL: `https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS`
   - Consulta: 10 de noviembre de 2026.
5. **IETF RFC 6265bis Draft:**
   - *Cookies: HTTP State Management Mechanism (Cookie Prefixes, SameSite attribute, Secure attribute semantics).*
   - URL: `https://datatracker.ietf.org/doc/html/draft-ietf-httpbis-rfc6265bis`
   - Consulta: 10 de noviembre de 2026.
6. **Express.js API Reference (v4.x / v5.x):**
   - *Response methods: `res.cookie(name, value, [options])` y `res.clearCookie(name, [options])`.*
   - URL: `https://expressjs.com/en/api.html#res.cookie`
   - Consulta: 10 de noviembre de 2026.

