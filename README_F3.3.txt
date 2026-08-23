MECA F3.3 - REPORTS SERVICE

Base: F3.2.

Reemplaza:
- server.js
- tests/reportes.characterization.f31.test.js

Agrega:
- src/modules/reports/reports.service.js
- tests/reports.service.f33.test.js
- tests/reports.service-server.f33.test.js
- F3.3_REPORTS_SERVICE.md

No modifica BD ni frontend.

server.js antes: 5092
server.js después: 4916

Ejecutar:
npm test

Esperado:
0 fail.
