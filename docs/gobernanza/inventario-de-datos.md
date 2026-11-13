# Inventario de datos

No se puede gobernar lo que no se sabe que se tiene. Una fila por cada dato que el sistema guarda, recibe o envía a un tercero, incluido el proveedor del modelo de IA.

| Dato | ¿Personal? | Categoría (Ley 8968, art. 9) | De dónde viene | Dónde se guarda | ¿Sale a un tercero? ¿A quién? | Cuánto se conserva | Quién puede verlo |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Cédula de identidad física o jurídica | Sí | Acceso restringido | Ingresada por el cobrador o consultada al padrón electoral público | PostgreSQL, tabla clientes (columna cedula) | No sale a proveedores de IA ni a terceros | Mientras la cuenta esté activa y 30 días en papelera si se elimina | Solo el cobrador autenticado propietario de la cuenta |
| Nombre completo y apellidos del deudor | Sí | Acceso irrestricto | Padrón electoral público o digitación del operador | PostgreSQL, tabla clientes (nombre, apellidos) | Sí: a Groq solo si el cobrador consulta por este cliente en Séneca | Permanente durante el ciclo crediticio del cliente | Cobrador autenticado |
| Teléfono principal y teléfono secundario | Sí | Acceso restringido | Declarado por el deudor en la solicitud del préstamo | PostgreSQL, tabla clientes (telefono, telefono_secundario) | Sí: a Groq solo cuando el cobrador pide datos de contacto a Séneca | Mientras el cliente mantenga relación con la cartera | Cobrador autenticado |
| Monto del préstamo, cuota y saldo pendiente | Sí | Crediticio | Acordado entre el prestamista y el deudor | PostgreSQL, tablas prestamos y agenda_cobros | Sí: a Groq en resúmenes para responder consultas financieras en Séneca | Duración del préstamo y archivo histórico de cobranza | Cobrador autenticado |
| Dirección física y ubicación de cobro | Sí | Acceso restringido | Indicada por el cliente para la ruta presencial de cobro | PostgreSQL, tabla clientes (columna ubicacion) | Sí: a Groq únicamente al consultar rutas de cobranza en Séneca | Vigencia del crédito o actualización por el cobrador | Cobrador autenticado |

## Lo que NO recolectamos

- Datos sensibles según la Ley 8968 (salud, religión, orientación sexual, convicciones políticas o datos biométricos): no son pertinentes ni necesarios para la gestión crediticia y de cobro.
- Números completos de tarjetas de crédito o débito ni claves bancarias: las operaciones de cobro se efectúan en efectivo o transferencias directas sin pasarelas con captura de tarjetas.
- Geolocalización continua o rastreo por GPS en tiempo real de los deudores: se protege la privacidad personal limitándose a la dirección física pactada para el cobro.
