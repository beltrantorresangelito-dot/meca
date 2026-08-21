-- F1.6 / Migración 0002
CREATE TABLE quiebres (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_quiebres_codigo UNIQUE (codigo),
    CONSTRAINT ck_quiebres_codigo_no_vacio CHECK (btrim(codigo) <> ''),
    CONSTRAINT ck_quiebres_nombre_no_vacio CHECK (btrim(nombre) <> '')
);

CREATE INDEX idx_quiebres_activo ON quiebres (activo);

COMMENT ON TABLE quiebres IS
'Actividad o proceso realizado por el gestor que agrupa campañas, matrices y reglas de evaluación.';

INSERT INTO quiebres (codigo, nombre, descripcion, activo)
VALUES (
    'COBRANZAS',
    'Cobranzas',
    'Actividad de gestión de cobranzas. Quiebre inicial de MECA.',
    TRUE
);
