-- Migración idempotente Seguridad Fase 1 (Aureus Manager)
-- Agrega control de revocación inmediata de sesiones (token_version)
-- y amplía accion_bitacora para auditar eventos de inicio, cierre y cambio de contraseña.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;

UPDATE usuarios
  SET token_version = 1
  WHERE token_version IS NULL;

ALTER TYPE public.accion_bitacora ADD VALUE IF NOT EXISTS 'INICIO_SESION';
ALTER TYPE public.accion_bitacora ADD VALUE IF NOT EXISTS 'CIERRE_SESION';
ALTER TYPE public.accion_bitacora ADD VALUE IF NOT EXISTS 'CAMBIO_CONTRASENA';
ALTER TYPE public.accion_bitacora ADD VALUE IF NOT EXISTS 'CONSENTIMIENTO_LEGAL_ACEPTADO';
