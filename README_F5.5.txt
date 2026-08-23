MECA F5.5 - LISTENINGS MODULE COMPLETO

REEMPLAZA:
- server.js
- tests/escuchas.characterization.f52.test.js
- tests/listenings.repository.f53.test.js

AGREGA:
- src/modules/listenings/listenings.controller.js
- src/modules/listenings/listenings.routes.js
- src/modules/listenings/index.js
- tests/listenings.module.f55.test.js
- tests/listenings.module-server.f55.test.js
- F5.5_LISTENINGS_MODULE.md

MANTIENE:
- src/modules/listenings/listenings.repository.js
- src/modules/listenings/listenings.service.js
- tests/listenings.service.f54.test.js

NO modifica BD ni frontend.

server.js:
4072 -> 3797
reducción: 275

Ejecutar:
npm test

Esperado:
0 fail.
