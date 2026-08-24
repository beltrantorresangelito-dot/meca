MECA F10.20 - DATABASE STATUS REPOSITORY

ARQUITECTURA TEMPORAL
server.js -> DatabaseStatusRepository -> PostgreSQL

AGREGA
- src/modules/database-status/database-status.repository.js
- tests/database-status.repository.f1020.test.js

REEMPLAZA
- server.js
- tests/database-status.characterization.f1019.test.js

MOVIDO FUERA DE server.js
- tamaño total de base de datos
- listado de tablas public con tamaños
- COUNT(*) exacto por tabla
- listado simple de tamaños totales

PERMANECE EN server.js
- routing
- Token requerido
- formateo MB/GB/KB
- armado de tablas
- totalRows/totalTables
- respuestas HTTP
- tolerancia a error por tabla

NOTA
countRows escapa comillas dobles del nombre de tabla antes de construir SQL.

server.js: 1360 -> 1342
reducción: 18

SIGUIENTE
F10.21 - DatabaseStatusService.
