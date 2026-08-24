MECA F7.3 - EVALUATIONS SERVICE

ARQUITECTURA:
server.js -> EvaluationsService -> EvaluationsRepository -> PostgreSQL

REEMPLAZA:
- server.js
- tests/evaluations.characterization.f71.test.js
- tests/evaluations.post-regression.f711.test.js

AGREGA:
- src/modules/evaluations/evaluations.service.js
- tests/evaluations.service.f73.test.js

MANTIENE:
- src/modules/evaluations/evaluations.repository.js
- tests/evaluations.repository.f72.test.js

server.js:
2430 -> 2432

NO modifica BD, frontend, URLs ni payloads.

Ejecutar:
npm test

Esperado:
0 fail.

Siguiente:
F7.4 - EvaluationsController.
