-- ============================================================
-- 0028 - SINCRONIZAR SECUENCIAS PDA
-- ============================================================

SELECT setval(
    'pda_documentos_id_seq',
    COALESCE(
        (
            SELECT MAX(id)
            FROM pda_documentos
        ),
        0
    ) + 1,
    false
);

SELECT setval(
    'pda_acciones_id_seq',
    COALESCE(
        (
            SELECT MAX(id)
            FROM pda_acciones
        ),
        0
    ) + 1,
    false
);

SELECT setval(
    'pda_cabecera_id_seq',
    COALESCE(
        (
            SELECT MAX(id)
            FROM pda_cabecera
        ),
        0
    ) + 1,
    false
);

SELECT setval(
    'pda_ciclos_evaluacion_id_seq',
    COALESCE(
        (
            SELECT MAX(id)
            FROM pda_ciclos_evaluacion
        ),
        0
    ) + 1,
    false
);