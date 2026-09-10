-- ============================================================================
-- MECA - Migración 0020
-- Reconstrucción segura de respuestas históricas de evaluación
--
-- CONTEXTO HISTÓRICO
-- ------------------
-- En versiones antiguas de MECA solo se almacenaba "cumple" como boolean.
-- Tanto "Cumple" como "No Aplica" terminaban almacenados como TRUE.
--
-- La migración 0019 agregó valor_respuesta:
--   0  = No Cumple
--   1  = Cumple
--   NA = No Aplica
--
-- 0019 pudo reconstruir de forma segura los FALSE como '0', pero los TRUE
-- históricos quedaron NULL porque podían representar '1' o 'NA'.
--
-- REGLA HISTÓRICA RECONSTRUIBLE
-- -----------------------------
-- Trigger:
--   ENC / PROTOCOLOS DE ATENCION / Cliente_corta_llamada
--   "Cliente permite continuar llamada a gestor"
--
-- Si el trigger era NO CUMPLE:
--   Todos los demás criterios se convertían en NA
--
-- Excepciones que seguían siendo evaluables:
--
--   ENC / PROTOCOLOS DE ATENCION / Cumple_Speech
--   "Brinda Speech de saludo/despedida"
--
--   ECN / CIERRE / Cierre_correcto
--   "Cuando el audio no coincide con lo que se ha tipificado"
--
--   ECN / TIPIFICACION / Tipificacion_correcta
--   "No presenta datos incompletos o incorrectos en PSI"
--
-- PRINCIPIOS DE SEGURIDAD
-- -----------------------
-- 1. No usa IDs concretos de evaluación, matriz o versión.
-- 2. Detecta evaluaciones por estructura histórica.
-- 3. Exige exactamente un trigger y una fila de cada excepción.
-- 4. Excluye evaluaciones con claves de criterio duplicadas.
-- 5. Solo modifica valor_respuesta IS NULL.
-- 6. Nunca sobreescribe 0, 1 o NA ya conocidos.
-- 7. Conserva respaldo exacto de cada detalle modificado.
-- 8. El rollback detecta modificaciones posteriores antes de restaurar.
-- ============================================================================


-- ============================================================================
-- 1. TABLA DE RESPALDO DE LA MIGRACIÓN
-- ============================================================================

CREATE TABLE meca_migration_0020_evaluation_response_backup (
    detalle_id INTEGER PRIMARY KEY,
    evaluacion_id BIGINT NOT NULL,

    valor_respuesta_anterior VARCHAR(2),
    valor_respuesta_nuevo VARCHAR(2) NOT NULL,

    motivo_reconstruccion TEXT NOT NULL,

    backed_up_at TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_meca_0020_valor_nuevo
        CHECK (valor_respuesta_nuevo IN ('1', 'NA'))
);


COMMENT ON TABLE meca_migration_0020_evaluation_response_backup IS
'Respaldo de filas modificadas por migración 0020. Permite rollback exacto y controlado.';


-- ============================================================================
-- 2. IDENTIFICAR RESPUESTAS RECONSTRUIBLES
-- ============================================================================

WITH detalles_normalizados AS (
    SELECT
        d.id,
        d.evaluacion_id,
        d.bloque,
        d.atributo,
        TRIM(d.submotivo) AS submotivo,
        d.cumple,
        d.valor_respuesta
    FROM detalles_evaluacion d
),

-- --------------------------------------------------------------------------
-- Una evaluación pertenece inequívocamente a esta estructura histórica
-- solamente si posee exactamente:
--
--   1 trigger
--   1 Cumple_Speech
--   1 Cierre_correcto
--   1 Tipificacion_correcta
--
-- El "=" 1 excluye automáticamente estructuras duplicadas en cualquiera
-- de estos cuatro criterios críticos.
-- --------------------------------------------------------------------------

estructura_historica AS (
    SELECT
        evaluacion_id
    FROM detalles_normalizados
    GROUP BY evaluacion_id
    HAVING

        COUNT(*) FILTER (
            WHERE bloque = 'ENC'
              AND atributo = 'PROTOCOLOS DE ATENCION'
              AND submotivo = 'Cliente_corta_llamada'
        ) = 1

        AND

        COUNT(*) FILTER (
            WHERE bloque = 'ENC'
              AND atributo = 'PROTOCOLOS DE ATENCION'
              AND submotivo = 'Cumple_Speech'
        ) = 1

        AND

        COUNT(*) FILTER (
            WHERE bloque = 'ECN'
              AND atributo = 'CIERRE'
              AND submotivo = 'Cierre_correcto'
        ) = 1

        AND

        COUNT(*) FILTER (
            WHERE bloque = 'ECN'
              AND atributo = 'TIPIFICACION'
              AND submotivo = 'Tipificacion_correcta'
        ) = 1
),

-- --------------------------------------------------------------------------
-- Excluir cualquier evaluación que tenga repetida una misma clave lógica
-- de criterio.
--
-- Aunque dos filas duplicadas fueran idénticas, la migración NO decide cuál
-- conservar. La limpieza histórica de duplicados es responsabilidad de una
-- migración independiente.
-- --------------------------------------------------------------------------

evaluaciones_con_duplicados AS (
    SELECT DISTINCT
        evaluacion_id
    FROM (
        SELECT
            evaluacion_id,
            bloque,
            atributo,
            submotivo,
            COUNT(*) AS cantidad
        FROM detalles_normalizados
        GROUP BY
            evaluacion_id,
            bloque,
            atributo,
            submotivo
        HAVING COUNT(*) > 1
    ) duplicados
),

evaluaciones_elegibles AS (
    SELECT
        eh.evaluacion_id
    FROM estructura_historica eh
    WHERE NOT EXISTS (
        SELECT 1
        FROM evaluaciones_con_duplicados dup
        WHERE dup.evaluacion_id = eh.evaluacion_id
    )
),

-- --------------------------------------------------------------------------
-- Evaluaciones donde la regla histórica fue disparada.
--
-- Se admite:
--   valor_respuesta = '0'
--
-- y también:
--   cumple = FALSE + valor_respuesta NULL
--
-- para que el mecanismo siga siendo válido incluso si se ejecuta sobre
-- una base histórica en la que todavía no se hubiera realizado el backfill.
-- --------------------------------------------------------------------------

evaluaciones_disparadas AS (
    SELECT
        d.evaluacion_id
    FROM detalles_normalizados d
    JOIN evaluaciones_elegibles ee
      ON ee.evaluacion_id = d.evaluacion_id
    WHERE d.bloque = 'ENC'
      AND d.atributo = 'PROTOCOLOS DE ATENCION'
      AND d.submotivo = 'Cliente_corta_llamada'
      AND (
            d.valor_respuesta = '0'
            OR (
                d.valor_respuesta IS NULL
                AND d.cumple = FALSE
            )
      )
),

-- --------------------------------------------------------------------------
-- Reconstrucción tipo 1:
--
-- Si la regla fue disparada:
--
--   TRUE + NULL
--
-- para cualquier criterio que NO sea trigger ni una de las tres
-- excepciones equivale históricamente a:
--
--   NA
-- --------------------------------------------------------------------------

respuestas_na AS (
    SELECT
        d.id AS detalle_id,
        d.evaluacion_id,
        d.valor_respuesta AS valor_anterior,
        'NA'::VARCHAR(2) AS valor_nuevo,
        'LEGACY_TRIGGER_NO_CUMPLE_TO_NA'::TEXT AS motivo
    FROM detalles_normalizados d
    JOIN evaluaciones_disparadas ed
      ON ed.evaluacion_id = d.evaluacion_id
    WHERE d.cumple = TRUE
      AND d.valor_respuesta IS NULL

      AND NOT (
            (
                d.bloque = 'ENC'
                AND d.atributo = 'PROTOCOLOS DE ATENCION'
                AND d.submotivo = 'Cliente_corta_llamada'
            )

            OR

            (
                d.bloque = 'ENC'
                AND d.atributo = 'PROTOCOLOS DE ATENCION'
                AND d.submotivo = 'Cumple_Speech'
            )

            OR

            (
                d.bloque = 'ECN'
                AND d.atributo = 'CIERRE'
                AND d.submotivo = 'Cierre_correcto'
            )

            OR

            (
                d.bloque = 'ECN'
                AND d.atributo = 'TIPIFICACION'
                AND d.submotivo = 'Tipificacion_correcta'
            )
      )
),

-- --------------------------------------------------------------------------
-- Reconstrucción tipo 2:
--
-- Las tres excepciones continuaban siendo evaluables aunque el trigger
-- fuera NO CUMPLE.
--
-- Por lo tanto:
--
--   excepción + TRUE + NULL = Cumple
-- --------------------------------------------------------------------------

respuestas_excepcion_cumple AS (
    SELECT
        d.id AS detalle_id,
        d.evaluacion_id,
        d.valor_respuesta AS valor_anterior,
        '1'::VARCHAR(2) AS valor_nuevo,
        'LEGACY_EXCEPTION_TO_CUMPLE'::TEXT AS motivo
    FROM detalles_normalizados d
    JOIN evaluaciones_disparadas ed
      ON ed.evaluacion_id = d.evaluacion_id
    WHERE d.cumple = TRUE
      AND d.valor_respuesta IS NULL
      AND (
            (
                d.bloque = 'ENC'
                AND d.atributo = 'PROTOCOLOS DE ATENCION'
                AND d.submotivo = 'Cumple_Speech'
            )

            OR

            (
                d.bloque = 'ECN'
                AND d.atributo = 'CIERRE'
                AND d.submotivo = 'Cierre_correcto'
            )

            OR

            (
                d.bloque = 'ECN'
                AND d.atributo = 'TIPIFICACION'
                AND d.submotivo = 'Tipificacion_correcta'
            )
      )
),

-- --------------------------------------------------------------------------
-- Reconstrucción tipo 3:
--
-- El propio trigger nunca se convierte en NA por su propia regla.
--
-- Por tanto:
--
--   Cliente_corta_llamada + TRUE + NULL = Cumple
--
-- Esto se aplica a todas las evaluaciones estructuralmente elegibles donde
-- el trigger histórico está TRUE+NULL, independientemente de que la regla
-- haya sido disparada o no.
-- --------------------------------------------------------------------------

respuesta_trigger_cumple AS (
    SELECT
        d.id AS detalle_id,
        d.evaluacion_id,
        d.valor_respuesta AS valor_anterior,
        '1'::VARCHAR(2) AS valor_nuevo,
        'LEGACY_TRIGGER_TO_CUMPLE'::TEXT AS motivo
    FROM detalles_normalizados d
    JOIN evaluaciones_elegibles ee
      ON ee.evaluacion_id = d.evaluacion_id
    WHERE d.bloque = 'ENC'
      AND d.atributo = 'PROTOCOLOS DE ATENCION'
      AND d.submotivo = 'Cliente_corta_llamada'
      AND d.cumple = TRUE
      AND d.valor_respuesta IS NULL
),

reconstruccion AS (
    SELECT * FROM respuestas_na

    UNION ALL

    SELECT * FROM respuestas_excepcion_cumple

    UNION ALL

    SELECT * FROM respuesta_trigger_cumple
)

INSERT INTO meca_migration_0020_evaluation_response_backup (
    detalle_id,
    evaluacion_id,
    valor_respuesta_anterior,
    valor_respuesta_nuevo,
    motivo_reconstruccion
)
SELECT
    detalle_id,
    evaluacion_id,
    valor_anterior,
    valor_nuevo,
    motivo
FROM reconstruccion;


-- ============================================================================
-- 3. VALIDACIÓN PREVIA AL UPDATE
--
-- Ningún detalle puede aparecer más de una vez en el respaldo.
-- La PK ya lo impediría, pero dejamos una validación explícita/documentada.
-- ============================================================================

DO $$
DECLARE
    v_duplicados BIGINT;
BEGIN

    SELECT COUNT(*)
    INTO v_duplicados
    FROM (
        SELECT detalle_id
        FROM meca_migration_0020_evaluation_response_backup
        GROUP BY detalle_id
        HAVING COUNT(*) > 1
    ) x;

    IF v_duplicados > 0 THEN
        RAISE EXCEPTION
            '0020 abortada: existen % detalles clasificados múltiples veces.',
            v_duplicados;
    END IF;

END
$$;


-- ============================================================================
-- 4. APLICAR RECONSTRUCCIÓN
--
-- Protección adicional:
-- solo modifica filas cuyo valor sigue siendo NULL.
-- ============================================================================

UPDATE detalles_evaluacion d
SET valor_respuesta = b.valor_respuesta_nuevo
FROM meca_migration_0020_evaluation_response_backup b
WHERE d.id = b.detalle_id
  AND d.evaluacion_id = b.evaluacion_id
  AND d.valor_respuesta IS NULL;


-- ============================================================================
-- 5. VALIDACIÓN POSTERIOR
--
-- Todos los detalles respaldados deben existir y contener exactamente
-- el valor reconstruido.
-- ============================================================================

DO $$
DECLARE
    v_total BIGINT;
    v_correctos BIGINT;
    v_faltantes BIGINT;
BEGIN

    SELECT COUNT(*)
    INTO v_total
    FROM meca_migration_0020_evaluation_response_backup;


    SELECT COUNT(*)
    INTO v_correctos
    FROM meca_migration_0020_evaluation_response_backup b
    JOIN detalles_evaluacion d
      ON d.id = b.detalle_id
     AND d.evaluacion_id = b.evaluacion_id
    WHERE d.valor_respuesta = b.valor_respuesta_nuevo;


    SELECT COUNT(*)
    INTO v_faltantes
    FROM meca_migration_0020_evaluation_response_backup b
    LEFT JOIN detalles_evaluacion d
      ON d.id = b.detalle_id
     AND d.evaluacion_id = b.evaluacion_id
    WHERE d.id IS NULL;


    IF v_faltantes > 0 THEN
        RAISE EXCEPTION
            '0020 abortada: % detalles respaldados no existen en detalles_evaluacion.',
            v_faltantes;
    END IF;


    IF v_total <> v_correctos THEN
        RAISE EXCEPTION
            '0020 abortada: se esperaban % respuestas reconstruidas pero solo % quedaron correctamente actualizadas.',
            v_total,
            v_correctos;
    END IF;


    RAISE NOTICE
        '0020 completada: % respuestas históricas reconstruidas.',
        v_total;

END
$$;