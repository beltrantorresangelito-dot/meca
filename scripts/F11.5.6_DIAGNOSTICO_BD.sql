-- MECA F11.5.6
-- Diagnóstico no destructivo de columnas relacionadas con campaña.

SELECT
    table_schema,
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
      column_name ILIKE '%campana%'
      OR column_name IN ('matriz_id', 'version_matriz_id')
  )
ORDER BY table_name, ordinal_position;

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'evaluaciones'
  AND column_name IN (
      'campana',
      'campana_id',
      'matriz_id',
      'version_matriz_id'
  )
ORDER BY column_name;

SELECT
    id,
    ticket_psi,
    campana_id,
    matriz_id,
    version_matriz_id
FROM evaluaciones
ORDER BY timestamp DESC
LIMIT 20;
