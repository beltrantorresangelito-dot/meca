MECA F8.3 - SESSIONS SERVICE

ARQUITECTURA:
server.js
  -> SessionsService
  -> SessionsRepository
  -> PostgreSQL

REEMPLAZA:
- server.js
- tests/sessions.characterization.f81.test.js
- tests/sessions.close-regression.f811.test.js

AGREGA:
- src/modules/sessions/sessions.service.js
- tests/sessions.service.f83.test.js

MANTIENE:
- src/modules/sessions/sessions.repository.js
- tests/sessions.repository.f82.test.js

PERMANECE EN server.js:
- routing
- Token requerido
- parsing del body
- respuestas HTTP
- logs

server.js: 2294 -> 2296
variación: +2

GARANTÍA:
F7 Evaluations permanece modularizado.

EJECUTAR:
npm test

ESPERADO:
0 fail.

SIGUIENTE:
F8.4 - SessionsController.
