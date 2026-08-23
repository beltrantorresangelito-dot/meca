MECA F6.4 - USERS/AUTH MODULE

REEMPLAZA:
- server.js
- tests/users-auth.characterization.f61.test.js
- tests/users.repository.f62.test.js

AGREGA:
- src/modules/users/users.controller.js
- src/modules/users/users.routes.js
- src/modules/users/index.js
- tests/users.module.f64.test.js
- tests/users.module-server.f64.test.js
- F6.4_USERS_AUTH_MODULE.md

MANTIENE:
- src/modules/users/users.repository.js
- src/modules/users/users.service.js
- tests/users.service.f63.test.js

Roles/Permisos NO se migran todavía.
BD y frontend no se modifican.

server.js:
3502 -> 3129
reducción: 373

Ejecutar:
npm test

Esperado:
0 fail.
