import { query } from '../config/db.js';

let cachedCobradorId = null;

export async function ensureBaseUser() {
  try {
    // 1. Hacer opcionales cedula, apellidos y detalles en clientes (y en tablas asociadas de archivo/lista negra)
    await query(`
      ALTER TABLE clientes
        ALTER COLUMN cedula DROP NOT NULL,
        ALTER COLUMN apellidos DROP NOT NULL,
        ALTER COLUMN detalles DROP NOT NULL;
    `);

    await query(`
      ALTER TABLE lista_negra
        ALTER COLUMN cedula DROP NOT NULL,
        ALTER COLUMN apellidos DROP NOT NULL;
      ALTER TABLE lista_negra DROP CONSTRAINT IF EXISTS ck_lista_negra_cedula_9_digitos;
      ALTER TABLE lista_negra ADD CONSTRAINT ck_lista_negra_cedula_9_digitos
        CHECK (cedula IS NULL OR cedula ~ '^[0-9]{9}$');
      ALTER TABLE historial_clientes_archivo
        ALTER COLUMN cedula DROP NOT NULL,
        ALTER COLUMN apellidos DROP NOT NULL;
    `);

    // 2. Asegurar que nombre, telefono y ubicacion sean obligatorios (NOT NULL)
    await query(`
      UPDATE clientes SET nombre = 'Sin nombre' WHERE nombre IS NULL OR btrim(nombre) = '';
      UPDATE clientes SET telefono = '0000-0000' WHERE telefono IS NULL OR btrim(telefono) = '';
      UPDATE clientes SET ubicacion = 'Sin ubicación' WHERE ubicacion IS NULL OR btrim(ubicacion) = '';
      ALTER TABLE clientes
        ALTER COLUMN nombre SET NOT NULL,
        ALTER COLUMN telefono SET NOT NULL,
        ALTER COLUMN ubicacion SET NOT NULL;
    `);

    // 3. Actualizar constraint de cédula para permitir NULL o exactamente 9 dígitos
    await query(`
      ALTER TABLE clientes DROP CONSTRAINT IF EXISTS ck_clientes_cedula_9_digitos;
      ALTER TABLE clientes ADD CONSTRAINT ck_clientes_cedula_9_digitos
        CHECK (cedula IS NULL OR cedula ~ '^[0-9]{9}$');
    `);

    // 4. Actualizar constraint de campos obligatorios no vacíos (solo nombre, telefono y ubicacion)
    await query(`
      ALTER TABLE clientes DROP CONSTRAINT IF EXISTS ck_clientes_campos_obligatorios_no_vacios;
      ALTER TABLE clientes ADD CONSTRAINT ck_clientes_campos_obligatorios_no_vacios
        CHECK (btrim(nombre) <> '' AND btrim(telefono) <> '' AND btrim(ubicacion) <> '');
    `);

    // Asegurar soporte para las DOS modalidades quincenales en prestamos (Día 15 y fin de mes OR Cada 2 semanas por día de la semana)
    await query(`
      ALTER TABLE prestamos DROP CONSTRAINT IF EXISTS ck_prestamos_dia_segun_modalidad;
      ALTER TABLE prestamos ADD CONSTRAINT ck_prestamos_dia_segun_modalidad CHECK (
        (modalidad = 'SEMANAL' AND dia_fijo_original IS NOT NULL AND dia_mes_1 IS NULL AND dia_mes_2 IS NULL)
        OR
        (modalidad = 'QUINCENAL' AND (
          (dia_mes_1 IS NOT NULL AND dia_mes_2 IS NOT NULL AND dia_fijo_original IS NULL AND dia_mes_1 < dia_mes_2)
          OR
          (dia_fijo_original IS NOT NULL AND dia_mes_1 IS NULL AND dia_mes_2 IS NULL)
        ))
      );
    `);

    const { rows: users } = await query('SELECT id, usuario, rol, estado_cuenta FROM usuarios LIMIT 1;');

    if (users.length > 0) {
      cachedCobradorId = users[0].id;
      console.log(`[Semilla Técnica] Usuario base verificado: ${users[0].usuario} (${users[0].id})`);
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
        '$2b$10$w8079zZqN8g6d.vK9N3wUuI2BqD2Z1e6w6eL3mY0L9bZ4lQ8Fq0uO',
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
