MECA F3.4 - REPORTS MODULE COMPLETO

Base: F3.3.

Reemplaza:
- server.js
- tests/reportes.characterization.f31.test.js

Agrega:
- src/modules/reports/reports.controller.js
- src/modules/reports/reports.routes.js
- src/modules/reports/index.js
- tests/reports.module.f34.test.js
- tests/reports.module-server.f34.test.js
- F3.4_REPORTS_MODULE.md

Mantiene:
- src/modules/reports/reports.repository.js
- src/modules/reports/reports.service.js

server.js:
4916 -> 4656
reducción: 260 líneas

Ejecutar:
npm test

Esperado:
0 fail.
