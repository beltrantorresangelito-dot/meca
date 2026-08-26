BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM campana_matriz cm
        JOIN campanas c
          ON c.id = cm.campana_id
        JOIN matrices m
          ON m.id = cm.matriz_id
        WHERE c.quiebre_id <> m.quiebre_id
          AND cm.activa = TRUE
    ) THEN
        RAISE EXCEPTION
            'No se puede revertir 0011: existen matrices compartidas entre quiebres.';
    END IF;
END $$;

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

    SELECT COUNT(*)
    INTO v_version_count
    FROM versiones_matriz vm
    WHERE vm.matriz_id = v_matriz_id
      AND vm.fecha_vigencia <= p_fecha;

    IF v_version_count = 0 THEN
        RAISE EXCEPTION
            'Existe matriz vigente para campaña % en fecha %, pero no existe una versión de matriz aplicable.',
            p_campana_id,
            p_fecha;
    END IF;

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
     AND m.quiebre_id = q.id

    JOIN LATERAL (
        SELECT vm2.*
        FROM versiones_matriz vm2
        WHERE vm2.matriz_id = m.id
          AND vm2.fecha_vigencia <= p_fecha
        ORDER BY
            vm2.fecha_vigencia DESC,
            vm2.id DESC
        LIMIT 1
    ) vm
      ON TRUE

    WHERE c.id = p_campana_id;

END;
$function$;

COMMENT ON COLUMN matrices.quiebre_id IS NULL;

COMMIT;