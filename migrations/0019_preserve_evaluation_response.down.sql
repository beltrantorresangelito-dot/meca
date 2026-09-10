BEGIN;

ALTER TABLE detalles_evaluacion
DROP CONSTRAINT IF EXISTS chk_detalles_evaluacion_valor_respuesta;

ALTER TABLE detalles_evaluacion
DROP COLUMN IF EXISTS valor_respuesta;

COMMIT;