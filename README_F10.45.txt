MECA F10.45 - GENERIC RPC CONTROLLER

ARQUITECTURA
server.js
  -> GenericRpcController
  -> GenericRpcService
  -> GenericRpcRepository
  -> PostgreSQL

MOVIDO AL CONTROLLER
- HTTP 200
- serialización JSON
- HTTP 500
- error/code
- log del error RPC

PERMANECE EN server.js
- routing
- functionName
- lectura body
- JSON.parse
- delegación Controller

server.js: 620 -> 620
reducción: 0

SIGUIENTE
F10.46 - GenericRpcRoutes.
