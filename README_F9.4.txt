MECA F9.4 - REQUESTS CONTROLLER
server.js -> RequestsController -> RequestsService -> RequestsRepository -> PostgreSQL

Agrega:
- src/modules/requests/requests.controller.js
- tests/requests.controller.f94.test.js

Reemplaza:
- server.js
- tests/requests.characterization.f91.test.js

Permanece en server.js:
- routing
- Token requerido
- lectura/parsing body

server.js: 2077 -> 2029
Siguiente: F9.5 RequestsRoutes.
