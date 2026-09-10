-- ============================================================
-- 0029 DOWN
--
-- Restaurar modelo anterior conservando el texto legacy.
-- ============================================================


-- ============================================================
-- 1. ELIMINAR FK
-- ============================================================

ALTER TABLE version_sub_motivos
DROP CONSTRAINT IF EXISTS
    version_sub_motivos_clasificacion_pda_id_fkey;


-- ============================================================
-- 2. ELIMINAR ÍNDICE
-- ============================================================

DROP INDEX IF EXISTS
    idx_version_sub_motivos_clasificacion_pda_id;


-- ============================================================
-- 3. ELIMINAR COLUMNA
-- ============================================================

ALTER TABLE version_sub_motivos
DROP COLUMN IF EXISTS
    clasificacion_pda_id;


-- ============================================================
-- 4. ELIMINAR CATÁLOGO
-- ============================================================

DROP TABLE IF EXISTS
    clasificaciones_pda;