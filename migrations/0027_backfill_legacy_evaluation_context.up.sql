-- ============================================================
-- 0027 - BACKFILL CONTEXTO LEGACY DE EVALUACIONES
--
-- Objetivo:
--   Regularizar evaluaciones históricas para el modelo
--   multiquiebre / multicampaña / matriz versionada.
--
-- Regla de transición:
--   Toda la data existente antes de esta migración
--   pertenece al quiebre COBRANZAS.
-- ============================================================


-- ============================================================
-- 1. BACKUP PARA ROLLBACK
-- ============================================================

CREATE TABLE IF NOT EXISTS migration_0027_evaluaciones_backup AS
SELECT
    id,
    quiebre_id,
    campana,
    campana_id,
    matriz_id,
    version_matriz_id
FROM evaluaciones
WITH NO DATA;


TRUNCATE TABLE migration_0027_evaluaciones_backup;


INSERT INTO migration_0027_evaluaciones_backup (
    id,
    quiebre_id,
    campana,
    campana_id,
    matriz_id,
    version_matriz_id
)
SELECT
    id,
    quiebre_id,
    campana,
    campana_id,
    matriz_id,
    version_matriz_id
FROM evaluaciones;


-- ============================================================
-- 2. TABLA DE CASOS QUE NO PUEDAN REGULARIZARSE
-- ============================================================

CREATE TABLE IF NOT EXISTS migration_0027_contexto_pendiente (
    evaluacion_id BIGINT PRIMARY KEY,
    campana TEXT,
    campana_id BIGINT,
    fecha_original TEXT,
    motivo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


TRUNCATE TABLE migration_0027_contexto_pendiente;


-- ============================================================
-- 3. TODA LA DATA LEGACY = COBRANZAS
-- ============================================================

DO $$
DECLARE
    v_quiebre_cobranzas BIGINT;
BEGIN

    SELECT id
    INTO v_quiebre_cobranzas
    FROM quiebres
    WHERE UPPER(TRIM(codigo)) = 'COBRANZAS'
    ORDER BY id
    LIMIT 1;


    IF v_quiebre_cobranzas IS NULL THEN
        RAISE EXCEPTION
            'No existe el quiebre COBRANZAS';
    END IF;


    UPDATE evaluaciones
    SET quiebre_id = v_quiebre_cobranzas;


    RAISE NOTICE
        'Evaluaciones asociadas a COBRANZAS: %',
        (
            SELECT COUNT(*)
            FROM evaluaciones
            WHERE quiebre_id = v_quiebre_cobranzas
        );

END $$;


-- ============================================================
-- 4. NORMALIZAR CAMPANA_ID DESDE EL CÓDIGO
--
-- IMPORTANTE:
-- En el histórico detectamos combinaciones como:
--
-- T  -> 1 / 2 / 3
-- ST -> 1 / 2 / 3
-- F  -> 1 / 2 / 3
--
-- Por tanto el campana_id histórico NO puede considerarse
-- confiable cuando sí existe un código de campaña.
--
-- La fuente principal será evaluaciones.campana.
-- ============================================================

DO $$
DECLARE
    v_quiebre_cobranzas BIGINT;
BEGIN

    SELECT id
    INTO v_quiebre_cobranzas
    FROM quiebres
    WHERE UPPER(TRIM(codigo)) = 'COBRANZAS'
    ORDER BY id
    LIMIT 1;


    UPDATE evaluaciones e
    SET campana_id = c.id
    FROM campanas c
    WHERE
        e.quiebre_id = v_quiebre_cobranzas

        AND NULLIF(
            TRIM(e.campana),
            ''
        ) IS NOT NULL

        AND c.quiebre_id =
            v_quiebre_cobranzas

        AND UPPER(
            TRIM(c.codigo)
        ) =
        UPPER(
            TRIM(e.campana)
        );

END $$;


-- ============================================================
-- 5. PARA REGISTROS SIN TEXTO DE CAMPAÑA,
--    RECUPERAR EL CÓDIGO DESDE campana_id
--    SI EL ID ES VÁLIDO PARA COBRANZAS.
-- ============================================================

DO $$
DECLARE
    v_quiebre_cobranzas BIGINT;
BEGIN

    SELECT id
    INTO v_quiebre_cobranzas
    FROM quiebres
    WHERE UPPER(TRIM(codigo)) = 'COBRANZAS'
    ORDER BY id
    LIMIT 1;


    UPDATE evaluaciones e
    SET campana = c.codigo
    FROM campanas c
    WHERE
        e.quiebre_id =
            v_quiebre_cobranzas

        AND NULLIF(
            TRIM(e.campana),
            ''
        ) IS NULL

        AND e.campana_id =
            c.id

        AND c.quiebre_id =
            v_quiebre_cobranzas;

END $$;


-- ============================================================
-- 6. RESOLVER MATRIZ Y VERSION POR EVALUACION
--
-- Se procesa individualmente para que UNA evaluación
-- problemática no provoque rollback de las otras 2480.
-- ============================================================

DO $$
DECLARE

    r RECORD;

    v_fecha DATE;

    v_quiebre_id BIGINT;

    v_campana_id BIGINT;

    v_matriz_id BIGINT;

    v_version_matriz_id BIGINT;

    v_fecha_texto TEXT;

BEGIN

    FOR r IN
        SELECT
            e.id,
            e.campana,
            e.campana_id,
            e.fecha
        FROM evaluaciones e
        ORDER BY e.id
    LOOP

        BEGIN

            -- ================================================
            -- NORMALIZAR FECHA LEGACY
            -- ================================================

            v_fecha := NULL;

            v_fecha_texto :=
                NULLIF(
                    TRIM(
                        r.fecha::TEXT
                    ),
                    ''
                );


            IF v_fecha_texto IS NULL THEN

                INSERT INTO migration_0027_contexto_pendiente (
                    evaluacion_id,
                    campana,
                    campana_id,
                    fecha_original,
                    motivo
                )
                VALUES (
                    r.id,
                    r.campana,
                    r.campana_id,
                    NULL,
                    'Fecha vacía'
                )
                ON CONFLICT (evaluacion_id)
                DO UPDATE
                SET motivo = EXCLUDED.motivo;

                CONTINUE;

            END IF;


            -- ISO: 2026-08-25 / timestamp ISO
            IF
                v_fecha_texto ~
                '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
            THEN

                v_fecha :=
                    SUBSTRING(
                        v_fecha_texto
                        FROM 1 FOR 10
                    )::DATE;


            -- DD/MM/YYYY
            ELSIF
                v_fecha_texto ~
                '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}'
            THEN

                v_fecha :=
                    TO_DATE(
                        SPLIT_PART(
                            v_fecha_texto,
                            ' ',
                            1
                        ),
                        'DD/MM/YYYY'
                    );

            END IF;


            IF v_fecha IS NULL THEN

                INSERT INTO migration_0027_contexto_pendiente (
                    evaluacion_id,
                    campana,
                    campana_id,
                    fecha_original,
                    motivo
                )
                VALUES (
                    r.id,
                    r.campana,
                    r.campana_id,
                    v_fecha_texto,
                    'Formato de fecha no reconocido'
                )
                ON CONFLICT (evaluacion_id)
                DO UPDATE
                SET
                    fecha_original =
                        EXCLUDED.fecha_original,
                    motivo =
                        EXCLUDED.motivo;

                CONTINUE;

            END IF;


            -- ================================================
            -- CAMPAÑA
            -- ================================================

            IF r.campana_id IS NULL THEN

                INSERT INTO migration_0027_contexto_pendiente (
                    evaluacion_id,
                    campana,
                    campana_id,
                    fecha_original,
                    motivo
                )
                VALUES (
                    r.id,
                    r.campana,
                    NULL,
                    v_fecha_texto,
                    'No se pudo identificar campaña'
                )
                ON CONFLICT (evaluacion_id)
                DO UPDATE
                SET motivo =
                    EXCLUDED.motivo;

                CONTINUE;

            END IF;


            -- ================================================
            -- RESOLVER CONTEXTO HISTÓRICO
            -- ================================================

            v_quiebre_id :=
                NULL;

            v_campana_id :=
                NULL;

            v_matriz_id :=
                NULL;

            v_version_matriz_id :=
                NULL;


            SELECT
                ctx.quiebre_id,
                ctx.campana_id,
                ctx.matriz_id,
                ctx.version_matriz_id
            INTO
                v_quiebre_id,
                v_campana_id,
                v_matriz_id,
                v_version_matriz_id
            FROM resolver_contexto_evaluacion(
                r.campana_id,
                v_fecha
            ) ctx;


            IF
                v_quiebre_id IS NULL
                OR v_matriz_id IS NULL
                OR v_version_matriz_id IS NULL
            THEN

                INSERT INTO migration_0027_contexto_pendiente (
                    evaluacion_id,
                    campana,
                    campana_id,
                    fecha_original,
                    motivo
                )
                VALUES (
                    r.id,
                    r.campana,
                    r.campana_id,
                    v_fecha_texto,
                    'resolver_contexto_evaluacion no devolvió contexto completo'
                )
                ON CONFLICT (evaluacion_id)
                DO UPDATE
                SET motivo =
                    EXCLUDED.motivo;

                CONTINUE;

            END IF;


            -- ================================================
            -- ACTUALIZAR EVALUACIÓN
            -- ================================================

            UPDATE evaluaciones
            SET
                quiebre_id =
                    v_quiebre_id,

                campana_id =
                    v_campana_id,

                matriz_id =
                    v_matriz_id,

                version_matriz_id =
                    v_version_matriz_id

            WHERE id =
                r.id;


        EXCEPTION
            WHEN OTHERS THEN

                /*
                 * NO abortamos toda la migración.
                 *
                 * Registramos el caso para regularización
                 * posterior.
                 */

                INSERT INTO migration_0027_contexto_pendiente (
                    evaluacion_id,
                    campana,
                    campana_id,
                    fecha_original,
                    motivo
                )
                VALUES (
                    r.id,
                    r.campana,
                    r.campana_id,
                    v_fecha_texto,
                    SQLERRM
                )
                ON CONFLICT (evaluacion_id)
                DO UPDATE
                SET
                    fecha_original =
                        EXCLUDED.fecha_original,

                    motivo =
                        EXCLUDED.motivo;

        END;

    END LOOP;

END $$;


-- ============================================================
-- 7. LIMPIAR DE PENDIENTES LOS QUE SÍ QUEDARON RESUELTOS
-- ============================================================

DELETE FROM migration_0027_contexto_pendiente p
USING evaluaciones e
WHERE
    p.evaluacion_id = e.id
    AND e.quiebre_id IS NOT NULL
    AND e.matriz_id IS NOT NULL
    AND e.version_matriz_id IS NOT NULL;


-- ============================================================
-- 8. RESULTADO
-- ============================================================

DO $$
DECLARE
    v_total BIGINT;
    v_completas BIGINT;
    v_pendientes BIGINT;
BEGIN

    SELECT COUNT(*)
    INTO v_total
    FROM evaluaciones;


    SELECT COUNT(*)
    INTO v_completas
    FROM evaluaciones
    WHERE
        quiebre_id IS NOT NULL
        AND matriz_id IS NOT NULL
        AND version_matriz_id IS NOT NULL;


    SELECT COUNT(*)
    INTO v_pendientes
    FROM migration_0027_contexto_pendiente;


    RAISE NOTICE
        'Migración 0027: total=%, completas=%, pendientes=%',
        v_total,
        v_completas,
        v_pendientes;

END $$;