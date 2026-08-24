MECA F10.46 - GENERIC RPC ROUTES / HANDLER

ARQUITECTURA
server.js
  -> GenericRpcRoutes
  -> GenericRpcController
  -> GenericRpcService
  -> GenericRpcRepository
  -> PostgreSQL

ENDPOINT MIGRADO
POST /api/rpc/:functionName

MIGRADO A ROUTES
- regex routing
- extracción/sanitización functionName
- lectura body
- JSON.parse
- construcción Repository/Service/Controller
- delegación Controller

COMPORTAMIENTO JSON INVÁLIDO
Se conserva fallback actual a {}.

server.js: 620 -> 597
reducción: 23

SIGUIENTE
F10.47 - cleanup + validación funcional final Generic RPC.
