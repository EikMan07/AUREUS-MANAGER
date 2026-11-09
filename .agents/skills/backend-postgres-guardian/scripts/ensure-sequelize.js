#!/usr/bin/env node
/**
 * ensure-sequelize.js
 * Verifica que Sequelize (único ORM permitido) y las dependencias de autenticación estén
 * instalados en el backend, y lo instala automáticamente si faltan. Idempotente.
 * Crea la estructura obligatoria:  backend/.env  y  backend/src/{models,controllers,routes,middlewares}
 *
 * Uso:  node ensure-sequelize.js [--dir <carpeta-del-proyecto>] [--scaffold] [--dry-run]
 *   --dir       carpeta del proyecto (por defecto la actual; si existe ./backend se usa esa)
 *   --scaffold  copia las plantillas base (app.js, usuario, auth, middlewares, .env.example...)
 *               SIN sobrescribir archivos existentes
 *   --dry-run   muestra lo que haría sin cambiar nada
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const dirIdx = args.indexOf('--dir');
const dryRun = args.includes('--dry-run');
const scaffold = args.includes('--scaffold');

let root = path.resolve(dirIdx !== -1 ? args[dirIdx + 1] : process.cwd());
// Si se ejecuta desde la raíz del proyecto y existe backend/, se trabaja ahí.
if (!fs.existsSync(path.join(root, 'package.json')) && fs.existsSync(path.join(root, 'backend'))) {
  root = path.join(root, 'backend');
}
if (path.basename(root) !== 'backend' && fs.existsSync(path.join(root, 'backend', 'package.json'))) {
  root = path.join(root, 'backend');
}

const SKILL_DIR = path.resolve(__dirname, '..');
const TPL = path.join(SKILL_DIR, 'assets', 'templates', 'backend');

const log = (m) => console.log(`[ensure-sequelize] ${m}`);
const run = (cmd) => {
  log(`> ${cmd}`);
  if (!dryRun) execSync(cmd, { cwd: root, stdio: 'inherit' });
};

log(`Proyecto backend: ${root}`);
if (!fs.existsSync(root) && !dryRun) fs.mkdirSync(root, { recursive: true });

// 1. Gestor de paquetes
let pm = 'npm';
if (fs.existsSync(path.join(root, 'pnpm-lock.yaml'))) pm = 'pnpm';
else if (fs.existsSync(path.join(root, 'yarn.lock'))) pm = 'yarn';
const install = (pkgs, dev = false) => {
  if (!pkgs.length) return;
  const list = pkgs.join(' ');
  if (pm === 'npm') run(`npm install ${dev ? '--save-dev ' : ''}${list}`);
  else if (pm === 'pnpm') run(`pnpm add ${dev ? '-D ' : ''}${list}`);
  else run(`yarn add ${dev ? '-D ' : ''}${list}`);
};

// 2. package.json
const pkgPath = path.join(root, 'package.json');
if (!fs.existsSync(pkgPath)) {
  log('No existe package.json: se crea con npm init -y');
  run('npm init -y');
}
const pkg = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, 'utf8')) : {};
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

// 3. Aviso si hay otro ORM (no se elimina nada automáticamente)
const otros = ['prisma', '@prisma/client', 'typeorm', 'knex', 'drizzle-orm', 'mongoose', 'objection', 'mikro-orm', '@mikro-orm/core', 'bookshelf'];
const encontrados = otros.filter((o) => deps[o]);
if (encontrados.length) {
  log(`AVISO: se detectó otro ORM (${encontrados.join(', ')}). Este proyecto usa SOLO Sequelize. No se elimina nada automáticamente: consulta al usuario antes de migrar.`);
}

// 4. Dependencias necesarias (bcrypt o bcryptjs: cualquiera sirve)
const hayBcrypt = deps['bcrypt'] || deps['bcryptjs'];
const faltanProd = ['sequelize', 'pg', 'pg-hstore', 'express', 'cors', 'dotenv', 'jsonwebtoken']
  .concat(hayBcrypt ? [] : ['bcryptjs'])
  .filter((d) => !deps[d]);
const faltanDev = ['sequelize-cli', 'nodemon'].filter((d) => !deps[d]);
if (!faltanProd.length && !faltanDev.length) log('Sequelize y sus dependencias ya están instalados.');
install(faltanProd);
install(faltanDev, true);

// 5. Estructura obligatoria: backend/src/{models,controllers,routes,middlewares} (+ config, migrations, seeders)
for (const d of ['src/models', 'src/controllers', 'src/routes', 'src/middlewares', 'src/config', 'src/migrations', 'src/seeders']) {
  const p = path.join(root, d);
  if (!fs.existsSync(p)) {
    log(`Se crea la carpeta ${d}/`);
    if (!dryRun) fs.mkdirSync(p, { recursive: true });
  }
}

// 6. Scaffold: copia plantillas sin sobrescribir
const copiar = (origen, destino) => {
  const dst = path.join(root, destino);
  if (fs.existsSync(dst)) return log(`Ya existe ${destino} (no se sobrescribe)`);
  if (!fs.existsSync(origen)) return log(`Plantilla no encontrada: ${origen}`);
  log(`Se crea ${destino}`);
  if (!dryRun) {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(origen, dst);
  }
};
if (scaffold) {
  const mapa = [
    ['env.example', '.env.example'],
    ['sequelizerc.template', '.sequelizerc'],
    ['src/config/config.template.js', 'src/config/config.js'],
    ['src/models/index.template.js', 'src/models/index.js'],
    ['src/models/usuario.template.js', 'src/models/usuario.js'],
    ['src/controllers/authController.template.js', 'src/controllers/authController.js'],
    ['src/routes/authRoutes.template.js', 'src/routes/authRoutes.js'],
    ['src/middlewares/authMiddleware.template.js', 'src/middlewares/authMiddleware.js'],
    ['src/middlewares/validaciones.template.js', 'src/middlewares/validaciones.js'],
  ];
  mapa.forEach(([o, d]) => copiar(path.join(TPL, o), d));

  // La migración de usuarios lleva fecha en el nombre; solo si no hay ninguna migración de usuarios.
  const migDir = path.join(root, 'src', 'migrations');
  const hayMigUsuarios = fs.existsSync(migDir) && fs.readdirSync(migDir).some((f) => /usuario/i.test(f));
  if (!hayMigUsuarios) {
    const sello = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    copiar(path.join(TPL, 'src/migrations/create-usuarios.template.js'), `src/migrations/${sello}-create-usuarios.js`);
  }

  // app.js solo si no existe (nunca se pisa un app.js existente). Ojo: la plantilla importa
  // ./routes/entidadRoutes como ejemplo: se deja solo la parte de auth.
  const appDst = path.join(root, 'src', 'app.js');
  if (!fs.existsSync(appDst)) {
    log('Se crea src/app.js (solo /auth; registra tus routers de entidades debajo)');
    if (!dryRun) {
      const tpl = fs.readFileSync(path.join(TPL, 'src/app.template.js'), 'utf8')
        .replace(/const entidadRoutes = .*\n/, '')
        .replace(/app\.use\('\/entidades'.*\n/, '');
      fs.writeFileSync(appDst, tpl);
    }
  } else log('Ya existe src/app.js (no se sobrescribe)');

  // .env real a partir del ejemplo (para desarrollo local) y .gitignore
  const envDst = path.join(root, '.env');
  if (!fs.existsSync(envDst) && !dryRun && fs.existsSync(path.join(root, '.env.example'))) {
    // El .env local recibe un JWT_SECRET aleatorio real; el .env.example conserva el texto de ejemplo.
    const secreto = require('crypto').randomBytes(48).toString('hex');
    const ejemplo = fs.readFileSync(path.join(root, '.env.example'), 'utf8')
      .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secreto}`);
    fs.writeFileSync(envDst, ejemplo);
    log('Se crea .env a partir de .env.example con un JWT_SECRET aleatorio. COMPLETA las credenciales de la BD.');
  }
}

// 7. .gitignore: el .env nunca se sube
const gi = path.join(root, '.gitignore');
const giTxt = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : '';
if (!/^\.env\s*$/m.test(giTxt)) {
  log('Se agrega .env (y node_modules) a .gitignore');
  if (!dryRun) fs.appendFileSync(gi, `${giTxt && !giTxt.endsWith('\n') ? '\n' : ''}.env\nnode_modules/\n`);
}

// 8. package.json: main y scripts
if (fs.existsSync(pkgPath) && !dryRun) {
  const p = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  let cambio = false;
  if (p.main !== 'src/app.js') { p.main = 'src/app.js'; cambio = true; }
  p.scripts = p.scripts || {};
  if (!p.scripts.start) { p.scripts.start = 'node src/app.js'; cambio = true; }
  if (!p.scripts.dev) { p.scripts.dev = 'nodemon src/app.js'; cambio = true; }
  if (cambio) { fs.writeFileSync(pkgPath, JSON.stringify(p, null, 2) + '\n'); log('package.json: main y scripts start/dev apuntan a src/app.js'); }
}

log(dryRun ? 'Simulación terminada (no se cambió nada).' : 'Listo: Sequelize instalado y estructura backend/src creada.');
log('Siguiente: completa .env, crea la BD (npx sequelize-cli db:create) y corre las migraciones (npx sequelize-cli db:migrate).');
