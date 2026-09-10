BEGIN;

ALTER TABLE detalles_evaluacion
ADD COLUMN valor_respuesta VARCHAR(2);

ALTER TABLE detalles_evaluacion
ADD CONSTRAINT chk_detalles_evaluacion_valor_respuesta
CHECK (
    valor_respuesta IS NULL
    OR valor_respuesta IN ('0', '1', 'NA')
);

-- Los FALSE históricos son inequívocamente NO CUMPLE.
UPDATE detalles_evaluacion
SET valor_respuesta = '0'
WHERE cumple = FALSE
  AND valor_respuesta IS NULL;

-- IMPORTANTE:
-- Los TRUE históricos NO se migran a '1',
-- porque podrían haber sido originalmente 'NA'.
-- Se mantienen NULL para no inventar información histórica.

COMMENT ON COLUMN detalles_evaluacion.valor_respuesta IS
'Respuesta original de auditoría: 1=Cumple, 0=No Cumple, NA=No Aplica. NULL indica dato histórico no recuperable con certeza.';

COMMIT;