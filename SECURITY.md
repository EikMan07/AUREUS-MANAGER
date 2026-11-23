# Política de Seguridad — AUREUS MANAGER

## Versiones Compatibles
| Versión | Soportada | Estado |
| :--- | :--- | :--- |
| 1.0.x | :white_check_mark: | Activa / Endurecida (Fases 1, 2 y 3) |

---

## Directrices de Seguridad del Sistema

### 1. Autenticación Dual y Sesiones Endurecidas
- **Credenciales Locales con Protección Anti-Enumeración**: El acceso con usuario o correo utiliza `bcryptjs` y ejecuta comparación contra un hash ficticio (`DUMMY_BCRYPT_HASH`) en tiempo constante cuando la cuenta no existe o carece de contraseña local (`password_hash IS NULL`), respondiendo siempre un `401` genérico para evitar enumeración de usuarios.
- **Inicio de Sesión Social OAuth 2.0 y OpenID Connect (Patrón BFF)**:
  - Integración oficial con **Google (OpenID Connect)** y **GitHub (OAuth 2.0)** usando exclusivamente el flujo **Authorization Code + PKCE (`S256`)**; los flujos obsoletos `Implicit` y `ROPC` están prohibidos.
  - Los parámetros `state` criptográfico (`crypto.randomBytes(32)`), `nonce` obligatorio en Google y `code_verifier` PKCE se almacenan en una cookie efímera de un solo uso de 10 minutos (`oauth_tx` en desarrollo, `__Host-oauth_tx` en producción) cifrada y autenticada con **AES-256-GCM** (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` en producción) y verificada en tiempo constante mediante `crypto.timingSafeEqual`.
  - **Validación de Identidad Externa**: El ID Token de Google se verifica criptográficamente contra el JWKS oficial (`https://www.googleapis.com/oauth2/v3/certs`) con `jose` exigiendo `RS256`, `iss`, `aud`, `exp`, `nonce` y `email_verified === true`. En GitHub (`scope: read:user user:email`) se exige un correo con `verified === true`. El ID Token externo se consume solo para identificar al usuario y **nunca** autoriza endpoints propios.
  - **Aislamiento de Roles en OAuth**: Toda cuenta creada vía Google o GitHub recibe estrictamente `rol = 'COBRADOR'` y `password_hash = NULL`. La cuenta única `ADMINISTRADOR` rechaza cualquier vinculación o ingreso social y permanece restringida a acceso local.
  - Ningún token de Google, GitHub ni JWT de sesión se expone en parámetros de URL, `localStorage` ni `sessionStorage`.
- **Sesiones en Cookies `HttpOnly` con Revocación Inmediata**:
  - Toda sesión activa emite un JWT `HS256` propio con claims explícitos `iss` y `aud`, almacenado exclusivamente en cookie `HttpOnly` (`sid` en desarrollo, `__Host-sid` en producción con `Secure=true` y `SameSite=Lax`).
  - Ventana deslizante de **25 minutos por inactividad** combinada con un **tope máximo absoluto de 12 horas** (`SESSION_MAX_HOURS`).
  - Cada petición autenticada verifica `usuarios.token_version` y `estado_cuenta === 'ACTIVA'` contra PostgreSQL, garantizando revocación inmediata al cerrar sesión, cambiar contraseña o suspender la cuenta.

### 2. Defensa Anti-CSRF en 3 Capas
Todas las mutaciones (`POST`, `PUT`, `PATCH`, `DELETE`) se protegen mediante tres controles independientes:
1. Cookie de sesión con `SameSite=Lax` (y `Secure` obligatorio en producción).
2. Validación estricta de cabeceras `Origin` y `Referer` contra lista blanca (`getAllowedOrigins()` en `csrf.js`), rechazando con `403 Forbidden` toda petición mutable con cookie que omita ambas cabeceras o provenga de un origen no autorizado.
3. Token criptográfico HMAC enviado en memoria mediante `X-CSRF-Token`, validado en tiempo constante con `crypto.timingSafeEqual`.

### 3. Control de Acceso, Aislamiento y Privacidad (RBAC, IDOR, ABAC, ReBAC)
- **RBAC en Servidor (`roleMiddleware.js`, `adminMiddleware.js`)**: Toda ruta privada encadena `authMiddleware -> requiereRol(...)`. Los endpoints `/api/admin/*` y `/api/admin/crm/*` exigen `rol === 'ADMINISTRADOR'`; las rutas operativas y `/api/crm/*` exigen `rol === 'COBRADOR'`.
- **Cierre Total de IDOR Horizontal**: Ningún controlador confía en identificadores de propietario enviados en `req.body` o `req.query`; toda consulta y mutación deriva el titular exclusivamente desde `req.user.id`.
- **ReBAC en Delegación de Cobros**: Compartir rutas diarias (`/api/compartir/dia`) valida explícitamente la relación activa previa en `contactos_cobradores`, devolviendo `403 Forbidden` ante destinatarios no vinculados.
- **ABAC en RAG Documental**: Los documentos de Séneca se etiquetan por `nivel_acceso` (`PRESTAMISTA` frente a `ADMIN`), impidiendo que un rol recupere fragmentos destinados al otro.
- **Cumplimiento Ley N.° 8968 y Redacción de PII**: Enmascaramiento automático de datos personales en logs y auditoría (`piiRedactor.js`), separación absoluta entre el administrador y las carteras de deudores, consentimiento legal versionado y exportación ARCO (`/api/auth/exportar-datos`).

### 4. Endurecimiento HTTP, Limitación de Tasa y Base de Datos
- **Cabeceras de Seguridad y CORS**: `helmet` activo con política CSP (incluyendo `https://lh3.googleusercontent.com` y `https://avatars.githubusercontent.com` en `imgSrc` para avatares), `HSTS` en producción, `x-powered-by` deshabilitado, `trust proxy = 1`, CORS restringido a orígenes explícitos con credenciales y endpoint `/api/health` mínimo sin metadatos internos. Las trazas de error detalladas nunca se exponen fuera de desarrollo.
- **Limitación de Tasa y Bloqueo Progresivo Persistente**: `express-rate-limit` (`rateLimiters.js`) protege login, registro, cambio de contraseña, flujos OAuth y tráfico global `/api`. Adicionalmente, el inicio de sesión local aplica bloqueo progresivo persistente en PostgreSQL (`intentos_fallidos`, `bloqueado_hasta`: 5, 8 y 10 fallos bloquean 5, 15 y 30 minutos respectivamente) con reinicio automático al autenticarse correctamente.
- **Endpoints `GET` Estrictamente de Solo Lectura**: Ninguna ruta `GET` ejecuta escrituras ni DDL; el aprovisionamiento inicial corre en el arranque del servidor y la retención de bitácora junto con la purga de papelera vencida (> 30 días) se ejecutan mediante tareas programadas diarias (`node-cron`).
- **Base de Datos y Mínimo Privilegio**: Consultas parametrizadas con Sequelize y `pg`, bitácora protegida contra alteraciones mediante trigger, cero contraseñas hardcodeadas en semillas (`ADMIN_INITIAL_PASSWORD` desde entorno) y script `backend/sql/06_rol_minimo_privilegio.sql` para aprovisionar en producción el rol dedicado `aureus_app` (`NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`).
- **Gobernanza de Secretos e IA**: Todas las llaves (`DATABASE_URL`, `JWT_SECRET`, `CSRF_SECRET`, `GROQ_API_KEY`, credenciales OAuth y cuenta de servicio de Google Drive) viven exclusivamente fuera del control de versiones. Séneca opera en estricto modo de solo lectura y nunca ejecuta mutaciones transaccionales en la base de datos.

---

## Reporte Responsable de Vulnerabilidades
Si detectas una posible vulnerabilidad o fallo de seguridad en **AUREUS MANAGER**:
1. No abras un issue público en GitHub.
2. Comunícate directamente con el equipo administrador del repositorio describiendo el vector y los pasos de reproducción.
3. Se confirmará la recepción en un plazo máximo de 48 horas junto con el plan de mitigación.
