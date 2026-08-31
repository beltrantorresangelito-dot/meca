-- ============================================================
-- MECA F12
-- Excluir versiones no publicadas de la resolución
-- del contexto de evaluación
--
-- OBJETIVO:
--   Una versión BORRADOR:
--
--       publicado_en IS NULL
--
--   NO puede ser utilizada por una evaluación.
--
-- Solo participan:
--
--   PUBLICADA ACTIVA:
--       publicado_en IS NOT NULL
--       activa = TRUE
--
--   PUBLICADA HISTÓRICA:
--       publicado_en IS NOT NULL
--       activa = FALSE
--
-- La fecha de vigencia continúa determinando qué versión
-- publicada corresponde a una evaluación histórica.
-- ============================================================

BEGIN;


-- ============================================================
-- 1. ACTUALIZAR RESOLVER DE CONTEXTO DE EVALUACIÓN
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolver_contexto_evaluacion(
    p_campana_id bigint,
    p_fecha date DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    quiebre_id bigint,
    quiebre_codigo character varying,
    campana_id bigint,
    campana_codigo character varying,
    matriz_id bigint,
    matriz_codigo character varying,
    version_matriz_id bigint,
    version character varying,
    fecha_vigencia date
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INTEGER;
    v_matriz_id BIGINT;
    v_version_count INTEGER;
BEGIN

    -- ========================================================
    -- 1. RESOLVER MATRIZ VIGENTE DE LA CAMPAÑA
    -- ========================================================

    SELECT
        COUNT(*),
        MAX(cm.matriz_id)
    INTO
        v_count,
        v_matriz_id
    FROM campana_matriz cm
    WHERE cm.campana_id = p_campana_id
      AND cm.activa = TRUE
      AND cm.vigente_desde <= p_fecha
      AND (
            cm.vigente_hasta IS NULL
            OR cm.vigente_hasta >= p_fecha
          );

    IF v_count = 0 THEN

        RAISE EXCEPTION
            'No existe matriz vigente para campaña % en fecha %.',
            p_campana_id,
            p_fecha;

    ELSIF v_count > 1 THEN

        RAISE EXCEPTION
            'Existe más de una matriz vigente para campaña % en fecha %.',
            p_campana_id,
            p_fecha;

    END IF;


    -- ========================================================
    -- 2. VALIDAR VERSIÓN PUBLICADA APLICABLE
    --
    -- publicado_en IS NULL = BORRADOR
    -- Los borradores no participan en evaluaciones.
    -- ========================================================

    SELECT COUNT(*)
    INTO v_version_count
    FROM versiones_matriz vm
    WHERE vm.matriz_id = v_matriz_id
      AND vm.fecha_vigencia <= p_fecha
      AND vm.publicado_en IS NOT NULL;

    IF v_version_count = 0 THEN

        RAISE EXCEPTION
            'Existe matriz vigente para campaña % en fecha %, pero no existe una versión de matriz publicada y aplicable.',
            p_campana_id,
            p_fecha;

    END IF;


    -- ========================================================
    -- 3. DEVOLVER CONTEXTO
    --
    -- La matriz puede ser utilizada por campañas pertenecientes
    -- a quiebres distintos al quiebre de origen de la matriz.
    --
    -- Únicamente se consideran versiones PUBLICADAS.
    -- ========================================================

    RETURN QUERY

    SELECT
        q.id::BIGINT,
        q.codigo::VARCHAR,

        c.id::BIGINT,
        c.codigo::VARCHAR,

        m.id::BIGINT,
        m.codigo::VARCHAR,

        vm.id::BIGINT,
        vm.version::VARCHAR,
        vm.fecha_vigencia::DATE

    FROM campanas c

    JOIN quiebres q
      ON q.id = c.quiebre_id

    JOIN campana_matriz cm
      ON cm.campana_id = c.id
     AND cm.activa = TRUE
     AND cm.vigente_desde <= p_fecha
     AND (
           cm.vigente_hasta IS NULL
           OR cm.vigente_hasta >= p_fecha
         )

    JOIN matrices m
      ON m.id = cm.matriz_id
     AND m.activa = TRUE

    JOIN LATERAL (

        SELECT vm2.*

        FROM versiones_matriz vm2

        WHERE vm2.matriz_id = m.id
          AND vm2.fecha_vigencia <= p_fecha
          AND vm2.publicado_en IS NOT NULL

        ORDER BY
            vm2.fecha_vigencia DESC,
            vm2.id DESC

        LIMIT 1

    ) vm
      ON TRUE

    WHERE c.id = p_campana_id;

END;
$function$;


COMMIT;