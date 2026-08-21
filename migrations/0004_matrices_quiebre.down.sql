-- F1.8 / Rollback 0004
-- Revierte únicamente la nueva raíz de matrices.
-- No elimina versiones_matriz históricas.

DROP INDEX IF EXISTS idx_versiones_matriz_matriz_id;

ALTER TABLE versiones_matriz
    DROP CONSTRAINT IF EXISTS fk_versiones_matriz_matriz;

ALTER TABLE versiones_matriz
    DROP COLUMN IF EXISTS matriz_id;

DROP INDEX IF EXISTS idx_matrices_activa;
DROP INDEX IF EXISTS idx_matrices_quiebre_id;

DROP TABLE IF EXISTS matrices;
