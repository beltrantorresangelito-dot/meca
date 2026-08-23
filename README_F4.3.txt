MECA F4.3 - AGENTS SERVICE

REEMPLAZA:
- server.js
- tests/agentes.characterization.f41.test.js
- tests/agents.repository.f42.test.js

AGREGA:
- src/modules/agents/agents.service.js
- tests/agents.service.f43.test.js
- F4.3_AGENTS_SERVICE.md

NO modifica BD ni frontend.

server.js:
4574 -> 4521

Ejecutar:
npm test

Esperado:
0 fail.
