BEGIN;


-- ============================================================
-- 1. ELIMINAR ÍNDICES
-- ============================================================

DROP INDEX IF EXISTS
    idx_detalles_evaluacion_frente_id;

DROP INDEX IF EXISTS
    idx_detalles_evaluacion_atributo_id;

DROP INDEX IF EXISTS
    idx_detalles_evaluacion_criterio_id;



-- ============================================================
-- 2. ELIMINAR FOREIGN KEYS
-- ============================================================

ALTER TABLE detalles_evaluacion
    DROP CONSTRAINT IF EXISTS
        fk_detalles_evaluacion_frente;

ALTER TABLE detalles_evaluacion
    DROP CONSTRAINT IF EXISTS
        fk_detalles_evaluacion_atributo;

ALTER TABLE detalles_evaluacion
    DROP CONSTRAINT IF EXISTS
        fk_detalles_evaluacion_criterio;



-- ============================================================
-- 3. ELIMINAR COLUMNAS
-- ============================================================

ALTER TABLE detalles_evaluacion
    DROP COLUMN IF EXISTS criterio_id;

ALTER TABLE detalles_evaluacion
    DROP COLUMN IF EXISTS atributo_id;

ALTER TABLE detalles_evaluacion
    DROP COLUMN IF EXISTS frente_id;



-- ============================================================
-- 4. RETIRAR CRITERIOS AÑADIDOS A v1.0.0
--
-- Todo se identifica dinámicamente.
-- ============================================================

DELETE FROM version_sub_motivos vsm
USING version_atributos va,
      version_frentes vf,
      versiones_matriz vm,
      matrices m,
      quiebres q

WHERE
    vsm.version_atributo_id = va.id

    AND va.version_frente_id = vf.id

    AND vf.version_id = vm.id

    AND vm.matriz_id = m.id

    AND m.quiebre_id = q.id

    AND UPPER(TRIM(q.codigo)) =
        'COBRANZAS'

    AND UPPER(TRIM(m.codigo)) =
        'MATRIZ_COBRANZAS'

    AND vm.version =
        'v1.0.0'

    AND (
        (
            UPPER(TRIM(va.nombre)) =
                'PROTOCOLOS DE ATENCION'

            AND LOWER(TRIM(vsm.codigo)) =
                LOWER('Cliente_corta_llamada')
        )

        OR

        (
            UPPER(TRIM(va.nombre)) =
                'SONDEO'

            AND LOWER(TRIM(vsm.codigo)) =
                LOWER('Ofrece_Campana')
        )
    );


COMMIT;