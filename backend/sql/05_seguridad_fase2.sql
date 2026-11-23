-- Migración idempotente Seguridad Fase 2 (Aureus Manager)
-- Asegura columnas persistentes de control de intentos fallidos y bloqueo progresivo en usuarios.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS intentos_fallidos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMPTZ;

UPDATE usuarios
  SET intentos_fallidos = 0
  WHERE intentos_fallidos IS NULL;
