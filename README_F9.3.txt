MECA F9.3 - REQUESTS SERVICE

ARQUITECTURA:
server.js
  -> RequestsService
  -> RequestsRepository
  -> PostgreSQL

REEMPLAZA:
- server.js
- tests/requests.characterization.f91.test.js

AGREGA:
- src/modules/requests/requests.service.js
- tests/requests.service.f93.test.js

PERMANECE EN server.js:
- routing
- Token requerido
- parsing JSON
- respuestas HTTP
- 404 y mensajes legacy

MOVIDO AL SERVICE:
- validación mínima de IDs
- validación mínima de payloads
- delegación al Repository

server.js: 2075 -> 2077
variación: +2

IMPORTANTE:
El contrato dinámico de creación sigue preservado en Repository.

PROTECCIÓN:
F7 Evaluations y F8 Sessions permanecen modularizados.

EJECUTAR:
npm test

ESPERADO:
0 fail.

SIGUIENTE:
F9.4 - RequestsController.
