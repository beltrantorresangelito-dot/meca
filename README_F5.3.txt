MECA F5.3 - LISTENINGS REPOSITORY

REEMPLAZA:
- server.js
- tests/escuchas.characterization.f52.test.js

AGREGA:
- src/modules/listenings/listenings.repository.js
- tests/listenings.repository.f53.test.js
- F5.3_LISTENINGS_REPOSITORY.md

No modifica BD ni frontend.

server.js:
4307 -> 4189

Ejecutar:
npm test

Esperado:
0 fail.
