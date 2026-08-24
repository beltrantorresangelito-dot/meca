MECA F10.44 - GENERIC RPC SERVICE

ARQUITECTURA TEMPORAL
server.js
  -> GenericRpcService
  -> GenericRpcRepository
  -> PostgreSQL

MOVIDO AL SERVICE
- selección cerrar_mes
- selección limpiar_sesiones_expiradas
- fallback genérico
- forma de payload:
  direct para cerrar_mes
  wrapped para limpiar/fallback

PERMANECE EN server.js
- routing
- functionName
- body/JSON.parse
- HTTP 200/500
- log error

server.js: 642 -> 620
reducción: 22

SIGUIENTE
F10.45 - GenericRpcController.
