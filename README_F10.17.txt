MECA F10.17 - VERSIONS ROUTES / HANDLER

ARQUITECTURA
server.js
  -> VersionsRoutes
  -> VersionsController
  -> VersionsService
  -> VersionsRepository
  -> PostgreSQL

ENDPOINTS MIGRADOS
- GET    /api/versiones
- POST   /api/versiones
- PUT    /api/versiones/:id/activar
- DELETE /api/versiones/:id

MIGRADO A ROUTES
- Token requerido
- parsing JSON POST
- extracción de id
- query param tipo
- routing

NO SE ARRASTRA
- handlers inline
- código legacy ajeno al dominio

server.js: 1450 -> 1360
reducción: 90

SIGUIENTE
F10.18 - limpieza + validación funcional Versiones.
