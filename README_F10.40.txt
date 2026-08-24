MECA F10.40 - GENERIC QUERY ROUTES / HANDLER

ARQUITECTURA
server.js
  -> GenericQueryRoutes
  -> GenericQueryController
  -> GenericQueryService
  -> GenericQueryRepository
  -> PostgreSQL

ENDPOINT MIGRADO
POST /api/query

MIGRADO A ROUTES
- routing
- lectura body
- JSON.parse
- construcción Repository/Service/Controller
- delegación al Controller

JSON INVÁLIDO
readJsonBody devuelve null.
Service mantiene:
HTTP 400
Payload inválido

server.js: 683 -> 665
reducción: 18

SIGUIENTE
F10.41 - cleanup + validación funcional final Generic Query.
