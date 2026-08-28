-- ============================================================
-- MECA F11.8.1
-- Limpieza del escenario controlado multi-matriz
-- ============================================================

BEGIN;

DO $$
DECLARE
    v_campana_id BIGINT;
    v_matriz_id  BIGINT;
BEGIN

    SELECT id
    INTO v_campana_id
    FROM campanas
    WHERE codigo = 'MXTEST'
    LIMIT 1;

    SELECT id
    INTO v_matriz_id
    FROM matrices
    WHERE codigo = 'MATRIZ_TEST'
    LIMIT 1;


    -- ========================================================
    -- Eliminar relación campaña/matriz
    -- ========================================================
    IF v_campana_id IS NOT NULL THEN
        DELETE FROM campana_matriz
        WHERE campana_id = v_campana_id;
    END IF;


    -- ========================================================
    -- Eliminar estructura versionada
    -- ========================================================
    IF v_matriz_id IS NOT NULL THEN

        DELETE FROM reglas_evaluacion
        WHERE version_id IN (
            SELECT id
            FROM versiones_matriz
            WHERE matriz_id = v_matriz_id
        );

        DELETE FROM version_sub_motivos
        WHERE version_atributo_id IN (
            SELECT va.id
            FROM version_atributos va
            JOIN version_frentes vf
              ON vf.id = va.version_frente_id
            JOIN versiones_matriz vm
              ON vm.id = vf.version_id
            WHERE vm.matriz_id = v_matriz_id
        );

        DELETE FROM version_atributos
        WHERE version_frente_id IN (
            SELECT vf.id
            FROM version_frentes vf
            JOIN versiones_matriz vm
              ON vm.id = vf.version_id
            WHERE vm.matriz_id = v_matriz_id
        );

        DELETE FROM version_frentes
        WHERE version_id IN (
            SELECT id
            FROM versiones_matriz
            WHERE matriz_id = v_matriz_id
        );

        DELETE FROM versiones_matriz
        WHERE matriz_id = v_matriz_id;

        DELETE FROM matrices
        WHERE id = v_matriz_id;

    END IF;


    -- ========================================================
    -- Eliminar campaña
    -- ========================================================
    IF v_campana_id IS NOT NULL THEN
        DELETE FROM campanas
        WHERE id = v_campana_id;
    END IF;

END $$;

COMMIT;