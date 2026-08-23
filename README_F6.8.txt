MECA F6.8 - ROLES/PERMISSIONS MODULE

REEMPLAZA:
- server.js
- tests/roles-permissions.characterization.f65.test.js
- tests/roles.repository.f66.test.js

AGREGA:
- src/modules/roles/roles.controller.js
- src/modules/roles/roles.routes.js
- src/modules/roles/index.js
- tests/roles.module.f68.test.js
- tests/roles.module-server.f68.test.js
- F6.8_ROLES_MODULE.md

MANTIENE:
- src/modules/roles/roles.repository.js
- src/modules/roles/roles.service.js
- tests/roles.service.f67.test.js

NO modifica BD ni frontend.

server.js:
2863 -> 2482
reducción: 381

Ejecutar:
npm test

Esperado:
0 fail.
