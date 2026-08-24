MECA F10.33 - MATRIX RECALCULATION CONTROLLER

ARQUITECTURA
server.js
  -> MatrixRecalculationController
  -> MatrixRecalculationService
  -> MatrixRecalculationRepository
  -> PostgreSQL

AGREGA
- src/modules/matrix-recalculation/matrix-recalculation.controller.js
- tests/matrix-recalculation.controller.f1033.test.js

REEMPLAZA
- server.js
- tests/matrix-recalculation.characterization.f1030.test.js

MOVIDO AL CONTROLLER
- respuesta HTTP 200
- serialización JSON
- error general
- status custom o 500
- log de error general

PERMANECE EN server.js
- routing
- Token requerido

server.js: 995 -> 988
reducción: 7

SIGUIENTE
F10.34 - MatrixRecalculationRoutes.
