# ADR-0003: Almacenamiento local en PostgreSQL y envío restringido de contexto a la API de inferencia

- Estado: Aceptado
- Fecha: 2026-11-13
- Decide: Equipo Aureus Manager, Arquitecto de Software Principal

## Contexto

El sistema administra datos identificativos (cédulas de identidad de Costa Rica, nombres y apellidos), datos de contacto (teléfonos y direcciones de cobro) y datos crediticios (capital prestado, cuotas y saldos), amparados por la Ley 8968 (Protección de la Persona frente al Tratamiento de sus Datos Personales). Es imperativo garantizar soberanía de datos, almacenamiento seguro y minimización de transferencias hacia servicios externos.

## Decisión

Los datos primarios y transaccionales residen de manera persistente en la base de datos relacional PostgreSQL (`cobro_firme_db`) alojada en infraestructura propia controlada.

Al proveedor de inferencia de IA (Groq) únicamente se envían resúmenes operativos o fragmentos de datos estrictamente necesarios para responder la consulta inmediata del usuario autenticado, transmitidos bajo cifrado TLS. Nunca se envían contraseñas, hashes bcrypt, credenciales de vinculación, cookies de sesión ni tokens de seguridad.

Los datos se conservan durante la vigencia del contrato de préstamo y su ciclo de cobro. Los registros eliminados permanecen 30 días en la tabla de papelera (`clientes_baneados` y `prestamos_baneados`) antes de ser archivados de forma definitiva o purgados, permitiendo auditoría y restauración legítima.

## Alternativas descartadas

- Base de datos en la nube sin control de región ni cifrado local: descartada por el riesgo de transferencias internacionales no autorizadas y pérdida de soberanía sobre datos crediticios sensibles.
- Envío continuo del volcado completo de la base de datos al proveedor de IA: descartado por violación del principio de minimización de datos de la Ley 8968 y costos excesivos de tokens.

## Consecuencias

Se garantiza el cumplimiento de los principios de consentimiento, finalidad y confidencialidad exigidos por la Ley 8968. Toda consulta a la IA es anónima respecto a credenciales de acceso y minimizada respecto a datos de terceros.

## Cómo se verifica

El esquema relacional e índices están documentados en `backend/sql/01_schema_cobro_firme.sql`. Los constructores de contexto en `backend/src/prompts/seneca.prompt.js` y `backend/src/schemas/seneca.schema.js` sanitizan los datos salientes y omiten cualquier credencial o secreto del sistema.
