MECA F11.5.5.5B - PERSISTENCIA EN EVALUATIONS REPOSITORY

HALLAZGO

La persistencia real ya no está en server.js.
server.js delega en createEvaluationsHandler.

El INSERT real está en:
src/modules/evaluations/evaluations.repository.js

ANTES
evaluaciones guardaba:
- version_matriz_id

AHORA
guardará:
- campana_id
- matriz_id
- version_matriz_id

El INSERT pasa de 18 a 20 parámetros.

APLICACIÓN

node --check scripts\f11555b-persistir-contexto-repository.js
node scripts\f11555b-persistir-contexto-repository.js

node scripts\f11555b-alinear-test-f11555.js

node --test tests\evaluation-matrix-persistence.f11555.test.js
node --test tests\evaluation-matrix-persistence.f11555b.test.js
npm test

Después de 0 fail:
1. reiniciar Node;
2. guardar evaluación nueva;
3. consultar PostgreSQL:

SELECT
  id,
  campana_id,
  matriz_id,
  version_matriz_id
FROM evaluaciones
ORDER BY id DESC
LIMIT 5;

OBJETIVO
campana_id = 1
matriz_id = 1
version_matriz_id = 7
