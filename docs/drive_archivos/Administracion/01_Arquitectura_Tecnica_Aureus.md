# Arquitectura Tecnica de Aureus Manager

Documento exclusivo para personal con rol ADMINISTRADOR. Prohibida su exposicion a cuentas COBRADOR o prestamistas externos.

## 1. Pila Tecnologica Oficial

- Backend: Node.js en modo ESM con Express 5 como capa HTTP y middlewares estrictos de seguridad.
- Base de Datos y ORM: PostgreSQL 18 (`cobro_firme_db`) accedido mediante pool nativo `pg` para consultas vectoriales/analiticas y Sequelize ORM para modelos relacionales.
- Frontend: React con Vite y react-router-dom ejecutando contexto de autenticacion estrictamente en memoria (prohibido usar localStorage o sessionStorage para sesiones).
- Proveedor de IA: Groq API con modelo `openai/gpt-oss-120b` consumido exclusivamente desde el servidor backend con Streaming SSE.
- Almacenamiento Documental Externo: Google Drive API (`googleapis`) autenticado mediante cuenta de servicio en el backend.

## 2. Seguridad, Sesiones y Defensa CSRF

1. **Cookies HttpOnly Reforzadas**: La sesion se emite mediante JWT firmado almacenado en cookie `sid` en desarrollo y `__Host-sid` en produccion, siempre con banderas `HttpOnly`, `SameSite=Lax` y alcance host-only sin atributo `Domain`.
2. **Proteccion de Rutas Privadas**: Todo endpoint de negocio bajo `/api/seneca` y rutas privadas valida la sesion mediante `authMiddleware.js`, respondiendo HTTP 401 ante cualquier peticion no autenticada.
3. **Control de Acceso Basado en Roles (RBAC)**: El middleware `soloAdminRag` valida exclusivamente `req.user.rol === 'ADMINISTRADOR'` y retorna HTTP 403 frente a cuentas `COBRADOR` en rutas de subida, borrado, configuracion Drive, sincronizacion y cambio de plan.
4. **Defensa CSRF en Capas**: Validacion de origen en metodos mutables y verificacion obligatoria de token HMAC en cabecera `X-CSRF-Token`.
5. **Expiracion Deslizante por Inactividad**: Toda sesion caduca automaticamente tras 25 minutos sin actividad.

## 3. Arquitectura RAG Segregada y Motor Determinista

- Las tablas `empresas_rag`, `documentos_rag` y `fragmentos_rag` almacenan metadatos, vectores `DOUBLE PRECISION[]` y etiquetas de seguridad `nivel_acceso` (`PRESTAMISTA` o `ADMIN`) junto con `ruta_carpeta`.
- `drive.service.js` escanea de forma recursiva las subcarpetas configuradas en Google Drive (`Prestamistas/` y `Administracion/`), clasifica cada archivo segun su ruta y mantiene sincronia con limpieza automatica de documentos eliminados o heredados.
- `embeddings.service.js` ejecuta el filtrado RBAC directamente en SQL mediante `AND d.nivel_acceso = ANY($2::varchar[])`, garantizando que ningun fragmento `ADMIN` sea recuperado por un `COBRADOR`.
- `senecaCalculos.service.js` intercepta preguntas de calculo financiero o aritmetico y resuelve ecuaciones de forma determinista sobre datos reales en PostgreSQL sin usar `eval` ni `new Function`.
