---
name: repo-docs-updater
description: >-
  Sincroniza y actualiza automáticamente los archivos clave de documentación del
  repositorio (CHANGELOG.md, README.md y SECURITY.md) antes de ejecutar el commit
  con la skill github-commits y hacer push a GitHub. Clasifica cambios según Conventional
  Commits y Keep a Changelog, revisa impactos en la guía del README y mantiene
  actualizadas las consideraciones de seguridad en SECURITY.md antes de subir todo
  al repositorio remoto. Usar siempre en el flujo de commits, preparación de releases
  o sincronización con GitHub.
---

# Sincronizador de Documentación del Repositorio (`repo-docs-updater`)

Este skill define y automatiza el ciclo de vida documental del proyecto. Se encarga de garantizar que **`CHANGELOG.md`**, **`README.md`** y **`SECURITY.md`** se mantengan rigurosamente sincronizados y actualizados **antes** de confirmar cualquier commit y enviarlo a GitHub.

---

## 1. Integración con el Flujo de `github-commits` y GitHub

El flujo de trabajo sigue una secuencia coordinada en 5 pasos obligatorios:

```
[Cambios en código] 
       │
       ▼
1. Formular Commit con skill `github-commits` (Título <= 50 chars + Cuerpo extenso)
       │
       ▼
2. PRE-COMMIT: Invocar `repo-docs-updater`
   ├── Actualizar CHANGELOG.md ([Unreleased] con Keep a Changelog)
   ├── Actualizar README.md (nuevas características, setup, endpoints o variables)
   └── Actualizar SECURITY.md (autenticación, secretos, dependencias o permisos)
       │
       ▼
3. Stage de Documentación (`git add CHANGELOG.md README.md SECURITY.md`)
       │
       ▼
4. Ejecutar el Commit (`git commit -m "..." -m "..."`)
       │
       ▼
5. Publicar en GitHub (`git push origin <rama>`)
```

---

## 2. Protocolo de Actualización de Documentos

### A. `CHANGELOG.md`
- **Estándar:** [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y [Conventional Commits](https://www.conventionalcommits.org/).
- **Ubicación:** Raíz del repositorio (`CHANGELOG.md`).
- **Mapeo:**
  - `feat`: Sección `### Added`
  - `fix`: Sección `### Fixed`
  - `refactor`, `perf`: Sección `### Changed`
  - `docs`: Sección `### Documentation`
  - `security` o cambios en auth/permisos: Sección `### Security`
  - `chore`, `build`, `ci`, `test`: Sección `### Maintenance`
- **Estructura de la entrada:**
  Conserva el título formateado y el desglose de viñetas redactado en el cuerpo del commit.

### B. `README.md`
- Se analiza si el cambio introduce:
  1. Nuevos comandos o scripts npm / package.json.
  2. Nuevas variables de entorno requeridas (`.env.example`).
  3. Nuevos endpoints de API o vistas de usuario.
  4. Cambios en la arquitectura, dependencias principales o guía de instalación.
- Si aplica, se actualiza la sección correspondiente del `README.md` para reflejar el estado actual del proyecto.

### C. `SECURITY.md`
- Se analiza si el cambio afecta:
  1. Flujos de autenticación o autorización (JWT, sesiones, middleware de roles).
  2. Manejo de secretos, llaves API, tokens o cookies (`HttpOnly`, `SameSite`).
  3. Políticas CORS, encabezados de seguridad (CSP, HSTS) o validaciones de entrada.
  4. Actualización de dependencias para resolver vulnerabilidades (CVEs).
- Si aplica, se añaden las notas pertinentes en `SECURITY.md` o se actualiza la matriz de versiones y directrices.

---

## 3. Instrucciones de Ejecución Paso a Paso para el Asistente

Cuando el usuario vaya a realizar un commit o prepare cambios para enviar a su repositorio:

1. **Revisar estado de Git:**
   ```bash
   git status
   git diff --staged
   ```

2. **Estructurar el mensaje con la skill `committed`:**
   - Redactar un título imperativo de máximo 50 caracteres (`tipo(ámbito): descripción`).
   - Redactar un cuerpo extenso explicando el por qué, el qué y componentes afectados.

3. **Ejecutar la actualización de documentación (Pre-Commit):**
   - Utilizar el script automatizado o actualizar los archivos directamente:
     ```bash
     node .agents/skills/repo-docs-updater/scripts/sync-docs.js --title "<título_commit>" --body "<cuerpo_commit>"
     ```
   - Revisar que `CHANGELOG.md`, `README.md` y `SECURITY.md` contengan la información actualizada.

4. **Preparar y confirmar el commit:**
   ```bash
   git add CHANGELOG.md README.md SECURITY.md
   git commit -m "<título_commit>" -m "<cuerpo_commit>"
   ```

5. **Enviar los cambios a GitHub:**
   ```bash
   git push origin <rama_actual>
   ```

---

## 4. Plantillas Base

### `CHANGELOG.md`
```markdown
# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
y este proyecto se adhiere a [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added

### Fixed

### Changed

### Security

### Maintenance
```

### `SECURITY.md`
```markdown
# Política de Seguridad

## Versiones Compatibles
| Versión | Soportada |
| :--- | :--- |
| 1.0.x | :white_check_mark: |

## Reporte de Vulnerabilidades
Si identificas un problema de seguridad, repórtalo responsablemente contactando al equipo del repositorio.

## Directrices de Seguridad
- Cero almacenamiento de credenciales o secretos en Git.
- Variables de entorno estrictamente administradas fuera del control de versiones.
- Auditorías preventivas de dependencias periódicas.
```
