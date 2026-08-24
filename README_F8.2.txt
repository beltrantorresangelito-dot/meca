MECA F8.2 - SESSIONS REPOSITORY

Arquitectura:
server.js -> SessionsRepository -> PostgreSQL

Reemplaza:
- server.js
- tests/sessions.characterization.f81.test.js
- tests/sessions.close-regression.f811.test.js

Agrega:
- src/modules/sessions/sessions.repository.js
- tests/sessions.repository.f82.test.js

server.js: 2320 -> 2294
reducción: 26

Nota:
Existe un UPDATE sesiones_activas adicional dentro del bloque genérico /api/query.
No pertenece a estos cinco endpoints y se mantiene fuera de F8.2.

Ejecutar:
npm test

Esperado:
0 fail.

Siguiente:
F8.3 - SessionsService.
