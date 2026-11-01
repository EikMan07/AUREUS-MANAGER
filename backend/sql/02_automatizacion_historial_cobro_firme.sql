-- =========================================================================
-- COBRO-FIRME (cobro_firme_db) - AUTOMATIZACIÓN DE PAPELERA E HISTORIAL
-- Ejecutar DESPUÉS de crear las tablas del Diagrama_ER_CobroFirme.dbml
-- =========================================================================

ALTER DATABASE cobro_firme_db SET timezone TO 'America/Costa_Rica';

-- Un solo arreglo activo por préstamo
CREATE UNIQUE INDEX IF NOT EXISTS uq_arreglo_activo ON arreglos_pago (prestamo_id) WHERE activo;

-- -------------------------------------------------------------------------
-- 1. SUSPENDER Y REACTIVAR PRÉSTAMOS (Papelera y Lista Negra)
-- -------------------------------------------------------------------------

-- Llamar al enviar un cliente a Papelera o a Lista Negra
CREATE OR REPLACE FUNCTION suspender_prestamos_cliente(p_cliente_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE prestamos
     SET estado_previo_suspension = estado,
         estado = 'SUSPENDIDO',
         actualizado_en = now()
   WHERE cliente_id = p_cliente_id
     AND estado NOT IN ('SUSPENDIDO', 'LIQUIDADO');
$$;

-- Llamar al Restaurar desde Papelera o Sacar de Lista Negra
CREATE OR REPLACE FUNCTION reactivar_prestamos_cliente(p_cliente_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE prestamos
     SET estado = COALESCE(estado_previo_suspension, 'ACTIVO'),
         estado_previo_suspension = NULL,
         actualizado_en = now()
   WHERE cliente_id = p_cliente_id
     AND estado = 'SUSPENDIDO';
$$;

-- -------------------------------------------------------------------------
-- 2. ARCHIVAR HISTORIAL Y ELIMINAR AL CLIENTE
--    Se usa en: Eliminar definitivamente, Vaciar Papelera y borrado a los 30 días.
-- -------------------------------------------------------------------------

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

-- -------------------------------------------------------------------------
-- 3. TAREAS AUTOMÁTICAS DIARIAS
-- -------------------------------------------------------------------------

-- Clientes cuyos 30 días en Papelera ya vencieron: archivar y eliminar
CREATE OR REPLACE FUNCTION purgar_papelera()
RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN SELECT id FROM clientes
            WHERE estado = 'EN_PAPELERA' AND fecha_borrado_definitivo <= now()
  LOOP
    PERFORM archivar_y_eliminar_cliente(r.id);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Historiales que cumplieron 5 meses sin que el cliente volviera a registrarse
CREATE OR REPLACE FUNCTION purgar_historial_vencido()
RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  n int;
BEGIN
  DELETE FROM historial_clientes_archivo
   WHERE fecha_expiracion IS NOT NULL AND fecha_expiracion <= now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- -------------------------------------------------------------------------
-- 4. VINCULAR EL HISTORIAL CUANDO EL CLIENTE VUELVE A REGISTRARSE
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION vincular_historial_cliente()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE historial_clientes_archivo
     SET cliente_id_actual = NEW.id,
         fecha_expiracion = NULL
   WHERE cobrador_id = NEW.cobrador_id
     AND cedula = NEW.cedula;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vincular_historial ON clientes;
CREATE TRIGGER trg_vincular_historial
AFTER INSERT ON clientes
FOR EACH ROW EXECUTE FUNCTION vincular_historial_cliente();

-- -------------------------------------------------------------------------
-- 4B. LIMPIEZA DE REGISTROS SIN VERIFICAR Y CÓDIGOS VENCIDOS
-- -------------------------------------------------------------------------

-- Cuentas que se registraron y nunca confirmaron el correo en 7 días, y códigos viejos
CREATE OR REPLACE FUNCTION purgar_registros_sin_verificar()
RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  n int;
BEGIN
  DELETE FROM usuarios
   WHERE estado_cuenta = 'PENDIENTE_VERIFICACION'
     AND creado_en < now() - interval '7 days';
  GET DIAGNOSTICS n = ROW_COUNT;

  DELETE FROM verificaciones_correo WHERE expira_en < now() - interval '1 day';
  RETURN n;
END;
$$;

-- -------------------------------------------------------------------------
-- 4C. ADMINISTRADOR: BITÁCORA INMUTABLE, LISTA NEGRA GLOBAL Y TRANSFERENCIA DE CARTERA
-- -------------------------------------------------------------------------

-- La bitácora solo admite INSERT
CREATE OR REPLACE FUNCTION bitacora_inmutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La bitácora no se puede modificar ni borrar';
END;
$$;

DROP TRIGGER IF EXISTS trg_bitacora_inmutable ON bitacora_actividad;
CREATE TRIGGER trg_bitacora_inmutable
BEFORE UPDATE OR DELETE ON bitacora_actividad
FOR EACH ROW EXECUTE FUNCTION bitacora_inmutable();

-- El administrador envía a una persona de la Lista Negra de un cobrador a la global
CREATE OR REPLACE FUNCTION compartir_lista_negra_global(p_lista_negra_id uuid, p_admin uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  l lista_negra%ROWTYPE;
BEGIN
  SELECT * INTO l FROM lista_negra WHERE id = p_lista_negra_id AND activo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La persona no está activa en la Lista Negra de ese cobrador';
  END IF;

  INSERT INTO lista_negra_global
    (cedula, nombre, apellidos, origen_lista_negra_id, cobrador_origen_id, compartida_por)
  VALUES
    (l.cedula, l.nombre, l.apellidos, l.id, l.cobrador_id, p_admin)
  ON CONFLICT (cedula) DO UPDATE
     SET activo = true,
         fecha_retiro = NULL,
         retirada_por = NULL,
         fecha_compartida = now(),
         compartida_por = p_admin,
         origen_lista_negra_id = EXCLUDED.origen_lista_negra_id,
         cobrador_origen_id = EXCLUDED.cobrador_origen_id;

  INSERT INTO bitacora_actividad (usuario_id, cobrador_id, accion, entidad, entidad_id, cedula)
  VALUES (p_admin, l.cobrador_id, 'LISTA_NEGRA_COMPARTIDA', 'lista_negra', l.id, l.cedula);
END;
$$;

CREATE OR REPLACE FUNCTION retirar_lista_negra_global(p_cedula text, p_admin uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE lista_negra_global
     SET activo = false, fecha_retiro = now(), retirada_por = p_admin
   WHERE cedula = p_cedula AND activo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Esa cédula no está activa en la Lista Negra global';
  END IF;

  INSERT INTO bitacora_actividad (usuario_id, accion, entidad, cedula)
  VALUES (p_admin, 'LISTA_NEGRA_GLOBAL_RETIRADA', 'lista_negra_global', p_cedula);
END;
$$;

-- Pasa TODA la cartera de un cobrador a otro (clientes, préstamos, agenda, pagos y su Lista Negra).
-- Los pagos conservan en registrado_por quién cobró realmente; las métricas diarias
-- históricas se quedan con el cobrador de origen.
CREATE OR REPLACE FUNCTION transferir_cartera(
  p_origen uuid, p_destino uuid, p_admin uuid, p_motivo text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  n_clientes int;
  n_prestamos int;
BEGIN
  IF p_origen = p_destino THEN
    RAISE EXCEPTION 'El cobrador de origen y el de destino deben ser distintos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_destino AND estado_cuenta = 'ACTIVA') THEN
    RAISE EXCEPTION 'El cobrador de destino no tiene una cuenta activa';
  END IF;
  IF EXISTS (SELECT 1 FROM clientes a JOIN clientes b ON b.cedula = a.cedula
              WHERE a.cobrador_id = p_origen AND b.cobrador_id = p_destino) THEN
    RAISE EXCEPTION 'El cobrador de destino ya tiene clientes con la misma cédula; resolverlos antes de transferir';
  END IF;
  IF EXISTS (SELECT 1 FROM lista_negra a JOIN lista_negra b ON b.cedula = a.cedula
              WHERE a.cobrador_id = p_origen AND b.cobrador_id = p_destino) THEN
    RAISE EXCEPTION 'El cobrador de destino ya tiene personas en su Lista Negra con la misma cédula';
  END IF;

  UPDATE clientes SET cobrador_id = p_destino, version = version + 1, actualizado_en = now()
   WHERE cobrador_id = p_origen;
  GET DIAGNOSTICS n_clientes = ROW_COUNT;

  UPDATE prestamos SET cobrador_id = p_destino, version = version + 1, actualizado_en = now()
   WHERE cobrador_id = p_origen;
  GET DIAGNOSTICS n_prestamos = ROW_COUNT;

  UPDATE agenda_cobros SET cobrador_id = p_destino, version = version + 1
   WHERE cobrador_id = p_origen;
  UPDATE pagos_prestamo SET cobrador_id = p_destino WHERE cobrador_id = p_origen;
  UPDATE lista_negra SET cobrador_id = p_destino WHERE cobrador_id = p_origen;

  INSERT INTO transferencias_cartera
    (cobrador_origen_id, cobrador_destino_id, realizado_por, cantidad_clientes, cantidad_prestamos, motivo)
  VALUES (p_origen, p_destino, p_admin, n_clientes, n_prestamos, p_motivo);

  INSERT INTO bitacora_actividad (usuario_id, cobrador_id, accion, entidad, entidad_id, detalle)
  VALUES (p_admin, p_destino, 'CARTERA_TRANSFERIDA', 'usuario', p_origen,
          jsonb_build_object('desde', p_origen, 'hacia', p_destino,
                             'clientes', n_clientes, 'prestamos', n_prestamos));
END;
$$;

-- -------------------------------------------------------------------------
-- 5. PROGRAMACIÓN (pg_cron usa hora UTC: 09:00 UTC = 03:00 de Costa Rica)
--    Si tu hosting no tiene pg_cron, ejecutar estas dos consultas desde el backend.
-- -------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule('purgar-papelera', '0 9 * * *', $$SELECT purgar_papelera()$$);
SELECT cron.schedule('purgar-historial-vencido', '15 9 * * *', $$SELECT purgar_historial_vencido()$$);
SELECT cron.schedule('purgar-registros-sin-verificar', '30 9 * * *', $$SELECT purgar_registros_sin_verificar()$$);
