MECA F9.2 - REQUESTS REPOSITORY

ARQUITECTURA:
server.js -> RequestsRepository -> PostgreSQL

REEMPLAZA:
- server.js
- tests/requests.characterization.f91.test.js

AGREGA:
- src/modules/requests/requests.repository.js
- tests/requests.repository.f92.test.js

MOVIDO FUERA DE server.js:
- GET por solicitante
- GET general
- POST creación dinámica legacy
- GET por ID
- PUT estado y campos opcionales

PERMANECE EN server.js:
- routing
- Token requerido
- parsing JSON
- respuestas HTTP
- 404 y mensajes legacy

server.js: 2119 -> 2075
reducción: 44

IMPORTANTE:
createDynamic conserva deliberadamente Object.keys/Object.values.
No se endurece el contrato todavía.

PROTECCIÓN:
F7 Evaluations y F8 Sessions permanecen modularizados.

EJECUTAR:
npm test

ESPERADO:
0 fail.

SIGUIENTE:
F9.3 - RequestsService.
