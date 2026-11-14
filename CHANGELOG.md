# Changelog — AUREUS MANAGER

Todos los cambios notables de **Aureus Manager** serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Security
- **auth:** Blindaje integral de autenticación mediante Cookies `HttpOnly` (`sid` / `__Host-sid`, `SameSite=Lax`, expiración deslizante de 25 minutos por inactividad), defensa Anti-CSRF con tokens HMAC en memoria (`X-CSRF-Token`, `crypto.timingSafeEqual`) y verificación de `Origin`/`Referer`.
- **privacy:** Sanitización integral de placeholders en registro de cuentas (`LoginPage.jsx`), ejemplos de prompts IA, comentarios técnicos y registros de arquitectura (`docs/adr/`, `docs/gobernanza/`) eliminando nombres propios y datos personales del autor.
- **consent:** Implementación de banner de consentimiento de cookies esenciales de seguridad en primera visita (`CookieConsentBanner.jsx`) y bloqueo estricto de rutas privadas (`PrivateRoutes.jsx`) y endpoints operativos (`401`).

### Added
- **profile & accessibility:** Nuevo Perfil Ejecutivo de tres pestañas (`UserProfileModal.jsx`), endpoints autenticados `PUT /api/auth/perfil` y `PUT /api/auth/password` (`authController.js`, `authRoutes.js`), fotografía cuadrada optimizada en cliente y contexto `AccessibilityContext.jsx` con motor real DOM en dos pasadas para `4` tamaños tipográficos (`pequeno`, `normal`, `grande`, `extra`), `4` idiomas y `7` filtros SVG para daltonismo seguros para `position: fixed`.
- **landing:** Nuevo Portal Web Informativo Ejecutivo (`LandingPage.jsx`) accesible en `/`, `/bienvenida` y `/informacion` con vista previa de métricas, demostración de **Séneca** y modo dual Claro Marfil / Oscuro Azul Noche.
- **seneca:** Integración del asistente consultivo financiero de solo lectura **Séneca** sobre PostgreSQL con Groq (`openai/gpt-oss-120b`), respaldo determinista local, recomendaciones no repetitivas e icono clásico de busto romano.
- **historial:** Implementación del Detector Visual de Historial Permanente (`GET /api/clientes/historial-archivo/consultar`) al registrar clientes nuevos sobre archivo histórico de eliminados definitivos.
- **papelera:** Gestión unificada por cliente en Papelera con respaldo transaccional de préstamos (`prestamos_baneados`) durante 30 días y restauración selectiva.
- **compartir:** Sistema de delegación interactiva de cobros por fecha hacia cobradores vinculados mediante código `CF-XXXXXXXX` con reversión segura.
- **errors:** Pantallas ejecutivas para errores HTTP 4xx (`400`, `401`, `403`, `404`) con recuperación persistente del módulo activo.
- **auth & UX base (`backend/src/models/`, `backend/src/controllers/`, `frontend/src/components/`):**
  - Integración completa de `Sequelize` sobre PostgreSQL 18 con zona horaria `America/Costa_Rica` (`-06:00`).
  - Flujo de inicio de sesión (`/api/auth/login`), registro (`/api/auth/registro`), perfil (`/api/auth/yo`, `/api/auth/perfil`) y cierre de sesión (`/api/auth/logout`) con hash `bcryptjs`.
  - Módulos completos de Cobros, Clientes (con OCR multi-ángulo y consulta Hacienda CR), Préstamos, Resumen Analítico, Lista Negra y Papelera Unificada.
  - Sistema de Cápsulas Escénicas Animadas de `1480ms` (`ConfirmActionStage.jsx`), Centro de Notificaciones persistente y exportación PDF (`pdfCobrosGenerator.js`).

### Changed
- **brand:** Homologación oficial de identidad y documentación pública del repositorio hacia **Aureus Manager** (`README.md`, `SECURITY.md`, `CHANGELOG.md`, `AGENTS.md`, `AureusLogo.jsx` y manifiesto PWA).
- **navigation:** Reestructuración simétrica del menú principal (`BottomNav.jsx`) en disposición `3 | Botón Central | 3` arrastrable y minimizable hacia/desde el centro, con soporte dual Claro Marfil y Azul Noche.
- **modals & forms:** Doble verificación en modales críticos, cálculo reactivo de atrasos acumulados y estandarización de formularios responsivos de `360px` a escritorio.

### Fixed
- **login, topbar & responsive:** Blindaje de estilos y `-webkit-autofill` para inputs transparentes en modo oscuro en `/login` (`LoginPage.jsx`, `index.css`), prevención de falsos avisos de sesión expirada al recargar mediante `{ skipUnauthorizedEvent: true }` en `obtenerSesionActual()` (`apiClient.js`, `AuthContext.jsx`), retiro de toggles Sol/Luna fuera de `Perfil Ejecutivo -> Accesibilidad` (`Header.jsx`, `LoginPage.jsx`, `LandingPage.jsx`) y ajuste móvil del modal de perfil (`responsive.css`).
- **hooks & formatting:** Orden estricto e incondicional de React Hooks antes de retornos tempranos en todos los componentes y modales; saneamiento de nombres (`formatFullName`, `getInitials`); eliminación total de datos ficticios en métricas y detección preventiva de duplicados en clientes.
- **ci:** Normalización de saltos de línea `CRLF`/`LF` en `.github/governance-pack/verificar-pack.mjs` para compatibilidad uniforme en Windows y Linux.

### Documentation
- **gov:** Completa los registros oficiales de gobernanza (`docs/adr/0001..0003`, `docs/adr/README.md`, `docs/gobernanza/inventario-de-datos.md`, `docs/gobernanza/registro-de-riesgos.md`, `AGENTS.md`) con validación al 100% en CI.
- **skills:** Incorporación y actualización de flujos automatizados en `.agents/skills/` (`backend-postgres-guardian`, `frontend-react-structure`, `github-commits`, `repo-docs-updater`, `bitacora-agente`).
