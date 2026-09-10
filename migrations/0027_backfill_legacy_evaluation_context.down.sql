-- ============================================================
-- 0027 DOWN
-- Restaurar contexto anterior
-- ============================================================

UPDATE evaluaciones e
SET
    quiebre_id =
        b.quiebre_id,

    campana =
        b.campana,

    campana_id =
        b.campana_id,

    matriz_id =
        b.matriz_id,

    version_matriz_id =
        b.version_matriz_id

FROM migration_0027_evaluaciones_backup b
WHERE e.id =
    b.id;


DROP TABLE IF EXISTS
    migration_0027_contexto_pendiente;


DROP TABLE IF EXISTS
    migration_0027_evaluaciones_backup;