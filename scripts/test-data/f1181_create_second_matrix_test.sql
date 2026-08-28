-- ============================================================
-- MECA F11.8.1
-- Escenario controlado para validar frontend multi-matriz
--
-- CREA:
--   Campaña MXTST
--   Matriz MATRIZ_TEST
--   Versión TEST_M2_v1
--   1 frente / 1 atributo / 1 submotivo
--
-- NO MODIFICA:
--   T
--   ST
--   F
--   MATRIZ_COBRANZAS
-- ============================================================

BEGIN;

DO $$
DECLARE
    v_quiebre_id       BIGINT;
    v_campana_id       BIGINT;
    v_matriz_id        BIGINT;
    v_version_id       INTEGER;
    v_frente_id        INTEGER;
    v_atributo_id      INTEGER;
BEGIN

    -- ========================================================
    -- 1. RESOLVER QUIEBRE COBRANZAS
    -- ========================================================
    SELECT id
    INTO v_quiebre_id
    FROM quiebres
    WHERE codigo = 'COBRANZAS'
      AND activo = TRUE
    LIMIT 1;

    IF v_quiebre_id IS NULL THEN
        RAISE EXCEPTION
            'No existe el quiebre COBRANZAS activo.';
    END IF;


    -- ========================================================
    -- 2. CREAR CAMPAÑA DE PRUEBA
    -- ========================================================
    INSERT INTO campanas (
        codigo,
        descripcion,
        activa,
        quiebre_id
    )
    VALUES (
        'MXTST',
        'Prueba Multi Matriz',
        TRUE,
        v_quiebre_id
    )
    RETURNING id
    INTO v_campana_id;


    -- ========================================================
    -- 3. CREAR SEGUNDA MATRIZ
    -- ========================================================
    INSERT INTO matrices (
        quiebre_id,
        codigo,
        nombre,
        descripcion,
        activa
    )
    VALUES (
        v_quiebre_id,
        'MATRIZ_TEST',
        'Matriz Test Multi Matriz',
        'Matriz temporal para validación F11.8 frontend multi-matriz.',
        TRUE
    )
    RETURNING id
    INTO v_matriz_id;


    -- ========================================================
    -- 4. ASOCIAR CAMPAÑA → MATRIZ
    -- ========================================================
    INSERT INTO campana_matriz (
        campana_id,
        matriz_id,
        vigente_desde,
        vigente_hasta,
        activa
    )
    VALUES (
        v_campana_id,
        v_matriz_id,
        DATE '2026-08-26',
        NULL,
        TRUE
    );


    -- ========================================================
    -- 5. CREAR VERSIÓN ACTIVA
    --
    -- IMPORTANTE:
    -- version es UNIQUE global actualmente.
    -- ========================================================
    INSERT INTO versiones_matriz (
        version,
        descripcion,
        fecha_vigencia,
        activa,
        creado_por,
        publicado_por,
        publicado_en,
        matriz_id
    )
    VALUES (
        'TEST_M2_v1',
        'Versión temporal para prueba F11.8',
        DATE '2026-08-26',
        TRUE,
        'F11.8_TEST',
        'F11.8_TEST',
        NOW(),
        v_matriz_id
    )
    RETURNING id
    INTO v_version_id;


    -- ========================================================
    -- 6. CREAR FRENTE
    -- ========================================================
    INSERT INTO version_frentes (
        version_id,
        codigo,
        nombre,
        peso_maximo,
        orden,
        activo
    )
    VALUES (
        v_version_id,
        'TEST',
        'TEST - Frente Matriz 2',
        100,
        1,
        TRUE
    )
    RETURNING id
    INTO v_frente_id;


    -- ========================================================
    -- 7. CREAR ATRIBUTO
    -- ========================================================
    INSERT INTO version_atributos (
        version_frente_id,
        nombre,
        peso_maximo,
        orden,
        activo
    )
    VALUES (
        v_frente_id,
        'Atributo Matriz Test',
        100,
        1,
        TRUE
    )
    RETURNING id
    INTO v_atributo_id;


    -- ========================================================
    -- 8. CREAR SUBMOTIVO
    -- ========================================================
    INSERT INTO version_sub_motivos (
        version_atributo_id,
        peso_individual,
        orden,
        codigo,
        descripcion,
        activo,
        clasificacion
    )
    VALUES (
        v_atributo_id,
        100,
        1,
        'TEST_SM_001',
        'Submotivo exclusivo de MATRIZ_TEST',
        TRUE,
        'PROCESO'
    );


    -- ========================================================
    -- RESULTADO
    -- ========================================================
    RAISE NOTICE
        'F11.8 TEST creado: campana_id=%, matriz_id=%, version_id=%',
        v_campana_id,
        v_matriz_id,
        v_version_id;

END $$;

COMMIT;