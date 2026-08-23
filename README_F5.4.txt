MECA F5.4 - LISTENINGS SERVICE

REEMPLAZA:
- server.js
- tests/escuchas.characterization.f52.test.js
- tests/listenings.repository.f53.test.js

AGREGA:
- src/modules/listenings/listenings.service.js
- tests/listenings.service.f54.test.js
- F5.4_LISTENINGS_SERVICE.md

MANTIENE:
- src/modules/listenings/listenings.repository.js

NO modifica BD ni frontend.

server.js:
4189 -> 4072

Ejecutar:
npm test

Esperado:
0 fail.
