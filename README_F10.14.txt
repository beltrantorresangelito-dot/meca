MECA F10.14 - VERSIONS REPOSITORY

ARQUITECTURA TEMPORAL
server.js -> VersionsRepository -> PostgreSQL

AGREGA
- src/modules/versions/versions.repository.js
- tests/versions.repository.f1014.test.js

REEMPLAZA
- server.js
- tests/versions.characterization.f1013.test.js

MOVIDO FUERA DE server.js
- listado con filtro opcional por tipo
- publicación de versión
- desactivación por tipo
- activación por ID
- borrado por ID

PERMANECE EN server.js
- routing
- Token requerido
- parsing JSON
- respuestas HTTP
- logs y 404 actuales

LEGACY MANTENIDO POR VÍNCULO
- nuevas versiones es_activo=false
- tamano_bytes = contenido_html.length
- DELETE físico
- activación exclusiva por tipo

server.js: 1501 -> 1496
reducción: 5

SIGUIENTE
F10.15 - VersionsService.
