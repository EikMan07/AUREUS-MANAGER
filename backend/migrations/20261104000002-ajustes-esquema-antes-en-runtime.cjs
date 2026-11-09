'use strict';
// Ajustes de esquema que antes se ejecutaban en tiempo de ejecución desde los controladores
// (clientesController, papeleraController y seedService). Según la skill backend-postgres-guardian,
// la estructura solo la cambian las migraciones. Todo es idempotente: aplicarlo sobre una base que
// ya tiene estos ajustes no cambia nada. Se conservan los casts explícitos de ENUM y las funciones
// PL/pgSQL (suspender_prestamos_cliente, reactivar_prestamos_cliente, archivar_y_eliminar_cliente).
module.exports = {
  async up(queryInterface) {
    const { sequelize } = queryInterface;
    await sequelize.transaction(async (transaction) => {
      const run = (sql) => sequelize.query(sql, { transaction });

      // 1. Campos opcionales en clientes, lista negra e historial archivado
      await run(`
        ALTER TABLE clientes
          ALTER COLUMN cedula DROP NOT NULL,
          ALTER COLUMN apellidos DROP NOT NULL,
          ALTER COLUMN detalles DROP NOT NULL;
      `);
      await run(`
        ALTER TABLE lista_negra
          ALTER COLUMN cedula DROP NOT NULL,
          ALTER COLUMN apellidos DROP NOT NULL;
      `);
      await run(`
        ALTER TABLE historial_clientes_archivo
          ALTER COLUMN cedula DROP NOT NULL,
          ALTER COLUMN apellidos DROP NOT NULL;
      `);

      // 2. Rellenar vacíos antes de exigir nombre, teléfono y ubicación (solo toca filas en blanco)
      await run(`UPDATE clientes SET nombre = 'Sin nombre' WHERE nombre IS NULL OR btrim(nombre) = '';`);
      await run(`UPDATE clientes SET telefono = '0000-0000' WHERE telefono IS NULL OR btrim(telefono) = '';`);
      await run(`UPDATE clientes SET ubicacion = 'Sin ubicación' WHERE ubicacion IS NULL OR btrim(ubicacion) = '';`);
      await run(`
        ALTER TABLE clientes
          ALTER COLUMN nombre SET NOT NULL,
          ALTER COLUMN telefono SET NOT NULL,
          ALTER COLUMN ubicacion SET NOT NULL;
      `);

      // 3. Restricciones CHECK vigentes
      await run(`
        ALTER TABLE clientes DROP CONSTRAINT IF EXISTS ck_clientes_cedula_9_digitos;
        ALTER TABLE clientes ADD CONSTRAINT ck_clientes_cedula_9_digitos
          CHECK (cedula IS NULL OR cedula ~ '^[0-9]{9}$');
      `);
      await run(`
        ALTER TABLE clientes DROP CONSTRAINT IF EXISTS ck_clientes_campos_obligatorios_no_vacios;
        ALTER TABLE clientes ADD CONSTRAINT ck_clientes_campos_obligatorios_no_vacios
          CHECK (btrim(nombre) <> '' AND btrim(telefono) <> '' AND btrim(ubicacion) <> '');
      `);
      await run(`
        ALTER TABLE lista_negra DROP CONSTRAINT IF EXISTS ck_lista_negra_cedula_9_digitos;
        ALTER TABLE lista_negra ADD CONSTRAINT ck_lista_negra_cedula_9_digitos
          CHECK (cedula IS NULL OR cedula ~ '^[0-9]{9}$');
      `);
      // Las dos modalidades quincenales: día 15 y fin de mes, o cada 2 semanas con día fijo
      await run(`
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

      // 4. Funciones PL/pgSQL con cast explícito de ENUM (CREATE OR REPLACE: no se eliminan)
      await run(`
        CREATE OR REPLACE FUNCTION suspender_prestamos_cliente(p_cliente_id uuid)
        RETURNS void LANGUAGE sql AS $$
          UPDATE prestamos
             SET estado_previo_suspension = estado,
                 estado = 'SUSPENDIDO'::public.estado_prestamo,
                 actualizado_en = now(),
                 version = COALESCE(version, 1) + 1
           WHERE cliente_id = p_cliente_id
             AND estado NOT IN ('SUSPENDIDO'::public.estado_prestamo, 'LIQUIDADO'::public.estado_prestamo);
        $$;
      `);
      await run(`
        CREATE OR REPLACE FUNCTION reactivar_prestamos_cliente(p_cliente_id uuid)
        RETURNS void LANGUAGE sql AS $$
          UPDATE prestamos
             SET estado = COALESCE(estado_previo_suspension, 'ACTIVO'::public.estado_prestamo),
                 estado_previo_suspension = NULL,
                 actualizado_en = now(),
                 version = COALESCE(version, 1) + 1
           WHERE cliente_id = p_cliente_id
             AND estado = 'SUSPENDIDO'::public.estado_prestamo;
        $$;
      `);
      await run(`
        CREATE OR REPLACE FUNCTION archivar_y_eliminar_cliente(p_cliente_id uuid)
        RETURNS void LANGUAGE plpgsql AS $$
        DECLARE
          c clientes%ROWTYPE;
          v_archivo uuid;
        BEGIN
          SELECT * INTO c FROM clientes WHERE id = p_cliente_id FOR UPDATE;
          IF NOT FOUND THEN
            RETURN;
          END IF;

          IF c.cedula IS NOT NULL THEN
            INSERT INTO historial_clientes_archivo
              (cobrador_id, cedula, nombre, apellidos, telefono, ubicacion, detalles,
               fecha_eliminacion, fecha_expiracion, cliente_id_actual)
            VALUES
              (c.cobrador_id, c.cedula, c.nombre, c.apellidos, c.telefono, c.ubicacion, c.detalles,
               now(), now() + interval '5 months', NULL)
            ON CONFLICT (cobrador_id, cedula) DO UPDATE
               SET nombre = EXCLUDED.nombre,
                   apellidos = EXCLUDED.apellidos,
                   telefono = EXCLUDED.telefono,
                   ubicacion = EXCLUDED.ubicacion,
                   detalles = EXCLUDED.detalles,
                   fecha_eliminacion = now(),
                   fecha_expiracion = now() + interval '5 months',
                   cliente_id_actual = NULL
            RETURNING id INTO v_archivo;
          ELSE
            INSERT INTO historial_clientes_archivo
              (cobrador_id, cedula, nombre, apellidos, telefono, ubicacion, detalles,
               fecha_eliminacion, fecha_expiracion, cliente_id_actual)
            VALUES
              (c.cobrador_id, NULL, c.nombre, c.apellidos, c.telefono, c.ubicacion, c.detalles,
               now(), now() + interval '5 months', NULL)
            RETURNING id INTO v_archivo;
          END IF;

          INSERT INTO historial_prestamos_archivo
            (archivo_id, prestamo_id_original, monto_prestado, porcentaje_interes,
             monto_total_financiar, monto_pagado, saldo_pendiente, cuota, modalidad,
             fecha_inicio, fecha_final, estado_final, periodos_pagados, total_periodos,
             veces_pasado_total, total_moratorias, pagos_detalle)
          SELECT
             v_archivo, p.id, p.monto_prestado, p.porcentaje_interes,
             p.monto_total_financiar, p.monto_pagado_acumulado, p.saldo_por_pagar, p.cuota, p.modalidad,
             p.fecha_inicio, p.fecha_final, COALESCE(p.estado_previo_suspension, p.estado),
             p.periodos_pagados, p.total_periodos,
             (SELECT COALESCE(SUM(a.veces_pasado), 0) FROM agenda_cobros a WHERE a.prestamo_id = p.id),
             (SELECT COALESCE(SUM(g.monto_moratoria), 0) FROM pagos_prestamo g WHERE g.prestamo_id = p.id),
             (SELECT COALESCE(jsonb_agg(jsonb_build_object(
                        'fecha', g.fecha_hora_pago,
                        'monto', g.monto_cobrado,
                        'moratoria', g.monto_moratoria,
                        'tipo', g.tipo) ORDER BY g.fecha_hora_pago), '[]'::jsonb)
                FROM pagos_prestamo g WHERE g.prestamo_id = p.id)
          FROM prestamos p
          WHERE p.cliente_id = p_cliente_id;

          -- Borra en cascada préstamos, agenda, pagos, renovaciones y arreglos
          DELETE FROM clientes WHERE id = p_cliente_id;
        END;
        $$;
      `);
    });
  },

  async down() {
    // Irreversible a propósito: revertir significaría volver a exigir NOT NULL en columnas que ya
    // contienen NULL y reemplazar funciones activas. Es una operación 🔴 y no se hace en automático.
    throw new Error(
      'Migración irreversible: restaura un respaldo (pg_dump) si necesitas volver al estado anterior.'
    );
  },
};

