MECA F10.16 - VERSIONS CONTROLLER

ARQUITECTURA
server.js
  -> VersionsController
  -> VersionsService
  -> VersionsRepository
  -> PostgreSQL

AGREGA
- src/modules/versions/versions.controller.js
- tests/versions.controller.f1016.test.js

REEMPLAZA
- server.js
- tests/versions.characterization.f1013.test.js

MOVIDO AL CONTROLLER
- respuestas HTTP de negocio
- serialización JSON
- 201 publicación
- 404 versión inexistente
- manejo de errores
- logs de publicar/activar/eliminar

PERMANECE EN server.js
- routing
- Token requerido
- parsing JSON de POST
- extracción de id/tipo

server.js: 1497 -> 1450
reducción: 47

SIGUIENTE
F10.17 - VersionsRoutes.
