-- ============================================================
-- MECA
-- 0015 - Plantillas versionadas para carga de Escuchas
--
-- Objetivo:
-- Permitir que la estructura esperada de los archivos de carga
-- sea configurable desde BD y no quede hardcodeada en frontend
-- o backend.
--
-- Esta migración:
-- - NO modifica datos existentes.
-- - NO modifica asignaciones_escucha.
-- - NO modifica tareas_escucha.
-- - Es totalmente reversible mientras no existan dependencias
--   posteriores.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. PLANTILLAS DE CARGA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.plantillas_carga (
    id BIGSERIAL PRIMARY KEY,

    codigo VARCHAR(100) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,

    activa BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_plantillas_carga_codigo
        UNIQUE (codigo)
);

-- ============================================================
-- 2. VERSIONES DE PLANTILLA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.versiones_plantilla_carga (
    id BIGSERIAL PRIMARY KEY,

    plantilla_id BIGINT NOT NULL,

    version VARCHAR(30) NOT NULL,

    activa BOOLEAN NOT NULL DEFAULT FALSE,

    publicado_en TIMESTAMP WITHOUT TIME ZONE,

    created_at TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_version_plantilla_carga
        FOREIGN KEY (plantilla_id)
        REFERENCES public.plantillas_carga(id),

    CONSTRAINT uq_version_plantilla_carga
        UNIQUE (plantilla_id, version)
);

-- ============================================================
-- 3. CAMPOS DE CADA VERSIÓN
-- ============================================================

CREATE TABLE IF NOT EXISTS public.campos_plantilla_carga (
    id BIGSERIAL PRIMARY KEY,

    version_plantilla_id BIGINT NOT NULL,

    cabecera_origen VARCHAR(255) NOT NULL,

    campo_destino VARCHAR(100) NOT NULL,

    tipo_dato VARCHAR(30) NOT NULL DEFAULT 'texto',

    obligatorio BOOLEAN NOT NULL DEFAULT FALSE,

    orden INTEGER NOT NULL DEFAULT 0,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_campo_version_plantilla
        FOREIGN KEY (version_plantilla_id)
        REFERENCES public.versiones_plantilla_carga(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_campo_cabecera_version
        UNIQUE (version_plantilla_id, cabecera_origen),

    CONSTRAINT chk_campo_plantilla_tipo
        CHECK (
            tipo_dato IN (
                'texto',
                'entero',
                'decimal',
                'fecha',
                'booleano'
            )
        ),

    CONSTRAINT chk_campo_plantilla_orden
        CHECK (orden >= 0)
);

-- ============================================================
-- 4. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_versiones_plantilla_plantilla
    ON public.versiones_plantilla_carga (plantilla_id);

CREATE INDEX IF NOT EXISTS idx_versiones_plantilla_activa
    ON public.versiones_plantilla_carga (plantilla_id, activa);

CREATE INDEX IF NOT EXISTS idx_campos_plantilla_version
    ON public.campos_plantilla_carga (version_plantilla_id);

CREATE INDEX IF NOT EXISTS idx_campos_plantilla_destino
    ON public.campos_plantilla_carga (campo_destino);

COMMIT;