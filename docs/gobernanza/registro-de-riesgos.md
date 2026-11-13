# Registro de riesgos

Al menos tres riesgos, cada uno con quién sale afectado y una mitigación que ya exista o que tenga responsable. Guía: [OWASP Top 10 para aplicaciones con LLM](https://genai.owasp.org/llm-top-10/) y [OWASP Top 10 para aplicaciones agénticas](https://genai.owasp.org/resource/2025-12-09/owasp-top-10-for-agentic-applications-for-2026).

| # | Riesgo | Quién sale afectado | Probabilidad (B/M/A) | Impacto (B/M/A) | Mitigación | Estado | Responsable |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | Inyección indirecta de prompt o manipulación de instrucciones (OWASP LLM01) a través de notas o nombres de clientes | Cobradores que confían en las respuestas de Séneca y la integridad de los resúmenes financieros | B | M | El esquema del prompt (seneca.prompt.js) define los datos como información no ejecutable y sanitiza la entrada con seneca.schema.js | Hecho | Eiker Abarca |
| R2 | Fuga de clave de API o consumo desmedido por consultas repetitivas a Groq (OWASP LLM10) | El propietario del sistema por sobrecostos o denegación de servicio | B | M | La clave reside solo en el servidor backend (.env) y senecaController aplica rate limit estricto de 30 req/min por usuario | Hecho | Eiker Abarca |
| R3 | Alucinación del modelo en montos, cuotas o clientes inexistentes (OWASP LLM09) | Deudores y cobradores por posibles confusiones sobre montos pendientes | M | A | Séneca opera a temperatura 0.15 inyectando radiografía real verificada de PostgreSQL y prohibiendo inventar datos, con aviso visual de confirmación obligatoria | Hecho | Eiker Abarca |
| R4 | Exposición no autorizada de datos crediticios o personales por acceso sin autenticación (Ley 8968) | Clientes y cobradores por vulneración a su privacidad crediticia y personal | B | A | Autenticación HttpOnly SameSite=Lax, protección CSRF y middleware authMiddleware en todas las rutas privadas del backend | Hecho | Eiker Abarca |
