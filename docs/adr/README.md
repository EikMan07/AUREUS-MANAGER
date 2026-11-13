# Registro de decisiones de arquitectura (ADR)

Cada decisión que no es obvia queda escrita aquí: qué se decidió, por qué, qué se descartó y qué consecuencias tiene.

**Regla de oro:** un ADR aceptado no se edita. Si la decisión cambia, se escribe uno nuevo que lo reemplaza, y el anterior pasa a «Reemplazado por ADR-XXXX».

| ADR | Decisión | Estado |
| --- | --- | --- |
| [0001](0001-modelo-y-proveedor-de-ia.md) | Modelo Groq openai/gpt-oss-120b para Séneca | Aceptado |
| [0002](0002-que-decide-la-ia.md) | Separación estricta entre consultas de la IA y decisiones humanas | Aceptado |
| [0003](0003-donde-viven-los-datos.md) | Almacenamiento local en PostgreSQL y envío restringido | Aceptado |

Origen del formato: Michael Nygard, [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) (2011). Plantilla abierta de referencia: [MADR](https://adr.github.io/madr/).
