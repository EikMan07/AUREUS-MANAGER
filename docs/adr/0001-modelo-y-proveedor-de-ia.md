# ADR-0001: Modelo Groq openai/gpt-oss-120b para el asistente consultivo financiero Séneca

- Estado: Aceptado
- Fecha: 2026-11-13
- Decide: Equipo Aureus Manager, Arquitecto de Software Principal

## Contexto

Aureus Manager requiere un asistente financiero y operativo («Séneca») para que el cobrador consulte en lenguaje natural el estado de su cartera, atrasos, cobros del día, agenda y contactos. Se requiere baja latencia en campo, costo predecible y estricta privacidad de datos personales bajo la Ley 8968.

## Decisión

Se utiliza el modelo `openai/gpt-oss-120b` provisto por Groq mediante su API REST. La inferencia se invoca exclusivamente desde el servidor backend en `src/services/groq.service.js` y `src/services/seneca.service.js`, con temperatura 0.15, timeout de 20 segundos y reintentos exponenciales. La clave `GROQ_API_KEY` reside únicamente en variables de entorno del servidor (`backend/.env`), nunca en el cliente ni en el repositorio. Si la clave no está presente o hay fallo de red, se activa un motor analítico determinista local en PostgreSQL como respaldo.

## Alternativas descartadas

- OpenAI gpt-4o directo: descartado por mayor latencia en dispositivos móviles durante cobros en ruta y costo significativamente superior por token.
- No usar modelo de lenguaje y mantener solo consultas SQL estáticas: descartado porque el cobrador necesita síntesis contextual en lenguaje natural y sugerencias conversacionales rápidas sin navegar manualmente entre múltiples pantallas.

## Consecuencias

Se obtienen respuestas ejecutivas en menos de 1.5 segundos con un consumo mínimo de recursos. Si el proveedor Groq experimenta interrupciones o límite de cuota, el sistema degrada limpiamente hacia el motor analítico determinista sobre PostgreSQL sin interrumpir la operación del cobrador.

## Cómo se verifica

La implementación reside en `backend/src/services/groq.service.js`, `backend/src/services/seneca.service.js` y `backend/src/controllers/senecaController.js`, protegida por `authMiddleware` en `/api/seneca` y validada mediante la suite de pruebas `verify_seneca_v3.mjs` con respuestas HTTP 200 verificadas en vivo.
