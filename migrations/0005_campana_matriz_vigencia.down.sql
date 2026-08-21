-- F1.9 / Rollback 0005
-- Elimina únicamente la relación Campaña <-> Matriz.
-- No elimina campañas, matrices, versiones ni evaluaciones históricas.

DROP TRIGGER IF EXISTS trg_validar_campana_matriz ON campana_matriz;
DROP FUNCTION IF EXISTS validar_campana_matriz();

DROP INDEX IF EXISTS idx_campana_matriz_vigencia;
DROP INDEX IF EXISTS idx_campana_matriz_matriz;
DROP INDEX IF EXISTS idx_campana_matriz_campana;

DROP TABLE IF EXISTS campana_matriz;
