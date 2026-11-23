-- Script de aprovisionamiento de rol PostgreSQL con privilegios mínimos para Aureus Manager
-- USO MANUAL EN PRODUCCIÓN (requiere ejecutarse con un rol administrador de PostgreSQL, p. ej. postgres).
-- No altera backend/.env local automáticamente.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aureus_app') THEN
    CREATE ROLE aureus_app
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION
      LOGIN
      PASSWORD 'REEMPLAZAR_POR_CLAVE_SEGURA';
  END IF;
END
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;

GRANT CONNECT ON DATABASE cobro_firme_db TO aureus_app;
GRANT USAGE ON SCHEMA public TO aureus_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aureus_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aureus_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO aureus_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aureus_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO aureus_app;
