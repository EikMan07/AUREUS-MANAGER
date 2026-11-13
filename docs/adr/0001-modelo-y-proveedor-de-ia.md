# ADR-0001: <modelo y proveedor de IA que usa el proyecto, en una frase>

- Estado: Propuesto
- Fecha: <AAAA-MM-DD>
- Decide: <nombre y rol de quien responde por esta decisión>

<!--
Si su proyecto NO usa IA dentro del producto, este ADR pasa a ser:
«Qué herramientas de IA usamos para programar y con qué reglas».
-->

## Contexto

<Qué necesita hacer la IA en su producto. Qué restricciones hay: costo, datos personales, latencia, idioma, si el cliente u organización aliada puso condiciones. Máximo 5 líneas.>

## Decisión

<Qué modelo y qué proveedor, para qué tareas, y cómo se llama (solo desde el servidor, con qué llave). Frases verificables. Mal: «se usará IA de forma responsable». Bien: «el modelo X se llama solo desde `src/lib/ai/`, con la llave en una variable de entorno del servidor».>

## Alternativas descartadas

- <Otro modelo o proveedor>: <por qué no>.
- <Otra opción, por ejemplo no usar IA para esta tarea>: <por qué no>.

## Consecuencias

<Qué se gana y qué se pierde. Costo estimado por mes. Qué pasa si el proveedor falla o sube el precio. Qué queda pendiente.>

## Cómo se verifica

<Dónde en el código o en las pruebas se ve que esto se cumple: un archivo, un test, una regla de CI.>
