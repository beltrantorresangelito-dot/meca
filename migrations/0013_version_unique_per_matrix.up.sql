-- ============================================================
-- MECA F12
-- Versiones únicas por matriz
--
-- ANTES:
--   UNIQUE(version)
--
-- AHORA:
--   UNIQUE(matriz_id, version)
--
-- Esto permite:
--
--   MATRIZ_A -> v1.0.0
--   MATRIZ_B -> v1.0.0
--
-- sin generar conflicto.
-- ============================================================

BEGIN;


-- ============================================================
-- 1. VALIDAR MATRIZ_ID
-- ============================================================

DO $$
BEGIN

    IF EXISTS (
        SELECT 1
        FROM versiones_matriz
        WHERE matriz_id IS NULL
    ) THEN
        RAISE EXCEPTION
            'No se puede aplicar 0013: existen versiones sin matriz_id.';
    END IF;

END $$;


-- ============================================================
-- 2. ELIMINAR UNICIDAD GLOBAL LEGACY
-- ============================================================

ALTER TABLE versiones_matriz
DROP CONSTRAINT IF EXISTS
    versiones_matriz_version_key;


-- ============================================================
-- 3. CREAR UNICIDAD POR MATRIZ
-- ============================================================

ALTER TABLE versiones_matriz
ADD CONSTRAINT
    uq_versiones_matriz_matriz_version
UNIQUE (
    matriz_id,
    version
);


COMMENT ON CONSTRAINT
    uq_versiones_matriz_matriz_version
ON versiones_matriz
IS
'El código de versión es único únicamente dentro de cada matriz.';


COMMIT;