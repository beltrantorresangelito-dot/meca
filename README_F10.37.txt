MECA F10.37 - GENERIC QUERY REPOSITORY

ARQUITECTURA TEMPORAL
server.js
  -> GenericQueryRepository
  -> PostgreSQL

AGREGA
- src/modules/generic-query/generic-query.repository.js
- tests/generic-query.repository.f1037.test.js

REEMPLAZA
- server.js
- tests/generic-query.characterization.f1036.test.js

MOVIDO FUERA DE server.js
- sanitización de identificadores
- sanitización selectFields
- filtros SELECT
- filtros UPDATE/DELETE
- construcción SQL SELECT
- ORDER BY / LIMIT
- HEAD + COUNT
- INSERT
- UPDATE
- DELETE
- UPSERT
- fallback 23505
- ejecución pool.query del dominio

PERMANECE EN server.js
- routing /api/query
- lectura body
- JSON.parse
- validación table
- validaciones data
- switch de operación
- respuestas HTTP
- error general PostgreSQL

server.js: 978 -> 773
reducción: 205

SIGUIENTE
F10.38 - GenericQueryService.
