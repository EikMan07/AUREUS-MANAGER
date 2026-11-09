import { query } from '../config/db.js';

let cachedCobradorId = null;

export async function ensureBaseUser() {
  try {
    const { rows: users } = await query(
      "SELECT id, usuario, rol, estado_cuenta FROM usuarios WHERE rol = 'ADMINISTRADOR' ORDER BY creado_en ASC LIMIT 1;"
    );

    if (users.length > 0) {
      cachedCobradorId = users[0].id;
      console.log(`[Semilla Técnica] Usuario base verificado: ${users[0].usuario} (${users[0].id})`);
      return cachedCobradorId;
    }

    const { rows: fallbackUsers } = await query(
      'SELECT id, usuario, rol, estado_cuenta FROM usuarios ORDER BY creado_en ASC LIMIT 1;'
    );

    if (fallbackUsers.length > 0) {
      cachedCobradorId = fallbackUsers[0].id;
      console.log(`[Semilla Técnica] Usuario base verificado: ${fallbackUsers[0].usuario} (${fallbackUsers[0].id})`);
      return cachedCobradorId;
    }

    console.log('[Semilla Técnica] No hay usuarios en cobro_firme_db. Creando usuario cobrador base admin...');
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
        'admin@cobrofirme.cr',
        true,
        now(),
        '$2b$10$DhodtYjkyU5xdN.MBCjUIedFSdDTpG/8IUj4K/NNxYnJWfxcBdQIG',
        'ADMINISTRADOR',
        'ACTIVA'
      )
      RETURNING id, usuario;
    `;

    const { rows: newUsers } = await query(insertSql);
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
