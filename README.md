# AUREUS MANAGER

**Plataforma Ejecutiva de Gestión de Préstamos, Cobros Diarios y Asistencia Financiera con IA**  
*"Tu dinero, tus préstamos y tus operaciones bajo control."*

---

## 1. Arquitectura del Proyecto

El repositorio está estructurado de forma modular y desacoplada en aplicaciones independientes de frontend, servidor backend, gobernanza de arquitectura y automatización:

```text
AUREUS-MANAGER/
├── frontend/                     # Aplicación Web Progresiva (React + Vite + CSS Ejecutivo)
│   ├── public/                   # Logotipos SVG/PNG, manifiesto PWA, Service Worker y máscaras
│   └── src/
│       ├── components/           # Módulos (Cobros, Clientes, Préstamos, Resumen, Lista Negra, Papelera, Séneca, Profile/)
│       ├── context/              # AuthContext.jsx (sesión + 25m), ThemeContext.jsx y AccessibilityContext.jsx
│       ├── pages/
│       │   ├── Landing/          # Portal web informativo ejecutivo (LandingPage.jsx)
│       │   ├── Login/            # Acceso, registro de cuenta y consentimiento de cookies (LoginPage.jsx)
│       │   ├── Dashboard/        # Panel operativo principal de 6 módulos (DashboardPage.jsx)
│       │   └── Errors/           # Pantallas ejecutivas para errores HTTP 4xx (HttpErrorPage.jsx)
│       ├── routes/               # Enrutamiento completo y guardia de rutas privadas (PrivateRoutes.jsx)
│       ├── services/             # Cliente HTTP con cookies y CSRF (apiClient.js, api.js, cedulaLookup.js)
│       ├── styles/               # Hojas responsivas y animaciones
│       └── utils/                # Formateadores de moneda, fechas, teléfonos y generador PDF
├── backend/                      # API REST Segura (Node.js + Express + Sequelize + PostgreSQL)
│   ├── sql/                      # Esquemas DDL relacionales, funciones SQL y diagrama DBML
│   ├── src/
│   │   ├── config/               # Lectura de entorno (env.js) y conexión Pool PostgreSQL (db.js)
│   │   ├── controllers/          # Controladores de auth, cobros, compartir, clientes, préstamos, papelera, Séneca y más
│   │   ├── middlewares/          # authMiddleware.js (HttpOnly), csrf.js (HMAC/Origin), validaciones y errorHandler
│   │   ├── models/               # Modelos Sequelize (Usuario, Cliente, Prestamo, ClienteBaneado, PrestamoBaneado, etc.)
│   │   ├── prompts/              # Prompt de solo lectura y reglas anti-alucinación de Séneca (seneca.prompt.js)
│   │   ├── routes/               # Definición de rutas protegidas de la API REST (/api/*)
│   │   ├── schemas/              # Validación y sanitización de respuestas IA (seneca.schema.js)
│   │   ├── services/             # Integración Groq (groq.service.js), motor local (seneca.service.js), Hacienda y semilla
│   │   └── utils/                # Emisión de cookies HttpOnly (cookies.js) y helpers transaccionales de Papelera
│   ├── .env.example              # Plantilla pública de variables de entorno
│   └── package.json              # Dependencias y scripts del servidor backend
├── .github/                      # Workflows de CI y verificador automático del Governance Pack
├── docs/
│   ├── adr/                      # Registros de Decisiones de Arquitectura (ADR-0001, ADR-0002, ADR-0003)
│   └── gobernanza/               # Inventario de datos personales (Ley 8968) y registro de riesgos (OWASP)
├── AGENTS.md                     # Reglas operativas, de seguridad y arquitectura para agentes de código
├── CHANGELOG.md                  # Registro histórico de cambios bajo Keep a Changelog
├── SECURITY.md                   # Política de seguridad, cookies, CSRF y gobernanza de IA
└── README.md                     # Documentación oficial del proyecto
```

---

## 2. Requisitos Previos, Base de Datos y Puesta en Marcha

### Requisitos Previos
- **Node.js**: v18+ (recomendado v20+)
- **PostgreSQL**: v18 (o compatible) con la base de datos `cobro_firme_db` activa y zona horaria `'America/Costa_Rica'`.
- **Gestor de paquetes**: `npm`.

### Configuración de Base de Datos (`cobro_firme_db`)
1. Asegúrate de que el servicio de PostgreSQL esté en ejecución.
2. Configura la zona horaria oficial de la base de datos:
   ```sql
   ALTER DATABASE cobro_firme_db SET timezone TO 'America/Costa_Rica';
   ```
3. Los scripts de esquema y automatización residen en `backend/sql/`:
   - `01_schema_cobro_firme.sql`: Tipos ENUM, tablas relacionales, índices parciales, restricciones CHECK y políticas de seguridad.
   - `02_automatizacion_historial_cobro_firme.sql`: Funciones de suspensión de préstamos, reactivación, purga y archivo histórico.
   - `Diagrama_ER_CobroFirme.dbml`: Especificación completa del modelo entidad-relación.

### Variables de Entorno del Backend (`backend/.env`)
Copia `backend/.env.example` hacia `backend/.env` y configura tus credenciales locales:

```env
PORT=5000
PUERTO=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cobro_firme_db
JWT_SECRET=tu_clave_secreta_jwt_de_al_menos_32_caracteres_aqui
JWT_EXPIRES_IN=25m
CSRF_SECRET=tu_clave_secreta_csrf_hmac_de_al_menos_32_caracteres_aqui
FRONTEND_URL=http://localhost:5173
COOKIE_SAMESITE=lax
COOKIE_SECURE=false

# Configuración del Agente IA Séneca (Groq)
GROQ_API_KEY=gsk_PEGA_AQUI_TU_API_KEY_DE_GROQ
GROQ_MODEL=openai/gpt-oss-120b
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

Abre en el navegador: `http://localhost:5173` (el proxy de Vite redirige automáticamente las llamadas `/api` hacia `http://localhost:5000` preservando las cookies de sesión).

---

## 3. Endpoints de la API Backend (`/api`)

Todos los endpoints operativos están protegidos mediante `authMiddleware.js` (cookie `HttpOnly` válida) y las rutas mutadoras requieren token Anti-CSRF (`X-CSRF-Token`) y validación estricta de origen.

### Autenticación y Sesión (`/api/auth`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Inicio de sesión con verificación de consentimiento de cookies, `bcrypt`, emisión de cookie `HttpOnly` (`sid` / `__Host-sid`) y token Anti-CSRF. |
| `POST` | `/api/auth/registro` | Registro de nueva cuenta con hash `bcrypt`, generación de código único `CF-XXXXXXXX` y sesión automática. |
| `GET` | `/api/auth/yo` | Verificación y restauración de sesión activa con renovación deslizante de 25 minutos. |
| `GET` | `/api/auth/perfil` | Consulta del perfil autenticado y metadatos de sesión vigentes. |
| `PUT` | `/api/auth/perfil` | Actualización autenticada de datos del perfil ejecutivo y avatar optimizado. |
| `PUT` | `/api/auth/password` | Cambio autenticado de contraseña validando el hash vigente con `bcryptjs`. |
| `POST` | `/api/auth/logout` | Cierre seguro de sesión y limpieza de cookie `HttpOnly`. |

### Salud e Identificación (`/api/health`, `/api/hacienda`, `/api/ocr`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del servidor y verificación de conexión activa a PostgreSQL. |
| `GET` | `/api/hacienda/:cedula` | Consulta tributaria y verificación de morosidad en Hacienda CR. |
| `POST` | `/api/ocr/cedula` | Escaneo multi-ángulo de cédula por fotografía con Worker persistente de Tesseract y `sharp`. |

### Módulo 1 — Cobros y Delegación (`/api/cobros`, `/api/compartir`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/cobros?fecha=YYYY-MM-DD` | Métricas del día, cobros pendientes, registrados y atrasados. |
| `POST` | `/api/cobros/:id/pago` | Registro de pago total o parcial con cálculo de atrasos y moratoria. |
| `POST` | `/api/cobros/:id/pasar` | Reprogramación de fecha con control de colisión semanal (`ACUMULAR` o `CORRER`). |
| `POST` | `/api/cobros/:id/no-pago` | Registro de cuota no pagada y acumulación por modalidad. |
| `GET` | `/api/compartir/personas` | Listado de cobradores vinculados por usuario o código `CF-XXXXXXXX`. |
| `POST` | `/api/compartir/personas` | Vinculación de un cobrador autorizado para delegación operativa. |
| `DELETE` | `/api/compartir/personas/:id` | Desvinculación de un cobrador de la red de delegación. |
| `GET` | `/api/compartir/resumen-dia` | Resumen de cobros disponibles para delegar o ya compartidos en una fecha. |
| `POST` | `/api/compartir/dia` | Delegación interactiva de cobros seleccionados para una fecha. |
| `POST` | `/api/compartir/revertir-dia` | Reversión segura de una delegación diaria hacia el titular original. |

### Módulo 2 — Clientes e Historial Permanente (`/api/clientes`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/clientes` | Directorio de clientes activos ordenados cronológicamente. |
| `GET` | `/api/clientes/historial-archivo/consultar` | Detector de antecedentes en archivo histórico permanente de eliminados definitivos. |
| `POST` | `/api/clientes` | Registro idempotente de clientes nacionales y extranjeros con soporte de teléfono secundario e internacional. |
| `PUT` | `/api/clientes/:id` | Actualización de datos del cliente con control de versión. |
| `POST` | `/api/clientes/:id/papelera` | Envío a papelera por 30 días con respaldo transaccional de préstamos. |
| `POST` | `/api/clientes/:id/lista-negra` | Envío a Lista Negra y suspensión automática de préstamos. |

### Módulo 3 — Préstamos (`/api/prestamos`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/prestamos` | Consulta de préstamos pendientes, registrados y atrasados con su calendario de cuotas. |
| `POST` | `/api/prestamos` | Creación de préstamo desde cero o avanzado con generación automática de agenda. |
| `POST` | `/api/prestamos/:id/renovar` | Renovación de préstamo con nuevo monto, modalidad y reemplazo de cuotas pendientes. |
| `POST` | `/api/prestamos/:id/arreglo` | Reestructuración mediante arreglo de pago con cuota especial. |
| `DELETE` | `/api/prestamos/:id` | Envío individual de préstamo a la Papelera por 30 días. |
| `POST` | `/api/prestamos/eliminar-lote` | Envío por lote de préstamos seleccionados a la Papelera por 30 días. |

### Módulo 4 — Resumen y Analítica (`/api/resumen`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/resumen` | Métricas ejecutivas, efectividad, distribución de clientes y tendencias históricas. |

### Módulo 5 — Lista Negra (`/api/lista-negra`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/lista-negra` | Consulta del registro activo de restricciones crediticias. |
| `POST` | `/api/lista-negra` | Registro directo o traslado de persona con antecedentes a Lista Negra. |
| `DELETE` | `/api/lista-negra/:id` | Retiro de registro de Lista Negra y restauración según corresponda. |

### Módulo 6 — Papelera Unificada 30 Días (`/api/papelera`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/papelera` | Listado agrupado por cliente de clientes y préstamos eliminados con retención de 30 días. |
| `POST` | `/api/papelera/:id/restaurar` | Restauración íntegra de cliente y préstamos asociados desde Papelera. |
| `POST` | `/api/papelera/prestamo/:prestamoId/restaurar` | Restauración individual de un préstamo específico (reactivando al titular si aplica). |
| `DELETE` | `/api/papelera/:id` | Eliminación definitiva de cliente con resguardo en historial permanente. |
| `DELETE` | `/api/papelera/prestamo/:prestamoId` | Eliminación definitiva de préstamo individual con resguardo en historial permanente. |
| `POST` | `/api/papelera/vaciar` | Vaciado completo de la Papelera archivando todos los registros en historial permanente. |

### Agente Informativo de IA — Séneca (`/api/seneca`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/seneca/resumen-rapido` | Métricas rápidas y sugerencias iniciales basadas en la radiografía en vivo de PostgreSQL. |
| `POST` | `/api/seneca/consultar` | Consultas en lenguaje natural de solo lectura conectadas a Groq (`openai/gpt-oss-120b`) con respaldo determinista local. |

### Centro de Notificaciones (`/api/notificaciones`)
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/notificaciones` | Bandejas `Por revisar` y `Revisadas` con persistencia en PostgreSQL. |
| `POST` | `/api/notificaciones/marcar-vista` | Marcado persistente de alertas revisadas por el usuario autenticado. |

---

## 4. Ecosistema de Pantallas y Módulos Integrados

- **Portal Web Informativo (`LandingPage.jsx`)**: Carta de presentación ejecutiva en `/`, `/bienvenida` y `/informacion` con comparativa operativa, recorrido por los 6 módulos, demostración interactiva del asesor Séneca y acceso directo a inicio de sesión o panel operativo.
- **Acceso, Registro y Consentimiento de Cookies (`LoginPage.jsx`, `CookieConsentBanner.jsx`)**: Portal de autenticación con pestañas *"Iniciar sesión"* y *"Crear cuenta"*, aviso obligatorio de cookies esenciales de seguridad en primera visita, validación en memoria Anti-CSRF y bloqueo estricto de rutas privadas (`PrivateRoutes.jsx`).
- **Los 6 Módulos Operativos (`DashboardPage.jsx`)**:
  1. **Cobros**: Tarjetas financieras diarias, calendario con selector semanal/mensual, delegación diaria de rutas entre cobradores (`CompartirCobrosModal.jsx`), exportación PDF y cápsulas escénicas animadas tras cada acción.
  2. **Clientes**: Directorio multi-criterio, escaneo OCR de cédula con `Tesseract` + `sharp`, teléfonos nacionales e internacionales, detector preventivo de historial permanente y doble confirmación.
  3. **Préstamos**: Creación de créditos nuevos o avanzados, renovaciones, arreglos de pago y envío individual o por lote a Papelera.
  4. **Resumen**: Gráficas analíticas interactivas, tasas de efectividad y distribución por estado y modalidad.
  5. **Lista Negra**: Control de restricciones crediticias, consulta preventiva por cédula y administración de motivos.
  6. **Papelera Unificada**: Agrupación inteligente por cliente con retención de 30 días, restauración parcial o total y archivo histórico definitivo.
- **Asesor Financiero IA Séneca (`SenecaAssistantModal.jsx`)**: Panel consultivo de solo lectura accesible desde el icono romano clásico del encabezado, con preguntas recomendadas dinámicas no repetitivas y tarjetas ejecutivas de respuesta.
- **Perfil Ejecutivo y Accesibilidad Persistente (`UserProfileModal.jsx`, `AccessibilityContext.jsx`)**: Modal de tres pestañas (`Información del Perfil`, `Accesibilidad`, `Ajustes del Sistema`) con actualización segura de perfil y contraseña, fotografía cuadrada optimizada en cliente, selección centralizada de **Modo Claro Marfil** (`#F5F3ED` / `#FFFFFF`) y **Modo Oscuro Azul Noche** (`#101C2C` / `#162436`) con acentos en **Dorado Aureus** (`#B69A55` / `#D4B46A`), motor real de `4` tamaños tipográficos (`pequeno`, `normal`, `grande`, `extra`), `4` idiomas y `7` filtros SVG para daltonismo seguros para `position: fixed`.
- **Menú Central Simétrico Minimizable y Arrastrable (`BottomNav.jsx`)**: Barra de navegación simétrica (`3 | Botón Central | 3`) acoplable abajo, a la izquierda o a la derecha con animación bilateral hacia y desde el botón central.
- **Pantallas Ejecutivas de Errores HTTP 4xx (`HttpErrorPage.jsx`)**: Vistas dedicadas para códigos `400`, `401`, `403` y `404` con recuperación determinista hacia la operación del usuario.
