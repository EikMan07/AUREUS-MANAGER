# COBRO-FIRME

**Plataforma Integral de Gestión de Cartera, Cobros Diarios y Préstamos**  
Diseñada para dispositivos móviles con sincronización en tiempo real sobre PostgreSQL 18 y zona horaria de Costa Rica (`America/Costa_Rica`).

---

## 1. Arquitectura del Proyecto

El repositorio está organizado de forma estricta y desacoplada en dos aplicaciones independientes:

```
Proyecto-Backend/
├── frontend/             # Aplicación Web Móvil (React 18 + Vite + CSS Vanilla)
│   ├── public/           # Archivos estáticos y modelos OCR (eng.traineddata, spa.traineddata)
│   ├── src/              # Componentes, vistas, servicios de API y utilidades
│   ├── package.json      # Dependencias del cliente
│   └── vite.config.js    # Configuración de Vite y proxy /api -> :5000
├── backend/              # Servidor API REST (Node.js + Express + pg)
│   ├── sql/              # Esquemas DDL, triggers de automatización y diagrama DBML
│   ├── src/              # Controladores, rutas, configuración de Pool y servicios
│   ├── .env.example      # Plantilla de variables de entorno
│   └── package.json      # Dependencias del servidor
├── .agents/              # Habilidades y agentes de automatización
├── .github/              # Workflows CI y verificador del Governance Pack
├── docs/                 # ADRs de arquitectura e inventario/riesgos (gobernanza)
├── AGENTS.md             # Reglas operativas y de arquitectura para agentes IA
├── CHANGELOG.md          # Registro de cambios (Keep a Changelog + Conventional Commits)
├── SECURITY.md           # Políticas y directrices de seguridad
└── README.md             # Documentación principal del repositorio
```

---

## 2. Requisitos Previos

- **Node.js**: v18+ (Recomendado v20+)
- **PostgreSQL**: v18 (o compatible) con la base de datos `cobro_firme_db` activa.
- **Herramientas de construcción**: npm o pnpm.

---

## 3. Configuración de Base de Datos (`cobro_firme_db`)

1. Asegúrate de que el servicio de PostgreSQL esté iniciado.
2. La base de datos `cobro_firme_db` cuenta con la zona horaria costarricense:
   ```sql
   ALTER DATABASE cobro_firme_db SET timezone TO 'America/Costa_Rica';
   ```
3. Los scripts de creación y funciones automáticas se encuentran en `/backend/sql/`:
   - `01_schema_cobro_firme.sql`: Definición de tipos ENUM, 19 tablas relacionales, restricciones CHECK de cédula (9 dígitos) y llaves foráneas.
   - `02_automatizacion_historial_cobro_firme.sql`: Funciones de suspensión de préstamos (`suspender_prestamos_cliente`), reactivación y archivo de historial.
   - `Diagrama_ER_CobroFirme.dbml`: Especificación del modelo entidad-relación.

---

## 4. Puesta en Marcha

### Paso 1: Configurar y Arrancar el Backend

```bash
cd backend

# Copiar plantilla de entorno si aún no existe
cp .env.example .env

# Instalar dependencias
npm install

# Iniciar servidor en modo desarrollo (escucha en http://localhost:5000)
npm run dev
```

> **Semilla Técnica Mínima:** Al arrancar, el servidor verifica si existe al menos un usuario en la tabla `usuarios`. Si está vacía, genera automáticamente el usuario base `admin` (`estado_cuenta: 'ACTIVA'`, `correo_verificado: true`) para asociar operaciones. **No se inserta ningún cliente, préstamo ni cobro de prueba.**

### Paso 2: Configurar y Arrancar el Frontend

En una segunda terminal:

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo Vite (escucha en http://localhost:5173)
npm run dev
```

Abre en tu navegador móvil o de escritorio: **`http://localhost:5173`**.

---

## 5. Endpoints de la API Backend

Todos los endpoints responden bajo el prefijo `/api`:

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Autenticación de usuario y emisión de token JWT. |
| `POST` | `/api/auth/register` | Registro de nuevo usuario con cifrado `bcryptjs`. |
| `GET` | `/api/auth/me` | Verificación de sesión activa mediante token JWT. |
| `GET` | `/api/health` | Estado del servicio y verificación de conexión a `cobro_firme_db`. |
| `GET` | `/api/clientes` | Directorio de clientes con `estado = 'ACTIVO'` ordenados por fecha. |
| `POST` | `/api/clientes` | Registro de nuevo cliente con validación estricta de 9 dígitos y auditoría. |
| `PUT` | `/api/clientes/:id` | Actualización de datos del cliente e incremento de versión. |
| `POST` | `/api/clientes/:id/papelera` | Envío a papelera por 30 días y suspensión automática de préstamos. |
| `POST` | `/api/clientes/:id/lista-negra` | Envío a lista negra y suspensión automática de préstamos. |
| `GET` | `/api/hacienda/:cedula` | Proxy a la API oficial de Hacienda CR con formato *Title Case*. |
| `GET` | `/api/cobros?fecha=YYYY-MM-DD` | Métricas reales (`totalPrestado`, `estaSemana`, `hoy`) y listas de cobros. |
| `POST` | `/api/cobros/:id/pago` | Registro de pago, deducción de saldo y programación de próxima cuota. |
| `POST` | `/api/cobros/:id/pasar` | Reprogramación temporal de día e historial de paso de fecha. |
| `POST` | `/api/cobros/:id/no-pago` | Registro de cuota no pagada y cálculo de atraso crítico. |
| `GET` | `/api/prestamos` | Consulta de préstamos activos, atrasados y en acuerdo con su agenda de cuotas. |
| `POST` | `/api/prestamos` | Registro de nuevo préstamo, cálculo del calendario de pagos y generación de agenda. |
| `POST` | `/api/prestamos/:id/renovar` | Renovación de préstamo existente con nuevo monto, cuotas y reemplazo de agenda. |
| `POST` | `/api/prestamos/:id/arreglo` | Reestructuración de préstamo mediante arreglo de pago con cuota especial. |
| `DELETE` | `/api/prestamos/batch` | Eliminación por lote o individual de préstamos seleccionados. |
| `GET` | `/api/resumen` | Métricas ejecutivas de cartera, recaudación y distribución por frecuencia. |
| `GET` | `/api/lista-negra` | Listado de registros activos en Lista Negra y control de restricciones. |
| `GET` | `/api/papelera` | Listado de clientes en Papelera, restauración y eliminación permanente. |
| `GET` | `/api/notificaciones` | Centro de notificaciones de cobros programados y alertas de mora. |

---

## 6. Módulos Integrados (1 al 6)

- **Módulo 1 (Cobros)**:
  - Tarjetas de resumen (`TOTAL PRESTADO`, `ESTA SEMANA`, `HOY`), exportación PDF (`CompartirCobrosModal.jsx`) y pestañas `Pendientes`, `Registrados` y `Atrasados`.
  - Modales de pago, pasar día y no pago con cálculo de acumulado de atrasos y cápsulas escénicas animadas de `1480ms` (`ConfirmActionStage.jsx`).
- **Módulo 2 (Clientes)**:
  - Directorio con búsqueda multi-criterio, OCR de cédula, validación de duplicados, doble verificación al editar y cápsulas escénicas de confirmación (`editar_cliente`, `lista_negra`, `eliminar_cliente`).
- **Módulo 3 (Préstamos)**:
  - Creación, renovación, arreglo de pago y eliminación por categoría (`Pendientes`, `Registrados`, `Atrasados`) con cápsulas escénicas de `1480ms` diferenciadas.
- **Módulo 4 (Resumen)**:
  - Tablero analítico con indicadores de rendimiento, frecuencias de cobro y estado global de cartera.
- **Módulo 5 (Lista Negra)**:
  - Control de morosidad y restricciones para registrar y consultar personas que han incumplido con sus pagos, evitando otorgarles nuevos préstamos.
- **Módulo 6 (Papelera)**:
  - Retención de clientes eliminados por 30 días con opciones de restauración o borrado permanente definitivo (`eliminar_definitivo`).
