-- ============================================================================
-- MECA - Migración 0020 DOWN
-- Rollback seguro de reconstrucción histórica
--
-- El rollback:
--   1. verifica que exista el respaldo;
--   2. verifica que ningún detalle haya desaparecido;
--   3. detecta modificaciones posteriores;
--   4. solo restaura si el registro sigue en el estado dejado por 0020;
--   5. restaura exactamente el valor anterior;
--   6. elimina la tabla de respaldo al finalizar correctamente.
--
-- Si una respuesta reconstruida fue posteriormente modificada por un usuario,
-- el DOWN se aborta en lugar de destruir ese cambio.
-- ============================================================================


-- ============================================================================
-- 1. VERIFICAR SEGURIDAD DEL ROLLBACK
-- ============================================================================

DO $$
DECLARE
    v_faltantes BIGINT;
    v_modificados_posteriormente BIGINT;
BEGIN

    IF to_regclass(
        'public.meca_migration_0020_evaluation_response_backup'
    ) IS NULL THEN

        RAISE EXCEPTION
            'No existe meca_migration_0020_evaluation_response_backup. No es posible ejecutar rollback seguro de 0020.';

    END IF;


    -- ----------------------------------------------------------------------
    -- Ningún detalle respaldado puede haber sido eliminado.
    -- ----------------------------------------------------------------------

    SELECT COUNT(*)
    INTO v_faltantes
    FROM meca_migration_0020_evaluation_response_backup b
    LEFT JOIN detalles_evaluacion d
      ON d.id = b.detalle_id
     AND d.evaluacion_id = b.evaluacion_id
    WHERE d.id IS NULL;


    IF v_faltantes > 0 THEN

        RAISE EXCEPTION
            'Rollback 0020 abortado: % detalles respaldados ya no existen.',
            v_faltantes;

    END IF;


    -- ----------------------------------------------------------------------
    -- Una fila es segura para rollback si:
    --
    -- A) todavía contiene el valor que escribió 0020
    --
    -- o
    --
    -- B) ya contiene nuevamente su valor anterior.
    --
    -- Cualquier tercer valor indica modificación posterior.
    -- ----------------------------------------------------------------------

    SELECT COUNT(*)
    INTO v_modificados_posteriormente
    FROM meca_migration_0020_evaluation_response_backup b
    JOIN detalles_evaluacion d
      ON d.id = b.detalle_id
     AND d.evaluacion_id = b.evaluacion_id
    WHERE d.valor_respuesta IS DISTINCT FROM b.valor_respuesta_nuevo
      AND d.valor_respuesta IS DISTINCT FROM b.valor_respuesta_anterior;


    IF v_modificados_posteriormente > 0 THEN

        RAISE EXCEPTION
            'Rollback 0020 abortado: % respuestas fueron modificadas después de la migración. No se realizará rollback automático para evitar pérdida de información.',
            v_modificados_posteriormente;

    END IF;

END
$$;


-- ============================================================================
-- 2. RESTAURAR VALORES ANTERIORES
-- ============================================================================

UPDATE detalles_evaluacion d
SET valor_respuesta = b.valor_respuesta_anterior
FROM meca_migration_0020_evaluation_response_backup b
WHERE d.id = b.detalle_id
  AND d.evaluacion_id = b.evaluacion_id
  AND d.valor_respuesta IS NOT DISTINCT FROM b.valor_respuesta_nuevo;


-- ============================================================================
-- 3. VERIFICAR RESTAURACIÓN
-- ============================================================================

DO $$
DECLARE
    v_total BIGINT;
    v_restaurados BIGINT;
BEGIN

    SELECT COUNT(*)
    INTO v_total
    FROM meca_migration_0020_evaluation_response_backup;


    SELECT COUNT(*)
    INTO v_restaurados
    FROM meca_migration_0020_evaluation_response_backup b
    JOIN detalles_evaluacion d
      ON d.id = b.detalle_id
     AND d.evaluacion_id = b.evaluacion_id
    WHERE d.valor_respuesta IS NOT DISTINCT FROM b.valor_respuesta_anterior;


    IF v_total <> v_restaurados THEN

        RAISE EXCEPTION
            'Rollback 0020 incompleto: se esperaban % restauraciones pero solo % coinciden con el valor anterior.',
            v_total,
            v_restaurados;

    END IF;


    RAISE NOTICE
        'Rollback 0020 completado: % respuestas restauradas.',
        v_restaurados;

END
$$;


-- ============================================================================
-- 4. ELIMINAR RESPALDO
-- ============================================================================

DROP TABLE meca_migration_0020_evaluation_response_backup;