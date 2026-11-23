-- backend/sql/03_crm_aureus.sql
-- Arquitectura de Base de Datos del CRM Dual de Aureus Manager
-- CRM Crediticio del Prestamista (Aislado por cobrador_id) y CRM Comercial de Administración

DO $$ BEGIN
  CREATE TYPE etapa_crm_prestamista AS ENUM (
    'PROSPECTO',
    'EVALUACION_RIESGO',
    'PROPUESTA_APROBADA',
    'PRESTAMO_ACTIVO',
    'ALERTA_ATRASO',
    'ARREGLO_PAGO',
    'FINIQUITADO_RENOVABLE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE etapa_crm_admin AS ENUM (
    'VISITANTE_LANDING',
    'REGISTRO_INICIADO',
    'CONSENTIMIENTO_LEY_8968',
    'CUENTA_ACTIVA',
    'PRIMER_PRESTAMO',
    'PRESTAMISTA_ACTIVO',
    'EN_RIESGO_BAJA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_aprobacion_ia AS ENUM (
    'PENDIENTE_APROBACION',
    'APROBADO',
    'DESCARTADO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE estado_campana_crm AS ENUM (
    'OBJETIVO',
    'FICHA_CAMPANA',
    'PLAN_PIEZAS',
    'EN_GENERACION',
    'PENDIENTE_APROBACION',
    'PROGRAMADA',
    'PUBLICADA',
    'FINALIZADA'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Prospectos del CRM Crediticio de cada prestamista (aislamiento estricto por cobrador_id)
CREATE TABLE IF NOT EXISTS crm_prospectos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cobrador_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cliente_id uuid NULL REFERENCES clientes(id) ON DELETE SET NULL,
  nombre varchar(120) NOT NULL,
  apellidos varchar(120) NULL,
  telefono varchar(30) NOT NULL,
  ubicacion varchar(180) NOT NULL,
  canal_origen varchar(60) NOT NULL DEFAULT 'REFERIDO',
  monto_estimado numeric(12,2) NOT NULL DEFAULT 0,
  etapa etapa_crm_prestamista NOT NULL DEFAULT 'PROSPECTO',
  revisado boolean NOT NULL DEFAULT false,
  notas text NULL,
  fecha_ingreso timestamptz NOT NULL DEFAULT now(),
  fecha_ultimo_cambio_etapa timestamptz NOT NULL DEFAULT now(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- 2. Historial de transiciones entre etapas de los prospectos del prestamista
CREATE TABLE IF NOT EXISTS crm_historial_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id uuid NOT NULL REFERENCES crm_prospectos(id) ON DELETE CASCADE,
  etapa_anterior etapa_crm_prestamista NULL,
  etapa_nueva etapa_crm_prestamista NOT NULL,
  dias_en_etapa_anterior numeric(10,2) NOT NULL DEFAULT 0,
  nota_cambio text NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- 3. Configuración de metas de conversión y alertas de estancamiento por etapa para prestamistas
CREATE TABLE IF NOT EXISTS crm_metas_etapa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cobrador_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  etapa etapa_crm_prestamista NOT NULL,
  meta_conversion numeric(5,2) NOT NULL DEFAULT 75.00,
  dias_alerta_estancado integer NOT NULL DEFAULT 3,
  UNIQUE (cobrador_id, etapa)
);

-- 4. Mensajes propuestos por Séneca IA para prospectos del prestamista (aprobación humana)
CREATE TABLE IF NOT EXISTS crm_mensajes_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cobrador_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  prospecto_id uuid NOT NULL REFERENCES crm_prospectos(id) ON DELETE CASCADE,
  etapa_momento etapa_crm_prestamista NOT NULL,
  mensaje_propuesto text NOT NULL,
  estado estado_aprobacion_ia NOT NULL DEFAULT 'PENDIENTE_APROBACION',
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- 5. Configuración del Cerebro de Séneca CRM por prestamista
CREATE TABLE IF NOT EXISTS crm_cerebro_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cobrador_id uuid NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  tono varchar(40) NOT NULL DEFAULT 'EJECUTIVO_CERCANO',
  instruccion_base text NOT NULL,
  reglas_adicionales text NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- 6. Prospectos del CRM Comercial de Administración (adquisición de nuevos prestamistas)
CREATE TABLE IF NOT EXISTS crm_admin_prospectos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(120) NOT NULL,
  correo varchar(160) NULL,
  telefono varchar(30) NULL,
  zona varchar(120) NOT NULL DEFAULT 'Puntarenas',
  canal_origen varchar(60) NOT NULL DEFAULT 'LANDING_PAGE',
  etapa etapa_crm_admin NOT NULL DEFAULT 'VISITANTE_LANDING',
  revisado boolean NOT NULL DEFAULT false,
  notas text NULL,
  fecha_ingreso timestamptz NOT NULL DEFAULT now(),
  fecha_ultimo_cambio_etapa timestamptz NOT NULL DEFAULT now(),
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- 7. Historial de etapas del CRM Comercial de Administración
CREATE TABLE IF NOT EXISTS crm_admin_historial_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_admin_id uuid NOT NULL REFERENCES crm_admin_prospectos(id) ON DELETE CASCADE,
  etapa_anterior etapa_crm_admin NULL,
  etapa_nueva etapa_crm_admin NOT NULL,
  dias_en_etapa_anterior numeric(10,2) NOT NULL DEFAULT 0,
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- 8. Campañas de Mercadeo Comercial gestionadas por Administración
CREATE TABLE IF NOT EXISTS crm_admin_campanas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre varchar(150) NOT NULL,
  objetivo text NOT NULL,
  publico_objetivo text NULL,
  mensaje_central text NULL,
  canales varchar(120) NOT NULL DEFAULT 'Facebook e Instagram',
  presupuesto numeric(12,2) NOT NULL DEFAULT 0,
  inscritos_logrados integer NOT NULL DEFAULT 0,
  estado estado_campana_crm NOT NULL DEFAULT 'OBJETIVO',
  fecha_inicio date NULL,
  fecha_fin date NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- 9. Piezas de contenido de campañas generadas por IA (aprobación humana)
CREATE TABLE IF NOT EXISTS crm_admin_campana_piezas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id uuid NOT NULL REFERENCES crm_admin_campanas(id) ON DELETE CASCADE,
  titulo varchar(120) NOT NULL,
  canal varchar(60) NOT NULL DEFAULT 'Facebook',
  copy_propuesto text NOT NULL,
  formato varchar(20) NOT NULL DEFAULT '1:1',
  estado estado_aprobacion_ia NOT NULL DEFAULT 'PENDIENTE_APROBACION',
  fecha_programada timestamptz NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

-- Índices optimizados para consultas del embudo, filtros y claves foráneas
CREATE INDEX IF NOT EXISTS idx_crm_prospectos_cobrador_etapa ON crm_prospectos (cobrador_id, etapa);
CREATE INDEX IF NOT EXISTS idx_crm_prospectos_cambio ON crm_prospectos (cobrador_id, fecha_ultimo_cambio_etapa);
CREATE INDEX IF NOT EXISTS idx_crm_prospectos_cliente_id ON crm_prospectos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_historial_etapas_prospecto_id ON crm_historial_etapas (prospecto_id);
CREATE INDEX IF NOT EXISTS idx_crm_metas_etapa_cobrador_id ON crm_metas_etapa (cobrador_id);
CREATE INDEX IF NOT EXISTS idx_crm_mensajes_ia_cobrador_id ON crm_mensajes_ia (cobrador_id);
CREATE INDEX IF NOT EXISTS idx_crm_mensajes_ia_prospecto_id ON crm_mensajes_ia (prospecto_id);
CREATE INDEX IF NOT EXISTS idx_crm_admin_prospectos_etapa ON crm_admin_prospectos (etapa, fecha_ultimo_cambio_etapa);
CREATE INDEX IF NOT EXISTS idx_crm_admin_historial_etapas_prospecto_admin_id ON crm_admin_historial_etapas (prospecto_admin_id);
CREATE INDEX IF NOT EXISTS idx_crm_admin_campana_piezas_campana_id ON crm_admin_campana_piezas (campana_id);
