-- ============================================================
-- ROLLBACK 0013
-- Restaurar unicidad global de version
-- ============================================================

BEGIN;


-- ============================================================
-- 1. VALIDAR SI EL ROLLBACK ES POSIBLE
-- ============================================================

DO $$
BEGIN

    IF EXISTS (
        SELECT
            version
        FROM versiones_matriz
        GROUP BY version
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'No se puede revertir 0013: existen códigos de versión repetidos entre matrices.';
    END IF;

END $$;


-- ============================================================
-- 2. ELIMINAR UNICIDAD POR MATRIZ
-- ============================================================

ALTER TABLE versiones_matriz
DROP CONSTRAINT IF EXISTS
    uq_versiones_matriz_matriz_version;


-- ============================================================
-- 3. RESTAURAR UNICIDAD GLOBAL LEGACY
-- ============================================================

ALTER TABLE versiones_matriz
ADD CONSTRAINT
    versiones_matriz_version_key
UNIQUE (
    version
);


COMMIT;