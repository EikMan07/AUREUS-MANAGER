ALTER TABLE usuarios
  ALTER COLUMN password_hash DROP NOT NULL;

CREATE TABLE IF NOT EXISTS cuentas_oauth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  proveedor VARCHAR(20) NOT NULL CHECK (proveedor IN ('google', 'github')),
  proveedor_usuario_id VARCHAR(191) NOT NULL,
  correo_proveedor VARCHAR(255) NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_cuentas_oauth_proveedor_sub UNIQUE (proveedor, proveedor_usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_cuentas_oauth_usuario_id
  ON cuentas_oauth(usuario_id);
