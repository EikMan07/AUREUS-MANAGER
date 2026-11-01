--
-- PostgreSQL database dump
--

\restrict khdtEfOKl3GeL8FUPutowY8X2oh8pOfs18DGg2i0WnOIctQvd7NkRwycHCRDxBe

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: accion_bitacora; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.accion_bitacora AS ENUM (
    'PAGO_REGISTRADO',
    'COBRO_PASADO',
    'NO_PAGO_REGISTRADO',
    'CLIENTE_CREADO',
    'CLIENTE_EDITADO',
    'CLIENTE_A_PAPELERA',
    'CLIENTE_RESTAURADO',
    'CLIENTE_ELIMINADO_DEFINITIVO',
    'CLIENTE_A_LISTA_NEGRA',
    'CLIENTE_SACADO_DE_LISTA_NEGRA',
    'PRESTAMO_CREADO',
    'PRESTAMO_RENOVADO',
    'ARREGLO_PAGO_CREADO',
    'LISTA_NEGRA_COMPARTIDA',
    'LISTA_NEGRA_GLOBAL_RETIRADA',
    'CARTERA_TRANSFERIDA',
    'USUARIO_SUSPENDIDO',
    'USUARIO_REACTIVADO',
    'CLAVE_RESTABLECIDA',
    'HUELLA_ELIMINADA'
);


--
-- Name: dia_semana; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.dia_semana AS ENUM (
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO'
);


--
-- Name: estado_cliente; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_cliente AS ENUM (
    'ACTIVO',
    'EN_PAPELERA',
    'EN_LISTA_NEGRA'
);


--
-- Name: estado_cuenta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_cuenta AS ENUM (
    'PENDIENTE_VERIFICACION',
    'ACTIVA',
    'SUSPENDIDA'
);


--
-- Name: estado_cuota_cobro; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_cuota_cobro AS ENUM (
    'PENDIENTE',
    'REGISTRADO',
    'NO_PAGO',
    'PASADO_DE_DIA'
);


--
-- Name: estado_prestamo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_prestamo AS ENUM (
    'ACTIVO',
    'ATRASADO',
    'ARREGLO_PAGO',
    'LIQUIDADO',
    'RENOVADO',
    'SUSPENDIDO'
);


--
-- Name: modalidad_prestamo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.modalidad_prestamo AS ENUM (
    'SEMANAL',
    'QUINCENAL'
);


--
-- Name: proposito_verificacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.proposito_verificacion AS ENUM (
    'VERIFICAR_CORREO',
    'RECUPERAR_CONTRASENA'
);


--
-- Name: rol_usuario; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rol_usuario AS ENUM (
    'ADMINISTRADOR',
    'COBRADOR'
);


--
-- Name: tipo_pago; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_pago AS ENUM (
    'COBRO_NORMAL',
    'PAGO_ATRASADO'
);


--
-- Name: archivar_y_eliminar_cliente(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.archivar_y_eliminar_cliente(p_cliente_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
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

  DELETE FROM clientes WHERE id = p_cliente_id;
END;
$$;


--
-- Name: bitacora_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.bitacora_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION 'La bitácora no se puede modificar ni borrar';
END;
$$;


--
-- Name: compartir_lista_negra_global(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compartir_lista_negra_global(p_lista_negra_id uuid, p_admin uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: purgar_historial_vencido(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purgar_historial_vencido() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  n int;
BEGIN
  DELETE FROM historial_clientes_archivo
   WHERE fecha_expiracion IS NOT NULL AND fecha_expiracion <= now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;


--
-- Name: purgar_papelera(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purgar_papelera() RETURNS integer
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: purgar_registros_sin_verificar(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.purgar_registros_sin_verificar() RETURNS integer
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: reactivar_prestamos_cliente(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reactivar_prestamos_cliente(p_cliente_id uuid) RETURNS void
    LANGUAGE sql
    AS $$
  UPDATE prestamos
     SET estado = COALESCE(estado_previo_suspension, 'ACTIVO'),
         estado_previo_suspension = NULL,
         actualizado_en = now()
   WHERE cliente_id = p_cliente_id
     AND estado = 'SUSPENDIDO';
$$;


--
-- Name: retirar_lista_negra_global(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.retirar_lista_negra_global(p_cedula text, p_admin uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: suspender_prestamos_cliente(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.suspender_prestamos_cliente(p_cliente_id uuid) RETURNS void
    LANGUAGE sql
    AS $$
  UPDATE prestamos
     SET estado_previo_suspension = estado,
         estado = 'SUSPENDIDO',
         actualizado_en = now()
   WHERE cliente_id = p_cliente_id
     AND estado NOT IN ('SUSPENDIDO', 'LIQUIDADO');
$$;


--
-- Name: transferir_cartera(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.transferir_cartera(p_origen uuid, p_destino uuid, p_admin uuid, p_motivo text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: vincular_historial_cliente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.vincular_historial_cliente() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE historial_clientes_archivo
     SET cliente_id_actual = NEW.id,
         fecha_expiracion = NULL
   WHERE cobrador_id = NEW.cobrador_id
     AND cedula = NEW.cedula;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agenda_cobros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agenda_cobros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cobrador_id uuid NOT NULL,
    prestamo_id uuid NOT NULL,
    cliente_id uuid NOT NULL,
    numero_cobro integer NOT NULL,
    fecha_programada_original date NOT NULL,
    fecha_cobro_actual date NOT NULL,
    dia_semana_actual public.dia_semana NOT NULL,
    veces_pasado integer DEFAULT 0 NOT NULL,
    monto_cuota numeric(14,2) NOT NULL,
    monto_moratoria numeric(14,2) DEFAULT 0 NOT NULL,
    monto_total_cobrado numeric(14,2) DEFAULT 0 NOT NULL,
    estado public.estado_cuota_cobro DEFAULT 'PENDIENTE'::public.estado_cuota_cobro NOT NULL,
    fecha_hora_registro_pago timestamp with time zone,
    fecha_proximo_cobro date,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: arreglos_pago; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arreglos_pago (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prestamo_id uuid NOT NULL,
    monto_fijo_acordado numeric(14,2) NOT NULL,
    cuota_especial numeric(14,2) NOT NULL,
    nuevo_dia_cobro public.dia_semana,
    nuevo_dia_mes_1 smallint,
    nuevo_dia_mes_2 smallint,
    activo boolean DEFAULT true NOT NULL,
    fecha_acuerdo date DEFAULT ((now() AT TIME ZONE 'America/Costa_Rica'::text))::date NOT NULL
);


--
-- Name: bitacora_actividad; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bitacora_actividad (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    cobrador_id uuid,
    accion public.accion_bitacora NOT NULL,
    entidad character varying(40),
    entidad_id uuid,
    cedula character(9),
    detalle jsonb DEFAULT '{}'::jsonb NOT NULL,
    fecha_hora timestamp with time zone DEFAULT now() NOT NULL,
    sincronizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: clientes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clientes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cobrador_id uuid NOT NULL,
    cedula character(9),
    nombre character varying(100) NOT NULL,
    apellidos character varying(120),
    telefono character varying(20) NOT NULL,
    ubicacion character varying(200) NOT NULL,
    detalles text,
    estado public.estado_cliente DEFAULT 'ACTIVO'::public.estado_cliente NOT NULL,
    fecha_envio_papelera timestamp with time zone,
    fecha_borrado_definitivo timestamp with time zone,
    version integer DEFAULT 1 NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_clientes_campos_obligatorios_no_vacios CHECK (((btrim((nombre)::text) <> ''::text) AND (btrim((telefono)::text) <> ''::text) AND (btrim((ubicacion)::text) <> ''::text))),
    CONSTRAINT ck_clientes_cedula_9_digitos CHECK (((cedula IS NULL) OR (cedula ~ '^[0-9]{9}$'::text))),
    CONSTRAINT ck_clientes_papelera_fechas CHECK (((estado = 'EN_PAPELERA'::public.estado_cliente) = (fecha_envio_papelera IS NOT NULL)))
);


--
-- Name: credenciales_webauthn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credenciales_webauthn (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    credential_id text NOT NULL,
    public_key text NOT NULL,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports character varying(100),
    dispositivo character varying(100),
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    ultimo_uso timestamp with time zone
);


--
-- Name: historial_clientes_archivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_clientes_archivo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cobrador_id uuid NOT NULL,
    cliente_id_actual uuid,
    cedula character(9),
    nombre character varying(100) NOT NULL,
    apellidos character varying(120),
    telefono character varying(20),
    ubicacion character varying(200),
    detalles text,
    fecha_eliminacion timestamp with time zone DEFAULT now() NOT NULL,
    fecha_expiracion timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: historial_pasar_dia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_pasar_dia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agenda_cobro_id uuid NOT NULL,
    prestamo_id uuid NOT NULL,
    fecha_anterior date NOT NULL,
    fecha_nueva date NOT NULL,
    numero_reprogramacion integer NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: historial_prestamos_archivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historial_prestamos_archivo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    archivo_id uuid NOT NULL,
    prestamo_id_original uuid NOT NULL,
    monto_prestado numeric(14,2) NOT NULL,
    porcentaje_interes numeric(5,2) NOT NULL,
    monto_total_financiar numeric(14,2) NOT NULL,
    monto_pagado numeric(14,2) NOT NULL,
    saldo_pendiente numeric(14,2) NOT NULL,
    cuota numeric(14,2) NOT NULL,
    modalidad public.modalidad_prestamo NOT NULL,
    fecha_inicio date NOT NULL,
    fecha_final date NOT NULL,
    estado_final public.estado_prestamo NOT NULL,
    periodos_pagados integer NOT NULL,
    total_periodos integer NOT NULL,
    veces_pasado_total integer DEFAULT 0 NOT NULL,
    total_moratorias numeric(14,2) DEFAULT 0 NOT NULL,
    pagos_detalle jsonb DEFAULT '[]'::jsonb NOT NULL,
    archivado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: lista_negra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lista_negra (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cobrador_id uuid NOT NULL,
    cliente_id uuid,
    cedula character(9),
    nombre character varying(100) NOT NULL,
    apellidos character varying(120),
    activo boolean DEFAULT true NOT NULL,
    fecha_registro date DEFAULT ((now() AT TIME ZONE 'America/Costa_Rica'::text))::date NOT NULL,
    fecha_salida timestamp with time zone,
    CONSTRAINT ck_lista_negra_cedula_9_digitos CHECK (((cedula IS NULL) OR (cedula ~ '^[0-9]{9}$'::text)))
);


--
-- Name: lista_negra_global; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lista_negra_global (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cedula character(9) NOT NULL,
    nombre character varying(100) NOT NULL,
    apellidos character varying(120) NOT NULL,
    origen_lista_negra_id uuid,
    cobrador_origen_id uuid,
    compartida_por uuid NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    fecha_compartida timestamp with time zone DEFAULT now() NOT NULL,
    retirada_por uuid,
    fecha_retiro timestamp with time zone,
    CONSTRAINT ck_lista_negra_global_cedula_9_digitos CHECK ((cedula ~ '^[0-9]{9}$'::text)),
    CONSTRAINT ck_lista_negra_global_retiro CHECK ((activo = (fecha_retiro IS NULL)))
);


--
-- Name: metricas_diarias_resumen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metricas_diarias_resumen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cobrador_id uuid NOT NULL,
    fecha date NOT NULL,
    total_prestado_activo numeric(14,2) DEFAULT 0 NOT NULL,
    total_por_cobrar_hoy numeric(14,2) DEFAULT 0 NOT NULL,
    total_cobrado_hoy numeric(14,2) DEFAULT 0 NOT NULL,
    total_moratorias_cobradas numeric(14,2) DEFAULT 0 NOT NULL,
    clientes_programados_hoy integer DEFAULT 0 NOT NULL,
    clientes_cobrados_hoy integer DEFAULT 0 NOT NULL,
    clientes_al_dia_count integer DEFAULT 0 NOT NULL,
    clientes_pasados_semana_count integer DEFAULT 0 NOT NULL,
    clientes_atrasados_arreglo_count integer DEFAULT 0 CONSTRAINT metricas_diarias_resumen_clientes_atrasados_arreglo_co_not_null NOT NULL,
    intereses_proyectados numeric(14,2) DEFAULT 0 NOT NULL,
    total_en_moratoria numeric(14,2) DEFAULT 0 NOT NULL,
    capital_en_arreglos_pago numeric(14,2) DEFAULT 0 NOT NULL,
    efectividad_semanal_pct numeric(5,2),
    efectividad_quincenal_pct numeric(5,2),
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificaciones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    titulo character varying(120) NOT NULL,
    mensaje text NOT NULL,
    monto_resaltado numeric(14,2),
    leida boolean DEFAULT false NOT NULL,
    fecha_creacion timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pagos_prestamo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pagos_prestamo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cobrador_id uuid NOT NULL,
    prestamo_id uuid NOT NULL,
    agenda_cobro_id uuid,
    registrado_por uuid,
    tipo public.tipo_pago DEFAULT 'COBRO_NORMAL'::public.tipo_pago NOT NULL,
    monto_cobrado numeric(14,2) NOT NULL,
    monto_moratoria numeric(14,2) DEFAULT 0 NOT NULL,
    periodos_cubiertos integer DEFAULT 1 NOT NULL,
    fecha_hora_pago timestamp with time zone DEFAULT now() NOT NULL,
    sincronizado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_pagos_montos CHECK (((monto_cobrado >= (0)::numeric) AND (monto_moratoria >= (0)::numeric)))
);


--
-- Name: prestamos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prestamos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cobrador_id uuid NOT NULL,
    cliente_id uuid NOT NULL,
    monto_prestado numeric(14,2) NOT NULL,
    porcentaje_interes numeric(5,2) NOT NULL,
    monto_total_financiar numeric(14,2) NOT NULL,
    monto_pagado_acumulado numeric(14,2) DEFAULT 0 NOT NULL,
    saldo_por_pagar numeric(14,2) NOT NULL,
    cuota numeric(14,2) NOT NULL,
    modalidad public.modalidad_prestamo NOT NULL,
    dia_fijo_original public.dia_semana,
    dia_mes_1 smallint,
    dia_mes_2 smallint,
    fecha_inicio date NOT NULL,
    fecha_final date NOT NULL,
    total_periodos integer NOT NULL,
    periodos_pagados integer DEFAULT 0 NOT NULL,
    periodos_pendientes integer NOT NULL,
    periodos_atrasados_acumulados integer DEFAULT 0 NOT NULL,
    estado public.estado_prestamo DEFAULT 'ACTIVO'::public.estado_prestamo NOT NULL,
    estado_previo_suspension public.estado_prestamo,
    version integer DEFAULT 1 NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_prestamos_dia_segun_modalidad CHECK ((((modalidad = 'SEMANAL'::public.modalidad_prestamo) AND (dia_fijo_original IS NOT NULL) AND (dia_mes_1 IS NULL) AND (dia_mes_2 IS NULL)) OR ((modalidad = 'QUINCENAL'::public.modalidad_prestamo) AND (((dia_mes_1 IS NOT NULL) AND (dia_mes_2 IS NOT NULL) AND (dia_fijo_original IS NULL) AND (dia_mes_1 < dia_mes_2)) OR ((dia_fijo_original IS NOT NULL) AND (dia_mes_1 IS NULL) AND (dia_mes_2 IS NULL)))))),
    CONSTRAINT ck_prestamos_fechas CHECK ((fecha_final >= fecha_inicio)),
    CONSTRAINT ck_prestamos_rango_dias_mes CHECK ((((dia_mes_1 >= 1) AND (dia_mes_1 <= 31)) AND ((dia_mes_2 >= 1) AND (dia_mes_2 <= 31)))),
    CONSTRAINT ck_prestamos_saldo CHECK ((saldo_por_pagar >= (0)::numeric))
);


--
-- Name: renovaciones_prestamo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.renovaciones_prestamo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prestamo_id uuid NOT NULL,
    monto_anterior numeric(14,2) NOT NULL,
    monto_nuevo numeric(14,2) NOT NULL,
    cuota_anterior numeric(14,2) NOT NULL,
    cuota_nueva numeric(14,2) NOT NULL,
    fecha_final_anterior date NOT NULL,
    fecha_final_nueva date NOT NULL,
    fecha_renovacion timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: suscripciones_push; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suscripciones_push (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    dispositivo character varying(100),
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transferencias_cartera; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transferencias_cartera (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cobrador_origen_id uuid NOT NULL,
    cobrador_destino_id uuid NOT NULL,
    realizado_por uuid NOT NULL,
    cantidad_clientes integer NOT NULL,
    cantidad_prestamos integer NOT NULL,
    motivo character varying(200),
    fecha timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_transferencia_distintos CHECK ((cobrador_origen_id <> cobrador_destino_id))
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario character varying(50) NOT NULL,
    nombre_completo character varying(120) NOT NULL,
    correo character varying(254) NOT NULL,
    correo_verificado boolean DEFAULT false NOT NULL,
    correo_verificado_en timestamp with time zone,
    password_hash text NOT NULL,
    rol public.rol_usuario DEFAULT 'COBRADOR'::public.rol_usuario NOT NULL,
    estado_cuenta public.estado_cuenta DEFAULT 'PENDIENTE_VERIFICACION'::public.estado_cuenta NOT NULL,
    webauthn_user_handle text,
    intentos_fallidos integer DEFAULT 0 NOT NULL,
    bloqueado_hasta timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_usuarios_activa_requiere_correo_verificado CHECK (((estado_cuenta = 'PENDIENTE_VERIFICACION'::public.estado_cuenta) OR correo_verificado)),
    CONSTRAINT ck_usuarios_formato_usuario CHECK (((usuario)::text ~ '^[A-Za-z0-9._-]{3,50}$'::text))
);


--
-- Name: verificaciones_correo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verificaciones_correo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    correo character varying(254) NOT NULL,
    proposito public.proposito_verificacion DEFAULT 'VERIFICAR_CORREO'::public.proposito_verificacion NOT NULL,
    codigo_hash text NOT NULL,
    intentos integer DEFAULT 0 NOT NULL,
    expira_en timestamp with time zone NOT NULL,
    usado_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: agenda_cobros agenda_cobros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_cobros
    ADD CONSTRAINT agenda_cobros_pkey PRIMARY KEY (id);


--
-- Name: arreglos_pago arreglos_pago_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arreglos_pago
    ADD CONSTRAINT arreglos_pago_pkey PRIMARY KEY (id);


--
-- Name: bitacora_actividad bitacora_actividad_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_actividad
    ADD CONSTRAINT bitacora_actividad_pkey PRIMARY KEY (id);


--
-- Name: clientes clientes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);


--
-- Name: credenciales_webauthn credenciales_webauthn_credential_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credenciales_webauthn
    ADD CONSTRAINT credenciales_webauthn_credential_id_key UNIQUE (credential_id);


--
-- Name: credenciales_webauthn credenciales_webauthn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credenciales_webauthn
    ADD CONSTRAINT credenciales_webauthn_pkey PRIMARY KEY (id);


--
-- Name: historial_clientes_archivo historial_clientes_archivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_clientes_archivo
    ADD CONSTRAINT historial_clientes_archivo_pkey PRIMARY KEY (id);


--
-- Name: historial_pasar_dia historial_pasar_dia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_pasar_dia
    ADD CONSTRAINT historial_pasar_dia_pkey PRIMARY KEY (id);


--
-- Name: historial_prestamos_archivo historial_prestamos_archivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_prestamos_archivo
    ADD CONSTRAINT historial_prestamos_archivo_pkey PRIMARY KEY (id);


--
-- Name: lista_negra_global lista_negra_global_cedula_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista_negra_global
    ADD CONSTRAINT lista_negra_global_cedula_key UNIQUE (cedula);


--
-- Name: lista_negra_global lista_negra_global_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista_negra_global
    ADD CONSTRAINT lista_negra_global_pkey PRIMARY KEY (id);


--
-- Name: lista_negra lista_negra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista_negra
    ADD CONSTRAINT lista_negra_pkey PRIMARY KEY (id);


--
-- Name: metricas_diarias_resumen metricas_diarias_resumen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metricas_diarias_resumen
    ADD CONSTRAINT metricas_diarias_resumen_pkey PRIMARY KEY (id);


--
-- Name: notificaciones notificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_pkey PRIMARY KEY (id);


--
-- Name: pagos_prestamo pagos_prestamo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_prestamo
    ADD CONSTRAINT pagos_prestamo_pkey PRIMARY KEY (id);


--
-- Name: prestamos prestamos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamos
    ADD CONSTRAINT prestamos_pkey PRIMARY KEY (id);


--
-- Name: renovaciones_prestamo renovaciones_prestamo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.renovaciones_prestamo
    ADD CONSTRAINT renovaciones_prestamo_pkey PRIMARY KEY (id);


--
-- Name: suscripciones_push suscripciones_push_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripciones_push
    ADD CONSTRAINT suscripciones_push_endpoint_key UNIQUE (endpoint);


--
-- Name: suscripciones_push suscripciones_push_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripciones_push
    ADD CONSTRAINT suscripciones_push_pkey PRIMARY KEY (id);


--
-- Name: transferencias_cartera transferencias_cartera_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias_cartera
    ADD CONSTRAINT transferencias_cartera_pkey PRIMARY KEY (id);


--
-- Name: agenda_cobros uq_agenda_prestamo_numero; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_cobros
    ADD CONSTRAINT uq_agenda_prestamo_numero UNIQUE (prestamo_id, numero_cobro);


--
-- Name: clientes uq_clientes_cobrador_cedula; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT uq_clientes_cobrador_cedula UNIQUE (cobrador_id, cedula);


--
-- Name: historial_clientes_archivo uq_historial_cobrador_cedula; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_clientes_archivo
    ADD CONSTRAINT uq_historial_cobrador_cedula UNIQUE (cobrador_id, cedula);


--
-- Name: lista_negra uq_lista_negra_cobrador_cedula; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista_negra
    ADD CONSTRAINT uq_lista_negra_cobrador_cedula UNIQUE (cobrador_id, cedula);


--
-- Name: metricas_diarias_resumen uq_metricas_cobrador_fecha; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metricas_diarias_resumen
    ADD CONSTRAINT uq_metricas_cobrador_fecha UNIQUE (cobrador_id, fecha);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_webauthn_user_handle_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_webauthn_user_handle_key UNIQUE (webauthn_user_handle);


--
-- Name: verificaciones_correo verificaciones_correo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verificaciones_correo
    ADD CONSTRAINT verificaciones_correo_pkey PRIMARY KEY (id);


--
-- Name: idx_agenda_barra_7_dias; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agenda_barra_7_dias ON public.agenda_cobros USING btree (cobrador_id, fecha_cobro_actual, estado);


--
-- Name: idx_bitacora_accion_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_accion_fecha ON public.bitacora_actividad USING btree (accion, fecha_hora);


--
-- Name: idx_bitacora_cedula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_cedula ON public.bitacora_actividad USING btree (cedula);


--
-- Name: idx_bitacora_cobrador_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_cobrador_fecha ON public.bitacora_actividad USING btree (cobrador_id, fecha_hora);


--
-- Name: idx_bitacora_usuario_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bitacora_usuario_fecha ON public.bitacora_actividad USING btree (usuario_id, fecha_hora);


--
-- Name: idx_clientes_papelera; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clientes_papelera ON public.clientes USING btree (estado, fecha_borrado_definitivo);


--
-- Name: idx_credenciales_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credenciales_usuario ON public.credenciales_webauthn USING btree (usuario_id);


--
-- Name: idx_historial_expiracion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_expiracion ON public.historial_clientes_archivo USING btree (fecha_expiracion);


--
-- Name: idx_historial_prestamos_archivo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_historial_prestamos_archivo ON public.historial_prestamos_archivo USING btree (archivo_id);


--
-- Name: idx_notificaciones_usuario_leida; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notificaciones_usuario_leida ON public.notificaciones USING btree (usuario_id, leida);


--
-- Name: idx_pagos_cobrador_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_cobrador_fecha ON public.pagos_prestamo USING btree (cobrador_id, fecha_hora_pago);


--
-- Name: idx_pagos_prestamo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pagos_prestamo ON public.pagos_prestamo USING btree (prestamo_id);


--
-- Name: idx_prestamos_cliente_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prestamos_cliente_estado ON public.prestamos USING btree (cliente_id, estado);


--
-- Name: idx_prestamos_cobrador_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prestamos_cobrador_estado ON public.prestamos USING btree (cobrador_id, estado);


--
-- Name: idx_verificaciones_usuario_proposito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verificaciones_usuario_proposito ON public.verificaciones_correo USING btree (usuario_id, proposito, creado_en);


--
-- Name: uq_arreglo_activo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_arreglo_activo ON public.arreglos_pago USING btree (prestamo_id) WHERE activo;


--
-- Name: uq_usuarios_correo; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_usuarios_correo ON public.usuarios USING btree (lower((correo)::text));


--
-- Name: uq_usuarios_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_usuarios_usuario ON public.usuarios USING btree (lower((usuario)::text));


--
-- Name: bitacora_actividad trg_bitacora_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_bitacora_inmutable BEFORE DELETE OR UPDATE ON public.bitacora_actividad FOR EACH ROW EXECUTE FUNCTION public.bitacora_inmutable();


--
-- Name: clientes trg_vincular_historial; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_vincular_historial AFTER INSERT ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.vincular_historial_cliente();


--
-- Name: agenda_cobros agenda_cobros_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_cobros
    ADD CONSTRAINT agenda_cobros_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: agenda_cobros agenda_cobros_cobrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_cobros
    ADD CONSTRAINT agenda_cobros_cobrador_id_fkey FOREIGN KEY (cobrador_id) REFERENCES public.usuarios(id);


--
-- Name: agenda_cobros agenda_cobros_prestamo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_cobros
    ADD CONSTRAINT agenda_cobros_prestamo_id_fkey FOREIGN KEY (prestamo_id) REFERENCES public.prestamos(id) ON DELETE CASCADE;


--
-- Name: arreglos_pago arreglos_pago_prestamo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arreglos_pago
    ADD CONSTRAINT arreglos_pago_prestamo_id_fkey FOREIGN KEY (prestamo_id) REFERENCES public.prestamos(id) ON DELETE CASCADE;


--
-- Name: bitacora_actividad bitacora_actividad_cobrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_actividad
    ADD CONSTRAINT bitacora_actividad_cobrador_id_fkey FOREIGN KEY (cobrador_id) REFERENCES public.usuarios(id);


--
-- Name: bitacora_actividad bitacora_actividad_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bitacora_actividad
    ADD CONSTRAINT bitacora_actividad_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: clientes clientes_cobrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clientes
    ADD CONSTRAINT clientes_cobrador_id_fkey FOREIGN KEY (cobrador_id) REFERENCES public.usuarios(id);


--
-- Name: credenciales_webauthn credenciales_webauthn_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credenciales_webauthn
    ADD CONSTRAINT credenciales_webauthn_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: historial_clientes_archivo historial_clientes_archivo_cliente_id_actual_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_clientes_archivo
    ADD CONSTRAINT historial_clientes_archivo_cliente_id_actual_fkey FOREIGN KEY (cliente_id_actual) REFERENCES public.clientes(id) ON DELETE SET NULL;


--
-- Name: historial_clientes_archivo historial_clientes_archivo_cobrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_clientes_archivo
    ADD CONSTRAINT historial_clientes_archivo_cobrador_id_fkey FOREIGN KEY (cobrador_id) REFERENCES public.usuarios(id);


--
-- Name: historial_pasar_dia historial_pasar_dia_agenda_cobro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_pasar_dia
    ADD CONSTRAINT historial_pasar_dia_agenda_cobro_id_fkey FOREIGN KEY (agenda_cobro_id) REFERENCES public.agenda_cobros(id) ON DELETE CASCADE;


--
-- Name: historial_pasar_dia historial_pasar_dia_prestamo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_pasar_dia
    ADD CONSTRAINT historial_pasar_dia_prestamo_id_fkey FOREIGN KEY (prestamo_id) REFERENCES public.prestamos(id) ON DELETE CASCADE;


--
-- Name: historial_prestamos_archivo historial_prestamos_archivo_archivo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historial_prestamos_archivo
    ADD CONSTRAINT historial_prestamos_archivo_archivo_id_fkey FOREIGN KEY (archivo_id) REFERENCES public.historial_clientes_archivo(id) ON DELETE CASCADE;


--
-- Name: lista_negra lista_negra_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista_negra
    ADD CONSTRAINT lista_negra_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;


--
-- Name: lista_negra lista_negra_cobrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista_negra
    ADD CONSTRAINT lista_negra_cobrador_id_fkey FOREIGN KEY (cobrador_id) REFERENCES public.usuarios(id);


--
-- Name: lista_negra_global lista_negra_global_cobrador_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista_negra_global
    ADD CONSTRAINT lista_negra_global_cobrador_origen_id_fkey FOREIGN KEY (cobrador_origen_id) REFERENCES public.usuarios(id);


--
-- Name: lista_negra_global lista_negra_global_compartida_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista_negra_global
    ADD CONSTRAINT lista_negra_global_compartida_por_fkey FOREIGN KEY (compartida_por) REFERENCES public.usuarios(id);


--
-- Name: lista_negra_global lista_negra_global_origen_lista_negra_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista_negra_global
    ADD CONSTRAINT lista_negra_global_origen_lista_negra_id_fkey FOREIGN KEY (origen_lista_negra_id) REFERENCES public.lista_negra(id) ON DELETE SET NULL;


--
-- Name: lista_negra_global lista_negra_global_retirada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lista_negra_global
    ADD CONSTRAINT lista_negra_global_retirada_por_fkey FOREIGN KEY (retirada_por) REFERENCES public.usuarios(id);


--
-- Name: metricas_diarias_resumen metricas_diarias_resumen_cobrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metricas_diarias_resumen
    ADD CONSTRAINT metricas_diarias_resumen_cobrador_id_fkey FOREIGN KEY (cobrador_id) REFERENCES public.usuarios(id);


--
-- Name: notificaciones notificaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificaciones
    ADD CONSTRAINT notificaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: pagos_prestamo pagos_prestamo_agenda_cobro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_prestamo
    ADD CONSTRAINT pagos_prestamo_agenda_cobro_id_fkey FOREIGN KEY (agenda_cobro_id) REFERENCES public.agenda_cobros(id) ON DELETE SET NULL;


--
-- Name: pagos_prestamo pagos_prestamo_cobrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_prestamo
    ADD CONSTRAINT pagos_prestamo_cobrador_id_fkey FOREIGN KEY (cobrador_id) REFERENCES public.usuarios(id);


--
-- Name: pagos_prestamo pagos_prestamo_prestamo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_prestamo
    ADD CONSTRAINT pagos_prestamo_prestamo_id_fkey FOREIGN KEY (prestamo_id) REFERENCES public.prestamos(id) ON DELETE CASCADE;


--
-- Name: pagos_prestamo pagos_prestamo_registrado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pagos_prestamo
    ADD CONSTRAINT pagos_prestamo_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.usuarios(id);


--
-- Name: prestamos prestamos_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamos
    ADD CONSTRAINT prestamos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE;


--
-- Name: prestamos prestamos_cobrador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prestamos
    ADD CONSTRAINT prestamos_cobrador_id_fkey FOREIGN KEY (cobrador_id) REFERENCES public.usuarios(id);


--
-- Name: renovaciones_prestamo renovaciones_prestamo_prestamo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.renovaciones_prestamo
    ADD CONSTRAINT renovaciones_prestamo_prestamo_id_fkey FOREIGN KEY (prestamo_id) REFERENCES public.prestamos(id) ON DELETE CASCADE;


--
-- Name: suscripciones_push suscripciones_push_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suscripciones_push
    ADD CONSTRAINT suscripciones_push_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: transferencias_cartera transferencias_cartera_cobrador_destino_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias_cartera
    ADD CONSTRAINT transferencias_cartera_cobrador_destino_id_fkey FOREIGN KEY (cobrador_destino_id) REFERENCES public.usuarios(id);


--
-- Name: transferencias_cartera transferencias_cartera_cobrador_origen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias_cartera
    ADD CONSTRAINT transferencias_cartera_cobrador_origen_id_fkey FOREIGN KEY (cobrador_origen_id) REFERENCES public.usuarios(id);


--
-- Name: transferencias_cartera transferencias_cartera_realizado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transferencias_cartera
    ADD CONSTRAINT transferencias_cartera_realizado_por_fkey FOREIGN KEY (realizado_por) REFERENCES public.usuarios(id);


--
-- Name: verificaciones_correo verificaciones_correo_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verificaciones_correo
    ADD CONSTRAINT verificaciones_correo_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict khdtEfOKl3GeL8FUPutowY8X2oh8pOfs18DGg2i0WnOIctQvd7NkRwycHCRDxBe

