BEGIN;

-- ============================================================
-- PLANTILLA BASE PARA CARGA DE ESCUCHAS
-- ============================================================

INSERT INTO public.plantillas_carga (
    codigo,
    nombre,
    descripcion,
    activa
)
VALUES (
    'ESCUCHAS_GENERAL',
    'Carga general de escuchas',
    'Plantilla base para la carga multidominio de escuchas desde Excel.',
    TRUE
)
ON CONFLICT (codigo)
DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activa = TRUE,
    updated_at = CURRENT_TIMESTAMP;


-- ============================================================
-- VERSIÓN INICIAL PUBLICADA
-- ============================================================

INSERT INTO public.versiones_plantilla_carga (
    plantilla_id,
    version,
    activa,
    publicado_en
)
SELECT
    p.id,
    'v1.0.0',
    TRUE,
    CURRENT_TIMESTAMP
FROM public.plantillas_carga p
WHERE p.codigo = 'ESCUCHAS_GENERAL'
ON CONFLICT (plantilla_id, version)
DO UPDATE SET
    activa = TRUE,
    publicado_en = COALESCE(
        versiones_plantilla_carga.publicado_en,
        CURRENT_TIMESTAMP
    ),
    updated_at = CURRENT_TIMESTAMP;


-- ============================================================
-- CAMPOS DE LA PLANTILLA
-- ============================================================

WITH version_objetivo AS (
    SELECT vp.id
    FROM public.versiones_plantilla_carga vp
    INNER JOIN public.plantillas_carga p
        ON p.id = vp.plantilla_id
    WHERE p.codigo = 'ESCUCHAS_GENERAL'
      AND vp.version = 'v1.0.0'
)
INSERT INTO public.campos_plantilla_carga (
    version_plantilla_id,
    cabecera_origen,
    campo_destino,
    tipo_dato,
    obligatorio,
    orden,
    activo
)
SELECT
    v.id,
    datos.cabecera_origen,
    datos.campo_destino,
    datos.tipo_dato,
    datos.obligatorio,
    datos.orden,
    TRUE
FROM version_objetivo v
CROSS JOIN (
    VALUES
        ('Quiebre',                 'quiebre',                 'texto', TRUE,  1),
        ('Campaña',                 'campana',                 'texto', TRUE,  2),
        ('Fecha Descarga',          'fecha_descarga',          'fecha', FALSE, 3),
        ('Consulta[ticket]',        'ticket',                  'texto', TRUE,  4),
        ('Consulta[responsable]',   'supervisor_responsable',  'texto', FALSE, 5),
        ('Consulta[Motivos]',       'motivos',                 'texto', FALSE, 6),
        ('Consulta[Submotivos]',    'submotivos',              'texto', FALSE, 7),
        ('Consulta[SubNivel]',      'subnivel',                'texto', FALSE, 8),
        ('PETICION',                'peticion',                'texto', FALSE, 9),
        ('Consulta[UsuarioDNI]',    'usuario_dni',             'texto', FALSE, 10),
        ('Consulta[UsuarioMov]',    'usuario_mov',             'texto', FALSE, 11),
        ('Consulta[motivo_call]',   'motivo_call',             'texto', FALSE, 12)
) AS datos(
    cabecera_origen,
    campo_destino,
    tipo_dato,
    obligatorio,
    orden
)
ON CONFLICT (version_plantilla_id, cabecera_origen)
DO UPDATE SET
    campo_destino = EXCLUDED.campo_destino,
    tipo_dato = EXCLUDED.tipo_dato,
    obligatorio = EXCLUDED.obligatorio,
    orden = EXCLUDED.orden,
    activo = TRUE,
    updated_at = CURRENT_TIMESTAMP;

COMMIT;