-- ==========================================================
-- MECA F11.5.7.3
-- Rollback 0010
-- ==========================================================


-- ==========================================================
-- 1. ELIMINAR VISTAS
-- ==========================================================

DROP VIEW IF EXISTS
    vw_evaluaciones_campana;

DROP VIEW IF EXISTS
    vw_asignaciones_campana;


-- ==========================================================
-- 2. ELIMINAR ÍNDICE
-- ==========================================================

DROP INDEX IF EXISTS
    idx_asignaciones_escucha_campana_id;


-- ==========================================================
-- 3. ELIMINAR FOREIGN KEY
-- ==========================================================

ALTER TABLE asignaciones_escucha
    DROP CONSTRAINT IF EXISTS
        asignaciones_escucha_campana_id_fkey;


-- ==========================================================
-- 4. ELIMINAR COLUMNA
-- ==========================================================

ALTER TABLE asignaciones_escucha
    DROP COLUMN IF EXISTS campana_id;