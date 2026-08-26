-- ============================================================
-- MECA F11.6.5
-- Eliminar la restricción que impedía asociar una matriz
-- a campañas pertenecientes a otros quiebres.
--
-- IMPORTANTE:
-- - No modifica datos existentes.
-- - matrices.quiebre_id se conserva como quiebre de origen.
-- - campana_matriz continúa siendo la relación funcional efectiva.
-- - Se mantiene la validación de solapamiento de vigencias.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.validar_campana_matriz()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_campana_existe BOOLEAN;
    v_matriz_existe BOOLEAN;
    v_solapamientos INTEGER;
BEGIN

    -- ========================================================
    -- 1. VALIDAR EXISTENCIA DE CAMPAÑA
    -- ========================================================
    SELECT EXISTS (
        SELECT 1
        FROM campanas
        WHERE id = NEW.campana_id
    )
    INTO v_campana_existe;

    IF NOT v_campana_existe THEN
        RAISE EXCEPTION
            'Campaña % no existe.',
            NEW.campana_id;
    END IF;


    -- ========================================================
    -- 2. VALIDAR EXISTENCIA DE MATRIZ
    --
    -- Ya NO se exige que campaña y matriz pertenezcan
    -- al mismo quiebre.
    --
    -- matrices.quiebre_id representa únicamente el
    -- quiebre de origen de la matriz.
    -- ========================================================
    SELECT EXISTS (
        SELECT 1
        FROM matrices
        WHERE id = NEW.matriz_id
    )
    INTO v_matriz_existe;

    IF NOT v_matriz_existe THEN
        RAISE EXCEPTION
            'Matriz % no existe.',
            NEW.matriz_id;
    END IF;


    -- ========================================================
    -- 3. VALIDAR RANGO DE VIGENCIA
    -- ========================================================
    IF NEW.vigente_hasta IS NOT NULL
       AND NEW.vigente_hasta < NEW.vigente_desde THEN

        RAISE EXCEPTION
            'La fecha vigente_hasta (%) no puede ser anterior a vigente_desde (%).',
            NEW.vigente_hasta,
            NEW.vigente_desde;

    END IF;


    -- ========================================================
    -- 4. EVITAR MATRICES ACTIVAS CON VIGENCIAS SOLAPADAS
    --    PARA UNA MISMA CAMPAÑA
    -- ========================================================
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


    -- ========================================================
    -- 5. ACTUALIZAR FECHA DE MODIFICACIÓN
    -- ========================================================
    NEW.updated_at = NOW();

    RETURN NEW;

END;
$function$;

COMMENT ON FUNCTION public.validar_campana_matriz() IS
'Valida existencia de campaña y matriz, rango de vigencia y ausencia de solapamientos. Permite que una matriz sea utilizada por campañas de distintos quiebres.';

COMMIT;