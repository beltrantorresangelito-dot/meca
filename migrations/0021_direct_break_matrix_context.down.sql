-- ============================================================
-- MECA F14
-- Rollback contexto directo Quiebre -> Matriz
-- ============================================================

BEGIN;


DROP FUNCTION IF EXISTS
public.resolver_contexto_evaluacion_quiebre(BIGINT, DATE);


DROP TRIGGER IF EXISTS
trg_validar_quiebre_matriz
ON public.quiebre_matriz;


DROP FUNCTION IF EXISTS
public.validar_quiebre_matriz();


DROP INDEX IF EXISTS
public.idx_quiebre_matriz_vigencia;

DROP INDEX IF EXISTS
public.idx_quiebre_matriz_matriz;

DROP INDEX IF EXISTS
public.idx_quiebre_matriz_quiebre;


DROP TABLE IF EXISTS
public.quiebre_matriz;


COMMIT;