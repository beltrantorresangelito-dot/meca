BEGIN;

DO $$
DECLARE
    v_plantilla_id BIGINT;
    v_version_origen_id BIGINT;
    v_version_nueva_id BIGINT;
BEGIN
    -- ======================================================
    -- 1. OBTENER PLANTILLA ESCUCHAS_GENERAL
    -- ======================================================
    SELECT id
      INTO v_plantilla_id
      FROM public.plantillas_carga
     WHERE codigo = 'ESCUCHAS_GENERAL'
       AND activa = TRUE;

    IF v_plantilla_id IS NULL THEN
        RAISE EXCEPTION
            'No existe una plantilla activa con código ESCUCHAS_GENERAL';
    END IF;

    -- ======================================================
    -- 2. OBTENER VERSIÓN ACTUAL PUBLICADA
    -- ======================================================
    SELECT id
      INTO v_version_origen_id
      FROM public.versiones_plantilla_carga
     WHERE plantilla_id = v_plantilla_id
       AND version = 'v1.0.0'
       AND publicado_en IS NOT NULL;

    IF v_version_origen_id IS NULL THEN
        RAISE EXCEPTION
            'No existe la versión publicada v1.0.0 de ESCUCHAS_GENERAL';
    END IF;

    -- ======================================================
    -- 3. EVITAR DUPLICAR v1.1.0
    -- ======================================================
    IF EXISTS (
        SELECT 1
          FROM public.versiones_plantilla_carga
         WHERE plantilla_id = v_plantilla_id
           AND version = 'v1.1.0'
    ) THEN
        RAISE EXCEPTION
            'La versión v1.1.0 de ESCUCHAS_GENERAL ya existe';
    END IF;

    -- ======================================================
    -- 4. DESACTIVAR VERSIÓN ACTUAL
    -- ======================================================
    UPDATE public.versiones_plantilla_carga
       SET activa = FALSE,
           updated_at = CURRENT_TIMESTAMP
     WHERE plantilla_id = v_plantilla_id
       AND activa = TRUE;

    -- ======================================================
    -- 5. CREAR NUEVA VERSIÓN
    -- ======================================================
    INSERT INTO public.versiones_plantilla_carga (
        plantilla_id,
        version,
        activa,
        publicado_en,
        created_at,
        updated_at
    )
    VALUES (
        v_plantilla_id,
        'v1.1.0',
        TRUE,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    RETURNING id
    INTO v_version_nueva_id;

    -- ======================================================
    -- 6. COPIAR CAMPOS DESDE v1.0.0
    -- ======================================================
    INSERT INTO public.campos_plantilla_carga (
        version_plantilla_id,
        cabecera_origen,
        campo_destino,
        tipo_dato,
        obligatorio,
        orden,
        activo,
        created_at,
        updated_at
    )
    SELECT
        v_version_nueva_id,
        cabecera_origen,
        campo_destino,
        tipo_dato,
        CASE
            WHEN campo_destino = 'campana'
                THEN FALSE
            ELSE obligatorio
        END,
        orden,
        activo,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM public.campos_plantilla_carga
    WHERE version_plantilla_id = v_version_origen_id
    ORDER BY orden;

    -- ======================================================
    -- 7. VALIDACIONES DE INTEGRIDAD
    -- ======================================================

    IF NOT EXISTS (
        SELECT 1
          FROM public.campos_plantilla_carga
         WHERE version_plantilla_id = v_version_nueva_id
           AND campo_destino = 'quiebre'
           AND obligatorio = TRUE
    ) THEN
        RAISE EXCEPTION
            'La nueva versión no conserva Quiebre como obligatorio';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM public.campos_plantilla_carga
         WHERE version_plantilla_id = v_version_nueva_id
           AND campo_destino = 'campana'
           AND obligatorio = FALSE
    ) THEN
        RAISE EXCEPTION
            'La nueva versión no configura Campaña como opcional';
    END IF;

    IF (
        SELECT COUNT(*)
          FROM public.campos_plantilla_carga
         WHERE version_plantilla_id = v_version_nueva_id
    ) <> (
        SELECT COUNT(*)
          FROM public.campos_plantilla_carga
         WHERE version_plantilla_id = v_version_origen_id
    ) THEN
        RAISE EXCEPTION
            'La cantidad de campos de v1.1.0 no coincide con v1.0.0';
    END IF;
END
$$;

COMMIT;