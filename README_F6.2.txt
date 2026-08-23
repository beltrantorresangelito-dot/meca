MECA F6.2 — USERS/AUTH REPOSITORY

REEMPLAZA:
- server.js
- tests/users-auth.characterization.f61.test.js

AGREGA:
- src/modules/users/users.repository.js
- tests/users.repository.f62.test.js
- F6.2_USERS_AUTH_REPOSITORY.md

NO modifica BD ni frontend.
NO modulariza Roles/Permisos todavía.

server.js:
3772 -> 3681

Ejecutar:
npm test

Esperado:
0 fail.
