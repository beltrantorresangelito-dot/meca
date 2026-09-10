-- 0025_sync_evaluation_detail_sequence.up.sql
--
-- Corrige la secuencia de detalles_evaluacion para que el próximo
-- ID generado quede por encima del máximo ID persistido.

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