MECA F9.5 - REQUESTS ROUTES / HANDLER

ARQUITECTURA:
server.js
  -> RequestsRoutes
  -> RequestsController
  -> RequestsService
  -> RequestsRepository
  -> PostgreSQL

ENDPOINTS MIGRADOS:
- GET  /api/solicitudes/usuario/:id
- GET  /api/solicitudes
- POST /api/solicitudes
- GET  /api/solicitudes/:id
- PUT  /api/solicitudes/:id

CÓDIGO LEGACY MANTENIDO SOLO POR VÍNCULO:
- requireToken local para GET/PUT por ID.
- readJsonBody para POST/PUT.
- creación dinámica en Repository porque sigue siendo contrato vigente.

NO SE ARRASTRA:
- código legacy ajeno al dominio Requests.

server.js: 2029 -> 1948
reducción: 81

EJECUTAR:
npm test

ESPERADO:
0 fail.

SIGUIENTE:
F9.6 - limpieza + validación funcional.
