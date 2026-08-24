MECA F10.38 - GENERIC QUERY SERVICE

ARQUITECTURA TEMPORAL
server.js
  -> GenericQueryService
  -> GenericQueryRepository
  -> PostgreSQL

MOVIDO AL SERVICE
- validación payload
- validación table
- validación data insert/update/upsert
- selección de operación
- delegación select/insert/update/delete/upsert
- error operación no soportada
- preservación de status 400 del Repository

MEJORA IMPORTANTE
El catch inline de server.js ahora usa:
error.status || 500

Por tanto, las protecciones de F10.37.2:
UPDATE/DELETE sin filtros
ya responden HTTP 400 en vez de 500.

PERMANECE EN server.js
- routing /api/query
- lectura body
- JSON.parse
- respuesta HTTP 200
- serialización JSON
- payload PostgreSQL de error

server.js: 773 -> 683
reducción: 90

SIGUIENTE
F10.39 - GenericQueryController.
