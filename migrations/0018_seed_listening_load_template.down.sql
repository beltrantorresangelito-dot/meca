BEGIN;

DELETE FROM public.campos_plantilla_carga
WHERE version_plantilla_id IN (
    SELECT vp.id
    FROM public.versiones_plantilla_carga vp
    INNER JOIN public.plantillas_carga p
        ON p.id = vp.plantilla_id
    WHERE p.codigo = 'ESCUCHAS_GENERAL'
      AND vp.version = 'v1.0.0'
);

DELETE FROM public.versiones_plantilla_carga
WHERE plantilla_id IN (
    SELECT id
    FROM public.plantillas_carga
    WHERE codigo = 'ESCUCHAS_GENERAL'
)
AND version = 'v1.0.0';

DELETE FROM public.plantillas_carga
WHERE codigo = 'ESCUCHAS_GENERAL';

COMMIT;