MECA F10.43 - GENERIC RPC REPOSITORY

ARQUITECTURA TEMPORAL
server.js
  -> GenericRpcRepository
  -> PostgreSQL

MOVIDO FUERA DE server.js
- SQL cerrar_mes
- SQL limpiar_sesiones_expiradas
- construcción placeholders RPC genérico
- SELECT * FROM functionName(...)
- pool.query del dominio RPC

PERMANECE EN server.js
- routing
- functionName
- body/JSON.parse
- selección cerrar_mes / limpiar / fallback
- respuestas HTTP
- error general

server.js: 654 -> 642
reducción: 12

SIGUIENTE
F10.44 - GenericRpcService.
