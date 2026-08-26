DROP INDEX IF EXISTS idx_evaluaciones_matriz_id;

ALTER TABLE evaluaciones
    DROP COLUMN IF EXISTS matriz_id;