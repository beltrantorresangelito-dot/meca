MECA F11.5.5.5A - MIGRACIÓN SEGURA matriz_id

CAUSA DEL ERROR
La migración anterior asumió la existencia de:

matriz_versiones

En la BD actual esa relación no existe, por lo que PostgreSQL abortó
la transacción completa y ejecutó ROLLBACK.

RESULTADO
No quedó aplicada ninguna modificación.

NUEVA ESTRATEGIA
1. Agregar evaluaciones.matriz_id.
2. Crear índice.
3. NO hacer backfill todavía.
4. Identificar después la tabla real que relaciona versión -> matriz.
5. Ejecutar backfill histórico como migración separada.

EJECUCIÓN

.\psql.exe -U postgres -d meca_db -f .\migrations1_evaluaciones_matriz_id.sql

VALIDACIÓN

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'evaluaciones'
  AND column_name = 'matriz_id';

Luego:

SELECT
    id,
    campana_id,
    matriz_id,
    version_matriz_id
FROM evaluaciones
ORDER BY id DESC
LIMIT 5;

NOTA
Las evaluaciones históricas podrán mostrar matriz_id NULL.
Eso es esperado hasta hacer el backfill con la tabla real de versiones.
