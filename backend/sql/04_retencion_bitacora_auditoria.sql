-- 04_retencion_bitacora_auditoria.sql
-- Permite la política automática de retención (30 días / máximo 200 filas)
-- y la limpieza administrativa autorizada en bitacora_actividad mediante
-- bandera transaccional local, preservando la inmutabilidad ante UPDATE y DELETE ordinarios.

CREATE OR REPLACE FUNCTION public.bitacora_inmutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('aureus.allow_bitacora_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'La bitácora no se puede modificar ni borrar';
END;
$$;
