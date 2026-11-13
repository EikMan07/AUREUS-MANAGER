import bcryptjs from 'bcryptjs';
import { query } from '../config/db.js';

let cachedCobradorId = null;

const LEGACY_PLACEHOLDER_HASH = '$2b$10$DhodtYjkyU5xdN.MBCjUIedFSdDTpG/8IUj4K/NNxYnJWfxcBdQIG';

async function ensureUsuariosAuthColumns() {
  await query(`
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS codigo_vinculacion varchar(24),
      ADD COLUMN IF NOT EXISTS foto_url text,
      ADD COLUMN IF NOT EXISTS ultimo_acceso timestamptz;
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_codigo_vinculacion
      ON usuarios (codigo_vinculacion)
      WHERE codigo_vinculacion IS NOT NULL;
  `);

  await query(`
    UPDATE usuarios
    SET codigo_vinculacion = 'CF-' || UPPER(SUBSTRING(id::text FROM 1 FOR 8))
    WHERE codigo_vinculacion IS NULL OR BTRIM(codigo_vinculacion) = '';
  `);
}

async function ensureAdminPassword(adminUser) {
  const hash = String(adminUser?.password_hash || '');
  const isValidPrefix = hash.startsWith('$2a$') || hash.startsWith('$2b$');
  const isLegacyPlaceholder = hash === LEGACY_PLACEHOLDER_HASH;

  if (!isValidPrefix || isLegacyPlaceholder) {
    const newHash = await bcryptjs.hash('Admin1234!', 10);
    await query(
      `UPDATE usuarios
       SET password_hash = $1,
           estado_cuenta = 'ACTIVA',
           correo_verificado = true,
           correo_verificado_en = COALESCE(correo_verificado_en, now()),
           actualizado_en = now()
       WHERE id = $2;`,
      [newHash, adminUser.id]
    );
    console.log(`[Semilla Técnica] Credenciales seguras bcrypt inicializadas para administrador: ${adminUser.usuario}`);
  }
}

export async function ensureBaseUser() {
  try {
    await ensureUsuariosAuthColumns();

    const { rows: users } = await query(
      "SELECT id, usuario, rol, estado_cuenta, password_hash FROM usuarios WHERE rol = 'ADMINISTRADOR' ORDER BY creado_en ASC LIMIT 1;"
    );

    if (users.length > 0) {
      await ensureAdminPassword(users[0]);
      cachedCobradorId = users[0].id;
      console.log(`[Semilla Técnica] Usuario base verificado: ${users[0].usuario} (${users[0].id})`);
      return cachedCobradorId;
    }

    const { rows: fallbackUsers } = await query(
      'SELECT id, usuario, rol, estado_cuenta, password_hash FROM usuarios ORDER BY creado_en ASC LIMIT 1;'
    );

    if (fallbackUsers.length > 0) {
      cachedCobradorId = fallbackUsers[0].id;
      console.log(`[Semilla Técnica] Usuario base verificado: ${fallbackUsers[0].usuario} (${fallbackUsers[0].id})`);
      return cachedCobradorId;
    }

    console.log('[Semilla Técnica] No hay usuarios en cobro_firme_db. Creando usuario cobrador base admin...');
    const initialAdminHash = await bcryptjs.hash('Admin1234!', 10);
    const insertSql = `
      INSERT INTO usuarios (
        usuario,
        nombre_completo,
        correo,
        correo_verificado,
        correo_verificado_en,
        password_hash,
        rol,
        estado_cuenta
      ) VALUES (
        'admin',
        'Administrador Cobro-Firme',
        'admin@aureus.cr',
        true,
        now(),
        $1,
        'ADMINISTRADOR',
        'ACTIVA'
      )
      RETURNING id, usuario;
    `;

    const { rows: newUsers } = await query(insertSql, [initialAdminHash]);
    await query(
      `UPDATE usuarios
       SET codigo_vinculacion = 'CF-' || UPPER(SUBSTRING(id::text FROM 1 FOR 8))
       WHERE id = $1 AND (codigo_vinculacion IS NULL OR BTRIM(codigo_vinculacion) = '');`,
      [newUsers[0].id]
    );
    cachedCobradorId = newUsers[0].id;
    console.log(`[Semilla Técnica] Usuario base creado con éxito: ${newUsers[0].usuario} (${newUsers[0].id}). No se agregaron clientes ni préstamos de prueba.`);
    return cachedCobradorId;
  } catch (err) {
    console.error('[Semilla Técnica] Error al verificar/crear usuario base:', err.message);
    throw err;
  }
}

export async function getDefaultCobradorId() {
  if (cachedCobradorId) return cachedCobradorId;
  return await ensureBaseUser();
}
