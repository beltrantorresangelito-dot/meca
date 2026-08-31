-- ============================================================
-- MECA
-- 0016 - Contexto multidominio para Escuchas
--
-- Objetivo:
-- - Registrar el quiebre correspondiente a cada escucha.
-- - Registrar la versión de plantilla utilizada por cada lote.
-- - Preparar Escuchas para cargas multi-quiebre/multi-campaña.
--
-- Compatibilidad:
-- - NO elimina campana legacy.
-- - NO modifica campana_id existente.
-- - Nuevos campos son nullable para preservar datos históricos.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. TRAZABILIDAD DE PLANTILLA EN EL LOTE
-- ============================================================

ALTER TABLE public.tareas_escucha
    ADD COLUMN IF NOT EXISTS version_plantilla_carga_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'tareas_escucha_version_plantilla_carga_fkey'
    ) THEN
        ALTER TABLE public.tareas_escucha
            ADD CONSTRAINT tareas_escucha_version_plantilla_carga_fkey
            FOREIGN KEY (version_plantilla_carga_id)
            REFERENCES public.versiones_plantilla_carga(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tareas_escucha_version_plantilla
    ON public.tareas_escucha (version_plantilla_carga_id);

-- ============================================================
-- 2. QUIEBRE POR CADA ESCUCHA
-- ============================================================

ALTER TABLE public.asignaciones_escucha
    ADD COLUMN IF NOT EXISTS quiebre_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'asignaciones_escucha_quiebre_id_fkey'
    ) THEN
        ALTER TABLE public.asignaciones_escucha
            ADD CONSTRAINT asignaciones_escucha_quiebre_id_fkey
            FOREIGN KEY (quiebre_id)
            REFERENCES public.quiebres(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_asignaciones_escucha_quiebre_id
    ON public.asignaciones_escucha (quiebre_id);

COMMIT;