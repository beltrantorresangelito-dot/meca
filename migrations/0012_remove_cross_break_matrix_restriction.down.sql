-- ============================================================
-- MECA F11.6.5 - ROLLBACK
-- Restaurar la restricción que exige que campaña y matriz
-- pertenezcan al mismo quiebre.
--
-- IMPORTANTE:
-- La reversión se bloquea si ya existen asociaciones activas
-- entre campañas y matrices de quiebres diferentes.
-- ============================================================

BEGIN;

-- ============================================================
-- PROTECCIÓN DE REVERSIÓN
-- ============================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM campana_matriz cm
        JOIN campanas c
          ON c.id = cm.campana_id
        JOIN matrices m
          ON m.id = cm.matriz_id
        WHERE c.quiebre_id <> m.quiebre_id
          AND cm.activa = TRUE
    ) THEN
        RAISE EXCEPTION
            'No se puede revertir 0012: existen matrices compartidas entre quiebres.';
    END IF;
END $$;


-- ============================================================
-- RESTAURAR FUNCIÓN ANTERIOR
-- ============================================================
CREATE OR REPLACE FUNCTION public.validar_campana_matriz()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
        RAISE EXCEPTION
            'Campaña % no existe o no tiene Quiebre.',
            NEW.campana_id;
    END IF;

    IF v_quiebre_matriz IS NULL THEN
        RAISE EXCEPTION
            'Matriz % no existe o no tiene Quiebre.',
            NEW.matriz_id;
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
                COALESCE(
                    cm.vigente_hasta + 1,
                    'infinity'::date
                ),
                '[)'
              )
              &&
              daterange(
                NEW.vigente_desde,
                COALESCE(
                    NEW.vigente_hasta + 1,
                    'infinity'::date
                ),
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
$function$;

COMMENT ON FUNCTION public.validar_campana_matriz() IS NULL;

COMMIT;