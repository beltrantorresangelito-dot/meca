MECA F3.2 - REPORTS REPOSITORY

Reemplaza:
- server.js

Agrega:
- src/modules/reports/reports.repository.js
- tests/reports.repository.f32.test.js
- F3.2_REPORTS_REPOSITORY.md

No modifica BD ni frontend.

Ejecutar:
npm test

No hace falta prueba manual todavía si la suite queda verde:
las rutas siguen inline y los contratos HTTP no cambian.
