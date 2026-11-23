# AUREUS MANAGER

**Plataforma Ejecutiva de Gestión de Préstamos, Cobros Diarios, CRM Dual y Asistencia Financiera con IA**  
*"Tu dinero, tus préstamos y tus operaciones bajo control."*

---

## 1. Los Cuatro Pilares de la Plataforma

1. **Ecosistema Prestamista (6 Módulos Operativos + CRM Crediticio):** Gestión diaria de cobros con delegación segura entre cobradores vinculados, directorio de clientes con escaneo OCR de cédula y consulta tributaria en Hacienda CR, préstamos con renovaciones y arreglos de pago, analítica ejecutiva, lista negra, papelera unificada con respaldo de 30 días y CRM crediticio de 7 etapas con prospección asistida por IA.
2. **Panel Administrativo Exclusivo (`/admin`):** Consola aislada para la cuenta administrativa única, desvinculada de cualquier cartera privada de deudores conforme a la Ley N.° 8968, con gestión de cuentas de prestamistas, auditoría ejecutiva paginada con retención automática (30 días / 200 registros), depuración controlada y CRM Comercial con gestor de campañas en 8 pasos.
3. **Séneca IA con RAG Multiformato Segregado por Roles:** Asistente financiero consultivo de solo lectura potenciado por Groq (`openai/gpt-oss-120b`) con streaming SSE, sincronización de documentos desde Google Drive API v3 (`.pdf`, `.docx`, `.csv`, `.md`, `.json`, `.txt`), aislamiento estricto por rol (`PRESTAMISTA` frente a `ADMIN`), motor determinista de ecuaciones (`senecaCalculos.service.js`) y guardrails técnico y de dominio.
4. **Blindaje Legal y Seguridad Web (Ley N.° 8968 + OAuth 2.0 PKCE + OWASP):** Autenticación dual (credenciales locales con `bcryptjs` y acceso social con Google OIDC / GitHub OAuth 2.0 mediante **Authorization Code + PKCE** en patrón BFF), sesiones en cookies `HttpOnly` con revocación inmediata (`token_version`) y tope de 12 horas, defensa Anti-CSRF en 3 capas, RBAC/ReBAC/ABAC en servidor, limitación de tasa, bloqueo progresivo persistente y derechos ARCO integrados.

---

## 2. Arquitectura del Proyecto

```text
AUREUS-MANAGER/
├── frontend/                     # Aplicación Web Progresiva (React + Vite + CSS Ejecutivo)
│   ├── public/                   # Logotipos SVG/PNG, manifiesto PWA, Service Worker y máscaras
│   └── src/
│       ├── components/
│       │   ├── Admin/            # CRM Comercial y gestor de campañas (AdminCrmDashboard, modales)
│       │   ├── Clients/          # Directorio, OCR y CRM Crediticio (CrmPrestamistaDashboard, CrmCerebroModal)
│       │   ├── Legal/            # Consentimiento Ley N.° 8968 y Centro Legal (LegalGovernanceModal, MandatoryConsentModal)
│       │   ├── Seneca/           # Asistente consultivo Séneca IA y panel RAG (SenecaAssistantModal)
│       │   └── ...               # Cobros, Préstamos, Resumen, Lista Negra, Papelera, Modales, Perfil y Comunes
│       ├── context/              # AuthContext.jsx (sesión en memoria + 25m), ThemeContext.jsx y AccessibilityContext.jsx
│       ├── hooks/                # Custom hooks reutilizables (useChatRag.js, etc.)
│       ├── pages/
│       │   ├── Landing/          # Portal web informativo ejecutivo (LandingPage.jsx)
│       │   ├── Login/            # Acceso local, acceso social Google/GitHub, registro y cookies (LoginPage.jsx)
│       │   ├── Admin/            # Consola Exclusiva del Administrador Único (AdminDashboardPage.jsx)
│       │   ├── Dashboard/        # Panel operativo principal del prestamista (DashboardPage.jsx)
│       │   └── Errors/           # Pantallas ejecutivas para errores HTTP 4xx (HttpErrorPage.jsx)
│       ├── routes/               # Enrutamiento completo y guardia de rutas privadas (PrivateRoutes.jsx)
│       ├── services/             # Cliente HTTP con cookies y CSRF (apiClient.js, api.js, cedulaLookup.js)
│       ├── styles/               # Hojas responsivas y animaciones
│       └── utils/                # Formateadores de moneda, fechas, teléfonos y generador PDF
├── backend/                      # API REST Segura (Node.js + Express ES Modules + Sequelize + PostgreSQL 18)
│   ├── sql/                      # Esquemas DDL, migraciones idempotentes (01..07, 012_rag_google_drive.sql) y rol aureus_app
│   ├── scripts/                  # Utilidades de migración y generación documental
│   ├── src/
│   │   ├── config/               # Pool PostgreSQL (db.js) y configuración Sequelize (sequelize.js)
│   │   ├── controllers/          # auth, oauth, admin, crm, crmAdmin, cobros, compartir, clientes, préstamos, papelera, seneca, rag
│   │   ├── db/                   # Inicialización idempotente de esquema RAG (ragSchema.js)
│   │   ├── jobs/                 # Sincronización programada de Google Drive (sincronizar-drive.js)
│   │   ├── middlewares/          # authMiddleware, roleMiddleware, adminMiddleware, csrf, rateLimiters, ragLimites, errorHandler
│   │   ├── models/               # Modelos Sequelize (Usuario, CuentaOauth, Cliente, Prestamo, modelos CRM, etc.)
│   │   ├── prompts/              # Reglas de solo lectura y anti-alucinación de Séneca (seneca.prompt.js)
│   │   ├── rag/                  # Fragmentación e indexación vectorial (fragmentar.js, indexar.js)
│   │   ├── routes/               # Rutas REST protegidas bajo /api/*
│   │   ├── schemas/              # Validación y sanitización de respuestas IA (seneca.schema.js)
│   │   ├── services/             # oauth.service, crmIa.service, senecaCalculos.service, seneca.service, groq.service, drive.service, embeddings.service, extraccion.service, seedService
│   │   └── utils/                # cookies.js (sid + oauth_tx AES-256-GCM), piiRedactor.js y papeleraHelpers.js
│   ├── .env.example              # Plantilla pública de variables de entorno sin secretos
│   └── package.json              # Dependencias y scripts del servidor backend
├── .github/                      # Workflows de CI y verificador del Governance Pack
├── docs/
│   ├── adr/                      # Registros de Decisiones de Arquitectura (ADR-0001, ADR-0002, ADR-0003)
│   └── gobernanza/               # Cumplimiento Ley N.° 8968, inventario de datos, normativa IA y registro de riesgos
├── AGENTS.md                     # Reglas operativas, de seguridad y arquitectura para agentes de código
├── CHANGELOG.md                  # Registro histórico de cambios bajo Keep a Changelog
├── SECURITY.md                   # Política integral de seguridad, OAuth 2.0 PKCE, CSRF y gobernanza de IA
└── README.md                     # Documentación oficial del proyecto
```

---

## 3. Requisitos Previos, Base de Datos y Puesta en Marcha

### Requisitos Previos
- **Node.js**: v18+ (recomendado v20+)
- **PostgreSQL**: v18 (o compatible con extensión `pgvector`) con la base de datos `cobro_firme_db` activa y zona horaria `'America/Costa_Rica'`.
- **Gestor de paquetes**: `npm`.

### Configuración de Base de Datos (`cobro_firme_db`)
1. Asegúrate de que el servicio de PostgreSQL esté en ejecución.
2. Configura la zona horaria oficial de la base de datos:
   ```sql
   ALTER DATABASE cobro_firme_db SET timezone TO 'America/Costa_Rica';
   ```
3. Los scripts de esquema, migraciones y mínimo privilegio residen en `backend/sql/`:
   - `01_schema_cobro_firme.sql`: Tipos ENUM, tablas relacionales, índices y restricciones CHECK.
   - `02_automatizacion_historial_cobro_firme.sql`: Funciones transaccionales de préstamos, papelera e historial permanente.
   - `03_crm_aureus.sql`: Tablas del CRM Crediticio y CRM Comercial con campañas.
   - `04_retencion_bitacora_auditoria.sql` y `04_seguridad_fase1.sql`: Retención de bitácora, eventos de sesión y `token_version`.
   - `05_seguridad_fase2.sql`: Columnas de bloqueo progresivo persistente (`intentos_fallidos`, `bloqueado_hasta`).
   - `06_rol_minimo_privilegio.sql`: Aprovisionamiento del rol dedicado de mínimo privilegio `aureus_app` para producción.
   - `07_oauth_google_github.sql`: Soporte `password_hash NULL` y tabla `cuentas_oauth`.
   - `012_rag_google_drive.sql`: Esquema vectorial RAG para documentos segregados por rol.

### Variables de Entorno del Backend (`backend/.env`)
Copia `backend/.env.example` hacia `backend/.env` y completa tus valores locales (nunca subas `.env` ni archivos de credenciales a Git):

```env
PORT=5000
PUERTO=5000
# En producción usar el rol de mínimo privilegio aprovisionado con backend/sql/06_rol_minimo_privilegio.sql:
DATABASE_URL=postgresql://aureus_app:CAMBIAR_CLAVE_SEGURA@localhost:5432/cobro_firme_db
JWT_SECRET=tu_clave_secreta_jwt_de_al_menos_32_caracteres_aqui
JWT_ISSUER=aureus-manager-api
JWT_AUDIENCE=aureus-manager-web
JWT_EXPIRES_IN=25m
SESSION_MAX_HOURS=12
CSRF_SECRET=tu_clave_secreta_csrf_hmac_de_al_menos_32_caracteres_aqui
FRONTEND_URL=http://localhost:5173
COOKIE_SAMESITE=lax
COOKIE_SECURE=false
ADMIN_INITIAL_PASSWORD=CAMBIAR_PASSWORD_INICIAL_MIN_10_CHARS

# Límites de frecuencia (express-rate-limit)
RATE_LIMIT_LOGIN_MAX=15
RATE_LIMIT_REGISTER_MAX=10
RATE_LIMIT_PASSWORD_MAX=10
RATE_LIMIT_GLOBAL_MAX=400

# Configuración del Agente IA Séneca (Groq)
GROQ_API_KEY=gsk_xxxxxxxx
GROQ_MODEL=openai/gpt-oss-120b

# Configuración RAG y Google Drive API v3
GOOGLE_APPLICATION_CREDENTIALS=./credenciales/cuenta-servicio.json
GOOGLE_DRIVE_FOLDER_URL=https://drive.google.com/drive/folders/PEGA_AQUI_EL_ENLACE_DE_TU_CARPETA_DRIVE

# OAuth 2.0 y OpenID Connect (Google y GitHub)
OAUTH_BACKEND_URL=http://localhost:5000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
RATE_LIMIT_OAUTH_MAX=30
```

### Arranque en Desarrollo

**Terminal 1 — Backend (puerto `5000`):**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 — Frontend (puerto `5173`):**
```bash
cd frontend
npm install
npm run dev
```

Abre en el navegador `http://localhost:5173` (el proxy de Vite redirige `/api` hacia `http://127.0.0.1:5000` preservando las cookies seguras).

---

## 4. Endpoints de la API Backend (`/api`)

Todos los endpoints privados aplican autenticación mediante `authMiddleware.js` (cookie `HttpOnly` válida y `token_version` vigente en PostgreSQL), autorización explícita por rol (`requiereRol` / `adminMiddleware`) y defensa Anti-CSRF en 3 capas para cualquier mutación.

### Autenticación Local y OAuth 2.0 / OIDC (`/api/auth`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Inicio de sesión local con `bcrypt`, comparación constante anti-enumeración, bloqueo progresivo y emisión de cookie `HttpOnly` + token CSRF. |
| `POST` | `/api/auth/registro` | Registro de cuenta `COBRADOR`, código `CF-XXXXXXXX`, aprovisionamiento RAG y sesión automática. |
| `GET` | `/api/auth/yo` | Restauración de sesión activa (solo lectura) con renovación deslizante de 25 min y tope de 12 h. |
| `GET` | `/api/auth/perfil` | Consulta del perfil autenticado y estado de consentimiento legal. |
| `PUT` | `/api/auth/perfil` | Actualización autenticada de datos del perfil ejecutivo y avatar. |
| `PUT` | `/api/auth/password` | Cambio de contraseña local con incremento de `token_version` (protegido ante cuentas solo OAuth). |
| `POST` | `/api/auth/consentimiento` | Registro formal de aceptación de política de privacidad y Ley N.° 8968. |
| `GET` | `/api/auth/exportar-datos` | Ejercicio del derecho de portabilidad y acceso de datos personales (ARCO). |
| `POST` | `/api/auth/logout` | Cierre de sesión con invalidación inmediata de `token_version` y limpieza de cookie. |
| `GET` | `/api/auth/oauth/proveedores` | Consulta pública de disponibilidad booleana de Google y GitHub sin exponer secretos. |
| `GET` | `/api/auth/oauth/google` | Inicio de flujo Google OIDC con PKCE (`S256`), `state`, `nonce` y cookie efímera `AES-256-GCM`. |
| `GET` | `/api/auth/oauth/google/callback` | Intercambio seguro de código, verificación JWKS `RS256` con `jose` y emisión de sesión propia. |
| `GET` | `/api/auth/oauth/github` | Inicio de flujo GitHub OAuth 2.0 con PKCE (`S256`), `state` y cookie efímera `AES-256-GCM`. |
| `GET` | `/api/auth/oauth/github/callback` | Validación de identidad y correo verificado en GitHub, aislamiento en rol `COBRADOR` y sesión propia. |

### Salud e Identificación (`/api/health`, `/api/hacienda`, `/api/ocr`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado mínimo de disponibilidad y conectividad con PostgreSQL sin revelar detalles internos. |
| `GET` | `/api/hacienda/:cedula` | Consulta tributaria y validación de identidad en Hacienda CR (autenticada). |
| `POST` | `/api/ocr/cedula` | Escaneo multi-ángulo de cédula con Worker persistente de Tesseract y `sharp`. |

### Módulo 1 — Cobros y Delegación (`/api/cobros`, `/api/compartir`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/cobros?fecha=YYYY-MM-DD` | Consulta de solo lectura de métricas diarias, cobros pendientes, registrados y atrasados. |
| `POST` | `/api/cobros/:id/pago` | Registro de pago total o parcial con cálculo de atrasos y moratoria. |
| `POST` | `/api/cobros/:id/pasar` | Reprogramación de fecha con control de colisión semanal (`ACUMULAR` o `CORRER`). |
| `POST` | `/api/cobros/:id/no-pago` | Registro de cuota no pagada y acumulación por modalidad. |
| `GET` | `/api/compartir/personas` | Listado de cobradores vinculados mediante `contactos_cobradores`. |
| `POST` | `/api/compartir/personas` | Vinculación de un cobrador autorizado por usuario o código `CF-XXXXXXXX`. |
| `DELETE` | `/api/compartir/personas/:id` | Desvinculación de un cobrador de la red de delegación. |
| `GET` | `/api/compartir/resumen-dia` | Resumen de cobros disponibles para delegar o ya compartidos en una fecha. |
| `POST` | `/api/compartir/dia` | Delegación validada por ReBAC (`contactos_cobradores`) hacia un cobrador activo vinculado. |
| `POST` | `/api/compartir/revertir-dia` | Reversión segura de una delegación diaria hacia el titular original. |

### Módulo 2 — Clientes e Historial Permanente (`/api/clientes`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/clientes` | Directorio de clientes activos pertenecientes al cobrador autenticado. |
| `GET` | `/api/clientes/historial-archivo/consultar` | Detector preventivo de antecedentes en archivo histórico permanente. |
| `GET` | `/api/clientes/historial-archivo/lista` | Listado de antecedentes archivados y préstamos no finiquitados. |
| `DELETE` | `/api/clientes/historial-archivo/:archivoId` | Eliminación permanente de antecedente completo. |
| `DELETE` | `/api/clientes/historial-archivo/prestamo/:prestamoArchivoId` | Eliminación individual de préstamo archivado con recálculo del antecedente. |
| `POST` | `/api/clientes` | Registro idempotente de clientes nacionales y extranjeros. |
| `PUT` | `/api/clientes/:id` | Actualización de datos del cliente con control de propiedad. |
| `POST` | `/api/clientes/:id/papelera` | Envío a papelera por 30 días con respaldo transaccional de préstamos. |
| `POST` | `/api/clientes/:id/lista-negra` | Envío a Lista Negra y suspensión automática de préstamos. |

### Módulo 3 — Préstamos (`/api/prestamos`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/prestamos` | Consulta de préstamos activos, pagados y atrasados con su calendario de cuotas. |
| `POST` | `/api/prestamos` | Creación de préstamo con generación automática de agenda. |
| `POST` | `/api/prestamos/:id/renovar` | Renovación de préstamo con nuevo monto, modalidad y cuotas. |
| `POST` | `/api/prestamos/:id/arreglo` | Reestructuración mediante arreglo de pago. |
| `DELETE` | `/api/prestamos/:id` | Envío individual de préstamo a Papelera por 30 días. |
| `POST` | `/api/prestamos/eliminar-lote` | Envío por lote de préstamos a Papelera por 30 días. |

### Módulos 4, 5 y 6 — Resumen, Lista Negra, Papelera y Notificaciones
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/resumen` | Métricas ejecutivas, efectividad y tendencias históricas del cobrador. |
| `GET` / `POST` / `DELETE` | `/api/lista-negra` y `/api/lista-negra/:id` | Gestión de restricciones crediticias y retiro controlado. |
| `GET` | `/api/papelera` | Consulta pura de clientes y préstamos en retención de 30 días. |
| `POST` | `/api/papelera/:id/restaurar` y `/api/papelera/prestamo/:prestamoId/restaurar` | Restauración íntegra o selectiva desde Papelera. |
| `DELETE` / `POST` | `/api/papelera/:id`, `/api/papelera/prestamo/:prestamoId`, `/api/papelera/vaciar` | Purga definitiva con archivo histórico permanente. |
| `GET` / `POST` | `/api/notificaciones` y `/api/notificaciones/marcar-vista` | Consulta de notificaciones y marcado persistente de revisión. |

### CRM Crediticio del Prestamista (`/api/crm` — exclusivo `COBRADOR`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` / `POST` | `/api/crm/prospectos` | Listado y registro de prospectos crediticios aislados por `cobrador_id`. |
| `PUT` / `DELETE` | `/api/crm/prospectos/:id` | Edición y eliminación de prospectos propios. |
| `PATCH` | `/api/crm/prospectos/:id/etapa` | Avance entre las 7 etapas del embudo crediticio con registro histórico. |
| `POST` | `/api/crm/prospectos/:id/convertir-cliente` | Conversión controlada de prospecto aprobado a cliente operativo. |
| `POST` | `/api/crm/prospectos/:id/mensaje` | Generación asistida por IA de mensaje personalizado de seguimiento. |
| `PATCH` | `/api/crm/mensajes/:mensajeId/estado` | Actualización del estado de un mensaje generado por IA. |
| `GET` | `/api/crm/embudo` y `/api/crm/atencion` | Métricas de conversión por etapa y bandeja priorizada de atención diaria. |
| `GET` / `PUT` | `/api/crm/cerebro` | Configuración del perfil operativo y tono del asistente comercial del prestamista. |
| `PUT` | `/api/crm/metas` | Definición de metas y alertas por etapa del embudo. |

### Séneca IA y RAG Google Drive (`/api/seneca`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/seneca/resumen-rapido` | Radiografía rápida y sugerencias iniciales basadas en PostgreSQL. |
| `POST` | `/api/seneca/consultar` | Consultas financieras de solo lectura con Groq (`openai/gpt-oss-120b`) y cálculo determinista. |
| `GET` | `/api/seneca/rag/estado` | Estado de solo lectura de documentos indexados, cuota y conexión RAG por rol. |
| `POST` | `/api/seneca/rag/stream` | Respuesta consultiva en streaming SSE combinando RAG segregado por rol y motor de ecuaciones. |
| `POST` / `DELETE` | `/api/seneca/rag/documentos` y `/api/seneca/rag/documentos/:id` | Carga multiformato (`.pdf`, `.docx`, `.csv`, `.md`, `.json`, `.txt`) y retiro de documentos RAG (`ADMINISTRADOR`). |
| `POST` | `/api/seneca/rag/drive/conectar` y `/api/seneca/rag/drive/sincronizar` | Vinculación y sincronización manual con carpeta de Google Drive API v3 (`ADMINISTRADOR`). |
| `PUT` / `PATCH` | `/api/seneca/rag/plan` | Administración de cuota y plan documental RAG (`ADMINISTRADOR`). |

### Panel Administrativo Exclusivo y CRM Comercial (`/api/admin`, `/api/admin/crm` — exclusivo `ADMINISTRADOR`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/admin/resumen` | Métricas globales agregadas de plataforma sin acceso a datos privados de deudores. |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/admin/prestamistas` y `/api/admin/prestamistas/:id` | Administración completa de cuentas de prestamistas (`COBRADOR`). |
| `PATCH` / `POST` | `/api/admin/prestamistas/:id/estado` y `/api/admin/prestamistas/:id/password` | Suspensión/reactivación y restablecimiento administrativo con revocación de sesión. |
| `GET` / `DELETE` | `/api/admin/depuracion/antecedentes` y `/api/admin/depuracion/antecedentes/:targetId` | Resumen y purga administrativa controlada de archivos y papelera. |
| `GET` / `DELETE` | `/api/admin/auditoria` y `/api/admin/auditoria/limpiar` | Auditoría ejecutiva paginada con redacción PII y limpieza bajo retención Ley N.° 8968. |
| `GET` / `POST` / `PUT` / `DELETE` | `/api/admin/crm/prospectos` y `/api/admin/crm/prospectos/:id` | Gestión del embudo comercial de captación de nuevos prestamistas. |
| `PATCH` / `GET` / `POST` | `/api/admin/crm/prospectos/:id/etapa`, `/embudo`, `/atencion`, `/prospectos/:id/mensaje` | Seguimiento de etapas, métricas comerciales y mensajes asistidos por IA. |
| `GET` / `POST` / `PATCH` | `/api/admin/crm/campanas`, `/campanas/:id`, `/campanas/:id/generar-piezas`, `/piezas/:piezaId/estado` | Planificación de campañas comerciales en 8 pasos y generación de piezas con IA. |
