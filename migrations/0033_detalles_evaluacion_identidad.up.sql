BEGIN;


-- ============================================================
-- MECA
-- Identidad estructural de detalles_evaluacion
--
-- Objetivos:
--
-- 1. Normalizar el histórico válido al dominio COBRANZAS.
-- 2. Completar la fotografía histórica v1.0.0 cuando existen
--    criterios demostrablemente usados por evaluaciones pero
--    ausentes en version_sub_motivos.
-- 3. Agregar identidad relacional a detalles_evaluacion:
--       frente_id
--       atributo_id
--       criterio_id
-- 4. Poblar los IDs mediante la versión de matriz de cada
--    evaluación.
-- 5. Resolver aliases históricos conocidos sin hardcodear IDs.
-- 6. Validar que no queden detalles sin identidad.
--
-- IMPORTANTE:
-- Ningún ID de negocio está hardcodeado.
-- Todos se resuelven por códigos/nombres.
-- ============================================================



-- ============================================================
-- 0. VALIDAR DOMINIO COBRANZAS
-- ============================================================

DO $$
DECLARE
    v_quiebre_id BIGINT;
    v_matriz_id BIGINT;
BEGIN

    SELECT q.id
      INTO v_quiebre_id
    FROM quiebres q
    WHERE UPPER(TRIM(q.codigo)) = 'COBRANZAS'
    ORDER BY q.id
    LIMIT 1;


    IF v_quiebre_id IS NULL THEN
        RAISE EXCEPTION
            'No existe el quiebre COBRANZAS.';
    END IF;


    SELECT m.id
      INTO v_matriz_id
    FROM matrices m
    WHERE m.quiebre_id = v_quiebre_id
      AND UPPER(TRIM(m.codigo)) = 'MATRIZ_COBRANZAS'
    ORDER BY m.id
    LIMIT 1;


    IF v_matriz_id IS NULL THEN
        RAISE EXCEPTION
            'No existe MATRIZ_COBRANZAS asociada a COBRANZAS.';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM versiones_matriz vm
        WHERE vm.matriz_id = v_matriz_id
          AND vm.version = 'v1.0.0'
    ) THEN
        RAISE EXCEPTION
            'No existe v1.0.0 para MATRIZ_COBRANZAS.';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM versiones_matriz vm
        WHERE vm.matriz_id = v_matriz_id
          AND vm.version = 'v2.0.0'
    ) THEN
        RAISE EXCEPTION
            'No existe v2.0.0 para MATRIZ_COBRANZAS.';
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM versiones_matriz vm
        WHERE vm.matriz_id = v_matriz_id
          AND vm.version = 'v2.1.0'
    ) THEN
        RAISE EXCEPTION
            'No existe v2.1.0 para MATRIZ_COBRANZAS.';
    END IF;

END $$;



-- ============================================================
-- 1. NORMALIZAR CONTEXTO DE EVALUACIONES
--
-- Regla acordada:
-- todo el histórico considerado válido pertenece a COBRANZAS.
-- ============================================================

DO $$
DECLARE
    v_quiebre_id BIGINT;
    v_matriz_id BIGINT;
BEGIN

    SELECT q.id
      INTO v_quiebre_id
    FROM quiebres q
    WHERE UPPER(TRIM(q.codigo)) = 'COBRANZAS'
    ORDER BY q.id
    LIMIT 1;


    SELECT m.id
      INTO v_matriz_id
    FROM matrices m
    WHERE m.quiebre_id = v_quiebre_id
      AND UPPER(TRIM(m.codigo)) = 'MATRIZ_COBRANZAS'
    ORDER BY m.id
    LIMIT 1;


    UPDATE evaluaciones
    SET
        quiebre_id = v_quiebre_id,
        matriz_id = v_matriz_id
    WHERE
           quiebre_id IS DISTINCT FROM v_quiebre_id
        OR matriz_id IS DISTINCT FROM v_matriz_id;

END $$;



-- ============================================================
-- 2. COMPLETAR FOTOGRAFÍA HISTÓRICA v1.0.0
--
-- Se detectaron criterios realmente usados por las
-- evaluaciones de v1.0.0 que no estaban presentes en su
-- snapshot versionado.
--
-- Los datos estructurales se toman de v2.0.0.
-- No se utilizan IDs fijos.
-- ============================================================


-- ------------------------------------------------------------
-- 2.1 Cliente_corta_llamada
--
-- Destino:
-- v1.0.0
-- ENC
-- PROTOCOLOS DE ATENCION
--
-- Fuente estructural:
-- mismo criterio en v2.0.0.
-- ------------------------------------------------------------

INSERT INTO version_sub_motivos (
    version_atributo_id,
    peso_individual,
    orden,
    codigo,
    descripcion,
    activo,
    clasificacion,
    clasificacion_pda_id
)
SELECT
    va_destino.id,

    vsm_fuente.peso_individual,

    COALESCE(
        (
            SELECT MAX(x.orden) + 1
            FROM version_sub_motivos x
            WHERE x.version_atributo_id =
                  va_destino.id
        ),
        1
    ),

    vsm_fuente.codigo,
    vsm_fuente.descripcion,
    true,
    vsm_fuente.clasificacion,
    vsm_fuente.clasificacion_pda_id

FROM versiones_matriz vm_destino

JOIN version_frentes vf_destino
    ON vf_destino.version_id =
       vm_destino.id

JOIN version_atributos va_destino
    ON va_destino.version_frente_id =
       vf_destino.id

JOIN versiones_matriz vm_fuente
    ON vm_fuente.matriz_id =
       vm_destino.matriz_id
   AND vm_fuente.version =
       'v2.0.0'

JOIN version_frentes vf_fuente
    ON vf_fuente.version_id =
       vm_fuente.id
   AND UPPER(TRIM(vf_fuente.codigo)) =
       UPPER(TRIM(vf_destino.codigo))

JOIN version_atributos va_fuente
    ON va_fuente.version_frente_id =
       vf_fuente.id
   AND UPPER(TRIM(va_fuente.nombre)) =
       'PROTOCOLOS DE ATENCION'

JOIN version_sub_motivos vsm_fuente
    ON vsm_fuente.version_atributo_id =
       va_fuente.id
   AND LOWER(TRIM(vsm_fuente.codigo)) =
       LOWER('Cliente_corta_llamada')

WHERE
    vm_destino.version =
        'v1.0.0'

    AND vm_destino.matriz_id = (
        SELECT m.id
        FROM matrices m
        JOIN quiebres q
            ON q.id = m.quiebre_id
        WHERE
            UPPER(TRIM(q.codigo)) =
                'COBRANZAS'
            AND
            UPPER(TRIM(m.codigo)) =
                'MATRIZ_COBRANZAS'
        ORDER BY m.id
        LIMIT 1
    )

    AND UPPER(TRIM(vf_destino.codigo)) =
        'ENC'

    AND UPPER(TRIM(va_destino.nombre)) =
        'PROTOCOLOS DE ATENCION'

    AND NOT EXISTS (
        SELECT 1
        FROM version_sub_motivos existente
        WHERE
            existente.version_atributo_id =
                va_destino.id
            AND
            LOWER(TRIM(existente.codigo)) =
                LOWER(
                    TRIM(vsm_fuente.codigo)
                )
    );



-- ------------------------------------------------------------
-- 2.2 Ofrece_Campana
--
-- El histórico lo almacenó en BRINDA INFORMACION,
-- pero el modelo de dominio confirmado lo ubica en SONDEO.
--
-- Destino:
-- v1.0.0 / ECN / SONDEO
--
-- Fuente:
-- v2.0.0 / ECN / SONDEO / Ofrece_Campana
-- ------------------------------------------------------------

INSERT INTO version_sub_motivos (
    version_atributo_id,
    peso_individual,
    orden,
    codigo,
    descripcion,
    activo,
    clasificacion,
    clasificacion_pda_id
)
SELECT
    va_destino.id,

    vsm_fuente.peso_individual,

    COALESCE(
        (
            SELECT MAX(x.orden) + 1
            FROM version_sub_motivos x
            WHERE x.version_atributo_id =
                  va_destino.id
        ),
        1
    ),

    vsm_fuente.codigo,
    vsm_fuente.descripcion,
    true,
    vsm_fuente.clasificacion,
    vsm_fuente.clasificacion_pda_id

FROM versiones_matriz vm_destino

JOIN version_frentes vf_destino
    ON vf_destino.version_id =
       vm_destino.id

JOIN version_atributos va_destino
    ON va_destino.version_frente_id =
       vf_destino.id

JOIN versiones_matriz vm_fuente
    ON vm_fuente.matriz_id =
       vm_destino.matriz_id
   AND vm_fuente.version =
       'v2.0.0'

JOIN version_frentes vf_fuente
    ON vf_fuente.version_id =
       vm_fuente.id
   AND UPPER(TRIM(vf_fuente.codigo)) =
       'ECN'

JOIN version_atributos va_fuente
    ON va_fuente.version_frente_id =
       vf_fuente.id
   AND UPPER(TRIM(va_fuente.nombre)) =
       'SONDEO'

JOIN version_sub_motivos vsm_fuente
    ON vsm_fuente.version_atributo_id =
       va_fuente.id
   AND LOWER(TRIM(vsm_fuente.codigo)) =
       LOWER('Ofrece_Campana')

WHERE
    vm_destino.version =
        'v1.0.0'

    AND vm_destino.matriz_id = (
        SELECT m.id
        FROM matrices m
        JOIN quiebres q
            ON q.id = m.quiebre_id
        WHERE
            UPPER(TRIM(q.codigo)) =
                'COBRANZAS'
            AND
            UPPER(TRIM(m.codigo)) =
                'MATRIZ_COBRANZAS'
        ORDER BY m.id
        LIMIT 1
    )

    AND UPPER(TRIM(vf_destino.codigo)) =
        'ECN'

    AND UPPER(TRIM(va_destino.nombre)) =
        'SONDEO'

    AND NOT EXISTS (
        SELECT 1
        FROM version_sub_motivos existente
        WHERE
            existente.version_atributo_id =
                va_destino.id
            AND
            LOWER(TRIM(existente.codigo)) =
                LOWER(
                    TRIM(vsm_fuente.codigo)
                )
    );



-- ============================================================
-- 3. AGREGAR IDENTIDAD A detalles_evaluacion
-- ============================================================

ALTER TABLE detalles_evaluacion
    ADD COLUMN IF NOT EXISTS frente_id INTEGER;

ALTER TABLE detalles_evaluacion
    ADD COLUMN IF NOT EXISTS atributo_id INTEGER;

ALTER TABLE detalles_evaluacion
    ADD COLUMN IF NOT EXISTS criterio_id INTEGER;



-- ============================================================
-- 4. FOREIGN KEYS
-- ============================================================

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
              'fk_detalles_evaluacion_frente'
    ) THEN

        ALTER TABLE detalles_evaluacion
            ADD CONSTRAINT
                fk_detalles_evaluacion_frente
            FOREIGN KEY (frente_id)
            REFERENCES version_frentes(id);

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
              'fk_detalles_evaluacion_atributo'
    ) THEN

        ALTER TABLE detalles_evaluacion
            ADD CONSTRAINT
                fk_detalles_evaluacion_atributo
            FOREIGN KEY (atributo_id)
            REFERENCES version_atributos(id);

    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
              'fk_detalles_evaluacion_criterio'
    ) THEN

        ALTER TABLE detalles_evaluacion
            ADD CONSTRAINT
                fk_detalles_evaluacion_criterio
            FOREIGN KEY (criterio_id)
            REFERENCES version_sub_motivos(id);

    END IF;

END $$;



-- ============================================================
-- 5. BACKFILL PRINCIPAL
--
-- Primero resolvemos por:
--
-- versión + código de submotivo
--
-- No exigimos que coincida el atributo histórico porque ya
-- comprobamos que algunos criterios cambiaron correctamente de
-- atributo entre el detalle legacy y la estructura versionada.
--
-- Solo se acepta un criterio si el código es ÚNICO dentro de
-- esa versión.
-- ============================================================

WITH candidatos AS (
    SELECT
        vf.version_id AS version_matriz_id,

        vf.id AS frente_id,
        va.id AS atributo_id,
        vsm.id AS criterio_id,

        LOWER(TRIM(vsm.codigo))
            AS codigo_normalizado,

        COUNT(*) OVER (
            PARTITION BY
                vf.version_id,
                LOWER(TRIM(vsm.codigo))
        ) AS cantidad_codigo

    FROM version_frentes vf

    JOIN version_atributos va
        ON va.version_frente_id =
           vf.id

    JOIN version_sub_motivos vsm
        ON vsm.version_atributo_id =
           va.id
)

UPDATE detalles_evaluacion d
SET
    frente_id = c.frente_id,
    atributo_id = c.atributo_id,
    criterio_id = c.criterio_id

FROM evaluaciones e,
     candidatos c

WHERE
    e.id = d.evaluacion_id

    AND c.version_matriz_id =
        e.version_matriz_id

    AND c.cantidad_codigo = 1

    AND c.codigo_normalizado =
        LOWER(TRIM(d.submotivo))

    AND (
           d.frente_id IS NULL
        OR d.atributo_id IS NULL
        OR d.criterio_id IS NULL
    );



-- ============================================================
-- 6. NORMALIZACIÓN DE ATRIBUTO CORRUPTO
--
-- No modificamos el texto histórico.
-- Solamente resolvemos su identidad por el criterio.
--
-- El backfill anterior ya debería resolver estos registros
-- porque Tono_de_Voz/ Vocalizacion es único en v2.0.0.
-- Este bloque queda como validación explícita.
-- ============================================================

DO $$
DECLARE
    v_pendientes BIGINT;
BEGIN

    SELECT COUNT(*)
      INTO v_pendientes
    FROM detalles_evaluacion d
    JOIN evaluaciones e
        ON e.id = d.evaluacion_id
    JOIN versiones_matriz vm
        ON vm.id = e.version_matriz_id

    WHERE
        vm.version = 'v2.0.0'

        AND d.atributo LIKE
            '%COMUNICACI%'

        AND LOWER(TRIM(d.submotivo)) =
            LOWER(
                'Tono_de_Voz/ Vocalizacion'
            )

        AND d.criterio_id IS NULL;


    IF v_pendientes > 0 THEN
        RAISE EXCEPTION
            'Quedaron % detalles de lenguaje sin identidad.',
            v_pendientes;
    END IF;

END $$;



-- ============================================================
-- 7. ALIASES HISTÓRICOS
--
-- Se resuelven mediante versión + código destino.
-- Nunca mediante ID fijo.
-- ============================================================


-- ------------------------------------------------------------
-- v1.0.0:
-- No_Induce_Baja
--     -> No_Induce_Baja/Reclamo
-- ------------------------------------------------------------

UPDATE detalles_evaluacion d
SET
    frente_id = x.frente_id,
    atributo_id = x.atributo_id,
    criterio_id = x.criterio_id

FROM evaluaciones e

JOIN versiones_matriz vm
    ON vm.id = e.version_matriz_id

JOIN LATERAL (
    SELECT
        vf.id AS frente_id,
        va.id AS atributo_id,
        vsm.id AS criterio_id

    FROM version_frentes vf

    JOIN version_atributos va
        ON va.version_frente_id =
           vf.id

    JOIN version_sub_motivos vsm
        ON vsm.version_atributo_id =
           va.id

    WHERE
        vf.version_id =
            vm.id

        AND LOWER(TRIM(vsm.codigo)) =
            LOWER(
                'No_Induce_Baja/Reclamo'
            )

    LIMIT 1
) x ON TRUE

WHERE
    d.evaluacion_id = e.id

    AND vm.version =
        'v1.0.0'

    AND LOWER(TRIM(d.submotivo)) =
        LOWER('No_Induce_Baja')

    AND d.criterio_id IS NULL;



-- ------------------------------------------------------------
-- v1.0.0:
-- Menciona_Numero_Telefonico
--     -> Menciona_Numero_Servicio
-- ------------------------------------------------------------

UPDATE detalles_evaluacion d
SET
    frente_id = x.frente_id,
    atributo_id = x.atributo_id,
    criterio_id = x.criterio_id

FROM evaluaciones e

JOIN versiones_matriz vm
    ON vm.id = e.version_matriz_id

JOIN LATERAL (
    SELECT
        vf.id AS frente_id,
        va.id AS atributo_id,
        vsm.id AS criterio_id

    FROM version_frentes vf

    JOIN version_atributos va
        ON va.version_frente_id =
           vf.id

    JOIN version_sub_motivos vsm
        ON vsm.version_atributo_id =
           va.id

    WHERE
        vf.version_id =
            vm.id

        AND LOWER(TRIM(vsm.codigo)) =
            LOWER(
                'Menciona_Numero_Servicio'
            )

    LIMIT 1
) x ON TRUE

WHERE
    d.evaluacion_id = e.id

    AND vm.version =
        'v1.0.0'

    AND LOWER(TRIM(d.submotivo)) =
        LOWER(
            'Menciona_Numero_Telefonico'
        )

    AND d.criterio_id IS NULL;



-- ------------------------------------------------------------
-- v2.0.0:
-- No_Brinda_Spedy_de_Despedida
--     -> Brinda_Speech_de_Despedida
--
-- El histórico almacenó la denominación negativa del
-- incumplimiento; la matriz versionada conserva el criterio.
-- ------------------------------------------------------------

UPDATE detalles_evaluacion d
SET
    frente_id = x.frente_id,
    atributo_id = x.atributo_id,
    criterio_id = x.criterio_id

FROM evaluaciones e

JOIN versiones_matriz vm
    ON vm.id = e.version_matriz_id

JOIN LATERAL (
    SELECT
        vf.id AS frente_id,
        va.id AS atributo_id,
        vsm.id AS criterio_id

    FROM version_frentes vf

    JOIN version_atributos va
        ON va.version_frente_id =
           vf.id

    JOIN version_sub_motivos vsm
        ON vsm.version_atributo_id =
           va.id

    WHERE
        vf.version_id =
            vm.id

        AND LOWER(TRIM(vsm.codigo)) =
            LOWER(
                'Brinda_Speech_de_Despedida'
            )

    LIMIT 1
) x ON TRUE

WHERE
    d.evaluacion_id = e.id

    AND vm.version =
        'v2.0.0'

    AND LOWER(TRIM(d.submotivo)) =
        LOWER(
            'No_Brinda_Spedy_de_Despedida'
        )

    AND d.criterio_id IS NULL;



-- ============================================================
-- 8. SEGUNDO BACKFILL
--
-- Captura Cliente_corta_llamada y Ofrece_Campana de v1.0.0
-- después de haber completado esa versión.
-- ============================================================

WITH candidatos AS (
    SELECT
        vf.version_id AS version_matriz_id,

        vf.id AS frente_id,
        va.id AS atributo_id,
        vsm.id AS criterio_id,

        LOWER(TRIM(vsm.codigo))
            AS codigo_normalizado,

        COUNT(*) OVER (
            PARTITION BY
                vf.version_id,
                LOWER(TRIM(vsm.codigo))
        ) AS cantidad_codigo

    FROM version_frentes vf

    JOIN version_atributos va
        ON va.version_frente_id =
           vf.id

    JOIN version_sub_motivos vsm
        ON vsm.version_atributo_id =
           va.id
)

UPDATE detalles_evaluacion d
SET
    frente_id = c.frente_id,
    atributo_id = c.atributo_id,
    criterio_id = c.criterio_id

FROM evaluaciones e,
     candidatos c

WHERE
    e.id = d.evaluacion_id

    AND c.version_matriz_id =
        e.version_matriz_id

    AND c.cantidad_codigo = 1

    AND c.codigo_normalizado =
        LOWER(TRIM(d.submotivo))

    AND d.criterio_id IS NULL;



-- ============================================================
-- 9. VALIDAR INTEGRIDAD JERÁRQUICA
--
-- criterio
--    -> atributo
--       -> frente
--          -> misma versión de la evaluación
-- ============================================================

DO $$
DECLARE
    v_invalidos BIGINT;
BEGIN

    SELECT COUNT(*)
      INTO v_invalidos

    FROM detalles_evaluacion d

    JOIN evaluaciones e
        ON e.id = d.evaluacion_id

    LEFT JOIN version_sub_motivos vsm
        ON vsm.id = d.criterio_id

    LEFT JOIN version_atributos va
        ON va.id = d.atributo_id

    LEFT JOIN version_frentes vf
        ON vf.id = d.frente_id

    WHERE
           d.criterio_id IS NULL
        OR d.atributo_id IS NULL
        OR d.frente_id IS NULL

        OR vsm.version_atributo_id
           IS DISTINCT FROM va.id

        OR va.version_frente_id
           IS DISTINCT FROM vf.id

        OR vf.version_id
           IS DISTINCT FROM
           e.version_matriz_id;


    IF v_invalidos > 0 THEN
        RAISE EXCEPTION
            'La migración deja % detalles sin identidad estructural válida.',
            v_invalidos;
    END IF;

END $$;



-- ============================================================
-- 10. ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS
    idx_detalles_evaluacion_frente_id
ON detalles_evaluacion(frente_id);


CREATE INDEX IF NOT EXISTS
    idx_detalles_evaluacion_atributo_id
ON detalles_evaluacion(atributo_id);


CREATE INDEX IF NOT EXISTS
    idx_detalles_evaluacion_criterio_id
ON detalles_evaluacion(criterio_id);



COMMIT;