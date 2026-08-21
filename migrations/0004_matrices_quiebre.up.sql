-- F1.8 / Migración 0004
-- Introduce una entidad raíz MATRIZ asociada a QUIEBRE.
--
-- Diseño:
--   QUIEBRE 1:N MATRICES
--   MATRIZ  1:N VERSIONES_MATRIZ
--
-- Una MATRIZ NO pertenece a una campaña.
-- Varias campañas podrán compartir una misma matriz mediante
-- una relación independiente en una fase posterior.

CREATE TABLE matrices (
    id              BIGSERIAL PRIMARY KEY,
    quiebre_id      BIGINT NOT NULL,
    codigo          VARCHAR(50) NOT NULL,
    nombre          VARCHAR(120) NOT NULL,
    descripcion     TEXT,
    activa          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_matrices_quiebre
        FOREIGN KEY (quiebre_id)
        REFERENCES quiebres(id)
        ON UPDATE NO ACTION
        ON DELETE RESTRICT,

    CONSTRAINT uq_matrices_quiebre_codigo
        UNIQUE (quiebre_id, codigo),

    CONSTRAINT ck_matrices_codigo_no_vacio
        CHECK (btrim(codigo) <> ''),

    CONSTRAINT ck_matrices_nombre_no_vacio
        CHECK (btrim(nombre) <> '')
);

CREATE INDEX idx_matrices_quiebre_id
    ON matrices(quiebre_id);

CREATE INDEX idx_matrices_activa
    ON matrices(activa);

COMMENT ON TABLE matrices IS
'Definición lógica de una matriz de evaluación perteneciente a un Quiebre. Una matriz puede ser compartida por varias campañas.';

COMMENT ON COLUMN matrices.quiebre_id IS
'Quiebre propietario de la matriz.';

-- Crear la matriz inicial que agrupará todas las versiones históricas
-- existentes de Cobranzas.
INSERT INTO matrices (
    quiebre_id,
    codigo,
    nombre,
    descripcion,
    activa
)
SELECT
    q.id,
    'MATRIZ_COBRANZAS',
    'Matriz de Cobranzas',
    'Matriz inicial que agrupa las versiones históricas existentes de Cobranzas.',
    TRUE
FROM quiebres q
WHERE q.codigo = 'COBRANZAS';

DO $$
DECLARE
    v_matriz_id BIGINT;
BEGIN
    SELECT m.id
    INTO v_matriz_id
    FROM matrices m
    JOIN quiebres q ON q.id = m.quiebre_id
    WHERE q.codigo = 'COBRANZAS'
      AND m.codigo = 'MATRIZ_COBRANZAS';

    IF v_matriz_id IS NULL THEN
        RAISE EXCEPTION 'No se pudo crear MATRIZ_COBRANZAS. Verifique que exista el quiebre COBRANZAS.';
    END IF;
END $$;

ALTER TABLE versiones_matriz
    ADD COLUMN matriz_id BIGINT;

UPDATE versiones_matriz
SET matriz_id = (
    SELECT m.id
    FROM matrices m
    JOIN quiebres q ON q.id = m.quiebre_id
    WHERE q.codigo = 'COBRANZAS'
      AND m.codigo = 'MATRIZ_COBRANZAS'
)
WHERE matriz_id IS NULL;

DO $$
DECLARE
    v_huerfanas INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_huerfanas
    FROM versiones_matriz
    WHERE matriz_id IS NULL;

    IF v_huerfanas > 0 THEN
        RAISE EXCEPTION 'Existen % versiones de matriz sin matriz raíz después de la migración.', v_huerfanas;
    END IF;
END $$;

ALTER TABLE versiones_matriz
    ALTER COLUMN matriz_id SET NOT NULL;

ALTER TABLE versiones_matriz
    ADD CONSTRAINT fk_versiones_matriz_matriz
    FOREIGN KEY (matriz_id)
    REFERENCES matrices(id)
    ON UPDATE NO ACTION
    ON DELETE RESTRICT;

CREATE INDEX idx_versiones_matriz_matriz_id
    ON versiones_matriz(matriz_id);

COMMENT ON COLUMN versiones_matriz.matriz_id IS
'Matriz lógica a la que pertenece esta versión.';
