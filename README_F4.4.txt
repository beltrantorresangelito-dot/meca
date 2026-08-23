MECA F4.4 - AGENTS MODULE COMPLETO

REEMPLAZA:
- server.js
- tests/agentes.characterization.f41.test.js
- tests/agents.repository.f42.test.js

AGREGA:
- src/modules/agents/agents.controller.js
- src/modules/agents/agents.routes.js
- src/modules/agents/index.js
- tests/agents.module.f44.test.js
- tests/agents.module-server.f44.test.js
- F4.4_AGENTS_MODULE.md

MANTIENE:
- src/modules/agents/agents.repository.js
- src/modules/agents/agents.service.js
- tests/agents.service.f43.test.js

NO modifica BD ni frontend.

server.js:
4521 -> 4307
reducción: 214

Ejecutar:
npm test

Esperado:
0 fail.
