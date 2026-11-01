# Política de Seguridad — COBRO-FIRME

## Versiones Compatibles
| Versión | Soportada | Estado |
| :--- | :--- | :--- |
| 1.0.x | :white_check_mark: | Activa / En Desarrollo |

---

## Directrices de Seguridad del Sistema

### 1. Gestión de Secretos y Credenciales
- **Cero almacenamiento en Git**: Ningún archivo `.env`, contraseña, clave privada o cadena de conexión se confirma en el repositorio.
- **Variables de entorno estrictas**: Todas las configuraciones sensibles (`DATABASE_URL`, puertos, claves de sesión) se configuran mediante variables de entorno locales gestionadas por `dotenv`.
- **Plantillas públicas**: Se provee únicamente `.env.example` con valores de muestra ficticios.

### 2. Capa de Base de Datos y Persistencia (PostgreSQL)
- **Consultas Parametrizadas**: Todas las consultas ejecutadas con `pg` (`node-postgres`) utilizan marcadores posicionales (`$1`, `$2`, ...) para neutralizar cualquier vector de inyección SQL (SQLi).
- **Aislamiento por Cobrador (RLS)**: El esquema de base de datos incorpora políticas de seguridad a nivel de fila (`Row Level Security`) para garantizar que cada cobrador visualice exclusivamente su cartera.
- **Bitácora Inmutable**: La tabla `bitacora_actividad` cuenta con un trigger que impide actualizaciones (`UPDATE`) o eliminaciones (`DELETE`), garantizando una pista de auditoría inalterable.
- **Validación de Cédulas**: Validación a nivel de esquema con expresiones regulares (`CHECK (cedula ~ '^[0-9]{9}$')`).

### 3. Comunicaciones y Red
- **Políticas CORS**: El backend restringe el origen de solicitudes en entornos productivos.
- **Proxy Inverso en Desarrollo**: Vite redirige solicitudes `/api` al backend local para evitar exposición innecesaria de puertos entre navegadores.

---

## Reporte Responsable de Vulnerabilidades
Si detectas una posible vulnerabilidad o fallo de seguridad en COBRO-FIRME:
1. No abras un issue público en GitHub.
2. Comunícate directamente con el administrador del repositorio describiendo el vector de ataque y los pasos para su reproducción.
3. Se confirmará la recepción en un plazo máximo de 48 horas con el plan de mitigación.
