# ADR-0002: <qué decide la IA y qué decide una persona, en una frase>

- Estado: Propuesto
- Fecha: <AAAA-MM-DD>
- Decide: <nombre y rol de quien responde por esta decisión>

<!--
Este es el ADR más importante del pack. Pregúntense:
- ¿La IA ordena, filtra, puntúa, resume o recomienda algo sobre una persona?
- ¿Quién ve el resultado? ¿Puede corregirlo o reclamar?
- ¿Qué decisiones NUNCA se automatizan en su sistema?

Ejemplo real (portal de empleo en producción):
«La IA solo extrae campos a un esquema fijo; nunca puntúa, ordena, resume méritos ni
descarta candidatos. El resultado se muestra para revisión y nada se publica sin
confirmación de la persona.»
-->

## Contexto

<Qué hace la IA hoy en su producto y sobre quién recae lo que produce.>

## Decisión

<Lista, en frases verificables, de lo que la IA hace y de lo que nunca hace. Quién revisa o confirma lo que la IA produce antes de que tenga efecto.>

## Alternativas descartadas

- <Dejar que la IA decida X sola>: <por qué no>.

## Consecuencias

<Qué cuesta mantener a una persona en el ciclo. Qué riesgo se evita.>

## Cómo se verifica

<Dónde está el paso de confirmación humana en el código. Qué test comprueba que la IA no puede ejecutar la acción sola.>
