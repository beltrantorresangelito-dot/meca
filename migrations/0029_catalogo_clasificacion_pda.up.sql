-- ============================================================
-- 0029 - CATÁLOGO DE CLASIFICACIÓN PDA
--
-- Objetivo:
--   Normalizar la clasificación PDA de los submotivos
--   para soportar MECA multiquiebre / multicampaña
--   sin depender de textos libres.
--
-- Estrategia:
--   1. Crear catálogo maestro.
--   2. Insertar clasificaciones actuales.
--   3. Agregar FK a version_sub_motivos.
--   4. Migrar valores existentes.
--   5. Mantener temporalmente el campo clasificacion
--      por compatibilidad.
-- ============================================================


-- ============================================================
-- 1. CREAR CATÁLOGO
-- ============================================================

CREATE TABLE IF NOT EXISTS clasificaciones_pda (
    id SERIAL PRIMARY KEY,

    codigo VARCHAR(30) NOT NULL,

    nombre VARCHAR(100) NOT NULL,

    descripcion TEXT,

    activo BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMP WITHOUT TIME ZONE
        NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. CÓDIGO ÚNICO
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    uq_clasificaciones_pda_codigo
ON clasificaciones_pda (
    codigo
);


-- ============================================================
-- 3. INSERTAR CLASIFICACIONES ACTUALES
-- ============================================================

INSERT INTO clasificaciones_pda (
    codigo,
    nombre,
    descripcion
)
VALUES
(
    'PROCESO',
    'Proceso',
    'Hallazgos relacionados con conocimiento, cumplimiento o ejecución de procesos.'
),
(
    'HABILIDADES',
    'Habilidades blandas',
    'Hallazgos relacionados con habilidades de comunicación, interacción y manejo de la gestión.'
),
(
    'FEEDBACK',
    'Feedback',
    'Hallazgos que requieren retroalimentación puntual o reforzamiento específico.'
)
ON CONFLICT (codigo)
DO NOTHING;


-- ============================================================
-- 4. AGREGAR FK A version_sub_motivos
-- ============================================================

ALTER TABLE version_sub_motivos
ADD COLUMN IF NOT EXISTS clasificacion_pda_id INTEGER;


-- ============================================================
-- 5. MIGRAR VALORES EXISTENTES
--
-- PROCESO              -> PROCESO
-- HABILIDADES BLANDAS  -> HABILIDADES
-- FEEDBACK             -> FEEDBACK
-- ============================================================

UPDATE version_sub_motivos vsm
SET clasificacion_pda_id = cp.id
FROM clasificaciones_pda cp
WHERE
    cp.codigo = 'PROCESO'
    AND UPPER(TRIM(vsm.clasificacion)) = 'PROCESO';


UPDATE version_sub_motivos vsm
SET clasificacion_pda_id = cp.id
FROM clasificaciones_pda cp
WHERE
    cp.codigo = 'HABILIDADES'
    AND UPPER(TRIM(vsm.clasificacion)) = 'HABILIDADES BLANDAS';


UPDATE version_sub_motivos vsm
SET clasificacion_pda_id = cp.id
FROM clasificaciones_pda cp
WHERE
    cp.codigo = 'FEEDBACK'
    AND UPPER(TRIM(vsm.clasificacion)) = 'FEEDBACK';


-- ============================================================
-- 6. FALLBACK CONTROLADO
--
-- Si apareciera algún valor legacy distinto,
-- se asigna PROCESO para no dejar filas sin relación.
-- ============================================================

UPDATE version_sub_motivos vsm
SET clasificacion_pda_id = cp.id
FROM clasificaciones_pda cp
WHERE
    cp.codigo = 'PROCESO'
    AND vsm.clasificacion_pda_id IS NULL;


-- ============================================================
-- 7. HACER FK OBLIGATORIA
-- ============================================================

ALTER TABLE version_sub_motivos
ALTER COLUMN clasificacion_pda_id
SET NOT NULL;


-- ============================================================
-- 8. CREAR FOREIGN KEY
-- ============================================================

ALTER TABLE version_sub_motivos
DROP CONSTRAINT IF EXISTS
    version_sub_motivos_clasificacion_pda_id_fkey;


ALTER TABLE version_sub_motivos
ADD CONSTRAINT
    version_sub_motivos_clasificacion_pda_id_fkey
FOREIGN KEY (
    clasificacion_pda_id
)
REFERENCES clasificaciones_pda (
    id
);


-- ============================================================
-- 9. ÍNDICE PARA CONSULTAS
-- ============================================================

CREATE INDEX IF NOT EXISTS
    idx_version_sub_motivos_clasificacion_pda_id
ON version_sub_motivos (
    clasificacion_pda_id
);


-- ============================================================
-- 10. VERIFICACIÓN
-- ============================================================

DO $$
DECLARE
    v_total BIGINT;
    v_con_clasificacion BIGINT;
BEGIN

    SELECT COUNT(*)
    INTO v_total
    FROM version_sub_motivos;


    SELECT COUNT(*)
    INTO v_con_clasificacion
    FROM version_sub_motivos
    WHERE clasificacion_pda_id IS NOT NULL;


    IF v_total <> v_con_clasificacion THEN
        RAISE EXCEPTION
            'Migración 0029 incompleta: total %, relacionados %',
            v_total,
            v_con_clasificacion;
    END IF;


    RAISE NOTICE
        'Migración 0029 OK: % submotivos clasificados',
        v_con_clasificacion;

END $$;