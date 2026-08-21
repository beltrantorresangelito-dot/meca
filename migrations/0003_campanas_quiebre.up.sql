-- F1.7 / Migración 0003
-- Relaciona CAMPAÑA con QUIEBRE de forma compatible.
-- Todas las campañas existentes pertenecen actualmente al quiebre COBRANZAS.

ALTER TABLE campanas
    ADD COLUMN quiebre_id BIGINT;

UPDATE campanas
SET quiebre_id = (
    SELECT id
    FROM quiebres
    WHERE codigo = 'COBRANZAS'
)
WHERE quiebre_id IS NULL;

DO $$
DECLARE
    v_cobranzas_id BIGINT;
    v_huerfanas INTEGER;
BEGIN
    SELECT id
    INTO v_cobranzas_id
    FROM quiebres
    WHERE codigo = 'COBRANZAS';

    IF v_cobranzas_id IS NULL THEN
        RAISE EXCEPTION 'No existe el quiebre COBRANZAS. F1.6 debe estar aplicada.';
    END IF;

    SELECT COUNT(*)
    INTO v_huerfanas
    FROM campanas
    WHERE quiebre_id IS NULL;

    IF v_huerfanas > 0 THEN
        RAISE EXCEPTION 'Existen % campañas sin quiebre después de la migración.', v_huerfanas;
    END IF;
END $$;

ALTER TABLE campanas
    ALTER COLUMN quiebre_id SET NOT NULL;

ALTER TABLE campanas
    ADD CONSTRAINT fk_campanas_quiebre
    FOREIGN KEY (quiebre_id)
    REFERENCES quiebres(id)
    ON UPDATE NO ACTION
    ON DELETE RESTRICT;

CREATE INDEX idx_campanas_quiebre_id
    ON campanas(quiebre_id);

COMMENT ON COLUMN campanas.quiebre_id IS
'Quiebre al que pertenece la campaña. Una campaña pertenece exactamente a un quiebre.';
