MECA F8.4 - SESSIONS CONTROLLER

ARQUITECTURA:
server.js
  -> SessionsController
  -> SessionsService
  -> SessionsRepository
  -> PostgreSQL

REEMPLAZA:
- server.js
- tests/sessions.characterization.f81.test.js
- tests/sessions.close-regression.f811.test.js

AGREGA:
- src/modules/sessions/sessions.controller.js
- tests/sessions.controller.f84.test.js

PERMANECE EN server.js:
- routing
- Token requerido
- parsing JSON de los POST
- extracción de params

MOVIDO AL CONTROLLER:
- códigos HTTP
- serialización JSON
- logs de negocio
- errores del Service
- tolerancia legacy de historial-login

server.js: 2296 -> 2280
reducción: 16

EJECUTAR:
npm test

ESPERADO:
0 fail.

SIGUIENTE:
F8.5 - SessionsRoutes.
