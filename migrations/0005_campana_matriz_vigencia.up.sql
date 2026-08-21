-- F1.9 / Migración 0005
-- Relación CAMPAÑA <-> MATRIZ con vigencia temporal.
--
-- Reglas:
-- 1. Una matriz puede ser compartida por varias campañas.
-- 2. Una campaña puede cambiar de matriz en el tiempo.
-- 3. Campaña y matriz deben pertenecer al mismo Quiebre.
-- 4. Una campaña no puede tener dos asociaciones ACTIVAS con periodos solapados.
--
-- Las evaluaciones históricas NO se modifican: siguen conservando version_matriz_id.

CREATE TABLE campana_matriz (
    id              BIGSERIAL PRIMARY KEY,
    campana_id      BIGINT NOT NULL,
    matriz_id       BIGINT NOT NULL,
    vigente_desde   DATE NOT NULL,
    vigente_hasta   DATE,
    activa          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_campana_matriz_campana
        FOREIGN KEY (campana_id)
        REFERENCES campanas(id)
        ON UPDATE NO ACTION
        ON DELETE RESTRICT,

    CONSTRAINT fk_campana_matriz_matriz
        FOREIGN KEY (matriz_id)
        REFERENCES matrices(id)
        ON UPDATE NO ACTION
        ON DELETE RESTRICT,

    CONSTRAINT ck_campana_matriz_vigencia
        CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde),

    CONSTRAINT uq_campana_matriz_inicio
        UNIQUE (campana_id, vigente_desde)
);

CREATE INDEX idx_campana_matriz_campana
    ON campana_matriz(campana_id);

CREATE INDEX idx_campana_matriz_matriz
    ON campana_matriz(matriz_id);

CREATE INDEX idx_campana_matriz_vigencia
    ON campana_matriz(campana_id, vigente_desde, vigente_hasta);

COMMENT ON TABLE campana_matriz IS
'Asocia campañas con matrices de evaluación mediante vigencia temporal. Varias campañas pueden compartir una matriz.';

COMMENT ON COLUMN campana_matriz.vigente_hasta IS
'NULL indica vigencia abierta.';

-- Validación central de consistencia de dominio.
CREATE OR REPLACE FUNCTION validar_campana_matriz()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_quiebre_campana BIGINT;
    v_quiebre_matriz BIGINT;
    v_solapamientos INTEGER;
BEGIN
    SELECT quiebre_id
    INTO v_quiebre_campana
    FROM campanas
    WHERE id = NEW.campana_id;

    SELECT quiebre_id
    INTO v_quiebre_matriz
    FROM matrices
    WHERE id = NEW.matriz_id;

    IF v_quiebre_campana IS NULL THEN
        RAISE EXCEPTION 'Campaña % no existe o no tiene Quiebre.', NEW.campana_id;
    END IF;

    IF v_quiebre_matriz IS NULL THEN
        RAISE EXCEPTION 'Matriz % no existe o no tiene Quiebre.', NEW.matriz_id;
    END IF;

    IF v_quiebre_campana <> v_quiebre_matriz THEN
        RAISE EXCEPTION
            'Campaña % y Matriz % pertenecen a Quiebres diferentes.',
            NEW.campana_id,
            NEW.matriz_id;
    END IF;

    IF NEW.activa THEN
        SELECT COUNT(*)
        INTO v_solapamientos
        FROM campana_matriz cm
        WHERE cm.campana_id = NEW.campana_id
          AND cm.activa = TRUE
          AND cm.id <> COALESCE(NEW.id, -1)
          AND daterange(
                cm.vigente_desde,
                COALESCE(cm.vigente_hasta + 1, 'infinity'::date),
                '[)'
              )
              &&
              daterange(
                NEW.vigente_desde,
                COALESCE(NEW.vigente_hasta + 1, 'infinity'::date),
                '[)'
              );

        IF v_solapamientos > 0 THEN
            RAISE EXCEPTION
                'La campaña % ya tiene una matriz activa con vigencia solapada.',
                NEW.campana_id;
        END IF;
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_campana_matriz
BEFORE INSERT OR UPDATE ON campana_matriz
FOR EACH ROW
EXECUTE FUNCTION validar_campana_matriz();

-- Migrar el estado actual:
-- todas las campañas existentes son de COBRANZAS y usan la matriz raíz
-- MATRIZ_COBRANZAS. Se usa una vigencia histórica abierta para no introducir
-- un corte artificial en los datos previos a F1.9.
INSERT INTO campana_matriz (
    campana_id,
    matriz_id,
    vigente_desde,
    vigente_hasta,
    activa
)
SELECT
    c.id,
    m.id,
    DATE '1900-01-01',
    NULL,
    TRUE
FROM campanas c
JOIN quiebres qc
  ON qc.id = c.quiebre_id
 AND qc.codigo = 'COBRANZAS'
JOIN matrices m
  ON m.quiebre_id = qc.id
 AND m.codigo = 'MATRIZ_COBRANZAS'
WHERE NOT EXISTS (
    SELECT 1
    FROM campana_matriz cm
    WHERE cm.campana_id = c.id
);

DO $$
DECLARE
    v_total_campanas INTEGER;
    v_total_asociadas INTEGER;
    v_huerfanas INTEGER;
BEGIN
    SELECT COUNT(*)
      INTO v_total_campanas
      FROM campanas;

    SELECT COUNT(DISTINCT campana_id)
      INTO v_total_asociadas
      FROM campana_matriz
      WHERE activa = TRUE;

    SELECT COUNT(*)
      INTO v_huerfanas
      FROM campanas c
      WHERE NOT EXISTS (
          SELECT 1
          FROM campana_matriz cm
          WHERE cm.campana_id = c.id
            AND cm.activa = TRUE
      );

    IF v_huerfanas > 0 OR v_total_campanas <> v_total_asociadas THEN
        RAISE EXCEPTION
            'Migración incompleta: % campañas sin matriz activa. Total campañas %, asociadas %.',
            v_huerfanas,
            v_total_campanas,
            v_total_asociadas;
    END IF;
END $$;
