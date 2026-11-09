#!/usr/bin/env node
/**
 * lint-backend.js — auditoría estática de un proyecto Node + Express + Sequelize + PostgreSQL.
 * Sin dependencias. Uso:  node lint-backend.js [carpeta-del-proyecto]
 * Sale con código 1 si hay errores (🔴). Las advertencias (🟡) no hacen fallar.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || process.cwd());
// `base` = carpeta del backend (si se pasa la raíz del proyecto y existe ./backend, se usa esa).
let base = root;
if (!fs.existsSync(path.join(root, 'package.json')) && fs.existsSync(path.join(root, 'backend', 'package.json'))) {
  base = path.join(root, 'backend');
}
const findings = [];
const add = (level, file, line, msg) => findings.push({ level, file: path.relative(root, file) || file, line, msg });

const walk = (dir, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'build'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|cjs|mjs|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
};
const read = (f) => fs.readFileSync(f, 'utf8');
// Quita comentarios conservando los saltos de línea (los números de línea siguen siendo correctos).
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, pre) => pre + ' '.repeat(m.length - pre.length));
const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;
const scan = (src, file, re, level, msg) => {
  let m;
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(src))) add(level, file, lineOf(src, m.index), msg);
};

// ── 0. Sequelize instalado y único ORM ─────────────────────────────────────
const pkgPath = path.join(base, 'package.json');
if (!fs.existsSync(pkgPath)) {
  add('error', pkgPath, 0, 'No hay package.json. Ejecuta scripts/ensure-sequelize.js para instalar Sequelize.');
} else {
  const pkg = JSON.parse(read(pkgPath));
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const d of ['sequelize', 'pg', 'pg-hstore'])
    if (!deps[d]) add('error', pkgPath, 0, `Falta la dependencia "${d}". Ejecuta scripts/ensure-sequelize.js.`);
  if (!deps['sequelize-cli']) add('warn', pkgPath, 0, 'Falta sequelize-cli (devDependency) para migraciones.');
  const otros = ['prisma', '@prisma/client', 'typeorm', 'knex', 'drizzle-orm', 'mongoose', 'objection', '@mikro-orm/core', 'bookshelf'];
  for (const o of otros) if (deps[o]) add('error', pkgPath, 0, `Otro ORM detectado ("${o}"). El proyecto usa SOLO Sequelize.`);
  const hayAuth = ['src/models/usuario.js', 'src/controllers/authController.js', 'models/usuario.js']
    .some((f) => fs.existsSync(path.join(base, f)));
  if (hayAuth) {
    if (!deps['jsonwebtoken']) add('error', pkgPath, 0, 'Hay autenticación pero falta "jsonwebtoken".');
    if (!deps['bcrypt'] && !deps['bcryptjs']) add('error', pkgPath, 0, 'Hay usuarios pero falta bcrypt/bcryptjs: las contraseñas deben cifrarse.');
    if (!deps['dotenv']) add('warn', pkgPath, 0, 'Falta "dotenv" para leer .env (JWT_SECRET, conexión a BD).');
    if (!deps['cors']) add('warn', pkgPath, 0, 'Falta "cors" para que el front pueda llamar al backend.');
  }
}

// ── 1. Config ──────────────────────────────────────────────────────────────
const cfg = path.join(base, 'config', 'config.json');
if (fs.existsSync(cfg)) {
  const src = read(cfg);
  if (!/"dialect"\s*:\s*"postgres"/.test(src)) add('error', cfg, 0, 'El dialect no es "postgres".');
  if (/"password"\s*:\s*"[^"]+"/.test(src)) add('warn', cfg, 0, 'Contraseña en texto plano en config.json: usa variables de entorno y no la subas al repositorio.');
}

const files = walk(root);
const rel = (f) => path.relative(root, f).split(path.sep);
const inDir = (f, d) => rel(f).includes(d);

for (const f of files) {
  const src = stripComments(read(f));

  // ── Migraciones ──────────────────────────────────────────────────────────
  if (inDir(f, 'migrations')) {
    if (!/\bup\s*[:(]/.test(src)) add('error', f, 1, 'La migración no define up.');
    if (!/\bdown\s*[:(]/.test(src)) add('error', f, 1, 'La migración no define down (debe ser reversible).');
    else if (/down\s*(?::\s*async\s*)?\([^)]*\)\s*(?:=>)?\s*\{\s*\}/.test(src)) add('warn', f, 1, 'down está vacío: no revierte nada.');
    // Lo destructivo en `up` es riesgoso; en `down` de una migración que crea es lo normal.
    const downIdx = src.search(/\bdown\s*[:(]/);
    const upPart = downIdx > -1 ? src.slice(0, downIdx) : src;
    scan(upPart, f, /\b(dropTable|removeColumn)\s*\(/, 'warn', 'Operación destructiva en up: confirma respaldo (pg_dump) y que nada más use esa tabla/columna.');
    scan(upPart, f, /\bTRUNCATE\b|\bDROP\s+TABLE\b|\bDROP\s+COLUMN\b/i, 'warn', 'SQL destructivo en up: confirma respaldo (pg_dump).');
    if (/references\s*:/.test(src) && !/addIndex\s*\(/.test(src) && /createTable\s*\(/.test(src))
      add('warn', f, 1, 'Hay FKs pero ningún addIndex: PostgreSQL no indexa las FKs automáticamente.');
    if (/Sequelize\.ENUM\s*\(/.test(src) && !/DROP\s+TYPE/i.test(src))
      add('warn', f, 1, 'ENUM sin DROP TYPE en down: el tipo queda huérfano en PostgreSQL.');
    if (/createTable\s*\(/.test(src) && !/primaryKey\s*:\s*true/.test(src) && !/addConstraint\s*\(/.test(src))
      add('warn', f, 1, 'createTable sin primaryKey visible: toda tabla debe tener PK (1FN).');
    if (/createTable\s*\(/.test(src) && !/createdAt/.test(src))
      add('warn', f, 1, 'createTable sin createdAt/updatedAt: el modelo con timestamps fallará.');
  }

  // ── sync peligroso ───────────────────────────────────────────────────────
  scan(src, f, /\.sync\s*\(\s*\{[^}]*\bforce\s*:\s*true/, 'error', 'sequelize.sync({ force: true }) borra y recrea las tablas. Usa migraciones.');
  scan(src, f, /\.sync\s*\(\s*\{[^}]*\balter\s*:\s*true/, 'error', 'sequelize.sync({ alter: true }) puede borrar columnas. Usa migraciones.');
  scan(src, f, /\.sync\s*\(\s*\)/, 'warn', 'sequelize.sync(): la estructura debe crearla solo la migración.');

  // ── Borrados masivos ─────────────────────────────────────────────────────
  scan(src, f, /\.destroy\s*\(\s*\{\s*(truncate\s*:\s*true|where\s*:\s*\{\s*\})/, 'error', 'Borrado masivo (destroy sin filtro o truncate).');
  scan(src, f, /\.update\s*\([^)]*,\s*\{\s*where\s*:\s*\{\s*\}\s*\}/, 'error', 'UPDATE masivo sin filtro.');

  // ── Modelos ──────────────────────────────────────────────────────────────
  if (inDir(f, 'models') || inDir(f, 'migrations')) {
    scan(src, f, /\b\w+\.(FLOAT|DOUBLE|REAL)\b/, 'warn', 'FLOAT/DOUBLE: para dinero usa DECIMAL(10,2).');
    // 1FN: columnas numeradas tipo telefono1, telefono2
    scan(src, f, /^\s*([a-zA-Z_]+?)_?[1-9]\s*:\s*\{\s*type/m, 'warn', 'Posible grupo repetitivo (columna numerada tipo telefono1/telefono2): viola 1FN, usa una tabla hija.');
    // 1FN: columnas plurales STRING/TEXT que parecen listas
    scan(src, f, /^\s*(telefonos|correos|emails|alergias|etiquetas|tags|categorias|medicamentos|hobbies|items)\s*:\s*\{\s*type\s*:\s*\w+\.(STRING|TEXT)/mi, 'warn', 'Columna plural de texto: ¿guarda una lista separada por comas? Viola 1FN.');
    // 3FN: nombre de entidad relacionada repetido
    scan(src, f, /^\s*(\w+)Nombre\s*:\s*\{\s*type/m, 'warn', 'Columna "<entidad>Nombre": posible dependencia transitiva (3FN). Si ya tienes la FK, no repitas el nombre.');
    scan(src, f, /^\s*(\w+_nombre)\s*:\s*\{\s*type/m, 'warn', 'Columna "<entidad>_nombre": posible dependencia transitiva (3FN).');
  }

  // ── Controladores y rutas ────────────────────────────────────────────────
  if (inDir(f, 'controllers') || inDir(f, 'routes')) {
    scan(src, f, /\.(create|bulkCreate)\s*\(\s*req\.body\s*[,)]/, 'warn', 'create(req.body) sin filtrar campos (mass assignment): selecciona los campos permitidos.');
    scan(src, f, /\.update\s*\(\s*req\.body\s*[,)]/, 'warn', 'update(req.body) sin filtrar campos (mass assignment).');

    // async sin try/catch (heurística por función)
    const re = /(exports\.\w+|const\s+\w+)\s*=\s*async\s*\(\s*req\s*,\s*res[^)]*\)\s*=>\s*\{/g;
    let m;
    while ((m = re.exec(src))) {
      const start = m.index + m[0].length;
      let depth = 1, i = start;
      while (i < src.length && depth > 0) { if (src[i] === '{') depth++; else if (src[i] === '}') depth--; i++; }
      const body = src.slice(start, i);
      if (!/\btry\s*\{/.test(body) && /\bawait\b/.test(body))
        add('warn', f, lineOf(src, m.index), `Handler async sin try/catch (${m[1]}): un error de BD tumbaría la petición.`);
      if (/findByPk\s*\(/.test(body) && !/404/.test(body))
        add('warn', f, lineOf(src, m.index), `${m[1]} usa findByPk sin responder 404 cuando no existe.`);
    }
  }

  // ── Autenticación y seguridad ─────────────────────────────────────────────
  const nombre = path.basename(f);
  if (/jwt\.(sign|verify)\s*\(/.test(src) && !/JWT_SECRET/.test(src))
    add('error', f, 1, 'JWT sin process.env.JWT_SECRET: el secreto debe vivir en .env, no en el código.');
  {
    const re = /jwt\.sign\s*\(/g;
    let m;
    while ((m = re.exec(src))) {
      const trozo = src.slice(m.index, m.index + 400).split(';')[0];
      if (!/expiresIn/.test(trozo)) add('error', f, lineOf(src, m.index), 'jwt.sign sin expiresIn: el token debe expirar (25 min por inactividad).');
    }
  }
  scan(src, f, /jwt\.(sign|verify)\s*\([^;]*?,\s*(['"`])[^'"`$]{3,}\2/, 'error', 'Secreto JWT escrito en el código: usa process.env.JWT_SECRET (.env).');
  scan(src, f, /expiresIn\s*:\s*['"`](?!25m['"`])[^'"`]+['"`]/, 'warn', 'expiresIn distinto de 25m: la sesión debe expirar a los 25 min de inactividad (usa JWT_EXPIRES_IN=25m).');
  scan(src, f, /console\.(log|info|debug)\([^)]*password/i, 'warn', 'console.log con una contraseña: no registres claves, ni siquiera en desarrollo.');
  scan(src, f, /\bpassword\s*={2,3}\s*[\w.]+/, 'warn', 'Comparación directa de contraseñas: usa bcrypt.compare.');
  if (/^usuario\.js$/i.test(nombre) && inDir(f, 'models')) {
    if (!/bcrypt/.test(src)) add('error', f, 1, 'El modelo Usuario no cifra la contraseña con bcrypt.');
    if (!/exclude\s*:\s*\[[^\]]*password/.test(src) && !/toJSON/.test(src))
      add('error', f, 1, 'El modelo Usuario no oculta password (defaultScope con exclude o toJSON).');
    scan(src, f, /^\s*(rol|role|roles)\s*:/mi, 'warn', 'Roles/permisos están fuera de alcance: basta usuario autenticado / no autenticado.');
  }
  if (inDir(f, 'routes') && !f.endsWith('.jsx') && f.startsWith(base + path.sep) && !/auth/i.test(nombre) && !/authMiddleware/.test(src))
    add('warn', f, 1, 'Rutas sin authMiddleware: solo registro y login deben ser públicas.');

  // ── Front: sesión solo en AuthContext, nunca en localStorage ──────────────
  scan(src, f, /\b(localStorage|sessionStorage)\.(setItem|getItem)\s*\(\s*['"`][^'"`]*(token|jwt|usuario|user|auth|sesion|session)[^'"`]*['"`]/i, 'error', 'Datos de sesión en localStorage/sessionStorage: guárdalos solo en AuthContext (memoria).');
  scan(src, f, /document\.cookie\s*=\s*[^;]*(token|jwt)/i, 'error', 'Token en document.cookie legible por JS: guárdalo solo en AuthContext (memoria).');
  if (/AuthContext/.test(nombre)) {
    if (!/25\s*\*\s*60\s*\*\s*1000|1500000|1_500_000/.test(src))
      add('warn', f, 1, 'AuthContext sin temporizador de inactividad de 25 min (25 * 60 * 1000).');
    if (!/createContext/.test(src)) add('warn', f, 1, 'AuthContext no usa createContext.');
  }

  // ── SQL crudo inseguro ───────────────────────────────────────────────────
  scan(src, f, /\.query\s*\(\s*`[^`]*\$\{/, 'error', 'sequelize.query con interpolación ${}: riesgo de inyección SQL. Usa replacements/bind.');
  scan(src, f, /\.query\s*\(\s*(['"])[^'"]*\1\s*\+/, 'error', 'sequelize.query concatenando strings: riesgo de inyección SQL. Usa replacements/bind.');
}

// ── Estructura ───────────────────────────────────────────────────────────────


// ── Estructura obligatoria: backend/.env + backend/src/{models,controllers,routes,middlewares}, app.js ──
const exists = (...p) => fs.existsSync(path.join(base, ...p));
const listar = (d) => (fs.existsSync(path.join(base, d)) ? fs.readdirSync(path.join(base, d)) : []);
const tieneArchivo = (d, rx) => listar(d).some((f) => rx.test(f));
if (!exists('src')) {
  add('error', path.join(base, 'src'), 0, 'Falta backend/src/. Estructura obligatoria: src/{models,controllers,routes,middlewares} y src/app.js.');
} else {
  for (const d of ['models', 'controllers', 'routes', 'middlewares'])
    if (!exists('src', d)) add('error', path.join(base, 'src', d), 0, `Falta src/${d}/ (estructura obligatoria).`);
  if (!exists('src', 'app.js')) add('error', path.join(base, 'src', 'app.js'), 0, 'Falta src/app.js (la configuración de Express va dentro de src/).');
  if (!tieneArchivo('src/models', /^usuario\.js$/i)) add('warn', path.join(base, 'src', 'models'), 0, 'Falta models/usuario.js.');
  if (!tieneArchivo('src/controllers', /^authController\.js$/i)) add('warn', path.join(base, 'src', 'controllers'), 0, 'Falta controllers/authController.js.');
  if (!tieneArchivo('src/routes', /^authRoutes\.js$/i)) add('warn', path.join(base, 'src', 'routes'), 0, 'Falta routes/authRoutes.js.');
  if (!tieneArchivo('src/middlewares', /^authMiddleware\.js$/i)) add('warn', path.join(base, 'src', 'middlewares'), 0, 'Falta middlewares/authMiddleware.js.');
  if (!tieneArchivo('src/middlewares', /^validaciones/i)) add('warn', path.join(base, 'src', 'middlewares'), 0, 'Falta middlewares/validaciones.js.');
}
if (exists('app.js') && !exists('src', 'app.js')) add('warn', path.join(base, 'app.js'), 0, 'app.js está fuera de src/: muévelo a src/app.js.');

// .env: existe, no se versiona, y hay un ejemplo
const gitignores = [path.join(base, '.gitignore'), path.join(root, '.gitignore')].filter((g) => fs.existsSync(g));
const envIgnorado = gitignores.some((g) => /^\/?(backend\/)?\.env\s*$/m.test(read(g)));
if (exists('.env')) {
  if (!envIgnorado) add('error', path.join(base, '.gitignore'), 0, '.env no está en .gitignore: nunca se sube al repositorio.');
  const envTxt = read(path.join(base, '.env'));
  for (const k of ['PUERTO', 'JWT_SECRET'])
    if (!new RegExp(`^${k}=.+`, 'm').test(envTxt)) add('warn', path.join(base, '.env'), 0, `Falta ${k} en .env.`);
  if (!/^DB_(NAME|HOST|USER)=|^DATABASE_URL=/m.test(envTxt)) add('warn', path.join(base, '.env'), 0, 'Falta la conexión a la BD en .env.');
  const m = envTxt.match(/^JWT_SECRET=(.*)$/m);
  if (m && m[1].trim().length < 32) add('warn', path.join(base, '.env'), 0, 'JWT_SECRET demasiado corto (usa ≥ 32 caracteres aleatorios).');
} else {
  add('warn', path.join(base, '.env'), 0, 'No hay .env (PUERTO, conexión a BD, JWT_SECRET).');
}
if (!exists('.env.example')) add('warn', path.join(base, '.env.example'), 0, 'Falta .env.example (plantilla sin secretos reales).');

// Front con React: debe existir AuthContext
const hayReact = files.some((f) => f.endsWith('.jsx'));
if (hayReact && !files.some((f) => /AuthContext/.test(path.basename(f))))
  add('warn', root, 0, 'Hay front React pero no existe AuthContext: la sesión debe vivir en un AuthContext (memoria).');

// ── Reporte ──────────────────────────────────────────────────────────────────
const errs = findings.filter((x) => x.level === 'error');
const warns = findings.filter((x) => x.level === 'warn');
const fmt = (x) => `  ${x.level === 'error' ? '🔴' : '🟡'} ${x.file}${x.line ? ':' + x.line : ''}  ${x.msg}`;
console.log(`\nbackend-postgres-guardian · auditoría de ${root}\n`);
if (!findings.length) console.log('  🟢 Sin hallazgos.');
errs.forEach((x) => console.log(fmt(x)));
warns.forEach((x) => console.log(fmt(x)));
console.log(`\nResumen: ${errs.length} error(es), ${warns.length} advertencia(s).`);
process.exit(errs.length ? 1 : 0);
