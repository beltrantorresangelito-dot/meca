MECA F2.2 - ENDPOINTS LECTURA DOMINIO

Requiere F2.1 ya aplicado.

Archivos nuevos:
- src/modules/domain/domain.controller.js
- src/modules/domain/domain.routes.js
- tests/backend-domain-endpoints.f22.test.js
- tests/backend-domain-server-integration.f22.test.js
- F2.2_DOMAIN_READ_ENDPOINTS.md

Archivo reemplazado:
- server.js

No modifica BD ni frontend.

Después:
1. npm test
2. iniciar MECA
3. probar Auditor/Supervisor
4. probar los endpoints nuevos desde consola del navegador
