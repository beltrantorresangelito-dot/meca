-- ============================================================
-- MECA F14
-- Contexto directo Quiebre -> Matriz
--
-- OBJETIVO:
--   Permitir que un Quiebre opere sin Campañas.
--
-- MODALIDADES SOPORTADAS:
--
--   Quiebre -> Campaña -> campana_matriz -> Matriz
--   Quiebre ------------> quiebre_matriz -> Matriz
--
-- IMPORTANTE:
--   - NO modifica campana_matriz.
--   - NO modifica resolver_contexto_evaluacion().
--   - NO restringe la Matriz a su quiebre de origen.
--   - Solo versiones PUBLICADAS participan en evaluación.
-- ============================================================

BEGIN;


-- ============================================================
-- 1. RELACIÓN QUIEBRE -> MATRIZ
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quiebre_matriz (
    id BIGSERIAL PRIMARY KEY,

    quiebre_id BIGINT NOT NULL,
    matriz_id BIGINT NOT NULL,

    vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
    vigente_hasta DATE NULL,

    activa BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_quiebre_matriz_quiebre
        FOREIGN KEY (quiebre_id)
        REFERENCES public.quiebres(id),

    CONSTRAINT fk_quiebre_matriz_matriz
        FOREIGN KEY (matriz_id)
        REFERENCES public.matrices(id),

    CONSTRAINT ck_quiebre_matriz_vigencia
        CHECK (
            vigente_hasta IS NULL
            OR vigente_hasta >= vigente_desde
        ),

    CONSTRAINT uq_quiebre_matriz_inicio
        UNIQUE (quiebre_id, vigente_desde)
);


-- ============================================================
-- 2. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_quiebre_matriz_quiebre
    ON public.quiebre_matriz(quiebre_id);

CREATE INDEX IF NOT EXISTS idx_quiebre_matriz_matriz
    ON public.quiebre_matriz(matriz_id);

CREATE INDEX IF NOT EXISTS idx_quiebre_matriz_vigencia
    ON public.quiebre_matriz(
        quiebre_id,
        vigente_desde,
        vigente_hasta
    );


-- ============================================================
-- 3. VALIDAR SOLAPAMIENTO DE MATRICES DIRECTAS
-- ============================================================

CREATE OR REPLACE FUNCTION public.validar_quiebre_matriz()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INTEGER;
BEGIN

    -- Las relaciones inactivas no participan
    -- en la validación de vigencia operacional.
    IF NEW.activa IS FALSE THEN
        RETURN NEW;
    END IF;


    -- ========================================================
    -- VALIDAR QUE NO EXISTA OTRA MATRIZ ACTIVA
    -- PARA EL MISMO QUIEBRE EN EL MISMO PERIODO
    -- ========================================================

    SELECT COUNT(*)
    INTO v_count
    FROM public.quiebre_matriz qm
    WHERE qm.quiebre_id = NEW.quiebre_id
      AND qm.activa = TRUE
      AND qm.id <> COALESCE(NEW.id, 0)

      AND NEW.vigente_desde
          <= COALESCE(qm.vigente_hasta, 'infinity'::date)

      AND COALESCE(NEW.vigente_hasta, 'infinity'::date)
          >= qm.vigente_desde;


    IF v_count > 0 THEN

        RAISE EXCEPTION
            'Existe otra matriz vigente para quiebre % en el periodo solicitado.',
            NEW.quiebre_id;

    END IF;


    NEW.updated_at := NOW();

    RETURN NEW;

END;
$function$;


DROP TRIGGER IF EXISTS trg_validar_quiebre_matriz
ON public.quiebre_matriz;

CREATE TRIGGER trg_validar_quiebre_matriz
BEFORE INSERT OR UPDATE
ON public.quiebre_matriz
FOR EACH ROW
EXECUTE FUNCTION public.validar_quiebre_matriz();


-- ============================================================
-- 4. RESOLVER CONTEXTO DIRECTO POR QUIEBRE
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolver_contexto_evaluacion_quiebre(
    p_quiebre_id BIGINT,
    p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    quiebre_id BIGINT,
    quiebre_codigo CHARACTER VARYING,
    campana_id BIGINT,
    campana_codigo CHARACTER VARYING,
    matriz_id BIGINT,
    matriz_codigo CHARACTER VARYING,
    version_matriz_id BIGINT,
    version CHARACTER VARYING,
    fecha_vigencia DATE
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INTEGER;
    v_matriz_id BIGINT;
    v_version_count INTEGER;
BEGIN

    -- ========================================================
    -- 1. VALIDAR QUIEBRE
    -- ========================================================

    IF NOT EXISTS (
        SELECT 1
        FROM public.quiebres q
        WHERE q.id = p_quiebre_id
    ) THEN

        RAISE EXCEPTION
            'Quiebre % no existe.',
            p_quiebre_id;

    END IF;


    -- ========================================================
    -- 2. RESOLVER MATRIZ DIRECTA VIGENTE
    -- ========================================================

    SELECT
        COUNT(*),
        MAX(qm.matriz_id)
    INTO
        v_count,
        v_matriz_id
    FROM public.quiebre_matriz qm
    JOIN public.matrices m
      ON m.id = qm.matriz_id
     AND m.activa = TRUE
    WHERE qm.quiebre_id = p_quiebre_id
      AND qm.activa = TRUE
      AND qm.vigente_desde <= p_fecha
      AND (
            qm.vigente_hasta IS NULL
            OR qm.vigente_hasta >= p_fecha
          );


    IF v_count = 0 THEN

        RAISE EXCEPTION
            'No existe matriz directa vigente para quiebre % en fecha %.',
            p_quiebre_id,
            p_fecha;

    ELSIF v_count > 1 THEN

        RAISE EXCEPTION
            'Existe más de una matriz directa vigente para quiebre % en fecha %.',
            p_quiebre_id,
            p_fecha;

    END IF;


    -- ========================================================
    -- 3. VALIDAR VERSIÓN PUBLICADA APLICABLE
    -- ========================================================

    SELECT COUNT(*)
    INTO v_version_count
    FROM public.versiones_matriz vm
    WHERE vm.matriz_id = v_matriz_id
      AND vm.fecha_vigencia <= p_fecha
      AND vm.publicado_en IS NOT NULL;


    IF v_version_count = 0 THEN

        RAISE EXCEPTION
            'Existe matriz directa vigente para quiebre % en fecha %, pero no existe una versión de matriz publicada y aplicable.',
            p_quiebre_id,
            p_fecha;

    END IF;


    -- ========================================================
    -- 4. DEVOLVER CONTEXTO
    --
    -- campana_id / campana_codigo = NULL
    -- porque este contexto NO utiliza campaña.
    -- ========================================================

    RETURN QUERY

    SELECT
        q.id::BIGINT,
        q.codigo::VARCHAR,

        NULL::BIGINT,
        NULL::VARCHAR,

        m.id::BIGINT,
        m.codigo::VARCHAR,

        vm.id::BIGINT,
        vm.version::VARCHAR,
        vm.fecha_vigencia::DATE

    FROM public.quiebres q

    JOIN public.quiebre_matriz qm
      ON qm.quiebre_id = q.id
     AND qm.activa = TRUE
     AND qm.vigente_desde <= p_fecha
     AND (
           qm.vigente_hasta IS NULL
           OR qm.vigente_hasta >= p_fecha
         )

    JOIN public.matrices m
      ON m.id = qm.matriz_id
     AND m.activa = TRUE

    JOIN LATERAL (

        SELECT vm2.*

        FROM public.versiones_matriz vm2

        WHERE vm2.matriz_id = m.id
          AND vm2.fecha_vigencia <= p_fecha
          AND vm2.publicado_en IS NOT NULL

        ORDER BY
            vm2.fecha_vigencia DESC,
            vm2.id DESC

        LIMIT 1

    ) vm
      ON TRUE

    WHERE q.id = p_quiebre_id;

END;
$function$;


COMMENT ON TABLE public.quiebre_matriz IS
'Relación funcional directa entre Quiebre y Matriz para quiebres que operan sin Campaña.';

COMMENT ON FUNCTION
public.resolver_contexto_evaluacion_quiebre(BIGINT, DATE) IS
'Resuelve Matriz y versión publicada aplicable para un Quiebre que opera directamente sin Campaña.';


COMMIT;