CREATE OR REPLACE FUNCTION public.resolver_contexto_carga_escucha_quiebre(
    p_quiebre TEXT
)
RETURNS TABLE(
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

    v_contexto_directo_count INTEGER;

    v_quiebre_normalizado TEXT;
BEGIN

    -- ========================================================
    -- 1. VALIDAR ENTRADA
    -- ========================================================

    v_quiebre_normalizado :=
        UPPER(
            TRIM(
                COALESCE(
                    p_quiebre,
                    ''
                )
            )
        );

    IF v_quiebre_normalizado = '' THEN
        RAISE EXCEPTION
            'El Quiebre es obligatorio para cargar una escucha.';
    END IF;


    -- ========================================================
    -- 2. RESOLVER QUIEBRE
    --
    -- Puede recibirse código o nombre.
    -- Comparación exacta después de TRIM + UPPER.
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
            UPPER(TRIM(q.codigo)) =
                v_quiebre_normalizado
            OR
            UPPER(TRIM(q.nombre)) =
                v_quiebre_normalizado
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
    -- 3. VALIDAR QUE EL QUIEBRE TENGA CONTEXTO DIRECTO
    --
    -- Una campaña vacía NO convierte automáticamente a cualquier
    -- quiebre en un quiebre directo.
    --
    -- Para aceptar una escucha sin campaña debe existir una
    -- configuración vigente en quiebre_matriz.
    -- ========================================================

    SELECT
        COUNT(*)::INTEGER
    INTO
        v_contexto_directo_count
    FROM public.quiebre_matriz qm
    WHERE qm.quiebre_id = v_quiebre_id
      AND qm.activa = TRUE
      AND qm.vigente_desde <= CURRENT_DATE
      AND (
            qm.vigente_hasta IS NULL
            OR qm.vigente_hasta >= CURRENT_DATE
          );

    IF v_contexto_directo_count = 0 THEN
        RAISE EXCEPTION
            'Quiebre "%" no tiene una matriz directa vigente configurada.',
            TRIM(p_quiebre);
    END IF;

    IF v_contexto_directo_count > 1 THEN
        RAISE EXCEPTION
            'Quiebre "%" tiene más de una matriz directa vigente configurada.',
            TRIM(p_quiebre);
    END IF;


    -- ========================================================
    -- 4. DEVOLVER CONTEXTO
    --
    -- Se mantiene exactamente la misma estructura de salida
    -- del resolver Quiebre + Campaña.
    --
    -- En un quiebre directo los campos de campaña son NULL.
    -- ========================================================

    RETURN QUERY
    SELECT
        q.id::BIGINT,
        q.codigo::VARCHAR,
        q.nombre::VARCHAR,

        NULL::INTEGER,
        NULL::VARCHAR,
        NULL::VARCHAR

    FROM public.quiebres q
    WHERE q.id = v_quiebre_id;

END;
$function$;