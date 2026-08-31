-- ============================================================
-- MECA
-- 0017 DOWN - Resolución de dominio para carga de Escuchas
-- ============================================================

BEGIN;

DROP FUNCTION IF EXISTS public.resolver_contexto_carga_escucha(
    TEXT,
    TEXT
);

COMMIT;