MECA F4.2 - AGENTS REPOSITORY

Base:
server.js actual posterior a F3.

REEMPLAZA:
- server.js
- tests/agentes.characterization.f41.test.js

AGREGA:
- src/modules/agents/agents.repository.js
- tests/agents.repository.f42.test.js
- F4.2_AGENTS_REPOSITORY.md

NO modifica BD ni frontend.

server.js:
4656 -> 4574
reducción: 82 líneas

Después ejecutar:
npm test

Esperado:
0 fail.
