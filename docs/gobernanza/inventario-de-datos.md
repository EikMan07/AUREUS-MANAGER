# Inventario de datos

No se puede gobernar lo que no se sabe que se tiene. Una fila por cada dato que el sistema guarda, recibe o envía a un tercero, incluido el proveedor del modelo de IA.

| Dato | ¿Personal? | Categoría (Ley 8968, art. 9) | De dónde viene | Dónde se guarda | ¿Sale a un tercero? ¿A quién? | Cuánto se conserva | Quién puede verlo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| <dato> | <Sí o No> | <categoría, o «No aplica»> | <origen> | <servicio y tabla> | <No, o a quién y para qué> | <plazo> | <roles> |
| <dato> | <Sí o No> | <categoría, o «No aplica»> | <origen> | <servicio y tabla> | <No, o a quién y para qué> | <plazo> | <roles> |

<!--
Ejemplo de fila bien llenada:
| Texto del CV | Sí | Acceso restringido | Lo sube el usuario | Supabase Storage | Sí: proveedor de IA, solo para extraer campos | 30 días | El usuario |

Categorías de la Ley 8968 (art. 9):
- Sensibles: origen racial o étnico, opiniones políticas, convicciones religiosas, salud,
  vida y orientación sexual; la definición del art. 3 incluye la condición socioeconómica
  y la información biomédica o genética. Si aparece uno, expliquen en un ADR por qué lo necesitan.
- Acceso restringido: de interés solo para la persona o la administración (correo, teléfono, dirección).
- Acceso irrestricto: los que constan en bases públicas de acceso general.
- Crediticios: comportamiento crediticio de la persona.
-->

## Lo que NO recolectamos

- <dato que decidieron no pedir>: <por qué no lo necesitan>
