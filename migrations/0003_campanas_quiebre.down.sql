-- F1.7 / Rollback 0003
-- Revierte únicamente la relación Campaña -> Quiebre.
-- No elimina quiebres ni campañas.

DROP INDEX IF EXISTS idx_campanas_quiebre_id;

ALTER TABLE campanas
    DROP CONSTRAINT IF EXISTS fk_campanas_quiebre;

ALTER TABLE campanas
    DROP COLUMN IF EXISTS quiebre_id;
