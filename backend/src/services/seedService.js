import bcryptjs from 'bcryptjs';
import { query } from '../config/db.js';

let cachedCobradorId = null;

const LEGACY_PLACEHOLDER_HASH = '$2b$10$DhodtYjkyU5xdN.MBCjUIedFSdDTpG/8IUj4K/NNxYnJWfxcBdQIG';

async function ensureUsuariosAuthColumns() {
  await query(`
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS codigo_vinculacion varchar(24),
      ADD COLUMN IF NOT EXISTS foto_url text,
      ADD COLUMN IF NOT EXISTS ultimo_acceso timestamptz,
      ADD COLUMN IF NOT EXISTS consentimiento_aceptado boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS consentimiento_version varchar(24) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS consentimiento_aceptado_en timestamptz DEFAULT NULL;
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

export async function ensureAgendaDelegacionColumns() {
  await query(`
    ALTER TABLE agenda_cobros
      ADD COLUMN IF NOT EXISTS compartido_con_usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS compartido_por_usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS compartido_en timestamptz,
      ADD COLUMN IF NOT EXISTS gestionado_por_usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS gestionado_accion varchar(30),
      ADD COLUMN IF NOT EXISTS gestionado_en timestamptz;
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_agenda_cobros_compartido_fecha
      ON agenda_cobros(compartido_con_usuario_id, fecha_cobro_actual);
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

async function desvincularCarteraAdministrador(adminId) {
  if (!adminId) return;

  // Garantizar que únicamente el usuario admin principal tenga rol = 'ADMINISTRADOR'
  await query(
    `UPDATE usuarios
     SET rol = 'ADMINISTRADOR',
         estado_cuenta = 'ACTIVA',
         consentimiento_aceptado = true,
         consentimiento_version = COALESCE(consentimiento_version, 'v1.0-2026'),
         consentimiento_aceptado_en = COALESCE(consentimiento_aceptado_en, now())
     WHERE id = $1::uuid;`,
    [adminId]
  );

  await query(
    `UPDATE usuarios
     SET rol = 'COBRADOR'
     WHERE id <> $1::uuid AND rol = 'ADMINISTRADOR';`,
    [adminId]
  );

  // Limpiar cualquier registro de cartera de prestamista asociado a la cuenta administrativa
  await query(
    'DELETE FROM historial_pasar_dia WHERE prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = $1::uuid);',
    [adminId]
  );
  await query(
    'DELETE FROM cobros_compartidos_dia WHERE propietario_id = $1::uuid OR destinatario_id = $1::uuid;',
    [adminId]
  );
  await query(
    'DELETE FROM pagos_prestamo WHERE cobrador_id = $1::uuid OR prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = $1::uuid);',
    [adminId]
  );
  await query(
    'DELETE FROM arreglos_pago WHERE prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = $1::uuid);',
    [adminId]
  );
  await query(
    'DELETE FROM renovaciones_prestamo WHERE prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = $1::uuid);',
    [adminId]
  );
  await query('DELETE FROM agenda_cobros WHERE cobrador_id = $1::uuid;', [adminId]);
  await query('DELETE FROM prestamos WHERE cobrador_id = $1::uuid;', [adminId]);
  await query('DELETE FROM prestamos_baneados WHERE cobrador_id = $1::uuid;', [adminId]);
  await query('DELETE FROM clientes_baneados WHERE cobrador_id = $1::uuid;', [adminId]);
  await query('DELETE FROM lista_negra WHERE cobrador_id = $1::uuid;', [adminId]);
  await query(
    'DELETE FROM historial_prestamos_archivo WHERE archivo_id IN (SELECT id FROM historial_clientes_archivo WHERE cobrador_id = $1::uuid);',
    [adminId]
  );
  await query('DELETE FROM historial_clientes_archivo WHERE cobrador_id = $1::uuid;', [adminId]);
  await query('DELETE FROM clientes WHERE cobrador_id = $1::uuid;', [adminId]);
}

async function purgarCuentasPruebaQA() {
  // Asegurar que la cuenta del único prestamista inicial Eiker Abarca Murillo esté ACTIVA como COBRADOR
  await query(`
    UPDATE usuarios
    SET rol = 'COBRADOR',
        estado_cuenta = 'ACTIVA',
        ultimo_acceso = COALESCE(ultimo_acceso, now()),
        actualizado_en = now()
    WHERE LOWER(TRIM(correo)) = 'abarkei07@gmail.com'
       OR nombre_completo ILIKE '%Eiker%Abarca%Murillo%';
  `);

  // Eliminar en cascada TODAS las cuentas con rol <> 'ADMINISTRADOR' excepto Eiker Abarca Murillo
  const { rows: extraUsers } = await query(`
    SELECT id FROM usuarios
    WHERE rol <> 'ADMINISTRADOR'
      AND LOWER(TRIM(correo)) <> 'abarkei07@gmail.com'
      AND NOT (nombre_completo ILIKE '%Eiker%Abarca%Murillo%');
  `);

  const ids = extraUsers.map((r) => r.id);
  if (ids.length === 0) return;

  await query(`DELETE FROM verificaciones_correo WHERE usuario_id = ANY($1::uuid[]);`, [ids]);
  await query(`DELETE FROM credenciales_webauthn WHERE usuario_id = ANY($1::uuid[]);`, [ids]);
  await query(`DELETE FROM suscripciones_push WHERE usuario_id = ANY($1::uuid[]);`, [ids]);
  await query(`DELETE FROM notificaciones WHERE usuario_id = ANY($1::uuid[]);`, [ids]);
  await query(`DELETE FROM metricas_diarias_resumen WHERE cobrador_id = ANY($1::uuid[]);`, [ids]);
  await query(
    `DELETE FROM contactos_cobradores WHERE propietario_id = ANY($1::uuid[]) OR contacto_usuario_id = ANY($1::uuid[]);`,
    [ids]
  );
  await query(
    `DELETE FROM transferencias_cartera WHERE cobrador_origen_id = ANY($1::uuid[]) OR cobrador_destino_id = ANY($1::uuid[]) OR realizado_por = ANY($1::uuid[]);`,
    [ids]
  );
  await query(
    `DELETE FROM lista_negra_global WHERE compartida_por = ANY($1::uuid[]) OR cobrador_origen_id = ANY($1::uuid[]) OR retirada_por = ANY($1::uuid[]);`,
    [ids]
  );
  await query(
    `DELETE FROM historial_pasar_dia WHERE prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = ANY($1::uuid[]));`,
    [ids]
  );
  await query(
    `DELETE FROM cobros_compartidos_dia WHERE propietario_id = ANY($1::uuid[]) OR destinatario_id = ANY($1::uuid[]);`,
    [ids]
  );
  await query(
    `DELETE FROM pagos_prestamo WHERE cobrador_id = ANY($1::uuid[]) OR registrado_por = ANY($1::uuid[]) OR prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = ANY($1::uuid[]));`,
    [ids]
  );
  await query(
    `DELETE FROM arreglos_pago WHERE prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = ANY($1::uuid[]));`,
    [ids]
  );
  await query(
    `DELETE FROM renovaciones_prestamo WHERE prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = ANY($1::uuid[]));`,
    [ids]
  );
  await query(
    `DELETE FROM agenda_cobros WHERE cobrador_id = ANY($1::uuid[]) OR compartido_con_usuario_id = ANY($1::uuid[]) OR gestionado_por_usuario_id = ANY($1::uuid[]) OR compartido_por_usuario_id = ANY($1::uuid[]) OR prestamo_id IN (SELECT id FROM prestamos WHERE cobrador_id = ANY($1::uuid[]));`,
    [ids]
  );
  await query(
    `DELETE FROM prestamos WHERE cobrador_id = ANY($1::uuid[]) OR cliente_id IN (SELECT id FROM clientes WHERE cobrador_id = ANY($1::uuid[]));`,
    [ids]
  );
  await query(`DELETE FROM prestamos_baneados WHERE cobrador_id = ANY($1::uuid[]);`, [ids]);
  await query(`DELETE FROM clientes_baneados WHERE cobrador_id = ANY($1::uuid[]);`, [ids]);
  await query(`DELETE FROM lista_negra WHERE cobrador_id = ANY($1::uuid[]);`, [ids]);
  await query(
    `DELETE FROM historial_prestamos_archivo WHERE archivo_id IN (SELECT id FROM historial_clientes_archivo WHERE cobrador_id = ANY($1::uuid[]));`,
    [ids]
  );
  await query(`DELETE FROM historial_clientes_archivo WHERE cobrador_id = ANY($1::uuid[]);`, [ids]);
  await query(`DELETE FROM clientes WHERE cobrador_id = ANY($1::uuid[]);`, [ids]);
  await query(`DELETE FROM usuarios WHERE id = ANY($1::uuid[]);`, [ids]);
  console.log(`[Semilla Técnica] Cuentas residuales depuradas dejando solo a Eiker Abarca Murillo (${ids.length} eliminadas).`);
}

export async function ensureBaseUser() {
  try {
    await ensureUsuariosAuthColumns();
    await ensureAgendaDelegacionColumns();
    await purgarCuentasPruebaQA();

    const { rows: adminByUsername } = await query(
      "SELECT id, usuario, rol, estado_cuenta, password_hash FROM usuarios WHERE LOWER(usuario) = 'admin' ORDER BY creado_en ASC LIMIT 1;"
    );

    if (adminByUsername.length > 0) {
      await ensureAdminPassword(adminByUsername[0]);
      await desvincularCarteraAdministrador(adminByUsername[0].id);
      cachedCobradorId = adminByUsername[0].id;
      console.log(`[Semilla Técnica] Usuario administrador único verificado y desvinculado de cartera: ${adminByUsername[0].usuario} (${adminByUsername[0].id})`);
      return cachedCobradorId;
    }

    const { rows: users } = await query(
      "SELECT id, usuario, rol, estado_cuenta, password_hash FROM usuarios WHERE rol = 'ADMINISTRADOR' ORDER BY creado_en ASC LIMIT 1;"
    );

    if (users.length > 0) {
      await ensureAdminPassword(users[0]);
      await desvincularCarteraAdministrador(users[0].id);
      cachedCobradorId = users[0].id;
      console.log(`[Semilla Técnica] Usuario administrador único verificado: ${users[0].usuario} (${users[0].id})`);
      return cachedCobradorId;
    }

    console.log('[Semilla Técnica] Creando usuario administrador único admin...');
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
        estado_cuenta,
        consentimiento_aceptado,
        consentimiento_version,
        consentimiento_aceptado_en
      ) VALUES (
        'admin',
        'Administrador Cobro-Firme',
        'admin@cobrofirme.cr',
        true,
        now(),
        $1,
        'ADMINISTRADOR',
        'ACTIVA',
        true,
        'v1.0-2026',
        now()
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
    await desvincularCarteraAdministrador(newUsers[0].id);
    cachedCobradorId = newUsers[0].id;
    console.log(`[Semilla Técnica] Usuario administrador creado con éxito: ${newUsers[0].usuario} (${newUsers[0].id}).`);
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
