MECA F10.21 - DATABASE STATUS SERVICE

ARQUITECTURA
server.js
  -> DatabaseStatusService
  -> DatabaseStatusRepository
  -> PostgreSQL

AGREGA
- src/modules/database-status/database-status.service.js
- tests/database-status.service.f1021.test.js

REEMPLAZA
- server.js
- tests/database-status.characterization.f1019.test.js

MOVIDO AL SERVICE
- formateo de tamaño de BD
- formateo KB/MB/GB por tabla
- armado de tablas detalladas
- totalRows / totalTables
- orden por tamaño
- tolerancia a error individual por tabla
- transformación del endpoint /tablas

PERMANECE EN server.js
- routing
- Token requerido
- respuestas HTTP
- logs generales
- contrato de error legacy

server.js: 1342 -> 1255
reducción: 87

SIGUIENTE
F10.22 - DatabaseStatusController.
