BEGIN;

DO $$
DECLARE
    v_plantilla_id BIGINT;
    v_version_v110_id BIGINT;
    v_version_v100_id BIGINT;
BEGIN
    -- ======================================================
    -- 1. OBTENER PLANTILLA
    -- ======================================================
    SELECT id
      INTO v_plantilla_id
      FROM public.plantillas_carga
     WHERE codigo = 'ESCUCHAS_GENERAL';

    IF v_plantilla_id IS NULL THEN
        RAISE EXCEPTION
            'No existe la plantilla ESCUCHAS_GENERAL';
    END IF;

    -- ======================================================
    -- 2. LOCALIZAR VERSIONES
    -- ======================================================
    SELECT id
      INTO v_version_v110_id
      FROM public.versiones_plantilla_carga
     WHERE plantilla_id = v_plantilla_id
       AND version = 'v1.1.0';

    SELECT id
      INTO v_version_v100_id
      FROM public.versiones_plantilla_carga
     WHERE plantilla_id = v_plantilla_id
       AND version = 'v1.0.0';

    IF v_version_v110_id IS NULL THEN
        RAISE EXCEPTION
            'No existe la versión v1.1.0 para revertir';
    END IF;

    IF v_version_v100_id IS NULL THEN
        RAISE EXCEPTION
            'No existe la versión v1.0.0 para restaurar';
    END IF;

    -- ======================================================
    -- 3. ELIMINAR CAMPOS DE v1.1.0
    -- ======================================================
    DELETE FROM public.campos_plantilla_carga
     WHERE version_plantilla_id = v_version_v110_id;

    -- ======================================================
    -- 4. ELIMINAR v1.1.0
    -- ======================================================
    DELETE FROM public.versiones_plantilla_carga
     WHERE id = v_version_v110_id;

    -- ======================================================
    -- 5. RESTAURAR v1.0.0 COMO ACTIVA
    -- ======================================================
    UPDATE public.versiones_plantilla_carga
       SET activa = CASE
                        WHEN id = v_version_v100_id
                            THEN TRUE
                        ELSE FALSE
                    END,
           updated_at = CURRENT_TIMESTAMP
     WHERE plantilla_id = v_plantilla_id;

END
$$;

COMMIT;