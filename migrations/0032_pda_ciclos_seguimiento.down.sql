DROP INDEX IF EXISTS
    uq_pda_ciclo_registrado;

DROP INDEX IF EXISTS
    idx_pda_ciclos_quiebre;

DROP INDEX IF EXISTS
    idx_pda_ciclos_pda_numero;

DROP INDEX IF EXISTS
    idx_pda_ciclos_pda_tipo;


ALTER TABLE pda_ciclos_evaluacion
    DROP COLUMN IF EXISTS evaluaciones_ids,
    DROP COLUMN IF EXISTS contexto_snapshot,
    DROP COLUMN IF EXISTS quiebre_id,
    DROP COLUMN IF EXISTS ciclo_numero;