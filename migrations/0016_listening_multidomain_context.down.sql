-- ============================================================
-- MECA
-- 0016 DOWN - Contexto multidominio para Escuchas
-- ============================================================

BEGIN;

DROP INDEX IF EXISTS public.idx_asignaciones_escucha_quiebre_id;

ALTER TABLE public.asignaciones_escucha
    DROP CONSTRAINT IF EXISTS asignaciones_escucha_quiebre_id_fkey;

ALTER TABLE public.asignaciones_escucha
    DROP COLUMN IF EXISTS quiebre_id;


DROP INDEX IF EXISTS public.idx_tareas_escucha_version_plantilla;

ALTER TABLE public.tareas_escucha
    DROP CONSTRAINT IF EXISTS tareas_escucha_version_plantilla_carga_fkey;

ALTER TABLE public.tareas_escucha
    DROP COLUMN IF EXISTS version_plantilla_carga_id;

COMMIT;