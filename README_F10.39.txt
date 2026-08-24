MECA F10.39 - GENERIC QUERY CONTROLLER

ARQUITECTURA
server.js
  -> GenericQueryController
  -> GenericQueryService
  -> GenericQueryRepository
  -> PostgreSQL

MOVIDO AL CONTROLLER
- HTTP 200
- JSON
- error.status || 500
- payload PostgreSQL error/code/details/hint
- log de error

PERMANECE EN server.js
- routing
- lectura body
- JSON.parse
- delegación Controller

ACTUALIZACIÓN DE TEST
GENQFIX-005 ahora valida correctamente que el manejo HTTP vive en Controller,
no en server.js.

server.js: 683 -> 683
reducción: 0

SIGUIENTE
F10.40 - GenericQueryRoutes.
