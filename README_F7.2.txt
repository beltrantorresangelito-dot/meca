MECA F7.2 - EVALUATIONS REPOSITORY

ARQUITECTURA TEMPORAL

server.js
  -> EvaluationsRepository
  -> PostgreSQL

REEMPLAZA:
- server.js
- tests/evaluations.characterization.f71.test.js
- tests/evaluations.post-regression.f711.test.js

AGREGA:
- src/modules/evaluations/evaluations.repository.js
- tests/evaluations.repository.f72.test.js

MOVIDO FUERA DE server.js:
- SQL GET /api/evaluaciones
- transacción POST evaluación + detalles
- transacción DELETE detalles + evaluación
- validar ticket
- listado de detalles

PERMANECE EN server.js:
- rutas
- parsing del body
- query params
- códigos HTTP
- logs
- manejo HTTP de errores

server.js:
2482 -> 2430
reducción: 52

NO modifica:
- BD
- frontend
- URLs
- contratos JSON

Ejecutar:
npm test

Esperado:
0 fail.

Siguiente:
F7.3 - EvaluationsService.
