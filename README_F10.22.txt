MECA F10.22 - DATABASE STATUS CONTROLLER

ARQUITECTURA
server.js
  -> DatabaseStatusController
  -> DatabaseStatusService
  -> DatabaseStatusRepository
  -> PostgreSQL

AGREGA
- src/modules/database-status/database-status.controller.js
- tests/database-status.controller.f1022.test.js

REEMPLAZA
- server.js
- tests/database-status.characterization.f1019.test.js

MOVIDO AL CONTROLLER
- respuestas HTTP
- serialización JSON
- log resumen de BD
- manejo de errores
- contrato legacy /tablas: 500 + []

PERMANECE EN server.js
- routing
- Token requerido

server.js: 1255 -> 1235
reducción: 20

SIGUIENTE
F10.23 - DatabaseStatusRoutes.
