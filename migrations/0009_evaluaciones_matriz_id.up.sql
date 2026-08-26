-- MECA F11.5.7
-- Agrega matriz_id a evaluaciones.
-- Compatible con bases existentes.

ALTER TABLE evaluaciones
    ADD COLUMN IF NOT EXISTS matriz_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_evaluaciones_matriz_id
    ON evaluaciones (matriz_id);