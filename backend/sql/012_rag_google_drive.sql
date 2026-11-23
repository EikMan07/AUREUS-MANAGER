-- ============================================================================
-- Aureus Manager — Esquema Multiempresa RAG sobre Google Drive (PostgreSQL 18)
-- ============================================================================

CREATE TABLE IF NOT EXISTS planes_rag (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  max_documentos INT NOT NULL,
  max_preguntas_mes INT NOT NULL
);

INSERT INTO planes_rag (id, nombre, max_documentos, max_preguntas_mes)
VALUES
  ('gratis', 'Plan Estandar', 10, 200),
  ('pro', 'Plan Ejecutivo Pro', 500, 10000)
ON CONFLICT (id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    max_documentos = EXCLUDED.max_documentos,
    max_preguntas_mes = EXCLUDED.max_preguntas_mes;

CREATE TABLE IF NOT EXISTS empresas_rag (
  empresa_id UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  plan_id TEXT NOT NULL REFERENCES planes_rag(id) DEFAULT 'gratis',
  drive_carpeta_id TEXT,
  drive_carpeta_nombre TEXT,
  ultima_sincronizacion TIMESTAMPTZ,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documentos_rag (
  id SERIAL PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  origen TEXT NOT NULL CHECK (origen IN ('carga', 'drive')),
  drive_file_id TEXT,
  drive_modificado TIMESTAMPTZ,
  nivel_acceso VARCHAR(20) NOT NULL DEFAULT 'PRESTAMISTA' CHECK (nivel_acceso IN ('PRESTAMISTA', 'ADMIN')),
  ruta_carpeta VARCHAR(120) NOT NULL DEFAULT 'Prestamistas',
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'indexado', 'error')),
  num_fragmentos INT NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, drive_file_id)
);

ALTER TABLE documentos_rag
  ADD COLUMN IF NOT EXISTS nivel_acceso VARCHAR(20) NOT NULL DEFAULT 'PRESTAMISTA',
  ADD COLUMN IF NOT EXISTS ruta_carpeta VARCHAR(120) NOT NULL DEFAULT 'Prestamistas';

CREATE INDEX IF NOT EXISTS idx_documentos_rag_empresa_nivel
  ON documentos_rag (empresa_id, nivel_acceso);

CREATE TABLE IF NOT EXISTS fragmentos_rag (
  id SERIAL PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  documento_id INT NOT NULL REFERENCES documentos_rag(id) ON DELETE CASCADE,
  orden INT NOT NULL,
  texto TEXT NOT NULL,
  embedding DOUBLE PRECISION[] NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fragmentos_rag_empresa ON fragmentos_rag (empresa_id);
CREATE INDEX IF NOT EXISTS idx_fragmentos_rag_documento ON fragmentos_rag (documento_id);

CREATE TABLE IF NOT EXISTS mensajes_rag (
  id SERIAL PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  pregunta TEXT NOT NULL,
  respuesta TEXT,
  fuentes JSONB NOT NULL DEFAULT '[]'::jsonb,
  tokens_entrada INT NOT NULL DEFAULT 0,
  tokens_salida INT NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_rag_empresa_mes ON mensajes_rag (empresa_id, creado_en DESC);
