CREATE TABLE IF NOT EXISTS pda_feedback_items (
    id BIGSERIAL PRIMARY KEY,

    pda_id BIGINT NOT NULL
        REFERENCES pda_cabecera(id)
        ON DELETE CASCADE,

    accion_id BIGINT NOT NULL
        REFERENCES pda_acciones(id)
        ON DELETE CASCADE,

    criterio_id BIGINT NULL,

    estado VARCHAR(20) NOT NULL
        CHECK (
            estado IN (
                'trabajado',
                'parcial',
                'no_trabajado'
            )
        ),

    observacion TEXT NULL,

    registrado_por VARCHAR(200) NULL,

    fecha_registro TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL
        DEFAULT NOW(),

    CONSTRAINT uq_pda_feedback_accion
        UNIQUE (pda_id, accion_id)
);


CREATE INDEX IF NOT EXISTS
    idx_pda_feedback_items_pda
ON pda_feedback_items(pda_id);


CREATE INDEX IF NOT EXISTS
    idx_pda_feedback_items_accion
ON pda_feedback_items(accion_id);


CREATE INDEX IF NOT EXISTS
    idx_pda_feedback_items_estado
ON pda_feedback_items(estado);