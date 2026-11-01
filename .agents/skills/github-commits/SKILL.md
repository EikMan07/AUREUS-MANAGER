---
name: github-commits
description: >-
  Automatiza el ciclo de Git para GitHub: cuando el usuario realiza git add o solicita
  registrar cambios, analiza las diferencias staged, formula automáticamente un commit
  bajo el estándar de Conventional Commits (título conciso de máximo 50 caracteres y
  cuerpo técnico extenso), sincroniza la documentación del repositorio (CHANGELOG.md,
  README.md, SECURITY.md) mediante repo-docs-updater, ejecuta el commit y realiza o
  facilita el git push a GitHub. Usar siempre que se preparen cambios con git add, se
  soliciten commits o se envíen cambios al repositorio remoto.
---

# Gestión Automatizada de Commits y Sincronización en GitHub (`github-commits`)

Este skill define el protocolo oficial para automatizar el flujo de trabajo en Git hacia GitHub. Su objetivo es que cada vez que se preparen cambios con **`git add`**, el agente analice las modificaciones, formule y ejecute automáticamente un **`git commit`** con rigor profesional y prepare o ejecute el **`git push`** hacia el repositorio remoto.

---

## 1. El Flujo de Trabajo en 4 Fases

```
[Usuario ejecuta o solicita git add]
               │
               ▼
FASE 1: Análisis de Staged Changes
  • Inspección con `git status` y `git diff --staged`
  • Detección del tipo de cambio, componentes y contexto técnico
               │
               ▼
FASE 2: Formulación del Commit (Estándar Conventional Commits)
  • Título conciso e imperativo (MÁXIMO 50 CARACTERES)
  • Cuerpo extenso y detallado (Motivo, Solución técnica, Componentes)
               │
               ▼
FASE 3: Pre-Commit Documentation Sync (Skill repo-docs-updater)
  • Sincroniza CHANGELOG.md (sección [Unreleased])
  • Sincroniza README.md si cambiaron comandos, setup o endpoints
  • Sincroniza SECURITY.md si hubo cambios de autenticación, secretos o dependencias
  • Stage de documentos: `git add CHANGELOG.md README.md SECURITY.md`
               │
               ▼
FASE 4: Confirmación y Envío a GitHub
  • Ejecuta el commit: `git commit -m "<título>" -m "<cuerpo>"`
  • Realiza o solicita confirmación para el push: `git push origin <rama>`
```

---

## 2. Reglas Estrictas del Mensaje de Commit (Convención)

Todo commit debe respetar los siguientes estándares de calidad:

### A. Título del Commit (Header)
- **Límite de longitud estricto:** Máximo **50 caracteres** en total.
- **Formato:** `<tipo>(<ámbito opcional>): <descripción breve>`
- **Modo imperativo y minúsculas:** Usar tiempo presente (ej. `añade soporte`, `corrige error`, `refactoriza api`). La primera letra tras los dos puntos va en minúscula.
- **Sin punto final:** Nunca colocar un punto al final del título.

### B. Tipos Permitidos (Types)

| Tipo | Propósito | Ejemplo |
| :--- | :--- | :--- |
| **`feat`** | Nueva funcionalidad o módulo para el usuario. | `feat(auth): añade login con JWT` |
| **`fix`** | Corrección de un error o defecto en el código. | `fix(db): resuelve fuga en el pool` |
| **`docs`** | Modificaciones exclusivas en documentación. | `docs: actualiza README con setup` |
| **`style`** | Formato, espacios, indentación (sin cambios de lógica). | `style(api): ajusta formato prettier` |
| **`refactor`** | Reestructuración de código sin alterar comportamiento. | `refactor(user): desacopla validador` |
| **`perf`** | Optimizaciones enfocadas en velocidad o memoria. | `perf(query): indexa campo email` |
| **`test`** | Pruebas unitarias o de integración. | `test(order): añade tests de cálculo` |
| **`build`** | Dependencias, empaquetado o scripts de build. | `build: actualiza dependencias npm` |
| **`ci`** | Flujos de integración y despliegue continuo. | `ci: agrega step de linter en github` |
| **`chore`** | Tareas auxiliares, mantenimiento o .gitignore. | `chore: actualiza .gitignore` |

### C. Cuerpo Extenso (Body)
El cuerpo es **obligatorio y debe ser detallado y explicativo**:
1. **Línea en blanco separadora:** Siempre dejar una línea en blanco entre el título y el cuerpo.
2. **Qué explicar:**
   - **Motivo / Contexto:** Por qué era necesario este cambio.
   - **Qué se hizo:** Lista clara de componentes, funciones, rutas o archivos modificados.
   - **Impactos o consideraciones:** Migraciones de base de datos, variables de entorno requeridas, compatibilidad.

### D. Pie de Página (Footer - Opcional)
- **Breaking Changes:** `BREAKING CHANGE: <descripción del cambio incompatible>`.
- **Referencias:** `Closes #42`, `Fixes #108`, `Ref #23`.

---

## 3. Ejemplos Completos de Referencia

### Ejemplo 1: Nueva funcionalidad (`feat`)
```text
feat(auth): implementa autenticación JWT

Implementa el flujo completo de autenticación y autorización mediante
JSON Web Tokens (JWT) para proteger los endpoints privados de la API.

Cambios principales:
- Se añade el middleware `authMiddleware` para verificar y decodificar el token en cada petición.
- Se implementa el servicio `TokenService` encargado de firmar tokens de acceso (15 min) y tokens de refresco (7 días).
- Se protegen las rutas bajo `/api/v1/protected/*`.
- Se gestiona el almacenamiento seguro del refresh token en cookies HTTP-only para mitigar ataques XSS.

Closes #45
```

### Ejemplo 2: Corrección de error (`fix`)
```text
fix(payment): corrige error de redondeo en total

Resuelve un problema de precisión decimal con operaciones de punto flotante
al calcular el total de la orden con impuestos aplicados.

Detalle de la solución:
- Se migra el cálculo de importes al uso de enteros (centavos) en lugar de floats nativos.
- Se actualiza la función `calculateTotal` en `PaymentProcessor` para redondear a 2 decimales usando mathjs.
- Se añade un caso de prueba para validar montos con múltiples tasas de impuestos combinadas.

Fixes #112
```

---

## 4. Instrucciones de Ejecución Paso a Paso para el Asistente

Cuando el usuario pida hacer `git add`, quiera confirmar cambios o envíe archivos a Git:

1. **Revisar estado de Git:**
   Ejecuta `git status -s` y `git diff --staged`. Si hay archivos pendientes fuera del stage, ejecuta `git add` según lo requerido.

2. **Formular el mensaje:**
   - Redacta el título asegurando estrictamente que **no supere los 50 caracteres**.
   - Redacta el cuerpo extenso y técnico con viñetas explicativas.

3. **Ejecutar Pre-Commit Docs Sync:**
   - Invoca la skill `repo-docs-updater` para mantener sincronizados `CHANGELOG.md`, `README.md` y `SECURITY.md`:
     ```bash
     node .agents/skills/repo-docs-updater/scripts/sync-docs.js --title "<título>" --body "<cuerpo>"
     ```
   - Añade los documentos al commit: `git add CHANGELOG.md README.md SECURITY.md`.

4. **Crear el Commit:**
   - Ejecuta `git commit` pasando el título y el cuerpo detallado.

5. **Lanzar a GitHub (`git push`):**
   - Ejecuta o presenta listo el comando `git push origin <rama_actual>` para que todo lo realizado quede inmediatamente publicado en el repositorio de GitHub del usuario.
