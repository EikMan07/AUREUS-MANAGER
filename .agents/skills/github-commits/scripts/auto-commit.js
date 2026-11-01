#!/usr/bin/env node

/**
 * Script de soporte para la skill github-commits.
 * Automatiza el flujo:
 * 1. git add (si hay cambios sin stage)
 * 2. Pre-commit sync de CHANGELOG.md, README.md y SECURITY.md mediante repo-docs-updater
 * 3. git commit con Conventional Commits (título <= 50 chars + cuerpo extenso)
 * 4. git push origin <rama> a GitHub
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function exec(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.error(`Error ejecutando: ${cmd}`);
    console.error(error.message);
    process.exit(1);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let title = '';
  let body = '';
  let push = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) {
      title = args[i + 1];
      i++;
    } else if (args[i] === '--body' && args[i + 1]) {
      body = args[i + 1];
      i++;
    } else if (args[i] === '--push') {
      push = true;
    }
  }

  return { title, body, push };
}

function main() {
  const { title, body, push } = parseArgs();

  if (!title) {
    console.error('Error: Se requiere un título para el commit (--title "<tipo>(ámbito): descripción").');
    process.exit(1);
  }

  if (title.length > 50) {
    console.warn(`[ADVERTENCIA] El título tiene ${title.length} caracteres (máx. recomendado: 50 caracteres).`);
  }

  // 1. Verificar y realizar git add si es necesario
  const status = exec('git status --porcelain');
  if (!status) {
    console.log('No hay cambios pendientes para commitear.');
    process.exit(0);
  }

  console.log('[1/4] Asegurando stage con git add...');
  exec('git add -A');

  // 2. Invocar sync de documentacion con repo-docs-updater si existe el script
  const syncScript = path.resolve(__dirname, '..', '..', 'repo-docs-updater', 'scripts', 'sync-docs.js');
  if (fs.existsSync(syncScript)) {
    console.log('[2/4] Sincronizando CHANGELOG.md, README.md y SECURITY.md con repo-docs-updater...');
    try {
      const escapedTitle = title.replace(/"/g, '\\"');
      const escapedBody = (body || '').replace(/"/g, '\\"');
      execSync(`node "${syncScript}" --title "${escapedTitle}" --body "${escapedBody}"`, { stdio: 'inherit' });
      exec('git add CHANGELOG.md README.md SECURITY.md');
    } catch (e) {
      console.warn('Nota: No se pudo ejecutar sync-docs.js automáticamente. Continuando con el commit...');
    }
  } else {
    console.log('[2/4] repo-docs-updater no encontrado. Omitiendo pre-commit sync.');
  }

  // 3. Ejecutar git commit
  console.log('[3/4] Creando commit...');
  if (body) {
    fs.writeFileSync('.git_commit_msg.tmp', `${title}\n\n${body}\n`, 'utf-8');
    exec('git commit -F .git_commit_msg.tmp');
    fs.unlinkSync('.git_commit_msg.tmp');
  } else {
    exec(`git commit -m "${title.replace(/"/g, '\\"')}"`);
  }
  console.log(`[OK] Commit creado: ${title}`);

  // 4. Ejecutar git push si fue solicitado
  if (push) {
    console.log('[4/4] Enviando a GitHub (git push)...');
    let branch = 'main';
    try {
      branch = exec('git branch --show-current');
    } catch {}
    exec(`git push origin ${branch}`);
    console.log(`[OK] Cambios enviados exitosamente a GitHub (rama: ${branch}).`);
  } else {
    console.log('[4/4] Commit listo. Para enviar a GitHub ejecuta: git push origin <rama>');
  }
}

main();
