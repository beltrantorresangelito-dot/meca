BEGIN;

DROP INDEX IF EXISTS public.idx_evaluaciones_quiebre_id;

ALTER TABLE public.evaluaciones
    DROP CONSTRAINT IF EXISTS evaluaciones_quiebre_id_fkey;

ALTER TABLE public.evaluaciones
    DROP COLUMN IF EXISTS quiebre_id;

COMMIT;