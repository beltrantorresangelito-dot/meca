MECA F6.6 - ROLES REPOSITORY

REEMPLAZA:
- server.js
- tests/roles-permissions.characterization.f65.test.js

AGREGA:
- src/modules/roles/roles.repository.js
- tests/roles.repository.f66.test.js
- F6.6_ROLES_REPOSITORY.md

NO modifica BD ni frontend.

server.js:
3129 -> 3063

Ejecutar:
npm test

Esperado:
0 fail.
