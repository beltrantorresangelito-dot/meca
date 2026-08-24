MECA F7.5 - EVALUATIONS ROUTES / HANDLER

ARQUITECTURA

server.js
  -> EvaluationsRoutes
  -> EvaluationsController
  -> EvaluationsService
  -> EvaluationsRepository
  -> PostgreSQL

ENDPOINTS MIGRADOS
- GET /api/evaluaciones
- POST /api/evaluaciones
- DELETE /api/evaluaciones/:id
- GET /api/evaluaciones/validar-ticket
- GET /api/evaluaciones/:id/detalles

REEMPLAZA
- server.js
- tests/evaluations.characterization.f71.test.js
- tests/evaluations.post-regression.f711.test.js

AGREGA
- src/modules/evaluations/evaluations.routes.js
- src/modules/evaluations/index.js
- tests/evaluations.module.f75.test.js
- tests/evaluations.module-server.f75.test.js

MANTIENE
- evaluations.repository.js
- evaluations.service.js
- evaluations.controller.js
- sus tests unitarios

server.js:
2399 -> 2326
reducción: 73

NO modifica
- BD
- frontend
- URLs
- payloads JSON

EJECUTAR
npm test

ESPERADO
0 fail.

SIGUIENTE
F7.6 - validación funcional + limpieza legacy de Evaluaciones.
