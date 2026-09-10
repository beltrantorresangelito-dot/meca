BEGIN;

DROP INDEX IF EXISTS public.uq_pda_ciclo_contexto;
DROP INDEX IF EXISTS public.idx_pda_acciones_pda_contexto;
DROP INDEX IF EXISTS public.idx_pda_documentos_pda_id;
DROP INDEX IF EXISTS public.idx_pda_cabecera_contexto;

ALTER TABLE public.pda_documentos
    DROP CONSTRAINT IF EXISTS pda_documentos_pda_id_fkey;

ALTER TABLE public.pda_acciones
    DROP COLUMN IF EXISTS contexto_snapshot,
    DROP COLUMN IF EXISTS evaluacion_id,
    DROP COLUMN IF EXISTS criterio,
    DROP COLUMN IF EXISTS frente,
    DROP COLUMN IF EXISTS criterio_id,
    DROP COLUMN IF EXISTS atributo_id,
    DROP COLUMN IF EXISTS frente_id;

ALTER TABLE public.pda_documentos
    DROP COLUMN IF EXISTS contexto_snapshot,
    DROP COLUMN IF EXISTS contenido_texto,
    DROP COLUMN IF EXISTS contenido_html,
    DROP COLUMN IF EXISTS pda_id;

ALTER TABLE public.pda_cabecera
    DROP COLUMN IF EXISTS contexto_snapshot,
    DROP COLUMN IF EXISTS version_matriz_id,
    DROP COLUMN IF EXISTS matriz_id,
    DROP COLUMN IF EXISTS campana_id,
    DROP COLUMN IF EXISTS quiebre_id;

ALTER TABLE public.pda_cabecera
    ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.pda_acciones
    ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.pda_ciclos_evaluacion
    ALTER COLUMN id DROP DEFAULT;

DROP SEQUENCE IF EXISTS public.pda_cabecera_id_seq;
DROP SEQUENCE IF EXISTS public.pda_acciones_id_seq;
DROP SEQUENCE IF EXISTS public.pda_ciclos_evaluacion_id_seq;

COMMIT;