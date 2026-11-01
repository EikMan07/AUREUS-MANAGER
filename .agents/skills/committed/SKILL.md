---
name: committed
description: >-
  Guía y genera mensajes de commit siguiendo el estándar de Conventional Commits,
  asegurando títulos concisos de máximo 50 caracteres y descripciones extensas y
  detalladas de los cambios realizados. Se integra con repo-docs-updater para sincronizar
  documentación antes del commit y realiza el push a GitHub.
---

# Guía de Convención de Commits (Conventional Commits) y Sincronización en GitHub

Este skill define la convención oficial para la creación de mensajes de commit en el repositorio. Todo commit debe seguir la especificación de **Conventional Commits**, garantizando coherencia en el historial de Git, actualización documental previa y facilidad de lectura en GitHub.

---

## 1. Estructura General del Mensaje

El formato obligatorio consta de un título conciso, una línea en blanco obligatoria, y un cuerpo extenso y detallado:

```text
<tipo>(<ámbito opcional>): <descripción breve y directa>

<descripción extensa y detallada explicando el contexto, por qué se hizo el cambio y cómo funciona>

[Opcional: BREAKING CHANGE: ... o referencias a tickets/issues como Closes #123]
```

---

## 2. Reglas del Título (Header)

- **Límite estricto de longitud:** Máximo **50 caracteres** en total (incluyendo el tipo, ámbito, dos puntos y espacios).
- **Formato:** `<tipo>(<ámbito>): <descripción breve>` o `<tipo>: <descripción breve>` si no aplica ámbito.
- **Modo imperativo:** Utilizar tiempo presente imperativo (ej. `añade soporte`, `corrige error`, `refactoriza servicio` o en inglés `feat: add user auth`).
- **Minúsculas:** El tipo y la primera letra de la descripción deben comenzar en minúscula.
- **Sin punto final:** Nunca colocar un punto al final del título.

---

## 3. Tipos Permitidos (Types)

| Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- |
| **`feat`** | Añade una nueva funcionalidad al sistema. | `feat(auth): añade login con JWT` |
| **`fix`** | Corrige un defecto, bug o error. | `fix(db): resuelve fuga en el pool` |
| **`docs`** | Modificaciones exclusivamente en documentación. | `docs: actualiza README con setup` |
| **`style`** | Cambios de formato/estilo que no alteran la lógica (lint, espacios). | `style(api): ajusta indentación prettier` |
| **`refactor`** | Reestructuración de código sin arreglar bugs ni añadir features. | `refactor(user): desacopla validador` |
| **`perf`** | Cambio de código enfocado en mejorar el rendimiento. | `perf(query): indexa campo email` |
| **`test`** | Añadir, corregir o refactorizar pruebas unitarias o de integración. | `test(order): añade tests de cálculo` |
| **`build`** | Cambios en herramientas de construcción, empaquetado o dependencias. | `build: actualiza dependencias npm` |
| **`ci`** | Ajustes en flujos de integración o despliegue continuo (CI/CD). | `ci: agrega step de linter en github` |
| **`chore`** | Mantenimiento rutinario, configuración auxiliar o scripts internos. | `chore: actualiza .gitignore` |

---

## 4. Descripción Extensa (Cuerpo / Body)

El cuerpo es **obligatorio y debe ser extenso**, explicando a fondo el contexto y la justificación de los cambios:

1. **Línea en blanco previa:** Siempre debe existir exactamente una línea en blanco entre el título y el cuerpo.
2. **Qué explicar:**
   - **¿Por qué se hizo el cambio?**: Explica el problema, contexto de negocio o motivación técnica.
   - **¿Qué cambios se realizaron?**: Detalla los módulos, funciones, clases o flujos intervenidos.
   - **Efectos secundarios o consideraciones**: Menciona posibles impactos en otras partes de la aplicación, migraciones necesarias o variables de entorno.
3. **Formato:** Puede organizarse en párrafos bien estructurados o listas con viñetas para mayor claridad técnica.

---

## 5. Pie de Página (Footer - Opcional)

Se utiliza para información crítica o trazabilidad:
- **Breaking Changes:** Si introduce un cambio incompatible con versiones anteriores, incluir `BREAKING CHANGE: <descripción del impacto y migración>`.
- **Referencias:** Enlaces a incidencias o tareas (ej. `Closes #42`, `Fixes #108`, `Ref PROJ-234`).

---

## 6. Instrucciones de Ejecución para el Asistente

Al preparar o realizar un commit para el usuario:
1. Inspecciona los cambios preparados con `git status` y `git diff --staged`. Si no están staged, ejecuta `git add`.
2. Verifica estrictamente que el título no supere los **50 caracteres**.
3. Redacta la descripción extensa cubriendo el motivo, la solución técnica y los componentes afectados.
4. **Pre-Commit Documentation Sync:** ANTES de ejecutar el commit, invoca la skill `repo-docs-updater` para actualizar automáticamente `CHANGELOG.md`, `README.md` y `SECURITY.md` según los cambios del commit.
5. Añade los archivos de documentación actualizados al stage (`git add CHANGELOG.md README.md SECURITY.md`).
6. Ejecuta el commit con el título y cuerpo formateados (`git commit -m "<título>" -m "<cuerpo>"`).
7. Tras realizar el commit, envía todos los cambios a GitHub (`git push origin <rama>`) para mantener el repositorio remoto sincronizado.
