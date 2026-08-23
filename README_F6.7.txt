MECA F6.7 - ROLES SERVICE

REEMPLAZA:
- server.js
- tests/roles-permissions.characterization.f65.test.js
- tests/roles.repository.f66.test.js

AGREGA:
- src/modules/roles/roles.service.js
- tests/roles.service.f67.test.js
- F6.7_ROLES_SERVICE.md

MANTIENE:
- src/modules/roles/roles.repository.js

NO modifica BD ni frontend.

server.js:
3063 -> 2863

Ejecutar:
npm test

Esperado:
0 fail.
