-- Rollback 0008
-- Restaura la definición funcional de 0007 (sin excepción explícita
-- por ausencia de versión aplicable).

CREATE OR REPLACE FUNCTION resolver_contexto_evaluacion(
    p_campana_id BIGINT,
    p_fecha DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    quiebre_id BIGINT,
    quiebre_codigo VARCHAR,
    campana_id BIGINT,
    campana_codigo VARCHAR,
    matriz_id BIGINT,
    matriz_codigo VARCHAR,
    version_matriz_id BIGINT,
    version VARCHAR,
    fecha_vigencia DATE
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM campana_matriz cm
    WHERE cm.campana_id = p_campana_id
      AND cm.activa = TRUE
      AND cm.vigente_desde <= p_fecha
      AND (cm.vigente_hasta IS NULL OR cm.vigente_hasta >= p_fecha);

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
     AND (cm.vigente_hasta IS NULL OR cm.vigente_hasta >= p_fecha)
    JOIN matrices m
      ON m.id = cm.matriz_id
     AND m.quiebre_id = q.id
    JOIN LATERAL (
        SELECT vm2.*
        FROM versiones_matriz vm2
        WHERE vm2.matriz_id = m.id
          AND vm2.fecha_vigencia <= p_fecha
        ORDER BY vm2.fecha_vigencia DESC, vm2.id DESC
        LIMIT 1
    ) vm ON TRUE
    WHERE c.id = p_campana_id;
END;
$$;
