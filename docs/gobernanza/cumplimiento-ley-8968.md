# Cumplimiento de la Ley N.° 8968 de Costa Rica y Reforma (Expediente 25.826)

Este documento certifica la arquitectura técnica y operativa implementada en **Aureus Manager** para cumplir con la **Ley N.° 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales** (PRODHAB, Costa Rica) y los criterios modernos de autodeterminación informativa y gobernanza de datos contemplados en el **Expediente Legislativo N.° 25.826**.

---

## Matriz Verificable de 12 Requisitos de Cumplimiento (Estándar Auditoría FWD)

| # | Requisito Legal y Técnico (Ley 8968 / Exp. 25.826) | Implementación en Aureus Manager | Evidencia Técnica en el Repositorio | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Consentimiento informado con modal ineludible y trazabilidad** | Registro explícito en `/login` y modal de consentimiento informado (`MandatoryConsentModal.jsx`) que no se puede saltar en `/dashboard` hasta que el titular acepta la versión vigente (`v1.0-2026`), guardando fecha y versión en PostgreSQL. | `usuarios.consentimiento_aceptado`, `usuarios.consentimiento_version`, `usuarios.consentimiento_aceptado_en`, `POST /api/auth/consentimiento`, `MandatoryConsentModal.jsx` | Cumplido |
| **2** | **Principio de calidad, exactitud y veracidad del dato** | Validación con esquemas `zod` en cada entrada y consulta opcional de nombre oficial por número de cédula, permitiendo corrección manual inmediata si el padrón externo no responde. | `backend/src/schemas/`, `frontend/src/services/cedulaLookup.js`, `ClientFormModal.jsx` | Cumplido |
| **3** | **Visibilidad estrictamente privada por cuenta (`cobrador_id`)** | Aislamiento total por titular: ningún cliente, préstamo ni registro interno de Lista Negra es público ni accesible por otros usuarios sin delegación explícita por día. | Filtros `WHERE cobrador_id = $1` en `clientesController.js`, `prestamosController.js`, `listaNegraController.js` | Cumplido |
| **4** | **Derecho ARCO de Acceso y Portabilidad** | El titular puede consultar y descargar en cualquier momento un archivo estructurado con sus datos personales, constancia de consentimiento y resumen operativo desde **Mi Perfil**. | `GET /api/auth/exportar-datos`, `exportarDatosPersonalesUsuario()`, `UserProfileModal.jsx` | Cumplido |
| **5** | **Derecho ARCO de Rectificación inmediata** | Edición directa y auditada con doble verificación para actualizar nombre, usuario, correo, teléfonos, ubicación y condiciones de préstamos. | `PUT /api/auth/perfil`, `PUT /api/clientes/:id`, `UserProfileModal.jsx`, `ClientFormModal.jsx` | Cumplido |
| **6** | **Derecho ARCO de Supresión y retención controlada de 30 días** | Borrado lógico con ventana de resguardo de 30 días en Papelera (`eliminado_en`) para prevenir pérdidas accidentales antes del archivado o eliminación definitiva. | `PapeleraDashboard.jsx`, `papeleraController.js`, `docs/adr/0003-donde-viven-los-datos.md` | Cumplido |
| **7** | **Enmascaramiento automático de PII en logs técnicos** | Todo error o evento registrado en consola pasa por `redactarPII()`, reemplazando correos, teléfonos, cédulas y UUIDs por `[email]`, `[phone]`, `[cedula]` y `[uuid]`. | `backend/src/utils/piiRedactor.js`, `backend/src/middlewares/errorHandler.js` | Cumplido |
| **8** | **Seguridad de sesión y defensa Anti-CSRF** | Sesión en cookie `HttpOnly`, `SameSite=Lax`, expiración por inactividad a los 25 minutos y validación de origen y token `X-CSRF-Token` en memoria. | `backend/src/utils/cookies.js`, `backend/src/middlewares/csrf.js`, `AuthContext.jsx` | Cumplido |
| **9** | **Cifrado de credenciales y ocultación de secretos** | Contraseñas cifradas con `bcryptjs` (factor de costo 10) y exclusión obligatoria de `password_hash` en todas las respuestas y alcances por defecto. | `backend/src/models/Usuario.js`, `formatUsuarioPublico` en `authController.js` | Cumplido |
| **10** | **Defensa contra Prompt Injection y separación de instrucciones** | El asistente **Séneca IA** separa las instrucciones del sistema de los datos consultados, sanitiza entradas y nunca ejecuta comandos ni modifica registros. | `backend/src/controllers/senecaController.js`, `SenecaAssistantModal.jsx` | Cumplido |
| **11** | **Prohibición de decisiones o puntajes crediticios automatizados** | **Séneca IA** y la consulta tributaria operan en modo 100 % informativo de solo lectura; jamás puntúan, ordenan, perfilan ni rechazan personas automáticamente. | `docs/adr/0002-que-decide-la-ia.md`, `LegalGovernanceModal.jsx`, `ClientFormModal.jsx` | Cumplido |
| **12** | **Protocolo de respuesta y notificación ante incidentes (< 72 h)** | Procedimiento documentado de revocación de credenciales (`JWT_SECRET`, `GROQ_API_KEY`), auditoría en `bitacora_actividad` y notificación a titulares en menos de 72 horas. | `docs/gobernanza/inventario-de-datos.md`, `docs/gobernanza/registro-de-riesgos.md` | Cumplido |

---

## Verificación de Cumplimiento

1. **Verificación documental automática:** `node .github/governance-pack/verificar-pack.mjs .`
2. **Verificación de endpoints ARCO y consentimiento:** `POST /api/auth/consentimiento` y `GET /api/auth/exportar-datos`.
3. **Verificación de sanitización de logs:** `redactarPII()` en `backend/src/utils/piiRedactor.js`.
