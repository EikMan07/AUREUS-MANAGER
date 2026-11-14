# Política de Seguridad — AUREUS MANAGER

## Versiones Compatibles
| Versión | Soportada | Estado |
| :--- | :--- | :--- |
| 1.0.x | :white_check_mark: | Activa / En Producción |

---

## Directrices de Seguridad del Sistema

### 1. Gestión de Secretos, Autenticación y Sesiones Reforzadas
- **Cookies Seguras `HttpOnly` y JWT**: Toda sesión autenticada emite un JSON Web Token firmado (`HS256`) almacenado exclusivamente en cookies seguras **`HttpOnly`** (`sid` en desarrollo y `__Host-sid` en producción) con atributos `SameSite=Lax`, `Path=/` y expiración deslizante de **25 minutos por inactividad**. Está estrictamente prohibido guardar tokens de sesión en `localStorage` o `sessionStorage`, así como exponer el JWT en respuestas JSON.
- **Defensa Anti-CSRF en 3 Capas**: Todas las mutaciones (`POST`, `PUT`, `PATCH`, `DELETE`) están protegidas mediante:
  1. Atributo `SameSite=Lax` en la cookie de sesión.
  2. Verificación estricta de cabeceras `Origin` y `Referer` contra orígenes autorizados (`verificarOrigen`).
  3. Validación criptográfica de token HMAC enviado en memoria a través de la cabecera `X-CSRF-Token`, comparado en tiempo constante mediante `crypto.timingSafeEqual`.
- **Consentimiento de Cookies y Bloqueo de Rutas Privadas**: El acceso a la operativa exige la aceptación explícita de cookies esenciales de seguridad en primera visita. Las rutas del cliente protegidas con `PrivateRoutes.jsx` y todos los endpoints `/api/*` privados rechazan solicitudes sin sesión verificada devolviendo `401 Unauthorized`.
- **Protección contra Fuerza Bruta (Rate Limiting)**: Limitación de intentos fallidos en inicio de sesión (`10` intentos por ventana de `10` minutos por origen) y control de frecuencia en consultas al asistente IA (`30` consultas por minuto por usuario autenticado).
- **Hash de Contraseñas y Secretos**: Cifrado irreversible de contraseñas con `bcryptjs` tanto en registro (`POST /api/auth/registro`) como en actualización de credenciales (`PUT /api/auth/password`, con verificación previa de la contraseña actual), variables sensibles (`DATABASE_URL`, `JWT_SECRET`, `CSRF_SECRET`, `GROQ_API_KEY`) cargadas exclusivamente desde el entorno del servidor (`dotenv`) y provisión únicamente de plantillas `.env.example` públicas sin credenciales reales.
- **Cero almacenamiento de secretos en Git**: Ningún archivo `.env`, contraseña, clave privada, cadena de conexión ni archivos de notas de desarrollo local se confirman en el repositorio.

### 2. Capa de Base de Datos y Persistencia (PostgreSQL + Sequelize)
- **Consultas Parametrizadas y ORM**: Todas las operaciones en PostgreSQL a través de `Sequelize` y `pg` utilizan enlace de parámetros seguro para neutralizar cualquier vector de inyección SQL (SQLi).
- **Aislamiento por Usuario Autenticado**: Cada consulta filtra estrictamente por el `cobrador_id` extraído de la sesión autenticada en el servidor, reforzado con políticas a nivel de fila (`Row Level Security`) en esquema.
- **Bitácora Inmutable**: La tabla `bitacora_actividad` cuenta con triggers que impiden modificaciones (`UPDATE`) o eliminaciones (`DELETE`), garantizando una pista de auditoría inalterable.
- **Validación de Integridad**: Restricciones de esquema para cédulas (`CHECK (cedula ~ '^[0-9]{9}$')`), códigos únicos de vinculación (`CF-XXXXXXXX`) y respaldo transaccional en Papelera por 30 días antes del archivo permanente.

### 3. Gobernanza de IA (Séneca)
- **Principio de Privilegio Mínimo (Solo Lectura)**: El agente informativo **Séneca** opera exclusivamente con consultas `SELECT` sobre los registros pertenecientes al usuario autenticado. No posee capacidad, rutas ni permisos para ejecutar `INSERT`, `UPDATE` ni `DELETE` sobre saldos, clientes o préstamos; toda transacción exige confirmación humana explícita.
- **Aislamiento de Clave y Datos**: `GROQ_API_KEY` permanece aislada únicamente en el entorno del servidor backend. Las consultas enviadas al proveedor de inferencia omiten contraseñas, hashes, cookies y tokens de seguridad, aplicando además sanitización estricta de salidas en `seneca.schema.js`.

### 4. Comunicaciones y Red
- **Políticas CORS y Validación de Origen**: El servidor configura `cors({ origin: true, credentials: true })`, analiza cookies con `cookie-parser` y valida estrictamente las cabeceras `Origin`/`Referer` mediante `verificarOrigen` antes de procesar las rutas bajo `/api`.
- **Proxy Inverso en Desarrollo**: Vite redirige las solicitudes `/api` al backend local preservando las cookies seguras sin exponer puertos de infraestructura al usuario.

---

## Reporte Responsable de Vulnerabilidades
Si detectas una posible vulnerabilidad o fallo de seguridad en **AUREUS MANAGER**:
1. No abras un issue público en GitHub.
2. Comunícate directamente con el equipo administrador del repositorio describiendo el vector y los pasos de reproducción.
3. Se confirmará la recepción en un plazo máximo de 48 horas junto con el plan de mitigación.
