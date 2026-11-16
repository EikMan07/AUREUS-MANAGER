# Normativa de Inteligencia Artificial: Estrategia Nacional MICITT, NIST AI RMF, ISO/IEC 42001 y OWASP LLM Top 10

Este documento define el marco técnico y ético bajo el cual opera **Séneca IA** y los servicios de asistencia automatizada dentro de **Aureus Manager**.

---

## 1. Alineación con la Estrategia Nacional de Inteligencia Artificial (MICITT Costa Rica 2024-2027)

1. **Supervisión Humana Efectiva (Human-in-the-Loop):**
   - Ningún componente de inteligencia artificial en **Aureus Manager** tiene autoridad para otorgar préstamos, modificar saldos, aplicar recargos, enviar clientes a Lista Negra ni eliminar registros.
   - Todas las operaciones financieras exigen acción humana explícita y confirmación en dos pasos.
2. **Transparencia y Explicabilidad:**
   - La interfaz identifica claramente a **Séneca IA** como un asesor financiero de solo lectura y muestra avisos permanentes sobre el alcance informativo de sus respuestas.
3. **No Discriminación y Equidad:**
   - Se prohíbe el cálculo de puntajes crediticios automatizados (*credit scoring* opaco), el perfilamiento demográfico o la exclusión automática por zona geográfica o nacionalidad.

---

## 2. Aplicación del Marco NIST AI RMF 1.0

- **GOVERN (Gobernar):** Reglas inquebrantables definidas en `AGENTS.md` y decisiones arquitectónicas trazables en `docs/adr/0001-modelo-y-proveedor-de-ia.md`, `0002-que-decide-la-ia.md` y `0003-donde-viven-los-datos.md`.
- **MAP (Mapear):** Inventario exhaustivo de datos personales y financieros en `docs/gobernanza/inventario-de-datos.md`, delimitando qué datos permanecen en PostgreSQL (`cobro_firme_db`) y qué contexto resumido de solo lectura recibe el modelo.
- **MEASURE (Medir):** Evaluación continua de riesgos en `docs/gobernanza/registro-de-riesgos.md`, incluyendo pruebas contra alucinaciones numéricas, caída de proveedores externos y fugas en logs.
- **MANAGE (Gestionar):** Degradación elegante mediante motor analítico determinista local en `senecaController.js` cuando el proveedor externo no está disponible, garantizando continuidad operativa con datos exactos de PostgreSQL.

---

## 3. Controles ISO/IEC 42001 (Sistemas de Gestión de IA) e ISO/IEC 27001 (Seguridad de la Información)

- **Aislamiento de Credenciales y Secretos:** Las llaves `GROQ_API_KEY` y `JWT_SECRET` residen exclusivamente en variables de entorno del servidor (`backend/.env`), nunca en el cliente web.
- **Mínimo Privilegio en Consultas de IA:** El controlador de **Séneca IA** ejecuta únicamente consultas `SELECT` parametrizadas filtradas por el `cobrador_id` de la sesión autenticada.
- **Trazabilidad y Auditoría:** Registro de aceptaciones legales y acciones críticas en `bitacora_actividad` y en la tabla `usuarios`.

---

## 4. Mitigación del OWASP Top 10 para Aplicaciones LLM

| Riesgo OWASP LLM | Mitigación Implementada en Aureus Manager |
| :--- | :--- |
| **LLM01: Prompt Injection** | Separación estricta entre el prompt del sistema y la consulta del usuario; truncamiento a 600 caracteres y prohibición de instrucciones que alteren el rol contable de Séneca IA. |
| **LLM02: Sensitive Information Disclosure** | Filtrado estricto por `cobrador_id`, prohibición de incluir hashes o secretos en el contexto del modelo y redacción automática de PII en logs mediante `redactarPII()`. |
| **LLM06: Excessive Agency** | Séneca IA carece de herramientas de escritura (`INSERT`, `UPDATE`, `DELETE`); opera en modo 100 % consultivo. |
| **LLM09: Misinformation / Hallucinations** | Todas las cifras provienen de consultas SQL deterministas sobre `cobro_firme_db` inyectadas en tiempo real antes de formular la respuesta ejecutiva. |
