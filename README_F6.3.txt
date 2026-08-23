MECA F6.3 - USERS/AUTH SERVICE

REEMPLAZA:
- server.js
- tests/users-auth.characterization.f61.test.js
- tests/users.repository.f62.test.js

AGREGA:
- src/modules/users/users.service.js
- tests/users.service.f63.test.js
- F6.3_USERS_AUTH_SERVICE.md

MANTIENE:
- src/modules/users/users.repository.js

NO modifica BD ni frontend.
Roles/Permisos siguen inline.

server.js:
3681 -> 3502

Ejecutar:
npm test

Esperado:
0 fail.
