# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added
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
- **Marca y Presentación**: Renombrado de marca en la barra superior de `COBROCLARO` a `COBRO-FIRME`.
- **Frontend conectado en tiempo real**: Sustitución de almacenamiento mock local por capa de servicios `api.js` y `dbService` sincronizada con PostgreSQL.
- **Navegación extendida**: Activación e integración completa de los módulos de Cobros, Clientes y Préstamos en la barra de navegación inferior.
- **Estandarización de inputs**: Buscadores con `placeholder=""` limpio y campos numéricos editables inicializados en cero o Ninguno.
- **Validaciones UX unificadas**: Resaltado visual en rojo de recuadros con datos incompletos (`form-input-error`) y alertas ejecutivas formales (`AlertModal`).

### Fixed
- **Eliminación total de datos ficticios**: Remoción de arrays estáticos de demostración (`María Rodríguez Solís`, `Carlos Mora Valverde`, etc.) y purga de bases locales heredadas (`CobroClaroDB`).
- **Valores iniciales limpios**: Tarjetas financieras en `₡0` y contadores de cartera en `0 clientes` cuando la base de datos no contiene registros.
- **Protección contra valores nulos en formateadores**: Manejo seguro de apellidos nulos en cálculo de iniciales de clientes (`getInitials`).
- **Control de superposición de modales**: Fondo difuminado de pantalla completa (`100dvh`) en el selector de fecha sin cortes por scroll.
- **Bloqueo de duplicados en clientes**: Detección preventiva de repetición en número de teléfono y cédula al registrar o editar.

### Security
- Inyección de parámetros segura en todas las consultas SQL mediante sentencias preparadas de `pg`.
- Variables de entorno (`.env`) excluidas del control de versiones con plantilla `.env.example`.
- Bitácora inmutable de auditoría para todas las operaciones sobre clientes y cobros.
