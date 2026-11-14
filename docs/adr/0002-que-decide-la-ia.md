# ADR-0002: Separación estricta entre consultas informativas de la IA y decisiones transaccionales humanas

- Estado: Aceptado
- Fecha: 2026-11-13
- Decide: Equipo Aureus Manager, Arquitecto de Software Principal

## Contexto

Aureus Manager gestiona colocación de capital, cobros diarios, reprogramaciones, suspensión de préstamos y archivo de clientes. Automatizar decisiones crediticias o permitir que la inteligencia artificial modifique saldos sin supervisión humana representaría un riesgo financiero, legal y ético inaceptable tanto para el acreedor como para el deudor.

## Decisión

El asistente de inteligencia artificial (Séneca) tiene un rol estrictamente consultivo y de solo lectura.

Lo que la IA hace:
- Sintetiza y resume información de cobros del día, totales adeudados y rutas pendientes.
- Responde preguntas en lenguaje natural sobre teléfonos de contacto, historial de pagos anteriores y clientes en Lista Negra o Papelera.
- Sugiere recomendaciones y preguntas de seguimiento para facilitar la consulta del cobrador.

Lo que la IA nunca hace:
- Nunca registra abonos, cuotas ni transacciones de dinero.
- Nunca aprueba, deniega, reestructura o suspende préstamos.
- Nunca altera el estado crediticio de un cliente ni lo envía a Lista Negra o Papelera.
- Nunca inserta, modifica ni elimina registros en la base de datos PostgreSQL.

Toda acción transaccional u operativa requiere la decisión y confirmación manual explícita de una persona autenticada mediante la interfaz de usuario.

## Alternativas descartadas

- Evaluación crediticia y aprobación autónoma de préstamos por IA: descartada para evitar sesgos algorítmicos opacos y asegurar la debida diligencia financiera con responsabilidad humana.
- Registro automático de abonos interpretados por lenguaje natural sin confirmación del operador: descartada por el riesgo de alucinaciones en cifras y discrepancias de caja.

## Consecuencias

Se garantiza que la responsabilidad jurídica y contable permanezca siempre en el operador humano. Se previene cualquier mutación accidental o alucinación de datos en la base de datos operativa, manteniendo la confianza de deudores y administradores.

## Cómo se verifica

El módulo `backend/src/controllers/senecaController.js` únicamente implementa métodos de lectura (`GET /resumen-rapido` y `POST /consultar`). No existe ninguna ruta ni función de Sequelize donde el modelo de IA tenga permisos de escritura. Todas las mutaciones de datos exigen autenticación por cookie de sesión, validación CSRF y controladores dedicados con auditoría transaccional.
