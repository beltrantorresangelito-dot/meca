MECA F10.23 - DATABASE STATUS ROUTES / HANDLER

ARQUITECTURA
server.js
  -> DatabaseStatusRoutes
  -> DatabaseStatusController
  -> DatabaseStatusService
  -> DatabaseStatusRepository
  -> PostgreSQL

ENDPOINTS MIGRADOS
- GET /api/estado-bd
- GET /api/estado-bd/tablas

MIGRADO A ROUTES
- Token requerido
- routing

NO SE ARRASTRA
- handlers inline
- código legacy ajeno al dominio

server.js: 1235 -> 1201
reducción: 34

SIGUIENTE
F10.24 - limpieza + validación funcional Estado BD.
