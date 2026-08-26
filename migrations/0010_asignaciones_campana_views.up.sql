-- ==========================================================
-- MECA F11.5.7.3
-- Campaña normalizada en asignaciones + vistas de compatibilidad
--
-- OBJETIVO:
-- - Incorporar campana_id a asignaciones_escucha.
-- - Mantener campana textual legacy.
-- - Exponer información normalizada mediante vistas.
-- - NO modificar datos históricos.
-- ==========================================================


-- ==========================================================
-- 1. CAMPANA_ID EN ASIGNACIONES
-- ==========================================================

ALTER TABLE asignaciones_escucha
    ADD COLUMN IF NOT EXISTS campana_id INTEGER;


-- ==========================================================
-- 2. FOREIGN KEY
-- ==========================================================
-- Se crea solamente si todavía no existe.
-- La columna continúa permitiendo NULL.
-- ==========================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname =
            'asignaciones_escucha_campana_id_fkey'
          AND conrelid =
            'public.asignaciones_escucha'::regclass
    ) THEN

        ALTER TABLE asignaciones_escucha
            ADD CONSTRAINT
                asignaciones_escucha_campana_id_fkey
            FOREIGN KEY (campana_id)
            REFERENCES campanas(id);

    END IF;
END
$$;


-- ==========================================================
-- 3. ÍNDICE
-- ==========================================================

CREATE INDEX IF NOT EXISTS
    idx_asignaciones_escucha_campana_id
ON asignaciones_escucha (campana_id);


-- ==========================================================
-- 4. VISTA ASIGNACIONES + CAMPAÑA
-- ==========================================================

CREATE OR REPLACE VIEW
    vw_asignaciones_campana
AS
SELECT
    a.id,
    a.tarea_id,
    a.ticket,
    a.supervisor_responsable,
    a.gestor_auditado,
    a.auditor_asignado,
    a.motivos,
    a.submotivos,
    a.subnivel,
    a.peticion,
    a.usuario_dni,
    a.usuario_mov,
    a.motivo_call,
    a.fecha_descarga,
    a.estado,
    a.fecha_asignacion,
    a.fecha_gestion,
    a.comentarios,
    a.created_at,
    a.updated_at,
    a.audio_disponible,
    a.motivo_incidencia,
    a.fecha_incidencia,
    a.fecha_reasignacion,
    a.motivo_reasignacion,
    a.reasignado_por,
    a.audio_path,
    a.audio_encontrado,
    a.transcripcion,
    a.transcripcion_estado,
    a.analisis_ollama,
    a.audio_duracion_segundos,
    a.fecha_transcripcion,

    -- Legacy: se mantiene durante transición
    a.campana,

    -- Nueva identidad normalizada
    a.campana_id,

    -- Datos derivados del catálogo
    c.codigo AS campana_codigo,
    c.descripcion AS campana_descripcion,
    c.activa AS campana_activa

FROM asignaciones_escucha a

LEFT JOIN campanas c
    ON a.campana_id = c.id;


-- ==========================================================
-- 5. VISTA EVALUACIONES + CAMPAÑA
-- ==========================================================

CREATE OR REPLACE VIEW
    vw_evaluaciones_campana
AS
SELECT
    e.id,
    e."timestamp",
    e.fecha,
    e.fecha_formateada,
    e.ticket_psi,
    e.agente,
    e.evaluador,
    e.id_llamada,
    e.total_enc,
    e.total_ecuf,
    e.total_ecn,
    e.nota_final,
    e.rango,
    e.tiempo_auditoria,
    e.tiempo_auditoria_formateado,
    e.fecha_registro,
    e.fecha_modificacion,
    e.veces_editado,
    e.created_at,
    e.fecha_descarga,
    e.version_sistema,
    e.porcentajes_originales,
    e.version_matriz_id,

    -- Legacy
    e.campana,

    -- Nueva identidad normalizada
    e.campana_id,

    -- Datos derivados del catálogo
    c.codigo AS campana_codigo,
    c.descripcion AS campana_descripcion,
    c.activa AS campana_activa

FROM evaluaciones e

LEFT JOIN campanas c
    ON e.campana_id = c.id;