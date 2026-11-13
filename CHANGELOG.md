# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Documentation
- **gov:** completa ADRs, riesgos y AGENTS.md
  Completa la documentación y reglas del Governance Pack para Aureus Manager, asegurando que todos los registros cumplan con el verificador automático en CI y reflejen con precisión la arquitectura actual del proyecto.
  
  Cambios principales:
  - docs/adr/0001-modelo-y-proveedor-de-ia.md: documenta el uso de Groq (openai/gpt-oss-120b) desde el backend con respaldo determinista local en PostgreSQL.
  - docs/adr/0002-que-decide-la-ia.md: establece la separación estricta entre consultas informativas de Séneca y decisiones transaccionales humanas.
  - docs/adr/0003-donde-viven-los-datos.md: detalla la residencia local en cobro_firme_db y minimización de contexto hacia IA conforme a la Ley 8968.
  - docs/adr/README.md: actualiza el índice de decisiones al estado Aceptado.
  - docs/gobernanza/inventario-de-datos.md: registra 5 categorías de datos personales/crediticios y define los datos explícitamente no recolectados.
  - docs/gobernanza/registro-de-riesgos.md: documenta 4 riesgos concretos (OWASP LLM01, LLM09, LLM10 y Ley 8968) con probabilidad, impacto y mitigaciones implementadas.
  - AGENTS.md: define 15 reglas de desarrollo, arquitectura y seguridad propias de Aureus Manager.
  - .github/governance-pack/verificar-pack.mjs: normaliza saltos de línea CRLF/LF para garantizar compatibilidad en Windows y Linux.
  
  Impacto y verificación:
  - Validación local con node .github/governance-pack/verificar-pack.mjs . superada al 100% con 0 errores y 0 avisos.


### Added
- **feat: integra módulos, auth JWT y cápsulas UX**:
  - **Capa ORM Sequelize y Migraciones (`backend/src/models/`, `backend/migrations/`)**:
    - Integración completa de `Sequelize` sobre PostgreSQL 18 con zona horaria `America/Costa_Rica` (`-06:00`) y modelos relacionales (`Usuario`, `Cliente`, `Prestamo`, `AgendaCobro`, `PagoPrestamo`, `HistorialPasarDia`, `RenovacionPrestamo`, `ArregloPago`, `ListaNegra`, `PapeleraCliente`, `Notificacion`, `BitacoraActividad`).
  - **Autenticación JWT y Seguridad (`authController.js`, `authMiddleware.js`, `AuthContext.jsx`)**:
    - Flujo completo de inicio de sesión (`/api/auth/login`), registro (`/api/auth/register`), perfil (`/api/auth/me`) y cierre de sesión con tokens JWT y contraseñas cifradas mediante `bcryptjs`.
    - Vistas dedicadas `LoginPage.jsx` y `RegisterPage.jsx` protegidas con `ProtectedRoute.jsx`.
  - **Módulo 4: Resumen Ejecutivo (`resumenController.js`, `ResumenDashboard.jsx`)**:
    - Panel analítico con métricas financieras en tiempo real, desglose por frecuencias (semanal/quincenal), evolución de cartera y gráficas interactivas.
  - **Módulo 5: Lista Negra (`listaNegraController.js`, `ListaNegraDashboard.jsx`)**:
    - Directorio de control de morosidad y restricciones con buscador en vivo, descripción ejecutiva en el encabezado, registro directo (`NuevoRegistroModal.jsx`), edición (`EditarMotivoModal.jsx`) y restablecimiento de clientes a cartera activa.
  - **Módulo 6: Papelera (`papeleraController.js`, `PapeleraDashboard.jsx`)**:
    - Gestión de clientes eliminados con retención de 30 días, restauración inmediata, vaciado de papelera y eliminación definitiva con cápsula escénica dedicada (`'eliminar_definitivo'`).
  - **Sistema de Cápsulas Escénicas Animadas de `1480ms` (`ConfirmActionStage.jsx`)**:
    - Desmontaje completo de la ventana blanca del modal durante `1480ms` (`1200ms` activo + `280ms` salida) para presentar retroalimentación vectorial SVG animada en todas las confirmaciones críticas:
      - Cobros: `'pago'`, `'pasar'` y `'nopago'`.
      - Clientes: `'editar_cliente'`, `'lista_negra'` y `'eliminar_cliente'`.
      - Préstamos: `'nuevo_prestamo'`, `'eliminar_prestamo_pendiente'`, `'eliminar_prestamo_registrado'` y `'eliminar_prestamo_atrasado'`.
      - Papelera: `'eliminar_definitivo'` (`"Ya se eliminó definitivamente"` — `"Borrado permanente"`).
  - **Centro de Notificaciones y Exportación PDF (`NotificationCenterModal.jsx`, `CompartirCobrosModal.jsx`, `pdfCobrosGenerator.js`)**:
    - Alertas automáticas de cobros del día y préstamos atrasados con sonido Web Audio API y generación de reportes PDF listos para compartir.
- **Arquitectura Monorepo desacoplada**: Estructuración estricta en directorios independientes `frontend/` y `backend/`.
- **Servidor Backend en Node.js + Express**:
  - Conexión mediante `Pool` de `pg` hacia PostgreSQL 18 (`cobro_firme_db`).
  - Configuración automática de zona horaria `America/Costa_Rica` en cada conexión.
  - Semilla técnica mínima: verificación y creación de usuario base `admin` (`estado_cuenta: 'ACTIVA'`, `correo_verificado: true`) sin insertar clientes ni préstamos falsos.
  - Endpoints del Módulo Clientes:
    - `GET /api/clientes`: Directorio de clientes activos ordenados cronológicamente.
    - `POST /api/clientes`: Validación estricta de 9 dígitos numéricos, inserción y registro en `bitacora_actividad` (`CLIENTE_CREADO`).
    - `PUT /api/clientes/:id`: Edición asistida, incremento de versión y auditoría (`CLIENTE_EDITADO`).
    - `POST /api/clientes/:id/papelera`: Traslado a papelera por 30 días, suspensión automática de préstamos (`suspender_prestamos_cliente`) y auditoría (`CLIENTE_A_PAPELERA`).
    - `POST /api/clientes/:id/lista-negra`: Traslado a lista negra, suspensión de préstamos y auditoría (`CLIENTE_A_LISTA_NEGRA`).
  - Endpoints del Módulo Cobros:
    - `GET /api/cobros?fecha=YYYY-MM-DD`: Métricas en vivo (`totalPrestado`, `estaSemana`, `hoy`), listas de cobros `pendientes`, `registrados` y préstamos `atrasados`.
    - `POST /api/cobros/:id/pago`: Registro de pagos en `pagos_prestamo`, actualización de agenda a `REGISTRADO`, deducción de saldo y cálculo de próxima fecha.
    - `POST /api/cobros/:id/pasar`: Reprogramación temporal de fecha, incremento de `veces_pasado` y registro en `historial_pasar_dia`.
    - `POST /api/cobros/:id/no-pago`: Registro de incumplimiento, incremento de mora y pase a `ATRASADO` al superar umbrales (4 semanas / 2 quincenas).
  - Endpoints del Módulo Préstamos:
    - `GET /api/prestamos`: Listado completo de préstamos y cronograma de agenda de cuotas ordenadas cronológicamente.
    - `POST /api/prestamos`: Creación transaccional de préstamo y cálculo automático de agenda según modalidad semanal o quincenal (día 15/fin de mes o cada 2 semanas).
    - `POST /api/prestamos/:id/renovar`: Renovación de condiciones, liquidación de saldo anterior y sustitución de cuotas pendientes.
    - `POST /api/prestamos/:id/arreglo`: Reestructuración mediante cuota especial acordada y reprogramación de días de cobro.
  - Proxy oficial de Hacienda CR:
    - `GET /api/hacienda/:cedula`: Consulta de personas físicas/jurídicas y parseo a Title Case separando los 2 apellidos.
- **Componentes y Vistas del Frontend**:
  - `LoansDirectory`, `LoanCard`, `NewLoanModal`, `RenewLoanModal` y `PaymentAgreementModal`.
  - Búsqueda multi-criterio instantánea por nombre, apellidos, cédula, teléfono (con/sin guion), ubicación y detalles.
  - Selector de fecha propio con navegación mensual y soporte táctil por deslizamiento horizontal (swipe).
- **Archivos de Esquema SQL y Diagramas**:
  - `/backend/sql/01_schema_cobro_firme.sql` (Esquema DDL completo con RLS, triggers y enums).
  - `/backend/sql/02_automatizacion_historial_cobro_firme.sql` (Funciones de suspensión, reactivación, purga y archivo).
  - `/backend/sql/Diagrama_ER_CobroFirme.dbml` (Especificación integral del modelo relacional).

### Changed
- **Doble Verificación y Flujo de Modales**: Incorporación de paso de confirmación en edición de clientes (`ClientFormModal.jsx`), creación de préstamos (`NewLoanModal.jsx`) y registro de pagos/atrasos (`PaymentModal.jsx`, `PassDayModal.jsx`), eliminando alertas estáticas redundantes tras las cápsulas animadas de `1480ms`.
- **Cálculo de Acumulado de Atraso y Semáforo Financiero (`PaymentModal.jsx`, `PassDayModal.jsx`)**: Desglose de cuota del día + atrasos acumulados (`deudaBaseTotal`) con recuadro reactivo que pasa a Verde Dólar positivo (`+₡...`) únicamente cuando `montoDigitado > deudaBaseTotal`.
- **Marca y Presentación**: Renombrado de marca en la barra superior de `COBROCLARO` a `COBRO-FIRME`.
- **Frontend conectado en tiempo real**: Sustitución de almacenamiento mock local por capa de servicios `api.js` y `dbService` sincronizada con PostgreSQL.
- **Navegación extendida de 6 Módulos**: Integración completa de Cobros, Clientes, Préstamos, Resumen, Lista Negra y Papelera en la navegación principal (`BottomNav.jsx`).
- **Estandarización de inputs**: Buscadores con `placeholder=""` limpio y campos numéricos editables inicializados en cero o Ninguno.
- **Validaciones UX unificadas**: Resaltado visual en rojo de recuadros con datos incompletos (`form-input-error`) y alertas ejecutivas formales (`AlertModal`).

### Fixed
- **Orden estricto de React Hooks (`PaymentModal.jsx`, `PassDayModal.jsx`)**: Reubicación de `useState`, `useRef` y `useEffect` antes de cualquier retorno condicional (`if (!isOpen || !client) return null`) para erradicar pantallas en blanco al abrir modales.
- **Saneamiento de nombres de clientes (`formatFullName`)**: Supresión de literales `"null"` o `"undefined"` al concatenar nombres con un solo apellido en todas las tarjetas y modales.
- **Eliminación total de datos ficticios**: Remoción de arrays estáticos de demostración y purga de bases locales heredadas (`CobroClaroDB`).
- **Valores iniciales limpios**: Tarjetas financieras en `₡0` y contadores de cartera en `0 clientes` cuando la base de datos no contiene registros.
- **Protección contra valores nulos en formateadores**: Manejo seguro de apellidos nulos en cálculo de iniciales de clientes (`getInitials`).
- **Control de superposición de modales**: Fondo difuminado de pantalla completa (`100dvh`) en el selector de fecha sin cortes por scroll.
- **Bloqueo de duplicados en clientes**: Detección preventiva de repetición en número de teléfono y cédula al registrar o editar.

### Security
- Autenticación basada en JSON Web Tokens (JWT) con middleware `authMiddleware.js`, hash de contraseñas con `bcryptjs` y protección de cabeceras HTTP mediante `helmet`.
- Inyección de parámetros segura en todas las consultas SQL mediante `Sequelize` y sentencias preparadas de `pg`.
- Variables de entorno (`.env`) y documentos de trabajo internos excluidos del control de versiones en `.gitignore`.
- Bitácora inmutable de auditoría para todas las operaciones sobre clientes y cobros.

### Maintenance
- Incorporación de skills de arquitectura y auditoría en `.agents/skills/` (`backend-postgres-guardian`, `frontend-react-structure`, `github-commits`, `repo-docs-updater`).
- Actualización de `.gitignore` para excluir archivos locales de trabajo y bitácoras internas del repositorio remoto.
