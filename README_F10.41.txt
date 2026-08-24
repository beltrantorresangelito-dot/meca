MECA F10.41 - GENERIC QUERY FINALIZATION / CLEANUP

ARQUITECTURA FINAL
server.js
  -> GenericQueryRoutes
  -> GenericQueryController
  -> GenericQueryService
  -> GenericQueryRepository
  -> PostgreSQL

ENDPOINT
POST /api/query

CERRADO EN ESTA FASE
- endpoint fuera de server.js
- parsing fuera de server.js
- HTTP fuera de server.js
- validaciones/operaciones fuera de server.js
- SQL fuera de server.js
- arrays insert/upsert corregidos
- update/delete global bloqueado
- status 400 preservado

RIESGOS PENDIENTES DOCUMENTADOS
- isSingle / isMaybeSingle sin semántica especial.
- sin allowlist funcional de tablas/operaciones.
- filtros mutation desconocidos caen a igualdad.

server.js: 665 -> 665
variación cleanup: +0

SIGUIENTE
Si npm test + checklist quedan OK:
Generic Query queda cerrado.
Luego se inventaría el siguiente residual de server.js.
