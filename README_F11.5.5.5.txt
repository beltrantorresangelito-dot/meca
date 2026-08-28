MECA F11.5.5.5 - PERSISTENCIA DE matriz_id

HALLAZGO
La prueba PostgreSQL devolvió:

ERROR 42703
no existe la columna matriz_id

Eso confirma que frontend/contexto ya funcionan, pero la tabla
evaluaciones no almacena todavía la matriz histórica.

PASOS

1. Ejecutar migración:
migrations/0011_evaluaciones_matriz_id.sql

2. Aplicar parche backend:
scripts/f11555-persistir-matriz-id-backend.js

3. Ejecutar tests.

IMPORTANTE
La migración:
- agrega evaluaciones.matriz_id BIGINT;
- hace backfill usando matriz_versiones.matriz_id cuando existe
  version_matriz_id;
- crea índice.

COMANDOS

psql -U postgres -d meca_db -f migrations\0011_evaluaciones_matriz_id.sql

node --check scripts\f11555-persistir-matriz-id-backend.js
node scripts\f11555-persistir-matriz-id-backend.js

node --test tests\evaluation-matrix-persistence.f11555.test.js
npm test

VALIDACIÓN SQL

SELECT
    id,
    campana_id,
    matriz_id,
    version_matriz_id
FROM evaluaciones
ORDER BY fecha_registro DESC
LIMIT 5;

Después crear una nueva evaluación y repetir la consulta.

OBJETIVO
La nueva evaluación debe almacenar:
campana_id = 1
matriz_id = 1
version_matriz_id = 7
