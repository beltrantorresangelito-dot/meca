-- ============================================================
-- MECA
-- 0017 - Resolución de dominio para carga de Escuchas
--
-- Resuelve valores de negocio provenientes del archivo:
--
--   Quiebre + Campaña
--
-- hacia:
--
--   quiebre_id + campana_id
--
-- Reglas:
-- - Comparación exacta después de TRIM + UPPER.
-- - Quiebre debe estar activo.
-- - Campaña debe estar activa.
-- - Campaña debe pertenecer al quiebre resuelto.
-- - No utiliza fuzzy matching.
-- - No modifica datos existentes.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.resolver_contexto_carga_escucha(
    p_quiebre TEXT,
    p_campana TEXT
)
RETURNS TABLE (
    quiebre_id BIGINT,
    quiebre_codigo VARCHAR,
    quiebre_nombre VARCHAR,
    campana_id INTEGER,
    campana_codigo VARCHAR,
    campana_descripcion VARCHAR
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
    v_quiebre_id BIGINT;
    v_quiebre_count INTEGER;

    v_campana_id INTEGER;
    v_campana_count INTEGER;

    v_quiebre_normalizado TEXT;
    v_campana_normalizada TEXT;
BEGIN

    -- ========================================================
    -- 1. VALIDAR ENTRADAS
    -- ========================================================

    v_quiebre_normalizado := UPPER(TRIM(COALESCE(p_quiebre, '')));
    v_campana_normalizada := UPPER(TRIM(COALESCE(p_campana, '')));

    IF v_quiebre_normalizado = '' THEN
        RAISE EXCEPTION
            'El Quiebre es obligatorio para cargar una escucha.';
    END IF;

    IF v_campana_normalizada = '' THEN
        RAISE EXCEPTION
            'La Campaña es obligatoria para cargar una escucha.';
    END IF;


    -- ========================================================
    -- 2. RESOLVER QUIEBRE
    --
    -- Puede recibirse código o nombre.
    -- La comparación es exacta después de TRIM + UPPER.
    -- ========================================================

    SELECT
        COUNT(*)::INTEGER,
        MIN(q.id)
    INTO
        v_quiebre_count,
        v_quiebre_id
    FROM public.quiebres q
    WHERE q.activo = TRUE
      AND (
            UPPER(TRIM(q.codigo)) = v_quiebre_normalizado
            OR
            UPPER(TRIM(q.nombre)) = v_quiebre_normalizado
          );

    IF v_quiebre_count = 0 THEN
        RAISE EXCEPTION
            'Quiebre "%" no existe o no está activo.',
            TRIM(p_quiebre);
    END IF;

    IF v_quiebre_count > 1 THEN
        RAISE EXCEPTION
            'Quiebre "%" es ambiguo: coincide con más de un registro activo.',
            TRIM(p_quiebre);
    END IF;


    -- ========================================================
    -- 3. RESOLVER CAMPAÑA DENTRO DEL QUIEBRE
    --
    -- Puede recibirse código o descripción.
    -- Solo se consideran campañas activas pertenecientes al
    -- quiebre previamente resuelto.
    -- ========================================================

    SELECT
        COUNT(*)::INTEGER,
        MIN(c.id)
    INTO
        v_campana_count,
        v_campana_id
    FROM public.campanas c
    WHERE c.activa = TRUE
      AND c.quiebre_id = v_quiebre_id
      AND (
            UPPER(TRIM(c.codigo)) = v_campana_normalizada
            OR
            UPPER(TRIM(c.descripcion)) = v_campana_normalizada
          );

    IF v_campana_count = 0 THEN
        RAISE EXCEPTION
            'Campaña "%" no existe, no está activa o no pertenece al Quiebre "%".',
            TRIM(p_campana),
            TRIM(p_quiebre);
    END IF;

    IF v_campana_count > 1 THEN
        RAISE EXCEPTION
            'Campaña "%" es ambigua dentro del Quiebre "%".',
            TRIM(p_campana),
            TRIM(p_quiebre);
    END IF;


    -- ========================================================
    -- 4. DEVOLVER CONTEXTO RESUELTO
    -- ========================================================

    RETURN QUERY
    SELECT
        q.id::BIGINT,
        q.codigo::VARCHAR,
        q.nombre::VARCHAR,

        c.id::INTEGER,
        c.codigo::VARCHAR,
        c.descripcion::VARCHAR

    FROM public.quiebres q
    JOIN public.campanas c
      ON c.quiebre_id = q.id

    WHERE q.id = v_quiebre_id
      AND c.id = v_campana_id;

END;
$function$;

COMMIT;