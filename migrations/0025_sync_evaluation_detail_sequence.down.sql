-- 0025_sync_evaluation_detail_sequence.down.sql
--
-- Corrección de integridad no reversible de forma segura.
-- Un rollback NO debe devolver la secuencia a un valor inferior
-- al MAX(id), porque provocaría duplicados.
--
-- En caso de rollback de versión se mantiene la secuencia
-- sincronizada con los datos existentes.

SELECT setval(
    pg_get_serial_sequence(
        'public.detalles_evaluacion',
        'id'
    ),
    COALESCE(
        (
            SELECT MAX(id)
            FROM public.detalles_evaluacion
        ),
        1
    ),
    EXISTS (
        SELECT 1
        FROM public.detalles_evaluacion
    )
);