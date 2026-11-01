#!/usr/bin/env node

/**
 * Script de soporte para repo-docs-updater
 * Sincroniza y actualiza automáticamente CHANGELOG.md, README.md y SECURITY.md
 * antes de confirmar el commit y hacer push al repositorio en GitHub.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getProjectRoot() {
  try {
    const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
    return root;
  } catch {
    return process.cwd();
  }
}

const ROOT_DIR = getProjectRoot();

function parseArgs() {
  const args = process.argv.slice(2);
  let title = '';
  let body = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      title = args[i + 1];
      i++;
    } else if (args[i] === '--body' && args[i + 1]) {
      body = args[i + 1];
      i++;
    }
  }

  // Si no se pasaron por argumentos, leer el commit mas reciente o staged diff
  if (!title) {
    try {
      const raw = execSync('git log -1 --pretty=format:"%s%n%b"', { encoding: 'utf-8' });
      const lines = raw.trim().split('\n');
      title = lines[0] || '';
      body = lines.slice(1).join('\n').trim();
    } catch {
      title = 'chore: actualizacion de documentacion';
      body = 'Sincronizacion de documentacion del proyecto';
    }
  }

  return { title, body };
}

function parseCommitInfo(subject, body) {
  const match = subject.match(/^([a-z]+)(?:\(([^)]+)\))?!?:\s*(.*)$/);
  if (!match) {
    return {
      type: 'chore',
      scope: '',
      title: subject,
      body: body
    };
  }
  return {
    type: match[1],
    scope: match[2] || '',
    title: match[3],
    body: body
  };
}

function mapTypeToChangelogSection(type) {
  switch (type) {
    case 'feat':
      return '### Added';
    case 'fix':
      return '### Fixed';
    case 'refactor':
    case 'perf':
      return '### Changed';
    case 'docs':
      return '### Documentation';
    case 'security':
      return '### Security';
    default:
      return '### Maintenance';
  }
}

// 1. Sincronizar CHANGELOG.md
function updateChangelog(parsed) {
  const changelogPath = path.join(ROOT_DIR, 'CHANGELOG.md');
  const baseTemplate = `# Changelog

Todos los cambios notables de este proyecto seran documentados en este archivo.

El formato esta basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
y este proyecto se adhiere a [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added

### Fixed

### Changed

### Security

### Maintenance
`;

  let content = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf-8') : baseTemplate;
  const sectionHeader = mapTypeToChangelogSection(parsed.type);

  const scopeTag = parsed.scope ? `**${parsed.scope}:** ` : '';
  let entryText = `- ${scopeTag}${parsed.title}\n`;
  if (parsed.body) {
    const indented = parsed.body.split('\n').map(line => `  ${line}`).join('\n');
    entryText += `${indented}\n`;
  }

  if (content.includes(sectionHeader)) {
    content = content.replace(sectionHeader, `${sectionHeader}\n${entryText}`);
  } else if (content.includes('## [Unreleased]')) {
    content = content.replace('## [Unreleased]', `## [Unreleased]\n\n${sectionHeader}\n${entryText}`);
  } else {
    content = `## [Unreleased]\n\n${sectionHeader}\n${entryText}\n\n${content}`;
  }

  fs.writeFileSync(changelogPath, content, 'utf-8');
  console.log(`[OK] CHANGELOG.md actualizado: ${changelogPath}`);
}

// 2. Sincronizar README.md
function ensureReadme(parsed) {
  const readmePath = path.join(ROOT_DIR, 'README.md');
  if (!fs.existsSync(readmePath)) {
    const baseReadme = `# Proyecto

## Descripcion
Repositorio y servicios del proyecto.

## Caracteristicas
- Arquitectura modular y escalable.

## Instalacion y Uso
\`\`\`bash
npm install
npm run dev
\`\`\`

## Historial de Cambios
Consulta [CHANGELOG.md](./CHANGELOG.md) para el detalle de versiones y cambios recientes.

## Seguridad
Consulta [SECURITY.md](./SECURITY.md) para reporte de vulnerabilidades y buenas practicas.
`;
    fs.writeFileSync(readmePath, baseReadme, 'utf-8');
    console.log(`[OK] README.md inicializado: ${readmePath}`);
  } else {
    console.log(`[OK] README.md verificado: ${readmePath}`);
  }
}

// 3. Sincronizar SECURITY.md
function ensureSecurity(parsed) {
  const securityPath = path.join(ROOT_DIR, 'SECURITY.md');
  const baseSecurity = `# Politica de Seguridad

## Versiones Compatibles
| Version | Soportada |
| :--- | :--- |
| 1.0.x | :white_check_mark: |

## Reportar una Vulnerabilidad
Si detectas alguna vulnerabilidad de seguridad en este repositorio, por favor reportala de manera responsable antes de abrir una incidencia publica.

## Buenas Practicas de Seguridad
- No almacenar credenciales, llaves API ni tokens en el historial de Git.
- Utilizar variables de entorno protegidas (.env).
- Mantener dependencias actualizadas mediante auditorias regulares (\`npm audit\`).
- Implementar sanitizacion de entradas y proteccion contra ataques comunes (XSS, SQLi, CSRF).
`;

  if (!fs.existsSync(securityPath)) {
    fs.writeFileSync(securityPath, baseSecurity, 'utf-8');
    console.log(`[OK] SECURITY.md inicializado: ${securityPath}`);
  } else {
    // Si el cambio es de seguridad o auth, agregar nota si corresponde
    if (parsed.type === 'security' || parsed.scope.includes('auth') || parsed.scope.includes('sec')) {
      let content = fs.readFileSync(securityPath, 'utf-8');
      const note = `\n<!-- Actualizacion reciente: ${parsed.title} -->\n`;
      if (!content.includes(parsed.title)) {
        content += note;
        fs.writeFileSync(securityPath, content, 'utf-8');
      }
    }
    console.log(`[OK] SECURITY.md verificado: ${securityPath}`);
  }
}

function main() {
  const { title, body } = parseArgs();
  const parsed = parseCommitInfo(title, body);

  console.log(`Sincronizando documentacion para: [${parsed.type}${parsed.scope ? `(${parsed.scope})` : ''}]: ${parsed.title}`);

  updateChangelog(parsed);
  ensureReadme(parsed);
  ensureSecurity(parsed);

  console.log('Sincronizacion de documentacion completada.');
}

main();
