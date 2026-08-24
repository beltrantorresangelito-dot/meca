MECA F7.4 - EVALUATIONS CONTROLLER

ARQUITECTURA TEMPORAL

server.js
  -> EvaluationsController
  -> EvaluationsService
  -> EvaluationsRepository
  -> PostgreSQL

REEMPLAZA:
- server.js
- tests/evaluations.characterization.f71.test.js
- tests/evaluations.post-regression.f711.test.js

AGREGA:
- src/modules/evaluations/evaluations.controller.js
- tests/evaluations.controller.f74.test.js

MANTIENE:
- src/modules/evaluations/evaluations.service.js
- src/modules/evaluations/evaluations.repository.js
- tests/evaluations.service.f73.test.js
- tests/evaluations.repository.f72.test.js

MOVIDO AL CONTROLLER:
- códigos HTTP de éxito/error del dominio Evaluaciones
- serialización JSON
- logs de error
- delegación al Service

PERMANECE EN server.js:
- condiciones de routing
- lectura streaming del body POST
- JSON.parse del body
- extracción de IDs y query params

server.js:
2432 -> 2399
reducción: 33

NO modifica:
- BD
- frontend
- URLs
- payloads de éxito del dominio

NOTA:
JSON inválido en POST queda tratado como 400 antes de llegar al Controller.

Ejecutar:
npm test

Esperado:
0 fail.

Siguiente:
F7.5 - EvaluationsRoutes / handler.
