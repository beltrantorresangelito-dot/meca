BEGIN;

-- ============================================================
-- 1. CONTEXTO DE DOMINIO DEL PDA
-- ============================================================

ALTER TABLE public.pda_cabecera
    ADD COLUMN IF NOT EXISTS quiebre_id bigint,
    ADD COLUMN IF NOT EXISTS campana_id bigint,
    ADD COLUMN IF NOT EXISTS matriz_id bigint,
    ADD COLUMN IF NOT EXISTS version_matriz_id bigint,
    ADD COLUMN IF NOT EXISTS contexto_snapshot jsonb;


COMMENT ON COLUMN public.pda_cabecera.quiebre_id IS
'Quiebre bajo el cual fue generado el PDA.';

COMMENT ON COLUMN public.pda_cabecera.campana_id IS
'Campaña bajo la cual fue generado el PDA. NULL cuando la matriz está asociada directamente al quiebre.';

COMMENT ON COLUMN public.pda_cabecera.matriz_id IS
'Matriz de evaluación utilizada al generar el PDA.';

COMMENT ON COLUMN public.pda_cabecera.version_matriz_id IS
'Versión histórica de la matriz utilizada al generar el PDA.';

COMMENT ON COLUMN public.pda_cabecera.contexto_snapshot IS
'Snapshot histórico del contexto de dominio utilizado al generar el PDA.';


-- ============================================================
-- 2. DOCUMENTO PDA VINCULADO A SU CABECERA
-- ============================================================

ALTER TABLE public.pda_documentos
    ADD COLUMN IF NOT EXISTS pda_id bigint,
    ADD COLUMN IF NOT EXISTS contenido_html text,
    ADD COLUMN IF NOT EXISTS contenido_texto text,
    ADD COLUMN IF NOT EXISTS contexto_snapshot jsonb;


COMMENT ON COLUMN public.pda_documentos.pda_id IS
'PDA al que pertenece el documento.';

COMMENT ON COLUMN public.pda_documentos.contenido_html IS
'Representación HTML histórica del documento generado.';

COMMENT ON COLUMN public.pda_documentos.contenido_texto IS
'Representación de texto plano del documento generado.';

COMMENT ON COLUMN public.pda_documentos.contexto_snapshot IS
'Contexto histórico del documento al momento de su generación.';


-- ============================================================
-- 3. RELACIÓN DOCUMENTO -> PDA
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'pda_documentos_pda_id_fkey'
    ) THEN

        ALTER TABLE public.pda_documentos
            ADD CONSTRAINT pda_documentos_pda_id_fkey
            FOREIGN KEY (pda_id)
            REFERENCES public.pda_cabecera(id)
            ON DELETE CASCADE;

    END IF;
END
$$;


-- ============================================================
-- 4. IDENTIDAD REAL DE LOS HALLAZGOS / ACCIONES
-- ============================================================

ALTER TABLE public.pda_acciones
    ADD COLUMN IF NOT EXISTS frente_id bigint,
    ADD COLUMN IF NOT EXISTS atributo_id bigint,
    ADD COLUMN IF NOT EXISTS criterio_id bigint,
    ADD COLUMN IF NOT EXISTS frente text,
    ADD COLUMN IF NOT EXISTS criterio text,
    ADD COLUMN IF NOT EXISTS evaluacion_id bigint,
    ADD COLUMN IF NOT EXISTS contexto_snapshot jsonb;


COMMENT ON COLUMN public.pda_acciones.frente_id IS
'Identificador histórico del frente de la matriz.';

COMMENT ON COLUMN public.pda_acciones.atributo_id IS
'Identificador histórico del atributo de la matriz.';

COMMENT ON COLUMN public.pda_acciones.criterio_id IS
'Identificador histórico del criterio/item incumplido.';

COMMENT ON COLUMN public.pda_acciones.frente IS
'Nombre histórico del frente al generar el PDA.';

COMMENT ON COLUMN public.pda_acciones.criterio IS
'Nombre histórico del criterio/item incumplido.';

COMMENT ON COLUMN public.pda_acciones.evaluacion_id IS
'Evaluación que originó el hallazgo cuando aplica.';


-- ============================================================
-- 5. IDS GENERADOS POR POSTGRES
--    Evitamos definitivamente MAX(id) + 1 desde JS.
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.pda_cabecera_id_seq;

ALTER SEQUENCE public.pda_cabecera_id_seq
    OWNED BY public.pda_cabecera.id;

SELECT setval(
    'public.pda_cabecera_id_seq',
    GREATEST(
        COALESCE(
            (
                SELECT MAX(id)
                FROM public.pda_cabecera
            ),
            0
        ),
        1
    ),
    EXISTS (
        SELECT 1
        FROM public.pda_cabecera
    )
);

ALTER TABLE public.pda_cabecera
    ALTER COLUMN id
    SET DEFAULT nextval(
        'public.pda_cabecera_id_seq'
    );


CREATE SEQUENCE IF NOT EXISTS public.pda_acciones_id_seq;

ALTER SEQUENCE public.pda_acciones_id_seq
    OWNED BY public.pda_acciones.id;

SELECT setval(
    'public.pda_acciones_id_seq',
    GREATEST(
        COALESCE(
            (
                SELECT MAX(id)
                FROM public.pda_acciones
            ),
            0
        ),
        1
    ),
    EXISTS (
        SELECT 1
        FROM public.pda_acciones
    )
);

ALTER TABLE public.pda_acciones
    ALTER COLUMN id
    SET DEFAULT nextval(
        'public.pda_acciones_id_seq'
    );


CREATE SEQUENCE IF NOT EXISTS public.pda_ciclos_evaluacion_id_seq;

ALTER SEQUENCE public.pda_ciclos_evaluacion_id_seq
    OWNED BY public.pda_ciclos_evaluacion.id;

SELECT setval(
    'public.pda_ciclos_evaluacion_id_seq',
    GREATEST(
        COALESCE(
            (
                SELECT MAX(id)
                FROM public.pda_ciclos_evaluacion
            ),
            0
        ),
        1
    ),
    EXISTS (
        SELECT 1
        FROM public.pda_ciclos_evaluacion
    )
);

ALTER TABLE public.pda_ciclos_evaluacion
    ALTER COLUMN id
    SET DEFAULT nextval(
        'public.pda_ciclos_evaluacion_id_seq'
    );


-- ============================================================
-- 6. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_pda_cabecera_contexto
    ON public.pda_cabecera (
        quiebre_id,
        campana_id,
        matriz_id,
        version_matriz_id
    );


CREATE INDEX IF NOT EXISTS idx_pda_documentos_pda_id
    ON public.pda_documentos (
        pda_id
    );


CREATE INDEX IF NOT EXISTS idx_pda_acciones_pda_contexto
    ON public.pda_acciones (
        pda_id,
        frente_id,
        atributo_id,
        criterio_id
    );


-- ============================================================
-- 7. EVITAR DUPLICAR EL MISMO PDA DEL MISMO CICLO/CONTEXTO
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_pda_ciclo_contexto
    ON public.pda_cabecera (
        agente,
        ciclo_basal_numero,
        quiebre_id,
        COALESCE(campana_id, 0),
        matriz_id,
        version_matriz_id
    )
    WHERE
        ciclo_basal_numero IS NOT NULL
        AND quiebre_id IS NOT NULL
        AND matriz_id IS NOT NULL
        AND version_matriz_id IS NOT NULL;


COMMIT;