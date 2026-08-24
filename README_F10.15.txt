MECA F10.15 - VERSIONS SERVICE

ARQUITECTURA
server.js
  -> VersionsService
  -> VersionsRepository
  -> PostgreSQL

AGREGA
- src/modules/versions/versions.service.js
- tests/versions.service.f1015.test.js

REEMPLAZA
- server.js
- tests/versions.characterization.f1013.test.js

MOVIDO AL SERVICE
- delegación de listados
- validación mínima de publicación
- validación de contenido_html
- activación exclusiva por tipo
- validación de IDs
- borrado por ID

PERMANECE EN server.js
- routing
- Token requerido
- parsing JSON
- respuestas HTTP
- logs y 404 actuales

server.js: 1496 -> 1497
variación: +1

SIGUIENTE
F10.16 - VersionsController.
