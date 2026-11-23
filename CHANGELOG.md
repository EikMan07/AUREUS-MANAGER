# Changelog — AUREUS MANAGER

Todos los cambios notables de **Aureus Manager** serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Security
- **oauth (Fase 3):** Implementación completa de inicio de sesión social con **Google (OpenID Connect, verificación JWKS `RS256` con `jose`)** y **GitHub (OAuth 2.0 con verificación de correo `verified === true`)** bajo flujo estricto **Authorization Code + PKCE (`S256`)** en patrón BFF. Incluye tabla `cuentas_oauth` (`07_oauth_google_github.sql`), `usuarios.password_hash` nullable, cookie efímera cifrada `AES-256-GCM` (`oauth_tx` / `__Host-oauth_tx`), `oauthRateLimiter`, aislamiento de cuentas nuevas en rol `COBRADOR`, bloqueo de acceso social sobre `ADMINISTRADOR`, blindaje de `login`/`cambiarPassword` ante `password_hash IS NULL` y actualización de CSP `imgSrc` para avatares de Google y GitHub.
- **rate-limit & rebac (Fase 2):** Integración de `express-rate-limit` (`rateLimiters.js`), bloqueo progresivo persistente en PostgreSQL (`intentos_fallidos`, `bloqueado_hasta` en `05_seguridad_fase2.sql`), comparación en tiempo constante (`DUMMY_BCRYPT_HASH`) anti-enumeración, endurecimiento de `verificarOrigen` rechazando con `403` mutaciones con cookie sin `Origin`/`Referer`, control ReBAC en `contactos_cobradores` al delegar cobros, conversión de todos los endpoints `GET` a solo lectura puro con `node-cron` diario en `server.js` y script `06_rol_minimo_privilegio.sql` para rol `aureus_app`.
- **rbac & hardening (Fase 1):** Cierre integral de IDOR horizontal derivando el titular desde `req.user.id`, columna `usuarios.token_version` (`04_seguridad_fase1.sql`) para revocación inmediata de sesiones, tope máximo absoluto de 12 horas sobre ventana deslizante de 25 min, claims JWT `iss`/`aud`/`HS256`, `roleMiddleware.js` (`authMiddleware -> requiereRol(...)`), `helmet` con CSP y HSTS, CORS con lista blanca estricta, `/api/health` mínimo, ocultamiento de detalles de error fuera de desarrollo y retiro de contraseñas literales en `seedService.js`.
- **auth, privacy & consent:** Sesiones en cookies `HttpOnly` (`sid` / `__Host-sid`, `SameSite=Lax`), defensa Anti-CSRF en 3 capas (`X-CSRF-Token` HMAC + `timingSafeEqual`), consentimiento legal Ley N.° 8968 (`CookieConsentBanner.jsx`, `MandatoryConsentModal.jsx`, `/api/auth/consentimiento`, `/api/auth/exportar-datos`), enmascaramiento PII (`piiRedactor.js`) y sanitización de placeholders y registros de gobernanza.

### Added
- **oauth-ui:** Botones ejecutivos **`Continuar con Google`** y **`Continuar con GitHub`** con iconos vectoriales SVG inline en `LoginPage.jsx` (adaptados a Modo Claro y Modo Oscuro Azul Noche), validación previa de aceptación de cookies, manejo limpio de `?oauth_error=...` y traducciones completas (`es`, `en`, `pt`, `fr`) en `AccessibilityContext.jsx`.
- **crm-dual:** Nuevo **CRM Dual con IA** (`03_crm_aureus.sql`, `crm.controller.js`, `crmAdmin.controller.js`, `crmIa.service.js`, modelos `Crm*`, `CrmPrestamistaDashboard.jsx`, `AdminCrmDashboard.jsx`): CRM Crediticio de 7 etapas para prestamistas (`/api/crm/*`) con conversión a cliente y cerebro IA configurable, más CRM Comercial y gestor de campañas en 8 pasos para administración (`/api/admin/crm/*`).
- **seneca-rag:** Integración de **Séneca IA + RAG Multiformato** (`012_rag_google_drive.sql`, `drive.service.js`, `extraccion.service.js`, `embeddings.service.js`, `rag/fragmentar.js`, `rag/indexar.js`, `jobs/sincronizar-drive.js`, `ragController.js`, `useChatRag.js`) con sincronización de Google Drive API v3, soporte `.pdf`, `.docx`, `.csv`, `.md`, `.json` y `.txt`, streaming SSE con Groq (`openai/gpt-oss-120b`), segregación estricta por rol (`PRESTAMISTA` vs `ADMIN`) y motor determinista de ecuaciones (`senecaCalculos.service.js`).
- **admin:** Panel Administrativo Exclusivo (`/admin`, `AdminDashboardPage.jsx`, `/api/admin/*`) desvinculado de carteras privadas de deudores conforme a la Ley N.° 8968, con gestión de prestamistas, depuración de antecedentes y auditoría ejecutiva paginada con retención automática (30 días / 200 registros, `04_retencion_bitacora_auditoria.sql`).
- **profile, landing & core modules:** Perfil Ejecutivo de tres pestañas (`UserProfileModal.jsx`), `AccessibilityContext.jsx` (4 tamaños tipográficos, 4 idiomas, 7 filtros SVG), Portal Web Informativo (`LandingPage.jsx`), 6 módulos operativos de cobros/clientes/préstamos/resumen/lista negra/papelera 30 días, delegación de cobros, detector de historial permanente, OCR multi-ángulo, consulta Hacienda CR y pantallas HTTP 4xx.

### Changed
- **brand & navigation:** Homologación oficial de identidad hacia **Aureus Manager**, menú simétrico arrastrable (`BottomNav.jsx`), cápsulas escénicas animadas y diseño ejecutivo dual Claro Marfil / Azul Noche.

### Fixed
- **login, hooks & ci:** Blindaje de inputs y `-webkit-autofill` en `/login`, orden incondicional de React Hooks en todos los componentes, eliminación de escrituras secundarias en endpoints `GET` y compatibilidad `CRLF`/`LF` en `.github/governance-pack/verificar-pack.mjs`.

### Documentation
- **docs:** Sincronización completa de `README.md`, `SECURITY.md`, `CHANGELOG.md`, `AGENTS.md`, `docs/adr/0001..0003` y `docs/gobernanza/*` con validación al 100 % en el Governance Pack.
