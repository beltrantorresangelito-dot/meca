ALTER TABLE pda_ciclos_evaluacion
    ADD COLUMN IF NOT EXISTS ciclo_numero INTEGER,
    ADD COLUMN IF NOT EXISTS quiebre_id BIGINT,
    ADD COLUMN IF NOT EXISTS contexto_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS evaluaciones_ids JSONB;


CREATE INDEX IF NOT EXISTS
    idx_pda_ciclos_pda_tipo
ON pda_ciclos_evaluacion (
    pda_origen_id,
    tipo_ciclo
);


CREATE INDEX IF NOT EXISTS
    idx_pda_ciclos_pda_numero
ON pda_ciclos_evaluacion (
    pda_origen_id,
    ciclo_numero
);


CREATE INDEX IF NOT EXISTS
    idx_pda_ciclos_quiebre
ON pda_ciclos_evaluacion (
    quiebre_id
);


CREATE UNIQUE INDEX IF NOT EXISTS
    uq_pda_ciclo_registrado
ON pda_ciclos_evaluacion (
    pda_origen_id,
    ciclo_numero
)
WHERE ciclo_numero IS NOT NULL;